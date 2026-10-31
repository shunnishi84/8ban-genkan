import type { ImageStore } from '../assets/loader';
import { IMAGES, type ImageEntry, type ImageKey } from '../assets/manifest';
import type { SpotId } from '../core/types';

/** 論理解像度（9:16）。CSS で拡縮し、devicePixelRatio 分だけ実ピクセルを増やす */
const W = 360;
const H = 640;

const FULL = { x: 0, y: 0, w: W, h: H };

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 玄関前は bg_door（縦横比 224:367 の一枚絵。今の絵は 1080x1770）を横幅いっぱいに上詰めで描く。
 * 当たり判定とオーバーレイは、幅 224 に縮めたときのピクセル座標で書いて論理座標に変換する。
 */
const ART_W = 224;
const ART_H = 367;
const K = W / ART_W;
const art = (x: number, y: number, w: number, h: number): Rect => ({ x: x * K, y: y * K, w: w * K, h: h * K });
const DOOR_BG_RECT = art(0, 0, ART_W, ART_H);

/** 玄関前のタップ領域 */
const SPOT_RECTS: Record<SpotId, Rect> = {
  hallway: art(0, 40, 58, 290),
  door: art(63, 95, 107, 205),
  window: art(179, 98, 45, 87),
  nameplate: art(23, 124, 38, 25),
  floor: art(50, 303, 132, 32),
};

/**
 * 窓の中身を差し替える絵（window_*）。どれも旧い bg_door の窓枠ごと描かれているので、
 * 絵のガラス部分（WINDOW_ART_GLASS、絵に対する割合）だけを切り出して、今の bg_door のガラス（WINDOW_GLASS）に
 * 縦横比を保って敷き詰める（はみ出しは切る）。枠は bg_door のものがそのまま見える
 */
const WINDOW_GLASS = art(186, 107, 36, 67);
const WINDOW_ART_GLASS = { x: 7 / 43, y: 12 / 93, w: 33 / 43, h: 72 / 93 };
const WINDOW_OVERLAYS = new Set(['window_garland', 'window_candle', 'window_dark', 'window_tv']);

/** オーバーレイの描画位置（窓の絵は WINDOW_GLASS） */
const OVERLAY_RECTS: Record<string, Rect> = {
  garbage_bag: art(2, 270, 40, 48),
  game_parcel: art(172, 294, 40, 28),
  wet_floor: art(48, 316, 136, 23),
  castle_gate: art(52, 80, 130, 228),
  // 玄関マットの上に置かれた写真集
  item_gravure_book: art(100, 300, 30, 30),
};

export type Scene =
  | { kind: 'door'; visuals: string[] }
  | { kind: 'bg'; image: ImageKey; fallback?: ImageKey }
  /** image が無いときは鬼の形相の妻（wife_dark は時間切れの静かな怒り） */
  | { kind: 'angry'; image: ImageKey }
  /** final: 魔王の最終形態（缶ビール3本＋暴言コンプリートの魔王城） */
  /** kishin: 鬼のお面をかぶって鬼神になった魔王 */
  | { kind: 'demon'; final?: boolean; kishin?: boolean }
  /** 無限玄関ループ: level が上がるほど玄関がおかしくなる */
  | { kind: 'loop'; level: number }
  /** grudging: 渋々許す日は無表情の妻（画像が無ければ笑顔で代用） */
  | { kind: 'home'; grudging?: boolean; image?: ImageKey }
  | { kind: 'clear' }
  | { kind: 'title' };

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scene: Scene = { kind: 'title' };
  private raf = 0;
  /** 今の場面が始まった時刻（動く場面のアニメーション用） */
  private started = 0;

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
    this.started = performance.now();
    this.draw();
  }

  /** 画像の読み込み完了時などに呼ぶ */
  redraw() {
    this.draw();
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

  /**
   * 今の場面を描く。動く場面（怒り・魔王・ループ）は毎フレーム描き直す。
   * 描き直しの予約は常に1本だけ（場面の切り替え・画面の回転・画像の読み込みのたびに前の予約を取り消す）
   */
  private draw() {
    cancelAnimationFrame(this.raf);
    this.ctx.clearRect(0, 0, W, H);
    const s = this.scene;
    const t = (performance.now() - this.started) / 1000;
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
        this.drawLoop(s.level, t);
        break;
      case 'home':
        this.drawImage(
          s.image && this.images.get(s.image) ? s.image : s.grudging && this.images.get('wife_sullen') ? 'wife_sullen' : 'wife_smile',
          FULL,
        );
        break;
      case 'clear':
        this.drawImage('clear', FULL);
        break;
      case 'angry':
        this.drawAngry(t, s.image === 'wife_dark' || this.images.get(s.image) ? s.image : 'wife_angry');
        break;
      case 'demon':
        this.drawDemon(t, s.final, s.kishin);
        break;
    }
    if (s.kind === 'angry' || s.kind === 'demon' || s.kind === 'loop') this.raf = requestAnimationFrame(() => this.draw());
  }

  /** 画面全体を塗る */
  private fillAll(style: string | CanvasGradient) {
    this.ctx.fillStyle = style;
    this.ctx.fillRect(0, 0, W, H);
  }

  /** 画面全体を円形のグラデーションで塗る */
  private fillRadial(cx: number, cy: number, r0: number, r1: number, stops: [number, string][]) {
    const g = this.ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    this.fillAll(g);
  }

  private drawDoorScene(visuals: string[]) {
    // 一枚絵の下に余る部分は床の色で埋める
    this.fillAll('#39424f');
    const composite = this.images.get('bg_door') !== null;
    this.drawImage('bg_door', DOOR_BG_RECT, false);
    if (!composite) {
      // 一枚絵が無いときだけ、廊下の灯りの雰囲気を足す
      this.fillRadial(180, 60, 10, 240, [
        [0, 'rgba(200,230,255,0.25)'],
        [1, 'rgba(200,230,255,0)'],
      ]);
    }
    for (const spot of ['hallway', 'door', 'window', 'nameplate', 'floor'] as SpotId[]) {
      // 一枚絵があればパーツは個別画像があるときだけ重ねる
      if (!composite || this.images.get(spot)) this.drawImage(spot, SPOT_RECTS[spot]);
    }
    for (const v of visuals) {
      if (WINDOW_OVERLAYS.has(v)) this.drawWindowGlass(v as ImageKey);
      const rect = OVERLAY_RECTS[v];
      if (rect && v in IMAGES) this.drawImage(v as ImageKey, rect);
    }
  }

  private drawAngry(t: number, image: ImageKey) {
    const loud = image !== 'wife_dark';
    this.fillAll(loud ? '#2a0505' : '#0d0d14');
    const shake = loud ? Math.min(1, t) * Math.sin(t * 40) * 3 : 0;
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
    if (loud) {
      // 画面の縁を赤く脈打たせる
      const a = 0.25 + Math.sin(t * 6) * 0.1;
      this.fillRadial(W / 2, H / 2, H * 0.3, H * 0.7, [
        [0, 'rgba(255,40,0,0)'],
        [1, `rgba(255,40,0,${a})`],
      ]);
    }
  }

  /**
   * 暴言を送った日の結末: 邪悪なオーラを放つ魔王化した妻。
   * wife_demon 画像が無いあいだは wife_angry を紫に染めて代用する。
   */
  private drawDemon(t: number, final = false, kishin = false) {
    const { ctx } = this;
    // 最終形態は紫ではなく血のような赤と黒。光線は倍の速さで、稲妻も多い。鬼神は燃えるような朱と金
    const pal = kishin
      ? { bg: '#120400', ray: ['rgba(255,110,0,0.3)', 'rgba(60,5,0,0.5)'], aura: [255, 120, 20], mid: 'rgba(170,30,0,0.45)', ember: 'rgba(255,200,60,0.9)', flash: '255,230,170', vig: 'rgba(20,3,0,0.9)', tint: 'rgba(200,60,10,0.85)' }
      : final
      ? { bg: '#0d0203', ray: ['rgba(200,10,30,0.28)', 'rgba(20,0,0,0.5)'], aura: [220, 20, 40], mid: 'rgba(120,0,10,0.4)', ember: 'rgba(255,60,40,0.85)', flash: '255,200,190', vig: 'rgba(15,0,0,0.9)', tint: 'rgba(170,20,30,0.85)' }
      : { bg: '#07020d', ray: ['rgba(120,20,190,0.22)', 'rgba(40,0,70,0.35)'], aura: [190, 60, 255], mid: 'rgba(90,0,150,0.35)', ember: 'rgba(200,90,255,0.8)', flash: '235,220,255', vig: 'rgba(10,0,20,0.85)', tint: 'rgba(110,40,180,0.85)' };
    this.fillAll(pal.bg);

    // 背後で回る闇の光線
    ctx.save();
    ctx.translate(W / 2, H * 0.42);
    ctx.rotate(t * (final ? 0.8 : 0.35));
    const rays = final ? 22 : 14;
    for (let i = 0; i < rays; i++) {
      ctx.rotate((Math.PI * 2) / rays);
      ctx.fillStyle = pal.ray[i % 2];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-40, -H);
      ctx.lineTo(40, -H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 脈打つオーラ
    const pulse = 0.55 + Math.sin(t * (final ? 9 : 5)) * 0.2;
    this.fillRadial(W / 2, H * 0.45, 30, H * 0.55, [
      [0, `rgba(${pal.aura.join(',')},${pulse})`],
      [0.5, pal.mid],
      [1, 'rgba(0,0,0,0)'],
    ]);

    // 妻（魔王）。震えは怒りより大きく
    const shake = Math.min(1, t) * Math.sin(t * 55) * (final ? 9 : 5);
    const dy = Math.cos(t * 47) * 2;
    const zoom = 1.02 + Math.min(t, 2) * 0.05;
    // 最終形態の絵が無ければ、いつもの魔王を赤黒く染めて代用する。鬼神の絵が無ければ、元の魔王を朱色に染めて代用
    const kishinKey: ImageKey = final ? 'wife_kishin_final' : 'wife_kishin';
    const key: ImageKey = kishin && this.images.get(kishinKey) ? kishinKey : final && this.images.get('wife_demon_final') ? 'wife_demon_final' : 'wife_demon';
    const demon = this.images.get(key);
    if (demon) {
      // 横幅いっぱい・縦は中央。上下の余白は回る光線とオーラが埋める
      const w = W * zoom;
      const h = (w * demon.naturalHeight) / demon.naturalWidth;
      const rect = { x: (W - w) / 2 + shake, y: (H - h) / 2 + dy, w, h };
      this.drawImage(key, rect);
      // 最終形態の絵が無いときは赤黒く染める
      if (kishin && key !== kishinKey) this.tint('rgba(255,140,60,1)', rect, `rgba(255,90,0,${0.2 + Math.sin(t * 7) * 0.08})`);
      else if (final && key === 'wife_demon') this.tint('rgba(255,70,70,1)', rect, `rgba(160,0,20,${0.18 + Math.sin(t * 9) * 0.08})`);
    } else {
      this.drawImage('wife_angry', { x: (W - W * zoom) / 2 + shake, y: (H - H * zoom) / 2 + dy, w: W * zoom, h: H * zoom });
      // 代用: 紫に染めて闇落ちさせる
      this.tint(pal.tint, FULL, `rgba(150,40,255,${0.15 + Math.sin(t * 5) * 0.08})`);
    }

    // 立ちのぼる闇の火の粉
    for (let i = 0; i < 40; i++) {
      const seed = i * 97.13;
      const x = (Math.sin(seed) * 0.5 + 0.5) * W + Math.sin(t * 2 + i) * 12;
      const y = H - (((t * (40 + (i % 7) * 12) + seed * 3) % (H + 40)));
      const size = 2 + (i % 4);
      ctx.fillStyle = i % 3 ? pal.ember : 'rgba(30,0,40,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // ときどき稲妻で画面が白く光る
    const phase = t % (final || kishin ? 1.1 : 2.3);
    if (phase < 0.12) {
      this.fillAll(`rgba(${pal.flash},${0.75 - phase * 6})`);
    }

    // 画面の縁を闇で締める
    this.fillRadial(W / 2, H / 2, H * 0.25, H * 0.75, [
      [0, 'rgba(0,0,0,0)'],
      [1, pal.vig],
    ]);
  }

  /** 絵を色で染める（rect を乗算で染め、画面全体に発光色を重ねる） */
  private tint(multiply: string, rect: Rect, screen: string) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = multiply;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'screen';
    this.fillAll(screen);
    ctx.restore();
  }

  /** 無限玄関ループ: 段階的に「異変」を足していく（8番出口オマージュ） */
  private drawLoop(level: number, t: number) {
    const { ctx } = this;
    ctx.save();
    // 5周目以降は画面が横にずれる
    if (level >= 5) ctx.translate(Math.sin(t * 23) * (level - 4) * 1.5, 0);
    this.drawDoorScene([]);
    ctx.restore();

    // 周を重ねるごとに赤黒く沈む
    this.fillAll(`rgba(60,0,10,${Math.min(0.45, level * 0.05)})`);
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
      this.fillAll('rgba(255,0,30,0.12)');
    }
  }

  /** 窓の絵のガラス部分だけを、今の窓のガラスに敷き詰める */
  private drawWindowGlass(key: ImageKey) {
    const img = this.images.get(key);
    if (!img) return;
    const r = WINDOW_GLASS;
    const g = WINDOW_ART_GLASS;
    const gw = img.naturalWidth * g.w;
    const gh = img.naturalHeight * g.h;
    const scale = Math.max(r.w / gw, r.h / gh);
    const sw = r.w / scale;
    const sh = r.h / scale;
    const sx = img.naturalWidth * g.x + (gw - sw) / 2;
    const sy = img.naturalHeight * g.y + (gh - sh) / 2;
    this.ctx.drawImage(img, sx, sy, sw, sh, r.x, r.y, r.w, r.h);
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
