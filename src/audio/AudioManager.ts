import { AUDIO_DIR, BGM, SE, type BgmKey, type SeKey } from '../assets/manifest';

const url = (file: string) => `${import.meta.env.BASE_URL}${AUDIO_DIR}${file}`;
const FADE_MS = 400;

/**
 * BGM / SE の再生管理。
 * - ブラウザの自動再生制限: 最初のユーザー操作（unlock）までは再生を保留し、解除時に BGM を流し直す
 * - BGM はループ。切替時はフェードアウト→フェードイン
 * - 音声ファイルが無ければ BGM は無音、SE は WebAudio の短いビープで代替
 */
export class AudioManager {
  private muted = false;
  private unlocked = false;
  private bgm: HTMLAudioElement | null = null;
  private bgmKey: BgmKey | null = null;
  private missing = new Set<string>();
  private ctx: AudioContext | null = null;

  get isMuted() {
    return this.muted;
  }

  /** ユーザー操作のイベントハンドラ内で呼ぶ */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = Ctx ? new Ctx() : null;
      void this.ctx?.resume();
    } catch {
      this.ctx = null;
    }
    this.resumeBgm();
  }

  /** 鳴らせずに待っていた BGM を鳴らし直す（音の解禁・ミュート解除のとき） */
  private resumeBgm() {
    const key = this.bgmKey;
    if (!key) return;
    this.bgmKey = null;
    this.playBgm(key);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.bgm) {
      if (!muted) this.resumeBgm();
      return;
    }
    if (muted) this.bgm.pause();
    else void this.bgm.play().catch(() => {});
  }

  playBgm(key: BgmKey) {
    if (this.bgmKey === key && (this.bgm || !this.unlocked || this.muted)) return;
    this.fadeOut(this.bgm);
    this.bgm = null;
    this.bgmKey = key;
    if (!this.unlocked || this.muted || this.missing.has(key)) return;

    const entry = BGM[key];
    const el = new Audio(url(entry.file));
    el.loop = true;
    el.volume = 0;
    el.addEventListener('error', () => {
      this.missing.add(key);
      if (this.bgm === el) this.bgm = null;
    });
    this.bgm = el;
    void el.play().then(
      () => this.fadeTo(el, entry.volume ?? 0.5),
      () => {},
    );
  }

  playSe(key: SeKey) {
    if (this.muted || !this.unlocked) return;
    const entry = SE[key];
    // ファイルが無い効果音はビープで代用
    const fallback = () => this.beep(entry.beep ?? 440, entry.volume ?? 0.3);
    if (this.missing.has(key)) return fallback();
    const el = new Audio(url(entry.file));
    el.volume = entry.volume ?? 0.5;
    el.addEventListener(
      'error',
      () => {
        this.missing.add(key);
        fallback();
      },
      { once: true },
    );
    void el.play().catch(() => {});
  }

  private beep(freq: number, volume: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  }

  private fadeTo(el: HTMLAudioElement, target: number, done?: () => void) {
    const start = el.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / FADE_MS);
      el.volume = start + (target - start) * k;
      if (k < 1) requestAnimationFrame(step);
      else done?.();
    };
    requestAnimationFrame(step);
  }

  private fadeOut(el: HTMLAudioElement | null) {
    if (el) this.fadeTo(el, 0, () => el.pause());
  }
}
