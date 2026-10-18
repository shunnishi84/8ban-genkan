// 画面遷移と入力の管理。ゲームのルールそのものは core/engine.ts にある。
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AudioManager } from '../audio/AudioManager';
import { ImageStore } from '../assets/loader';
import { IMAGES, ITEM_ICONS, type BgmKey, type ImageKey, type SeKey } from '../assets/manifest';
import {
  CANCEL_DEADLINE,
  COST,
  EXPRESS_DEADLINE,
  GOAL_DAYS,
  TRAVEL,
  WARN_TIME,
  formatTime,
  startTimeFor,
} from '../core/config';
import {
  advanceRun,
  buildDay,
  canSendChat,
  chatText,
  chatTimeline,
  drunkLevel,
  sentText,
  hasUnreadChat,
  newRun,
  perform,
  startDay,
  unresolvedCauses,
  visibleClues,
} from '../core/engine';
import { loadBest, saveBest } from '../core/save';
import { solve } from '../core/solver';
import type { Action, AppId, Cause, ItemDef, ClueLocation, DayState, Location, RunState, SlotId, SpotId } from '../core/types';
import { APP_BASE, APP_LABEL, CHAT_HISTORY, SLOT_BASE, SLOT_LABEL, SPOT_BASE, SPOT_LABEL } from '../data/base';
import { CHAT_TEMPLATES } from '../data/chat';
import { FINALES, FINALE_IDS, type Finale, type FinaleChoice, type FinaleCounter, type FinaleFx, type FinaleId, type FinaleLine } from '../data/finales';
import { ITEM_MAP, itemsAt } from '../data/items';
import { SCENARIO_MAP } from '../data/scenarios';
import { h, type Child } from './dom';
import { Renderer } from './renderer';

type Line = {
  who: 'me' | 'wife' | 'narr' | 'other';
  text: string;
  /** who が other のときの名札 */
  name?: string;
  /** 大きなカードで見せる文字（家庭裁判の証拠など） */
  card?: string;
  fx?: FinaleFx;
  testimony?: boolean;
  /** 家庭裁判の信頼度ゲージ（この行を出している間の値。lost は今削れた分） */
  gauge?: Gauge;
};

type Gauge = { label: string; now: number; max: number; lost?: number };

/** 逆転裁判風の吹き出し・帯の文字 */
const FX_TEXT: Partial<Record<FinaleFx, string>> = {
  objection: '異議あり！',
  holdit: '待った！',
  takethat: 'くらえ！',
  testimony: '〜 証言開始 〜',
  crossexam: '〜 尋問開始 〜',
};
const FX_SE: Partial<Record<FinaleFx, SeKey>> = {
  objection: 'se_objection',
  holdit: 'se_objection',
  takethat: 'se_objection',
  gavel: 'se_gavel',
  slam: 'se_slam',
  shock: 'se_slam',
  penalty: 'se_penalty',
  guilty: 'se_guilty',
};

type SceneSpec = Parameters<Renderer['setScene']>[0];

type Screen =
  | { name: 'title' }
  | { name: 'howto' }
  | { name: 'intro' }
  | { name: 'play' }
  | {
      name: 'talk';
      mood: 'angry' | 'home' | 'demon' | 'finale';
      late?: boolean;
      alone?: boolean;
      grudging?: boolean;
      /** 指定すると最初の行でこの背景にする。finale で省略すると直前の背景を引き継ぐ */
      scene?: SceneSpec;
      lines: Line[];
      index: number;
      after: () => void;
    }
  | { name: 'choice'; prompt: string; options: FinaleChoice[]; onPick: (o: FinaleChoice) => void; court?: boolean; gauge?: Gauge }
  | { name: 'loop'; level: number }
  /** ロボット大戦風の戦闘。step は今のコマ */
  | { name: 'battle'; finale: Finale; step: number; after: () => void }
  | { name: 'gameover'; reason: string; causes: Cause[]; finale?: FinaleId }
  | { name: 'clear' };

type Modal =
  | { kind: 'spot'; spot: SpotId }
  | { kind: 'items'; slot: SlotId }
  | { kind: 'phone'; app: AppId | null }
  | { kind: 'confirmDoor' }
  /** 拾ったものを大きく見せる（写真集の付箋のページなど） */
  | { kind: 'reveal'; title: string; image: string; text: string }
  | { kind: 'confirmQuit' };

const INTRO_FLAVOR = [
  '今日も飲み会だった……。',
  '「もう一軒だけ」が三軒になった。',
  '部長の武勇伝は今日も長かった。',
  '終電に滑り込んだ。セーフ。',
  '同期と語り合ってしまった。',
  '取引先との会食。断れなかった。',
  '送別会。泣いた。',
  '今日こそ早く帰るつもりだった。',
];

const DEMON_REASON = '暴言による魔王化';

const LOCATION_LABEL: Record<Location, string> = {
  door: '自宅の玄関前',
  town: '夜の街',
  konbini: 'コンビニ',
  trash: 'ゴミ捨て場',
  bench: '公園のベンチ',
};

export class Game {
  private ui: HTMLElement;
  private toastLayer: HTMLElement;
  private renderer: Renderer;
  private images: ImageStore;
  private audio = new AudioManager();
  private run: RunState = newRun();
  private day: DayState | null = null;
  private screen: Screen = { name: 'title' };
  private modal: Modal | null = null;
  /** 演出の効果音を鳴らし終えた行（同じ行を描き直しても二度鳴らさない） */
  private fxPlayed: Line | null = null;
  /** 戦闘のコマの効果音を鳴らし終えたか */
  private battlePlayed: unknown = null;
  /** 家庭裁判の最中（会話ウィンドウを法廷風にする） */
  private court = false;
  /** 魔王が最終形態 */
  private finalForm = false;
  /** 酔いの霧（画面全体に重ねる） */
  private fog: HTMLElement;
  private best = loadBest();
  private debug = new URLSearchParams(location.search).has('debug');

  constructor(private root: HTMLElement) {
    // 画像が届いたら Canvas を描き直し、UI 内のイラストも出すために DOM だけ作り直す
    let pending = 0;
    const images = new ImageStore(() => {
      this.renderer?.redraw();
      window.clearTimeout(pending);
      pending = window.setTimeout(() => this.ui && this.ui.replaceChildren(h('div', { class: 'view' }, this.view())), 50);
    });
    this.images = images;
    this.renderer = new Renderer(root, images, (spot) => this.onSpot(spot));
    this.ui = h('div', { class: 'ui' });
    this.toastLayer = h('div', { class: 'toasts' });
    this.fog = h('div', { class: 'drunk-fog' });
    root.append(this.ui, this.fog, this.toastLayer);
    // 自動再生制限: 最初の操作で音を解禁する
    const unlock = () => this.audio.unlock();
    root.addEventListener('pointerdown', unlock, { once: true });
    root.addEventListener('keydown', unlock, { once: true });
    // Android アプリ: 端末の「戻る」ボタン
    if (Capacitor.isNativePlatform()) void NativeApp.addListener('backButton', () => this.onBack());
    this.render();
  }

  // ================================================================ 遷移

  private go(screen: Screen) {
    if (screen.name !== this.screen.name) this.toastLayer.replaceChildren();
    this.screen = screen;
    this.modal = null;
    this.render();
  }

  private startRun() {
    this.run = newRun();
    this.beginDay();
  }

  private beginDay() {
    // ?debug&scenario=a,b で その日のシナリオを固定できる（シナリオ追加時の動作確認用）
    const forced = this.debug ? new URLSearchParams(location.search).get('scenario') : null;
    const scenarios = forced?.split(',').map((id) => SCENARIO_MAP[id]).filter(Boolean);
    this.day = scenarios?.length
      ? buildDay(this.run.day, scenarios, startTimeFor(this.run.day, Math.random()), Math.random())
      : startDay(this.run, Math.random);
    // ?debug&finale=court で、暴言4種コンプリート時のフィナーレを固定できる
    const finale = this.debug ? (new URLSearchParams(location.search).get('finale') as FinaleId | null) : null;
    const idx = finale ? FINALE_IDS.indexOf(finale) : -1;
    if (idx >= 0) this.day.seed = (idx + 0.5) / FINALE_IDS.length;
    this.go({ name: 'intro' });
  }

  private act(action: Action, se?: SeKey): boolean {
    const day = this.day;
    if (!day) return false;
    const before = day.time;
    const from = day.location;
    const r = perform(day, action);
    // 魔王城の結界などで場所が勝手に変わったら、開いていた画面を閉じて現在地を見せる
    if (action.type !== 'travel' && day.location !== from) this.modal = null;
    if (se && r.ok) this.audio.playSe(se);
    if (action.type === 'sendChat' && r.cost > COST.sendChat) this.audio.playSe('se_phone_call');
    if (r.messages.length || r.cost) this.toast(r.messages, day.time - before);

    switch (r.outcome.kind) {
      case 'late':
        this.gameOver('late', []);
        return false;
      case 'angry':
        this.gameOver('angry', r.outcome.causes);
        return false;
      case 'demon':
        this.demonEnding(r.outcome.lines);
        return false;
      case 'finale':
        this.playFinale(r.outcome.finale);
        return false;
      case 'home':
        this.goHome(r.outcome.lines);
        return false;
    }
    this.render();
    return r.ok;
  }

  private gameOver(kind: 'late' | 'angry', causes: Cause[]) {
    this.audio.playSe(kind === 'late' ? 'se_late' : 'se_door');
    window.setTimeout(() => this.audio.playSe('se_angry'), 250);
    const lines: Line[] =
      kind === 'late'
        ? [
            { who: 'narr', text: `時計の針は ${formatTime(this.day!.time)} を指していた。` },
            { who: 'wife', text: '……今、何時だと思ってるの？' },
            { who: 'wife', text: '午前1時、過ぎてるんだけど。' },
            { who: 'wife', text: '言い訳は、朝ごはんの時に聞きます。' },
          ]
        : [
            { who: 'narr', text: 'ガチャ……' },
            ...causes[0].angerLines.map((text) => ({ who: 'wife' as const, text })),
            ...(causes.length > 1
              ? [{ who: 'narr' as const, text: `さらに${causes.length - 1}件の火種が燃え上がった……！` }]
              : []),
          ];
    this.recordBest();
    this.go({
      name: 'talk',
      mood: 'angry',
      late: kind === 'late',
      lines,
      index: 0,
      after: () => this.go({ name: 'gameover', reason: kind === 'late' ? '遅すぎる帰宅' : '妻の怒り', causes }),
    });
  }

  /** 暴言を送っていた日: 火種に関係なく、ドアの向こうに魔王 */
  private demonEnding(demonLines: string[]) {
    this.audio.playSe('se_door');
    window.setTimeout(() => this.audio.playSe('se_demon'), 300);
    const alone = this.day!.homeAlone;
    const lines: Line[] = [
      ...(alone ? [{ who: 'narr' as const, text: '実家にいるはずの妻の靴が、玄関にある。' }] : []),
      { who: 'narr', text: 'ガチャ……' },
      { who: 'narr', text: '玄関の空気が、凍りついた。' },
      ...demonLines.map((text) => ({ who: 'wife' as const, text })),
      { who: 'narr', text: '妻は、人であることをやめた。' },
    ];
    this.recordBest();
    this.go({
      name: 'talk',
      mood: 'demon',
      lines,
      index: 0,
      after: () => this.go({ name: 'gameover', reason: DEMON_REASON, causes: [] }),
    });
  }

  // ---------------------------------------------------------------- フィナーレ（暴言4種コンプリート）

  private finaleScene(f: Finale): SceneSpec {
    if (f.scene === 'demon' || f.scene === 'loop') return { kind: 'demon', started: performance.now(), final: this.finalForm };
    return { kind: 'bg', image: f.scene, fallback: f.scene === 'bg_battle' ? 'bg_town' : 'bg_door_dark' };
  }

  /** 家庭裁判のカメラ: 話している人の席を映す（その絵が無ければ法廷全体） */
  private courtCamera(line: Line): SceneSpec {
    const n = line.name ?? '';
    const image: ImageKey =
      line.fx === 'guilty' || n.startsWith('裁判長')
        ? 'bg_court_judge'
        : n.startsWith('検察')
          ? 'bg_court_prosecutor'
          : n.startsWith('証人')
            ? 'bg_court_witness'
            : line.who === 'me'
              ? 'bg_court_defense'
              : 'bg_court';
    return { kind: 'bg', image, fallback: 'bg_court' };
  }

  /** 証拠の行を、送った暴言1件ずつのカードに展開する */
  private expand(lines: FinaleLine[]): Line[] {
    const insults = CHAT_TEMPLATES.filter((t) => t.insult);
    return lines.flatMap((l): Line[] =>
      l.evidence
        ? insults.map((t, i) => ({ who: 'other', name: l.name, text: `証拠第${i + 1}号。`, card: sentText(this.day!, t.id) }))
        : [{ who: l.who, name: l.name, text: l.text, fx: l.fx, testimony: l.testimony }],
    );
  }

  private playFinale(id: FinaleId) {
    const base = FINALES[id];
    // 缶ビール3本で暴言を送りきった日は、魔王が最終形態になっている
    const ff = base.finalForm && drunkLevel(this.day!) >= 3 ? base.finalForm : undefined;
    const f: Finale = ff && base.choice ? { ...base, intro: ff.intro, choice: { ...base.choice, ...ff } } : base;
    this.finalForm = !!ff;
    this.court = f.choice?.style === 'court';
    this.audio.playSe('se_door');
    window.setTimeout(() => this.audio.playSe('se_demon'), 300);
    this.recordBest();
    const end = () => this.go({ name: 'gameover', reason: f.title, causes: [], finale: id });
    const outro = (scene?: SceneSpec) =>
      f.outro.length ? this.go({ name: 'talk', mood: 'finale', scene, lines: this.expand(f.outro), index: 0, after: end }) : end();
    const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
    let hp = f.choice?.hp ?? 0;
    let last: FinaleCounter | undefined;
    const choice = () => {
      if (!f.choice) return outro();
      const c = f.choice;
      const court = c.style === 'court';
      // 家庭裁判はゲージを絵で出す。それ以外（魔王城）は文字で出す
      const gauge = (now: number, lost?: number): Gauge | undefined =>
        court && c.hp ? { label: c.gauge ?? 'こころのHP', now: Math.max(0, now), max: c.hp, lost } : undefined;
      const text = !court && c.hp ? `\n【あなたの ${c.gauge ?? 'こころのHP'}: ${Math.max(0, hp)} / ${c.hp}】` : '';
      this.go({
        name: 'choice',
        prompt: c.prompt + text,
        options: c.options,
        court,
        gauge: gauge(hp),
        onPick: (o) => {
          const before = hp;
          let lines = this.expand(pick(o.replies)).map((l) => ({ ...l, gauge: gauge(before) }));
          let next = () => (o.end ? outro() : choice());
          if (!o.end && c.counters?.length) {
            // 相手の反撃。1ターンごとに必ず返ってくる
            const counter = pick(c.counters.length > 1 ? c.counters.filter((x) => x !== last) : c.counters);
            last = counter;
            hp -= counter.damage;
            // ゲージは penalty の行で削れる（無ければ最初の行で）
            const hit = Math.max(0, counter.lines.findIndex((l) => l.fx === 'penalty'));
            lines = lines.concat(
              this.expand(counter.lines).map((l, i) => ({
                ...l,
                gauge: i < hit ? gauge(before) : gauge(hp, i === hit ? counter.damage : undefined),
              })),
            );
            if (hp <= 0) {
              lines = lines.concat(this.expand(c.knockout ?? []).map((l) => ({ ...l, gauge: gauge(hp) })));
              next = () => outro();
            }
          }
          this.go({ name: 'talk', mood: 'finale', lines, index: 0, after: next });
        },
      });
    };
    if (f.loop) {
      this.go({ name: 'loop', level: 1 });
      return;
    }
    const afterIntro = f.battle ? () => this.go({ name: 'battle', finale: f, step: 0, after: () => outro() }) : choice;
    this.go({ name: 'talk', mood: 'finale', scene: this.finaleScene(f), lines: this.expand(f.intro), index: 0, after: afterIntro });
  }

  /** 無限玄関ループ: ドアを開けるたびに1段ずつおかしくなる。最後は魔王 */
  private nextLoop(level: number) {
    const f = FINALES.loop;
    this.audio.playSe('se_door');
    if (level < f.loop!.length) {
      this.go({ name: 'loop', level: level + 1 });
      return;
    }
    window.setTimeout(() => this.audio.playSe('se_demon'), 300);
    this.go({
      name: 'talk',
      mood: 'finale',
      scene: { kind: 'demon', started: performance.now() },
      lines: this.expand(f.outro),
      index: 0,
      after: () => this.go({ name: 'gameover', reason: f.title, causes: [], finale: 'loop' }),
    });
  }

  private goHome(successLines: string[]) {
    this.audio.playSe('se_door');
    window.setTimeout(() => this.audio.playSe('se_success'), 300);
    const alone = this.day!.homeAlone;
    const grudging = this.day!.grudging;
    const asleep = this.day!.asleepLines;
    const lines: Line[] = asleep.length && !alone
      ? [
          // 妻は先に寝ている: 誰も出てこない。ほかの火種への一言は翌朝に聞く
          { who: 'me', text: 'ただいま……（小声）' },
          { who: 'narr', text: '……返事はない。妻は、もう寝ているようだ。' },
          ...asleep.map((text) => ({ who: 'narr' as const, text })),
          { who: 'narr', text: '……今日も、平穏な1日だった。' },
          ...(successLines.length ? [{ who: 'narr' as const, text: '──翌朝。' }, ...successLines.map((text) => ({ who: 'wife' as const, text }))] : []),
        ]
      : alone
      ? [
          { who: 'me', text: 'ただいま……' },
          { who: 'narr', text: 'シーン……。返事はない。' },
          ...successLines.map((text) => ({ who: 'narr' as const, text })),
        ]
      : [
          { who: 'me', text: 'ただいま……' },
          { who: 'wife', text: grudging ? '……おかえり。' : 'おかえり。' },
          ...successLines.map((text) => ({ who: 'wife' as const, text })),
        ];
    const cleared = advanceRun(this.run);
    this.recordBest();
    this.go({
      name: 'talk',
      mood: 'home',
      alone: alone || asleep.length > 0,
      grudging,
      lines,
      index: 0,
      after: () => (cleared ? this.go({ name: 'clear' }) : this.beginDay()),
    });
  }

  private recordBest() {
    if (saveBest(this.run.streak)) this.best = this.run.streak;
  }

  // ================================================================ 入力

  private onSpot(spot: SpotId) {
    if (this.screen.name !== 'play' || this.modal || this.day?.location !== 'door') return;
    this.audio.playSe('se_tap');
    this.act({ type: 'inspect', spot });
    this.modal = { kind: 'spot', spot };
    this.render();
  }

  /**
   * Android の「戻る」: 開いているものを1段閉じる。店からは街へ出る。
   * プレイ中はタイトルに戻るか確認し、タイトルではアプリを閉じる。
   */
  private onBack() {
    const m = this.modal;
    if (m) {
      if (m.kind === 'phone' && m.app) this.openModal({ kind: 'phone', app: null });
      else this.closeModal();
      return;
    }
    switch (this.screen.name) {
      case 'title':
        void NativeApp.exitApp();
        return;
      case 'howto':
      case 'gameover':
      case 'clear':
        this.go({ name: 'title' });
        return;
      case 'play': {
        const loc = this.day?.location;
        if (loc === 'konbini' || loc === 'trash' || loc === 'bench') this.travel('town');
        else this.openModal({ kind: 'confirmQuit' });
        return;
      }
      default:
        // 幕間・会話中は無視（会話はタップで進める）
        return;
    }
  }

  private openModal(modal: Modal, action?: Action) {
    this.audio.playSe('se_open');
    this.modal = modal;
    if (action) this.act(action);
    else this.render();
  }

  private closeModal() {
    this.modal = null;
    this.render();
  }

  private travel(to: Location) {
    this.audio.playSe('se_walk');
    this.modal = null;
    this.act({ type: 'travel', to });
  }

  private toast(messages: string[], minutes: number) {
    if (minutes > 0) {
      // 経過時間は時計の下にポップさせる
      const pop = h('div', { class: 'cost-pop' }, `+${minutes}分`);
      this.root.append(pop);
      window.setTimeout(() => pop.remove(), 1200);
    }
    if (messages.length === 0) return;
    const el = h('div', { class: 'toast' }, messages.join(' '));
    this.toastLayer.append(el);
    window.setTimeout(() => el.classList.add('out'), 2600);
    window.setTimeout(() => el.remove(), 3200);
  }

  // ================================================================ 描画

  private render() {
    this.syncScene();
    // 酔っているあいだは霧がかかって画面が揺れる（ビールの本数で強くなる）
    const s = this.screen.name;
    const level = this.day && ['intro', 'play', 'talk', 'choice', 'loop'].includes(s) ? drunkLevel(this.day) : 0;
    for (const n of [1, 2, 3]) this.root.classList.toggle(`drunk-${n}`, level === n);
    this.ui.replaceChildren(h('div', { class: 'view' }, this.view()));
  }

  private syncScene() {
    const s = this.screen;
    const day = this.day;
    let bgm: BgmKey = 'bgm_title';
    if (s.name === 'title' || s.name === 'howto') {
      this.renderer.setScene({ kind: 'title' });
    } else if (s.name === 'talk') {
      bgm = s.mood === 'demon' || s.mood === 'finale' ? 'bgm_demon' : s.mood === 'angry' ? 'bgm_angry' : 'bgm_home';
      if (s.mood === 'finale') {
        if (this.court) this.renderer.setScene(this.courtCamera(s.lines[s.index]));
        else if (s.index === 0 && s.scene) this.renderer.setScene(s.scene);
      } else if (s.index === 0) {
        this.renderer.setScene(
          s.mood === 'demon'
            ? { kind: 'demon', started: performance.now() }
            : s.mood === 'home'
            ? s.alone
              ? { kind: 'bg', image: 'bg_door_dark' }
              : { kind: 'home', grudging: s.grudging }
            : { kind: 'angry', started: performance.now(), image: s.late ? 'wife_dark' : 'wife_angry' },
        );
      }
    } else if (s.name === 'choice') {
      bgm = 'bgm_demon';
      // 尋問中は証言台を映す
      if (this.court) this.renderer.setScene({ kind: 'bg', image: 'bg_court_witness', fallback: 'bg_court' });
    } else if (s.name === 'battle') {
      bgm = 'bgm_demon';
    } else if (s.name === 'loop') {
      bgm = 'bgm_demon';
      this.renderer.setScene({ kind: 'loop', level: s.level, started: performance.now() });
    } else if (s.name === 'gameover') {
      const demon = s.reason === DEMON_REASON || !!s.finale;
      bgm = demon ? 'bgm_demon' : 'bgm_angry';
      // 魔王化・フィナーレのときは、結果画面の背後でもその場面が続く
      this.renderer.setScene(
        s.finale
          ? this.finaleScene(FINALES[s.finale])
          : demon
            ? { kind: 'demon', started: performance.now() }
            : { kind: 'bg', image: 'wife_suspicious' },
      );
    } else if (s.name === 'clear') {
      bgm = 'bgm_clear';
      this.renderer.setScene({ kind: 'clear' });
    } else if (s.name === 'intro') {
      bgm = 'bgm_door';
      this.renderer.setScene({ kind: 'bg', image: 'bg_door_dark' });
    } else if (day) {
      const loc = day.location;
      bgm = loc === 'door' ? 'bgm_door' : 'bgm_town';
      if (loc === 'door') {
        const picked = day.pickups.filter((p) => day.flags.has(`picked:${p.item}`)).map((p) => p.visual);
        const finaleVisuals = day.finale ? (FINALES[day.finale].doorVisuals ?? []) : [];
        this.renderer.setScene({ kind: 'door', visuals: [...day.visuals.filter((v) => !picked.includes(v)), ...finaleVisuals] });
      } else {
        const bg = ({ town: 'bg_town', konbini: 'bg_konbini', trash: 'bg_trash', bench: 'bg_bench' } as const)[loc];
        this.renderer.setScene({ kind: 'bg', image: bg });
      }
    }
    this.audio.playBgm(bgm);
  }

  private view(): Child[] {
    const s = this.screen;
    switch (s.name) {
      case 'title':
        return this.viewTitle();
      case 'howto':
        return this.viewHowto();
      case 'intro':
        return this.viewIntro();
      case 'play':
        return this.viewPlay();
      case 'talk':
        return this.viewTalk(s);
      case 'choice':
        return this.viewChoice(s);
      case 'loop':
        return this.viewLoop(s.level);
      case 'battle':
        return this.viewBattle(s);
      case 'gameover':
        return this.viewGameOver(s.reason, s.causes);
      case 'clear':
        return this.viewClear();
    }
  }

  private muteButton() {
    return h(
      'button',
      {
        class: 'icon-btn',
        'aria-label': this.audio.isMuted ? 'ミュート解除' : 'ミュート',
        onclick: (e: Event) => {
          e.stopPropagation();
          this.audio.setMuted(!this.audio.isMuted);
          this.render();
        },
      },
      this.audio.isMuted ? '🔇' : '🔊',
    );
  }

  private viewTitle(): Child[] {
    return [
      h('div', { class: 'hud' }, h('span'), this.muteButton()),
      h(
        'div',
        { class: 'center-card title-card' },
        h('div', { class: 'sign' }, h('span', { class: 'sign-no' }, '8'), h('span', {}, '番玄関')),
        this.illust('hero', 'hero'),
        h('p', { class: 'sub' }, '異変を見つけて、妻の怒りの火種をすべて消してからドアを開けろ。'),
        h('button', { class: 'btn primary', onclick: () => this.startRun() }, 'はじめる'),
        h('button', { class: 'btn', onclick: () => this.go({ name: 'howto' }) }, '遊び方'),
        h('p', { class: 'best' }, `最高連続帰宅: ${this.best} / ${GOAL_DAYS} 日`),
      ),
    ];
  }

  private viewHowto(): Child[] {
    return [
      h(
        'div',
        { class: 'center-card howto' },
        h('h2', {}, '遊び方'),
        h(
          'ul',
          {},
          h('li', {}, `${GOAL_DAYS}日連続で無事に帰宅できたらクリア。1度でも失敗したら1日目からやり直し。`),
          h('li', {}, '玄関前のドア・廊下・窓・表札・足元をタップして調べよう。持ち物とスマホも要チェック。'),
          h('li', {}, '「いつもと違う」ところが妻を怒らせる原因。引き返してコンビニ・ゴミ捨て場・通販で対処しよう。'),
          h('li', {}, '原因が残ったままドアを開けると……鬼が出る。'),
          h('li', {}, '異変がない日もある。紛らわしい「ニセ異変」に惑わされて引き返すと、時間だけが過ぎていく。'),
          h('li', {}, `行動するたびに時間が進む。午前1:00を過ぎたらアウト。通販の特急便（翌朝着）は ${formatTime(EXPRESS_DEADLINE)} 締切。`),
          h('li', {}, '6日目からは原因が2つ、最終日は3つ重なる。'),
        ),
        h('button', { class: 'btn primary', onclick: () => this.go({ name: 'title' }) }, '戻る'),
      ),
    ];
  }

  private hud(): HTMLElement {
    const day = this.day!;
    return h(
      'div',
      { class: 'hud' },
      h(
        'div',
        { class: 'hud-left' },
        h('b', {}, `${day.day}日目`),
        h('small', {}, `連続帰宅 ${this.run.streak}/${GOAL_DAYS}`),
        drunkLevel(day) ? h('small', { class: 'drunk-meter' }, `酔い ${'🍺'.repeat(drunkLevel(day))}`) : null,
      ),
      h('div', { class: `clock${day.time >= WARN_TIME ? ' warn' : ''}` }, formatTime(day.time)),
      this.muteButton(),
    );
  }

  private viewIntro(): Child[] {
    const day = this.day!;
    return [
      this.hud(),
      h(
        'div',
        { class: 'center-card intro', onclick: () => this.go({ name: 'play' }) },
        h('div', { class: 'sign' }, h('span', { class: 'sign-no' }, String(day.day)), h('span', {}, '日目')),
        this.illust('hero', 'hero'),
        h('p', {}, INTRO_FLAVOR[(day.day - 1) % INTRO_FLAVOR.length]),
        h('p', {}, `${formatTime(day.time)}、自宅の玄関前に着いた。`),
        h('p', { class: 'dim' }, 'タップで開始'),
      ),
    ];
  }

  // ---------------------------------------------------------------- プレイ中

  private viewPlay(): Child[] {
    const day = this.day!;
    const out: Child[] = [this.hud(), h('div', { class: 'location' }, LOCATION_LABEL[day.location])];
    if (this.debug) out.push(this.viewDebug());

    out.push(this.viewBar());
    // 店などのシートは下部バー（持ち物・スマホ）の上に出す
    if (day.location === 'konbini') out.push(this.viewKonbini());
    else if (day.location === 'trash') out.push(this.viewTrash());
    else if (day.location === 'bench') out.push(this.sheet('公園のベンチ', this.viewShop(), () => this.travel('town'), '街へ戻る'));

    if (this.modal) out.push(this.viewModal(this.modal));
    return out;
  }

  private viewDebug(): HTMLElement {
    const day = this.day!;
    const plan = unresolvedCauses(day).length ? solve(day) : [{ type: 'openDoor' }];
    return h(
      'div',
      { class: 'debug' },
      `[debug] ${day.scenarioIds.join(' + ')}\n未解消: ${unresolvedCauses(day).map((c) => c.title).join(', ') || 'なし'}\n解答例: ${
        plan?.map((a) => Object.values(a).join(':')).join(' → ') ?? '解なし'
      }`,
    );
  }

  private viewBar(): HTMLElement {
    const day = this.day!;
    const btn = (label: string, sub: string | null, onclick: () => void, cls = '') =>
      h('button', { class: `bar-btn ${cls}`, onclick }, label, sub ? h('small', {}, sub) : null);
    const common = [
      btn('持ち物', null, () => this.openModal({ kind: 'items', slot: 'bag' }, { type: 'openSlot', slot: 'bag' })),
      day.flags.has('phone_broken')
        ? btn('スマホ', '故障', () => this.openModal({ kind: 'phone', app: null }), 'badge')
        : btn('スマホ', hasUnreadChat(day) ? '● 未読' : null, () => this.openModal({ kind: 'phone', app: null }), hasUnreadChat(day) ? 'badge' : ''),
    ];
    const cost = (to: Location) => `${TRAVEL[day.location][to]}分`;
    if (day.location === 'door') {
      return h(
        'div',
        { class: 'bar' },
        common,
        day.finale && FINALES[day.finale].trap
          ? btn('引き返す', '結界', () => this.travel('town'), 'badge')
          : btn('引き返す', cost('town'), () => this.travel('town')),
        btn('ドアを開ける', null, () => this.openModal({ kind: 'confirmDoor' }), 'danger'),
      );
    }
    if (day.location === 'town') {
      return h(
        'div',
        { class: 'bar town' },
        btn('コンビニ', cost('konbini'), () => this.travel('konbini')),
        btn('ゴミ捨て場', cost('trash'), () => this.travel('trash')),
        btn('ベンチで通販', cost('bench'), () => this.travel('bench')),
        btn('家に戻る', cost('door'), () => this.travel('door'), 'primary'),
        common,
      );
    }
    return h('div', { class: 'bar' }, common);
  }

  private sheet(title: string, body: Child, onClose: () => void, closeLabel = '閉じる'): HTMLElement {
    const inTown = closeLabel !== '閉じる';
    return h(
      'div',
      { class: inTown ? 'sheet above-bar' : 'sheet' },
      h('div', { class: 'sheet-head' }, h('b', {}, title), h('button', { class: 'btn small', onclick: onClose }, closeLabel)),
      h('div', { class: 'sheet-body' }, body),
    );
  }

  /** 読み込めている画像だけ <img> にする（無ければ何も出さない） */
  private illust(key: string | undefined, cls: string): Child {
    if (!key || !(key in IMAGES)) return null;
    const img = this.images.get(key as ImageKey);
    return img ? h('img', { class: cls, src: img.src, alt: '' }) : null;
  }

  private clueTexts(at: ClueLocation, base: string): Child {
    const clues = visibleClues(this.day!, at);
    if (clues.length === 0) return base ? h('p', { class: 'desc' }, base) : null;
    return clues.map((c) => [this.illust(c.image, 'clue-img'), h('p', { class: 'desc' }, c.text)]);
  }

  private itemRow(item: ItemDef, sub: string, action: Child): HTMLElement {
    return h(
      'div',
      { class: 'item' },
      this.illust(ITEM_ICONS[item.id], 'item-icon'),
      h('div', { class: 'item-text' }, h('b', {}, item.name), h('small', {}, sub)),
      action,
    );
  }

  private viewModal(m: Modal): HTMLElement {
    const day = this.day!;
    switch (m.kind) {
      case 'spot': {
        const pickups = day.pickups.filter((p) => p.at === m.spot && !day.flags.has(`picked:${p.item}`));
        return this.sheet(
          SPOT_LABEL[m.spot],
          [
            this.clueTexts(`spot:${m.spot}`, SPOT_BASE[m.spot]),
            pickups.map((p) =>
              h(
                'button',
                {
                  class: 'btn',
                  onclick: () => {
                    if (!this.act({ type: 'pickup', item: p.item }, 'se_tap')) return;
                    if (p.reveal) this.openModal({ kind: 'reveal', ...p.reveal });
                    else this.closeModal();
                  },
                },
                `${p.label}（1分）`,
              ),
            ),
          ],
          () => this.closeModal(),
        );
      }
      case 'items':
        return this.sheet('持ち物', this.viewItems(m.slot), () => this.closeModal());
      case 'reveal':
        return this.sheet(
          m.title,
          [this.illust(m.image, 'reveal-img'), h('p', { class: 'desc' }, m.text)],
          () => this.closeModal(),
        );
      case 'phone':
        return this.viewPhone(m.app);
      case 'confirmDoor':
        return h(
          'div',
          { class: 'dialog-backdrop' },
          h(
            'div',
            { class: 'dialog' },
            h('p', {}, 'ドアを開ける？'),
            h('p', { class: 'dim' }, '火種が残っていたら……'),
            h(
              'div',
              { class: 'row' },
              h('button', { class: 'btn', onclick: () => this.closeModal() }, 'やめる'),
              h('button', { class: 'btn danger', onclick: () => this.act({ type: 'openDoor' }) }, '開ける'),
            ),
          ),
        );
      case 'confirmQuit':
        return h(
          'div',
          { class: 'dialog-backdrop' },
          h(
            'div',
            { class: 'dialog' },
            h('p', {}, 'タイトルに戻る？'),
            h('p', { class: 'dim' }, `今の連続帰宅（${this.run.streak}日）はここで途切れる。最高記録は残る。`),
            h(
              'div',
              { class: 'row' },
              h('button', { class: 'btn', onclick: () => this.closeModal() }, 'つづける'),
              h('button', { class: 'btn danger', onclick: () => this.go({ name: 'title' }) }, 'タイトルへ'),
            ),
          ),
        );
    }
  }

  private viewItems(slot: SlotId): Child {
    const day = this.day!;
    const tabs = (Object.keys(SLOT_LABEL) as SlotId[]).map((s) =>
      h(
        'button',
        {
          class: `tab${s === slot ? ' active' : ''}`,
          onclick: () => this.openModal({ kind: 'items', slot: s }, { type: 'openSlot', slot: s }),
        },
        SLOT_LABEL[s],
      ),
    );
    const items = day.inventory.map((id) => ITEM_MAP[id]).filter((i) => i && i.slot === slot);
    return [
      h('div', { class: 'tabs' }, tabs, h('button', { class: 'tab', onclick: () => this.openModal({ kind: 'phone', app: null }) }, 'スマホ')),
      slot === 'shirt' && day.flags.has('undressed')
        ? h('div', { class: 'paper' }, h('p', { class: 'desc' }, 'ワイシャツは脱いで手に持っている。今は肌着一枚だ。'))
        : this.clueTexts(`slot:${slot}`, SLOT_BASE[slot]),
      slot === 'shirt'
        ? h(
            'div',
            { class: 'row-actions' },
            day.flags.has('undressed')
              ? h('button', { class: 'btn small', onclick: () => this.act({ type: 'dress' }, 'se_tap') }, '着る（1分）')
              : h('button', { class: 'btn small', onclick: () => this.act({ type: 'undress' }, 'se_tap') }, '脱ぐ（1分）'),
          )
        : null,
      items.map((item) =>
        this.itemRow(
          item,
          item.desc,
          item.useLabel
            ? h('button', { class: 'btn small', onclick: () => this.act({ type: 'use', item: item.id }, 'se_tap') }, `${item.useLabel}（2分）`)
            : null,
        ),
      ),
    ];
  }

  // ---------------------------------------------------------------- スマホ

  private viewPhone(app: AppId | null): HTMLElement {
    const day = this.day!;
    if (day.flags.has('phone_broken')) {
      return h(
        'div',
        { class: 'phone broken' },
        h('div', { class: 'phone-head' }, h('button', { class: 'btn small', onclick: () => this.closeModal() }, '閉じる'), h('b', {}, '……'), h('span')),
        h(
          'div',
          { class: 'phone-body' },
          h('div', { class: 'crack' }),
          h('p', { class: 'broken-msg' }, 'この端末は、妻によって', h('br'), 'リモート初期化されました'),
        ),
      );
    }
    const back = app ? () => this.openModal({ kind: 'phone', app: null }) : () => this.closeModal();
    let body: Child;
    if (!app) {
      const notices = visibleClues(day, 'notice');
      body = [
        h('div', { class: 'lock-time' }, formatTime(day.time)),
        notices.map((n) => h('div', { class: 'notice' }, this.illust(n.image, 'clue-img'), n.text)),
        h(
          'div',
          { class: 'apps' },
          (Object.keys(APP_LABEL) as AppId[]).map((a) =>
            h(
              'button',
              { class: `app app-${a}`, onclick: () => this.openModal({ kind: 'phone', app: a }, { type: 'openApp', app: a }) },
              h('span', { class: 'app-icon' }, { chat: '💬', calendar: '📅', memo: '📝', shop: '🛒', sns: '📣' }[a]),
              APP_LABEL[a],
              a === 'chat' && hasUnreadChat(day) ? h('i', { class: 'dot' }) : null,
            ),
          ),
        ),
      ];
    } else if (app === 'chat') body = this.viewChat();
    else if (app === 'sns') body = this.viewSns();
    else if (app === 'shop') body = this.viewShop();
    else body = h('div', { class: `paper ${app}` }, this.clueTexts(`app:${app}`, APP_BASE[app]));

    return h(
      'div',
      { class: 'phone' },
      h('div', { class: 'phone-head' }, h('button', { class: 'btn small', onclick: back }, app ? '‹ 戻る' : '閉じる'), h('b', {}, app ? APP_LABEL[app] : 'スマホ'), h('span', { class: 'phone-clock' }, formatTime(day.time))),
      h('div', { class: 'phone-body' }, body),
    );
  }

  private viewChat(): Child {
    const day = this.day!;
    const bubble = (from: 'me' | 'wife', text: string, cls = '') => h('div', { class: `bubble ${from} ${cls}` }, text);
    const ME = '（あなた）';
    const provoke = CHAT_TEMPLATES.filter(
      (t) => (t.provokeLines || t.finale) && (canSendChat(day, t.id) || day.flags.has(`chat:${t.id}`)),
    );
    return [
      h(
        'div',
        { class: 'chat-log' },
        CHAT_HISTORY.map((m) => bubble(m.from, m.text, 'old')),
        chatTimeline(day).map((c) => {
          if (!c.text.startsWith(ME)) return bubble('wife', c.text, c.unread ? 'unread' : '');
          if (!c.unsendable) return bubble('me', c.text.slice(ME.length));
          // 誤爆メッセージ: 既読になる 0:00 まで（かつ追加で何か送るまで）は送信取消できる
          if (day.flags.has(`unsent:${c.id}`)) return h('div', { class: 'chat-system' }, 'メッセージの送信を取り消しました');
          const read = day.time > CANCEL_DEADLINE || day.flags.has(`readmsg:${c.id}`);
          return h(
            'div',
            { class: 'bubble-row me' },
            read
              ? h('small', { class: 'read-mark' }, '既読')
              : h('button', { class: 'btn small unsend', onclick: () => this.act({ type: 'unsend', clue: c.id! }, 'se_tap') }, '送信取消（2分）'),
            bubble('me', c.text.slice(ME.length)),
          );
        }),
        day.chatLog.map((m) =>
          m.image && this.images.get(m.image as ImageKey)
            ? h('div', { class: `bubble ${m.from} photo` }, this.illust(m.image, 'chat-photo'), m.text.replace(/^【写真】/, ''))
            : bubble(m.from, m.text),
        ),
      ),
      h(
        'div',
        { class: 'compose' },
        h('small', { class: 'dim' }, '定型文を送る（2分）'),
        // 送れない定型文は出さない（条件を満たしたら現れる）。送信済みは ✓ 付きで残す
        CHAT_TEMPLATES.filter((t) => !t.insult && !t.provokeLines && !t.finale && (canSendChat(day, t.id) || day.flags.has(`chat:${t.id}`))).map((t) => {
          const sent = day.flags.has(`chat:${t.id}`);
          return h(
            'button',
            {
              class: 'template',
              disabled: sent || !canSendChat(day, t.id),
              onclick: () => this.act({ type: 'sendChat', template: t.id }, 'se_send'),
            },
            sent ? `✓ ${sentText(day, t.id)}` : chatText(day, t),
          );
        }),
        provoke.length ? h('small', { class: 'insult-label' }, '😏 余計なひと言（※おすすめしない）') : null,
        provoke.map((t) => {
          const sent = day.flags.has(`chat:${t.id}`);
          return h(
            'button',
            {
              class: 'template insult',
              disabled: sent || !canSendChat(day, t.id),
              onclick: () => this.act({ type: 'sendChat', template: t.id }, 'se_send'),
            },
            sent ? `✓ ${sentText(day, t.id)}` : chatText(day, t),
          );
        }),
        h('small', { class: 'insult-label' }, '😤 感情のままに送る（※おすすめしない）'),
        CHAT_TEMPLATES.filter((t) => t.insult).map((t) => {
          const sent = day.flags.has(`chat:${t.id}`);
          return h(
            'button',
            {
              class: 'template insult',
              disabled: sent,
              onclick: () => this.act({ type: 'sendChat', template: t.id }, 'se_send'),
            },
            sent ? `✓ ${sentText(day, t.id)}` : chatText(day, t),
          );
        }),
      ),
    ];
  }

  /** SNS（つぶやきー）: 自分の炎上投稿は削除できる。それ以外は文字だけ */
  private viewSns(): Child {
    const day = this.day!;
    const clues = visibleClues(day, 'app:sns');
    if (clues.length === 0) return h('div', { class: 'paper sns' }, h('p', { class: 'desc' }, APP_BASE.sns));
    return h(
      'div',
      { class: 'sns-feed' },
      clues.map((c) => {
        if (!c.deletable) return h('div', { class: 'sns-post' }, h('p', { class: 'desc' }, c.text));
        const deleted = day.flags.has(`deleted:${c.id}`);
        return h(
          'div',
          { class: `sns-post mine${deleted ? ' deleted' : ''}` },
          deleted ? h('p', { class: 'desc' }, 'この投稿は削除されました') : h('p', { class: 'desc' }, c.text),
          deleted
            ? null
            : h('button', { class: 'btn small danger', onclick: () => this.act({ type: 'deletePost', clue: c.id! }, 'se_discard') }, '投稿を削除（2分）'),
        );
      }),
    );
  }

  private viewShop(): Child {
    const day = this.day!;
    const open = day.time <= EXPRESS_DEADLINE;
    const status = (id: string) => day.orders[id];
    return [
      h(
        'div',
        { class: `banner${open ? '' : ' closed'}` },
        open
          ? `⚡ 特急便: ${formatTime(EXPRESS_DEADLINE)}までのご注文で翌朝お届け（あと${EXPRESS_DEADLINE - day.time + 1}分）`
          : '本日の特急便の受付は終了しました。今からのご注文は明後日のお届けです。',
      ),
      this.clueTexts('app:shop', ''),
      itemsAt('mail').map((item) => {
        const st = status(item.id);
        return this.itemRow(
          item,
          `¥${item.price?.toLocaleString()}　${item.desc}`,
          st === 'express'
            ? h('span', { class: 'tag ok' }, '翌朝着')
            : st === 'late'
              ? h('span', { class: 'tag ng' }, '明後日着')
              : h('button', { class: 'btn small', onclick: () => this.act({ type: 'order', item: item.id }, 'se_order') }, '注文（3分）'),
        );
      }),
      Object.entries(day.orders).some(([, v]) => v === 'existing' || v === 'canceled')
        ? h(
            'div',
            { class: 'history' },
            h('b', {}, '注文履歴（発送準備中）'),
            Object.entries(day.orders)
              .filter(([, v]) => v === 'existing' || v === 'canceled')
              .map(([id, v]) =>
                h(
                  'div',
                  { class: 'item' },
                  h('div', {}, h('b', {}, ITEM_MAP[id]?.name ?? id), h('small', {}, `¥${ITEM_MAP[id]?.price?.toLocaleString()}　${ITEM_MAP[id]?.cancelNote ?? '0:00 発送処理'}`)),
                  v === 'canceled'
                    ? h('span', { class: 'tag' }, 'キャンセル済み')
                    : h(
                        'button',
                        {
                          class: 'btn small',
                          disabled: day.time > CANCEL_DEADLINE,
                          onclick: () => this.act({ type: 'cancelOrder', item: id }, 'se_tap'),
                        },
                        day.time > CANCEL_DEADLINE ? '発送済み' : 'キャンセル（2分）',
                      ),
                ),
              ),
          )
        : null,
    ];
  }

  // ---------------------------------------------------------------- 街

  private viewKonbini(): HTMLElement {
    return this.sheet(
      'コンビニ',
      [
        h('p', { class: 'dim' }, 'いらっしゃいませー（1点 2分）'),
        itemsAt('konbini').map((item) =>
          this.itemRow(
            item,
            `¥${item.price?.toLocaleString()}　${item.desc}`,
            h('button', { class: 'btn small', onclick: () => this.act({ type: 'buy', item: item.id }, 'se_buy') }, '買う'),
          ),
        ),
      ],
      () => this.travel('town'),
      '店を出る',
    );
  }

  private viewTrash(): HTMLElement {
    const day = this.day!;
    const items = day.inventory.map((id) => ITEM_MAP[id]).filter((i) => i?.discardable);
    return this.sheet(
      'ゴミ捨て場',
      [
        h('p', { class: 'dim' }, '集積所とコンビニ前のゴミ箱。（1点 1分）'),
        items.length === 0 ? h('p', { class: 'desc' }, '捨てられるものは持っていない。') : null,
        items.map((item) =>
          this.itemRow(
            item,
            item.desc,
            h('button', { class: 'btn small', onclick: () => this.act({ type: 'discard', item: item.id }, 'se_discard') }, '捨てる'),
          ),
        ),
      ],
      () => this.travel('town'),
      '街へ戻る',
    );
  }

  // ---------------------------------------------------------------- 結末

  private viewTalk(s: Extract<Screen, { name: 'talk' }>): Child[] {
    const line = s.lines[s.index];
    const next = () => {
      this.audio.playSe('se_tap');
      if (s.index + 1 < s.lines.length) this.go({ ...s, index: s.index + 1 });
      else s.after();
    };
    const who = line.name ?? { me: 'あなた', wife: '妻', narr: '', other: '' }[line.who];
    const fx = line.fx;
    if (fx && this.fxPlayed !== line) {
      // 演出の効果音は、その行を最初に出したときだけ
      this.fxPlayed = line;
      const se = FX_SE[fx];
      if (se) this.audio.playSe(se);
      if (fx === 'gavel') [260, 520].forEach((ms) => window.setTimeout(() => this.audio.playSe('se_gavel'), ms));
      if (fx === 'guilty') window.setTimeout(() => this.audio.playSe('se_guilty'), 600);
    }
    const guilty = fx === 'guilty';
    return [
      h(
        'div',
        { class: `talk ${s.mood}${s.mood === 'finale' && this.court ? ' court' : ''}${fx ? ` is-${fx}` : ''}`, onclick: next },
        line.gauge ? this.viewGauge(line.gauge) : null,
        fx && FX_TEXT[fx]
          ? fx === 'testimony' || fx === 'crossexam'
            ? h('div', { class: 'fx-banner' }, FX_TEXT[fx])
            : h('div', { class: `fx-bubble ${fx}` }, h('span', {}, FX_TEXT[fx]))
          : null,
        fx === 'gavel' ? h('div', { class: 'fx-gavel' }, ['カン！', 'カン！', 'カン！'].map((t) => h('span', {}, t))) : null,
        guilty ? h('div', { class: 'fx-guilty' }, h('span', {}, '有'), h('span', {}, '罪')) : null,
        line.card ? h('div', { class: 'evidence' }, h('small', {}, '送信済みメッセージ（スクリーンショット）'), h('p', {}, line.card)) : null,
        guilty
          ? null
          : h(
              'div',
              { class: `speech ${line.who}${line.testimony ? ' testimony' : ''}` },
              who ? h('b', {}, who) : null,
              h('p', {}, line.text),
              h('small', { class: 'dim' }, '▼ タップ'),
            ),
      ),
    ];
  }

  /** 逆転裁判風の信頼度ゲージ。lost があれば削れた分を赤く点滅させる */
  private viewGauge(g: Gauge): HTMLElement {
    const pct = (n: number) => `${(Math.max(0, n) / g.max) * 100}%`;
    return h(
      'div',
      { class: `gauge${g.lost ? ' hit' : ''}` },
      h('small', {}, g.label),
      h(
        'div',
        { class: 'gauge-bar' },
        h('i', { class: 'gauge-fill', style: `width:${pct(g.now)}` }),
        g.lost ? h('i', { class: 'gauge-lost', style: `left:${pct(g.now)};width:${pct(Math.min(g.lost, g.max - g.now))}` }) : null,
      ),
    );
  }

  private viewChoice(s: Extract<Screen, { name: 'choice' }>): Child[] {
    if (s.court) {
      // 逆転裁判風: 青いボタンを縦に並べる
      return [
        h(
          'div',
          { class: 'talk finale choice court' },
          s.gauge ? this.viewGauge(s.gauge) : null,
          h('div', { class: 'court-prompt' }, s.prompt),
          h(
            'div',
            { class: 'court-menu' },
            s.options.map((o) =>
              h('button', { class: 'court-cmd', onclick: () => (this.audio.playSe('se_tap'), s.onPick(o)) }, o.label),
            ),
          ),
        ),
      ];
    }
    return [
      h(
        'div',
        { class: 'talk finale choice' },
        h(
          'div',
          { class: 'speech narr rpg' },
          h('p', {}, s.prompt),
          h(
            'div',
            { class: 'rpg-menu' },
            s.options.map((o) =>
              h('button', { class: 'rpg-cmd', onclick: () => (this.audio.playSe('se_tap'), s.onPick(o)) }, `▶ ${o.label}`),
            ),
          ),
        ),
      ),
    ];
  }

  /**
   * ロボット大戦風の戦闘画面。上に両者の HP、中央に向かい合う機体、下にパイロットの顔とセリフ。
   * コマごとの演出（ミサイル・ノーダメージ・溜め・極太ビーム・撃墜）は CSS アニメーション。
   */
  private viewBattle(s: Extract<Screen, { name: 'battle' }>): Child[] {
    const b = s.finale.battle!;
    const step = b.steps[s.step];
    const hpAt = (i: number, who: 'hero' | 'wife'): number => {
      let hp = b[who].hp;
      for (const x of b.steps.slice(0, i + 1)) hp = (who === 'hero' ? x.heroHp : x.wifeHp) ?? hp;
      return hp;
    };
    if (this.battlePlayed !== step) {
      // 効果音はそのコマを最初に出したときだけ
      this.battlePlayed = step;
      const se = (key: SeKey, ms: number) => window.setTimeout(() => this.audio.playSe(key), ms);
      if (step.anim === 'attack') [0, 120, 240, 360, 480, 600].forEach((ms) => se('se_send', ms)), [900, 1050, 1200].forEach((ms) => se('se_slam', ms));
      if (step.anim === 'zero') se('se_tap', 0);
      if (step.anim === 'charge') se('se_demon', 0);
      if (step.anim === 'finisher') se('se_objection', 0), se('se_demon', 500), [900, 1150, 1400, 1650].forEach((ms) => se('se_slam', ms));
      if (step.anim === 'shotdown') [300, 700, 1100].forEach((ms) => se('se_guilty', ms));
    }
    const next = () => {
      this.audio.playSe('se_tap');
      if (s.step + 1 < b.steps.length) this.go({ ...s, step: s.step + 1 });
      else s.after();
    };
    const hpPanel = (who: 'hero' | 'wife') => {
      const u = b[who];
      const now = hpAt(s.step, who);
      const before = s.step > 0 ? hpAt(s.step - 1, who) : now;
      const pct = (n: number) => `${(n / u.hp) * 100}%`;
      return h(
        'div',
        { class: `b-hp is-${who}` },
        h('small', {}, u.unit),
        h(
          'div',
          { class: 'b-hp-bar' },
          h('i', {
            class: now < before ? 'drain' : '',
            style: `--from:${pct(before)};--to:${pct(now)};width:${pct(now)}`,
          }),
        ),
        h('b', {}, `HP ${now} / ${u.hp}`),
      );
    };
    const unit = (who: 'hero' | 'wife') =>
      h(
        'div',
        { class: `b-unit is-${who}` },
        this.illust(`robot_${who}`, 'b-unit-img') ?? h('div', { class: 'b-unit-box' }, b[who].unit),
      );
    const anim = step.anim ?? 'none';
    const fx: Child[] = [];
    // 主人公の機体のまわりに散らばる爆発の位置
    const BOOMS = [[72, 50], [60, 60], [78, 68], [56, 46], [68, 72], [64, 54], [74, 60]];
    const boom = (i: number, cls = 'boom') =>
      h('i', { class: cls, style: `--i:${i};--x:${BOOMS[i][0]}%;--y:${BOOMS[i][1]}%` });
    if (anim === 'attack') {
      fx.push([0, 1, 2, 3, 4, 5].map((i) => h('i', { class: 'missile', style: `--i:${i}` })));
      fx.push([0, 1, 2, 3].map((i) => h('i', { class: 'puff', style: `--i:${i}` })));
    }
    if (anim === 'charge') fx.push(h('i', { class: 'aura' }), h('i', { class: 'converge' }));
    if (anim === 'finisher') {
      fx.push(h('i', { class: 'beam' }));
      fx.push([0, 1, 2, 3, 4, 5].map((i) => boom(i)));
    }
    if (anim === 'shotdown') fx.push([0, 1, 2, 3, 4, 5, 6].map((i) => boom(i, 'boom big')));
    if (step.damage) fx.push(h('b', { class: `b-damage is-${step.damage.to}` }, String(step.damage.value)));
    const portrait =
      step.speaker === 'narr'
        ? null
        : (this.illust(`pilot_${step.speaker}`, 'b-face') ??
          this.illust(step.speaker === 'hero' ? 'hero' : 'wife_angry', 'b-face fallback'));
    return [
      h(
        'div',
        { class: `battle anim-${anim}${hpAt(s.step, 'hero') <= 0 ? ' hero-down' : ''}`, onclick: next },
        // 味方（主人公）は右、敵（妻）は左
        h('div', { class: 'b-hud' }, hpPanel('wife'), hpPanel('hero')),
        h('div', { class: 'b-field' }, unit('wife'), unit('hero'), fx),
        step.attackName ? h('div', { class: `b-attack is-${step.speaker}` }, step.attackName) : null,
        h(
          'div',
          { class: `b-msg is-${step.speaker}` },
          portrait,
          h(
            'div',
            {},
            step.speaker === 'narr' ? null : h('b', {}, b[step.speaker].pilot),
            h('p', {}, step.text),
            h('small', { class: 'dim' }, '▼ タップ'),
          ),
        ),
      ),
    ];
  }

  private viewLoop(level: number): Child[] {
    const f = FINALES.loop;
    const day = this.day!;
    return [
      h(
        'div',
        { class: 'hud' },
        h('div', { class: 'hud-left' }, h('b', {}, `${day.day}日目`), h('small', {}, '連続帰宅 ？/？')),
        h('div', { class: 'clock warn' }, '4:44'),
        this.muteButton(),
      ),
      h(
        'div',
        { class: 'talk finale loop' },
        h(
          'div',
          { class: 'speech narr' },
          h('p', {}, f.loop![level - 1]),
          h(
            'button',
            { class: 'btn danger', onclick: () => this.nextLoop(level) },
            level < f.loop!.length ? `ドアを開ける（${level}/${f.loop!.length}）` : '入る',
          ),
        ),
      ),
    ];
  }

  private viewGameOver(reason: string, causes: Cause[]): Child[] {
    return [
      h(
        'div',
        { class: 'center-card gameover' },
        h('h2', {}, 'GAME OVER'),
        h('p', {}, `原因: ${reason}`),
        causes.length ? h('ul', {}, causes.map((c) => h('li', {}, c.title))) : null,
        h('p', {}, `連続帰宅 ${this.run.streak} 日で途切れた……`),
        h('p', { class: 'best' }, `最高記録: ${this.best} / ${GOAL_DAYS} 日`),
        h('button', { class: 'btn primary', onclick: () => this.startRun() }, '1日目からやり直す'),
        h('button', { class: 'btn', onclick: () => this.go({ name: 'title' }) }, 'タイトルへ'),
      ),
    ];
  }

  private viewClear(): Child[] {
    return [
      h(
        'div',
        { class: 'center-card clear' },
        h('div', { class: 'sign' }, h('span', { class: 'sign-no' }, String(GOAL_DAYS)), h('span', {}, '番玄関')),
        h('h2', {}, `${GOAL_DAYS}日連続 無事帰宅！`),
        h('p', {}, '妻「最近、ちゃんとしてるじゃない」'),
        h('p', {}, 'あなたは家庭の平和を守り抜いた。……来週も飲み会が5件入っている。'),
        h('button', { class: 'btn primary', onclick: () => this.startRun() }, 'もう一度'),
        h('button', { class: 'btn', onclick: () => this.go({ name: 'title' }) }, 'タイトルへ'),
      ),
    ];
  }
}
