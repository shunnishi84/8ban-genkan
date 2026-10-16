import type { ImageStore } from '../assets/loader';
import { IMAGES, type ImageEntry, type ImageKey } from '../assets/manifest';
import type { SpotId } from '../core/types';

/** 論理解像度（9:16）。CSS で拡縮し、devicePixelRatio 分だけ実ピクセルを増やす */
export const W = 360;
export const H = 640;

const FULL = { x: 0, y: 0, w: W, h: H };

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 玄関前は bg_door（224x367 の一枚絵）を横幅いっぱいに上詰めで描く。
 * 当たり判定とオーバーレイは、その絵のピクセル座標で書いて論理座標に変換する。
 */
const ART_W = 224;
const ART_H = 367;
const K = W / ART_W;
const art = (x: number, y: number, w: number, h: number): Rect => ({ x: x * K, y: y * K, w: w * K, h: h * K });
export const DOOR_BG_RECT = art(0, 0, ART_W, ART_H);

/** 玄関前のタップ領域 */
export const SPOT_RECTS: Record<SpotId, Rect> = {
  hallway: art(0, 40, 58, 290),
  door: art(63, 95, 107, 205),
  window: art(176, 93, 43, 93),
  nameplate: art(23, 124, 38, 25),
  floor: art(50, 303, 132, 32),
};

/** オーバーレイの描画位置（window_* は窓枠ごと差し替える絵なので、すべて窓と同じ矩形） */
const OVERLAY_RECTS: Record<string, Rect> = {
  window_garland: art(177, 93, 43, 93),
  window_candle: art(177, 93, 43, 93),
  window_dark: art(177, 93, 43, 93),
  window_tv: art(177, 93, 43, 93),
  garbage_bag: art(2, 270, 40, 48),
  wet_floor: art(48, 316, 136, 23),
  castle_gate: art(52, 80, 130, 228),
};

export type Scene =
  | { kind: 'door'; visuals: string[] }
  | { kind: 'bg'; image: ImageKey; fallback?: ImageKey }
  | { kind: 'angry'; started: number; image: 'wife_angry' | 'wife_dark' }
  | { kind: 'demon'; started: number }
  /** 無限玄関ループ: level が上がるほど玄関がおかしくなる */
  | { kind: 'loop'; level: number; started: number }
  | { kind: 'home' }
  | { kind: 'clear' }
  | { kind: 'title' };

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scene: Scene = { kind: 'title' };
  private raf = 0;

  constructor(
    parent: HTMLElement,
    private images: ImageStore,
    private onSpot: (spot: SpotId) => void,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'stage';
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('pointerup', (e) => this.handleTap(e));
  }

  setScene(scene: Scene) {
    this.scene = scene;
    cancelAnimationFrame(this.raf);
    this.draw();
  }

  /** 画像の読み込み完了時などに呼ぶ */
  redraw() {
    if (this.scene.kind !== 'angry' && this.scene.kind !== 'demon' && this.scene.kind !== 'loop') this.draw();
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  private handleTap(e: PointerEvent) {
    if (this.scene.kind !== 'door') return;
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    // 小さいもの（表札）を優先して判定
    const order: SpotId[] = ['nameplate', 'window', 'floor', 'door', 'hallway'];
    const hit = order.find((s) => inside(SPOT_RECTS[s], x, y));
    if (hit) this.onSpot(hit);
  }

  private draw() {
    const { ctx } = this;
    ctx.clearRect(0, 0, W, H);
    const s = this.scene;
    switch (s.kind) {
      case 'title':
        this.drawImage('bg_title', FULL, false);
        break;
      case 'door':
        this.drawDoorScene(s.visuals);
        break;
      case 'bg':
        this.drawImage(s.fallback && !this.images.get(s.image) && this.images.get(s.fallback) ? s.fallback : s.image, FULL);
        break;
      case 'loop':
        this.drawLoop(s.level, s.started);
        break;
      case 'home':
        this.drawImage('wife_smile', FULL);
        break;
      case 'clear':
        this.drawImage('clear', FULL);
        break;
      case 'angry':
        this.drawAngry(s.started, s.image);
        break;
      case 'demon':
        this.drawDemon(s.started);
        break;
    }
  }

  private drawDoorScene(visuals: string[]) {
    const { ctx } = this;
    // 一枚絵の下に余る部分は床の色で埋める
    ctx.fillStyle = '#39424f';
    ctx.fillRect(0, 0, W, H);
    const composite = this.images.get('bg_door') !== null;
    this.drawImage('bg_door', DOOR_BG_RECT, false);
    if (!composite) {
      // 一枚絵が無いときだけ、廊下の灯りの雰囲気を足す
      const g = ctx.createRadialGradient(180, 60, 10, 180, 60, 240);
      g.addColorStop(0, 'rgba(200,230,255,0.25)');
      g.addColorStop(1, 'rgba(200,230,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    for (const spot of ['hallway', 'door', 'window', 'nameplate', 'floor'] as SpotId[]) {
      // 一枚絵があればパーツは個別画像があるときだけ重ねる
      if (!composite || this.images.get(spot)) this.drawImage(spot, SPOT_RECTS[spot]);
    }
    for (const v of visuals) {
      const rect = OVERLAY_RECTS[v];
      if (rect && v in IMAGES) this.drawImage(v as ImageKey, rect);
    }
  }

  private drawAngry(started: number, image: 'wife_angry' | 'wife_dark') {
    const t = (performance.now() - started) / 1000;
    const { ctx } = this;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = image === 'wife_angry' ? '#2a0505' : '#0d0d14';
    ctx.fillRect(0, 0, W, H);
    const shake = image === 'wife_angry' ? Math.min(1, t) * Math.sin(t * 40) * 3 : 0;
    const zoom = 1 + Math.min(t, 1.5) * 0.04;
    const r = { x: (W - W * zoom) / 2 + shake, y: (H - H * zoom) / 2, w: W * zoom, h: H * zoom };
    if (this.images.get(image)) {
      this.drawImage(image, r);
    } else {
      // 代替表示: 炎の四角を揺らしつつ、中央に妻の四角
      if (image === 'wife_angry') {
        for (let i = 0; i < 5; i++) {
          const flick = Math.sin(t * 9 + i * 1.7) * 8;
          const fw = 90 + Math.sin(t * 5 + i) * 10;
          this.drawImage('fire', { x: -20 + i * 80, y: 300 + flick - (i % 2) * 40, w: fw, h: 200 - flick });
        }
      }
      this.drawImage(image, { x: 60 + shake, y: 110, w: 240, h: 320 });
    }
    if (image === 'wife_angry') {
      // 画面の縁を赤く脈打たせる
      const a = 0.25 + Math.sin(t * 6) * 0.1;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.7);
      g.addColorStop(0, 'rgba(255,40,0,0)');
      g.addColorStop(1, `rgba(255,40,0,${a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    this.raf = requestAnimationFrame(() => this.drawAngry(started, image));
  }

  /**
   * 暴言を送った日の結末: 邪悪なオーラを放つ魔王化した妻。
   * wife_demon 画像が無いあいだは wife_angry を紫に染めて代用する。
   */
  private drawDemon(started: number) {
    const t = (performance.now() - started) / 1000;
    const { ctx } = this;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#07020d';
    ctx.fillRect(0, 0, W, H);

    // 背後で回る闇の光線
    ctx.save();
    ctx.translate(W / 2, H * 0.42);
    ctx.rotate(t * 0.35);
    for (let i = 0; i < 14; i++) {
      ctx.rotate((Math.PI * 2) / 14);
      ctx.fillStyle = i % 2 ? 'rgba(120,20,190,0.22)' : 'rgba(40,0,70,0.35)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-40, -H);
      ctx.lineTo(40, -H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 脈打つオーラ
    const pulse = 0.55 + Math.sin(t * 5) * 0.2;
    const aura = ctx.createRadialGradient(W / 2, H * 0.45, 30, W / 2, H * 0.45, H * 0.55);
    aura.addColorStop(0, `rgba(190,60,255,${pulse})`);
    aura.addColorStop(0.5, 'rgba(90,0,150,0.35)');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, W, H);

    // 妻（魔王）。震えは怒りより大きく
    const shake = Math.min(1, t) * Math.sin(t * 55) * 5;
    const zoom = 1.02 + Math.min(t, 2) * 0.05;
    const r = { x: (W - W * zoom) / 2 + shake, y: (H - H * zoom) / 2 + Math.cos(t * 47) * 2, w: W * zoom, h: H * zoom };
    const demon = this.images.get('wife_demon');
    if (demon) {
      // 横幅いっぱい・縦は中央。上下の余白は回る光線とオーラが埋める
      const w = W * zoom;
      const h = (w * demon.naturalHeight) / demon.naturalWidth;
      this.drawImage('wife_demon', { x: (W - w) / 2 + shake, y: (H - h) / 2 + Math.cos(t * 47) * 2, w, h });
    } else {
      this.drawImage('wife_angry', r);
      // 代用: 紫に染めて闇落ちさせる
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(110,40,180,0.85)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(150,40,255,${0.15 + Math.sin(t * 5) * 0.08})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // 立ちのぼる闇の火の粉
    for (let i = 0; i < 40; i++) {
      const seed = i * 97.13;
      const x = (Math.sin(seed) * 0.5 + 0.5) * W + Math.sin(t * 2 + i) * 12;
      const y = H - (((t * (40 + (i % 7) * 12) + seed * 3) % (H + 40)));
      const size = 2 + (i % 4);
      ctx.fillStyle = i % 3 ? 'rgba(200,90,255,0.8)' : 'rgba(30,0,40,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // ときどき稲妻で画面が白く光る
    const phase = t % 2.3;
    if (phase < 0.12) {
      ctx.fillStyle = `rgba(235,220,255,${0.75 - phase * 6})`;
      ctx.fillRect(0, 0, W, H);
    }

    // 画面の縁を闇で締める
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(10,0,20,0.85)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    this.raf = requestAnimationFrame(() => this.drawDemon(started));
  }

  /** 無限玄関ループ: 段階的に「異変」を足していく（8番出口オマージュ） */
  private drawLoop(level: number, started: number) {
    const t = (performance.now() - started) / 1000;
    const { ctx } = this;
    ctx.save();
    // 5周目以降は画面が横にずれる
    if (level >= 5) ctx.translate(Math.sin(t * 23) * (level - 4) * 1.5, 0);
    this.drawDoorScene([]);
    ctx.restore();

    // 周を重ねるごとに赤黒く沈む
    ctx.fillStyle = `rgba(60,0,10,${Math.min(0.45, level * 0.05)})`;
    ctx.fillRect(0, 0, W, H);
    if (level >= 3) {
      // 表札が『魔』
      const r = SPOT_RECTS.nameplate;
      ctx.fillStyle = '#1a0d10';
      ctx.fillRect(r.x + 4, r.y + 6, r.w - 8, r.h - 12);
      ctx.fillStyle = '#d0202a';
      ctx.font = `900 ${Math.round(r.h * 0.55)}px "Noto Sans CJK JP", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('魔', r.x + r.w / 2, r.y + r.h / 2);
    }
    if (level >= 4) {
      // 窓の向こうの目
      const r = SPOT_RECTS.window;
      const blink = Math.sin(t * 1.3) > 0.97 ? 0.1 : 1;
      for (const dx of [-0.17, 0.17]) {
        ctx.fillStyle = 'rgba(255,240,200,0.9)';
        ctx.beginPath();
        ctx.ellipse(r.x + r.w * (0.5 + dx), r.y + r.h * 0.42, 6, 4 * blink, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#300';
        ctx.beginPath();
        ctx.arc(r.x + r.w * (0.5 + dx), r.y + r.h * 0.42, 2 * blink, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (level >= 6) {
      // 走査線
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = (t * 40) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    }
    if (level >= 7) {
      // 足元にのびる、自分のものではない影
      const g = ctx.createLinearGradient(0, H, 0, H * 0.55);
      g.addColorStop(0, 'rgba(0,0,0,0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(W * 0.42, H);
      ctx.lineTo(W * 0.58, H);
      ctx.lineTo(W * 0.53 + Math.sin(t) * 4, H * 0.55);
      ctx.lineTo(W * 0.47 + Math.sin(t) * 4, H * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    if (level >= 8 && Math.sin(t * 9) > 0.6) {
      ctx.fillStyle = 'rgba(255,0,30,0.12)';
      ctx.fillRect(0, 0, W, H);
    }
    this.raf = requestAnimationFrame(() => this.drawLoop(level, started));
  }

  /** 画像があれば描き、無ければ「仮の四角＋ラベル」 */
  private drawImage(key: ImageKey, r: Rect, label = true) {
    const img = this.images.get(key);
    const { ctx } = this;
    if (img) {
      if ((IMAGES[key] as ImageEntry).fit === 'cover') {
        // 縦横比を保ったまま r を覆う（はみ出しは切り取る）
        const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight);
        const sw = r.w / scale;
        const sh = r.h / scale;
        ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, r.x, r.y, r.w, r.h);
      } else {
        ctx.drawImage(img, r.x, r.y, r.w, r.h);
      }
      return;
    }
    const entry = IMAGES[key];
    ctx.fillStyle = entry.color;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    if (!label) return;
    ctx.fillStyle = luminance(entry.color) > 0.55 ? '#222' : '#f4f4f4';
    ctx.font = `bold ${Math.max(9, Math.min(14, r.h / 3))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.label, r.x + r.w / 2, r.y + r.h / 2, r.w - 4);
  }
}

const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
