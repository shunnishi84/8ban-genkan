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
  hm,
  LOCKOUT_TIME,
  DAWN_TIME,
  MAX_DRUNK,
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
  finaleSeed,
  sentText,
  hasUnreadChat,
  keyless,
  KEY_RATTLED,
  onDay,
  newRun,
  perform,
  startDay,
  unresolvedCauses,
  visibleClues,
} from '../core/engine';
import { loadBest, loadEndings, loadSeen, saveBest, saveEnding, saveSeen } from '../core/save';
import { COLLECTION, SPECIAL_ENDINGS, collectible, collectionCount, collectionRate, endingId } from '../core/collection';
import { solve } from '../core/solver';
import type { Action, AppId, Cause, ChatTemplate, Speaker, ItemDef, ClueLocation, DayState, Location, PrankEnding, RunState, SlotId, SpotId } from '../core/types';
import { APP_BASE, APP_LABEL, CHAT_HISTORY, SLOT_BASE, SLOT_LABEL, SPOT_BASE, SPOT_LABEL } from '../data/base';
import { CHAT_MAP, CHAT_TEMPLATES } from '../data/chat';
import { FINALES, FINALE_IDS, type Finale, type FinaleChoice, type FinaleCounter, type FinaleFx, type FinaleId, type FinaleLine } from '../data/finales';
import { ITEM_MAP, itemsAt } from '../data/items';
import { POSTS } from '../data/posts';
import { PC_APPROVED } from '../data/pc';
import { ARRESTS } from '../data/arrests';
import { SCENARIO_MAP } from '../data/scenarios';
import { h, type Child } from './dom';
import { pick } from '../core/rng';
import { Renderer, type Scene } from './renderer';

type Line = {
  who: Speaker;
  text: string;
  /** who が other のときの名札 */
  name?: string;
  /** 大きなカードで見せる文字（家庭裁判の証拠など） */
  card?: string;
  /** この行で背景を切り替える（悪ふざけの結末など）。絵が無ければ bgFallback */
  bg?: string;
  bgFallback?: string;
  fx?: FinaleFx;
  testimony?: boolean;
  /** 家庭裁判の信頼度ゲージ（この行を出している間の値。lost は今削れた分） */
  gauge?: Gauge;
  /** この行で場面を切り替える（魔王が鬼神に変身するなど） */
  scene?: Scene;
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


type TalkScreen = {
  name: 'talk';
  mood: 'angry' | 'home' | 'demon' | 'finale' | 'prank';
  /** prank のときの BGM */
  bgm?: BgmKey;
  late?: boolean;
  alone?: boolean;
  grudging?: boolean;
  /** 怒り・帰宅の場面の妻の絵（酔った妻など） */
  image?: ImageKey;
  /** 指定すると最初の行でこの背景にする。finale で省略すると直前の背景を引き継ぐ */
  scene?: Scene;
  lines: Line[];
  index: number;
  after: () => void;
};

type Screen =
  | { name: 'title' }
  | { name: 'collection' }
  | { name: 'howto' }
  | { name: 'intro' }
  | { name: 'play' }
  | TalkScreen
  | { name: 'choice'; prompt: string; options: FinaleChoice[]; onPick: (o: FinaleChoice) => void; court?: boolean; gauge?: Gauge }
  | { name: 'loop'; level: number }
  /** ロボット大戦風の戦闘。step は今のコマ */
  | { name: 'battle'; finale: Finale; step: number; after: () => void }
  | { name: 'gameover'; reason: string; causes: Cause[]; finale?: FinaleId; demon?: boolean }
  | { name: 'clear' };

type Modal =
  | { kind: 'spot'; spot: SpotId }
  | { kind: 'items'; slot: SlotId }
  | { kind: 'phone'; app: AppId | null }
  | { kind: 'confirmDoor' }
  | { kind: 'confirmIntercom' }
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
/** スピリタスで画面がぐるぐる回って暗転するまでの時間 */
const COLLAPSE_SPIN_MS = 2800;

/** 0, 1, …, n-1 */
const range = (n: number) => [...Array(n).keys()];

/** 同じ話し手のセリフをまとめて会話の行にする */
const say = (who: Speaker, texts: string[]): Line[] => texts.map((text) => ({ who, text }));

/** 商品の値段と説明の1行 */
const priceLine = (item: ItemDef | undefined, note: string) => (item?.price ? `¥${item.price.toLocaleString()}　${note}` : note);

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
  /** 演出の効果音を鳴らし終えた行・戦闘のコマ（同じものを描き直しても二度鳴らさない） */
  private sePlayed: unknown = null;
  /** 横スクロール用につないだ戦闘背景（data URL） */
  private stripUrl: string | null = null;
  /** 家庭裁判の最中（会話ウィンドウを法廷風にする） */
  private court = false;
  /** 魔王が最終形態 */
  private finalForm = false;
  /** 魔王城で鬼のお面を使われて、魔王が鬼神になった */
  private kishin = false;
  /** 酔いの霧（画面全体に重ねる） */
  private fog: HTMLElement;
  private best = loadBest();
  /** 遭遇した異変（異変コレクション） */
  private seen = loadSeen();
  /** 見た特殊エンディング（異変コレクションの下の欄） */
  private endings = loadEndings();
  /** ?debug のときだけ URL のパラメータ（シナリオ・フィナーレ・時刻の固定）を読む */
  private debug = new URLSearchParams(location.search).has('debug') ? new URLSearchParams(location.search) : null;

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
    // ドアを開けた瞬間（帰宅・怒り・魔王・法廷など）に、酔いは一気にさめる。夫婦で宴会のときだけは飲み続ける
    const partying = screen.name === 'talk' && screen.image === 'drunk_party';
    const sobered = this.screen.name === 'play' && screen.name !== 'play' && !partying && !!this.day && drunkLevel(this.day) > 0;
    this.screen = screen;
    this.modal = null;
    this.render();
    if (sobered) this.toast(['……酔いが、一気にさめた。'], 0);
  }

  private startRun() {
    this.run = newRun();
    this.beginDay();
  }

  private beginDay() {
    // ?debug&scenario=a,b で その日のシナリオを固定できる（シナリオ追加時の動作確認用）
    // ただし前の日の続き（両親が本当に来る日）は、固定より優先する
    const forced = this.run.parentsDay === this.run.day ? null : this.debug?.get('scenario');
    const scenarios = forced?.split(',').map((id) => SCENARIO_MAP[id]).filter(Boolean);
    this.day = scenarios?.length
      ? buildDay(this.run.day, scenarios, startTimeFor(this.run.day, Math.random()), Math.random())
      : startDay(this.run, Math.random);
    // ?debug&scenario=pc_delivery は「相談してから買ったパソコンが届いた日」として始める
    if (scenarios?.some((sc) => sc.id === 'pc_delivery')) this.day.flags.add(PC_APPROVED);
    // デバッグで固定した日は数えない
    if (!scenarios?.length) saveSeen(this.seen, collectible(this.day.scenarioIds));
    // ?debug&finale=court で、暴言4種コンプリート時のフィナーレを固定できる
    const finale = this.debug?.get('finale') as FinaleId | null | undefined;
    if (finale && FINALE_IDS.includes(finale)) this.day.seed = finaleSeed(finale);
    // ?debug&time=26:05 で開始時刻を変えられる（深夜の締め出しの確認用）
    const time = this.debug?.get('time')?.split(':').map(Number);
    if (time?.length === 2) this.day.time = this.day.startTime = hm(time[0], time[1]);
    this.go({ name: 'intro' });
  }

  /** 効果音を少し遅らせて鳴らす（ms を並べると、その時刻ごとに鳴らす） */
  private playSeAt(key: SeKey, ...ms: number[]) {
    for (const t of ms) window.setTimeout(() => this.audio.playSe(key), t);
  }

  private act(action: Action, se?: SeKey): boolean {
    const day = this.day;
    if (!day) return false;
    const before = day.time;
    const from = day.location;
    const noticesBefore = day.clues.filter((c) => c.at === 'notice').length;
    const r = perform(day, action);
    // 通知が一気に何件も届いた（悪ふざけの嘘・バズ・家族会議の呼び出しなど）
    const fresh = day.clues.filter((c) => c.at === 'notice').slice(noticesBefore).map((c) => c.text);
    if (fresh.length >= 2 || fresh.some((t) => t.startsWith('📣'))) this.notificationFlood(fresh);
    // 魔王城の結界などで場所が勝手に変わったら、開いていた画面を閉じて現在地を見せる
    if (action.type !== 'travel' && day.location !== from) this.modal = null;
    if (se && r.ok) this.audio.playSe(se);
    if (action.type === 'sendChat' && r.cost > COST.sendChat) this.audio.playSe('se_phone_call');
    if (r.messages.length || r.cost) this.toast(r.messages, day.time - before);

    switch (r.outcome.kind) {
      case 'late':
      case 'dawn':
      case 'angry':
        if (r.outcome.kind === 'angry' && r.outcome.fakeAsleep) this.fakeAsleep(r.outcome.fakeAsleep, r.outcome.causes);
        else if (r.outcome.kind === 'angry' && r.outcome.fakeHome) this.fakeHome(r.outcome.fakeHome, r.outcome.causes);
        else this.gameOver(r.outcome.kind, r.outcome.kind === 'angry' ? r.outcome.causes : [], r.outcome.kind === 'angry' && r.outcome.morning);
        return false;
      case 'demon':
        this.demonEnding(r.outcome.lines, r.outcome.reason);
        return false;
      case 'finale':
        this.playFinale(r.outcome.finale);
        return false;
      case 'home':
        this.goHome(r.outcome.lines, r.outcome.special);
        return false;
      case 'prank':
        this.recordEnding(endingId('prank', r.outcome.template));
        this.prankEnding(r.outcome.template);
        return false;
      case 'collapse':
        this.recordEnding(endingId('collapse', r.outcome.item));
        this.collapseEnding(r.outcome.item);
        return false;
      case 'arrest':
        this.recordEnding(endingId('arrest', r.outcome.ending));
        this.playEnding(ARRESTS[r.outcome.ending]);
        return false;
    }
    this.render();
    return r.ok;
  }

  /** 特殊エンディングを見たことを記録する（デバッグ中は数えない） */
  private recordEnding(id: string) {
    if (!this.debug) saveEnding(this.endings, id);
  }

  /** いったん普通に迎えられて、帰宅成功かと思ったところで鬼になる（鬼のお面を持って帰った日） */
  private fakeHome(successLines: string[], causes: Cause[]) {
    this.audio.playSe('se_door');
    this.playSeAt('se_success', 300);
    const lines: Line[] = [
      { who: 'me', text: 'ただいま……' },
      { who: 'wife', text: 'おかえり。' },
      ...say('wife', successLines),
      { who: 'wife', text: '……あら？ 何買ってきたの？' },
      { who: 'narr', text: '鞄から、赤鬼のお面がはみ出していた。' },
    ];
    this.talk('home', lines, () => this.gameOver('angry', causes, false, true));
  }

  /** 妻が先に寝ていた日に鬼のお面を持って帰った: その夜は平穏、翌朝に見つかる */
  private fakeAsleep(asleepLines: string[], causes: Cause[]) {
    this.audio.playSe('se_door');
    const lines: Line[] = [
      { who: 'me', text: 'ただいま……（小声）' },
      { who: 'narr', text: '……返事はない。妻は、もう寝ているようだ。' },
      ...say('narr', asleepLines),
      { who: 'narr', text: '鞄をテーブルに置いて、そのまま寝てしまった。' },
      { who: 'narr', text: '──翌朝。' },
      { who: 'wife', text: '……ねえ。起きて。' },
      { who: 'narr', text: '目を開けると、赤鬼のお面をかぶった妻が、枕元に立っていた。' },
      { who: 'wife', text: '……似合う？' },
    ];
    this.talk('home', lines, () => this.gameOver('angry', causes, false, true), { alone: true });
  }

  /** inside: もう玄関の中で迎えられたあと（ドアの音と「ガチャ……」を出さない） */
  private gameOver(kind: 'late' | 'dawn' | 'angry', causes: Cause[], morning = false, inside = false) {
    this.recordEnding(endingId('normal', kind));
    if (!inside) this.audio.playSe(kind === 'angry' ? 'se_door' : 'se_late');
    this.playSeAt('se_angry', 250);
    const spoken = causes.slice(1).filter((c) => c.alwaysSay);
    const unspoken = causes.length - 1 - spoken.length;
    const lines: Line[] =
      kind === 'dawn'
        ? [
            { who: 'narr', text: 'チュンチュン……。空が、すっかり明るい。' },
            { who: 'narr', text: 'ガチャ。……チェーンが、外れた。' },
            { who: 'wife', text: '……おはよう。' },
            { who: 'wife', text: '朝の6時。新聞と一緒に帰ってくる夫って、どうなの？' },
            { who: 'wife', text: 'もっと早く帰ってきなさい！！' },
            { who: 'wife', text: '……シャワー浴びて、そのまま会社に行ってらっしゃい。' },
          ]
        : kind === 'late'
        ? [
            { who: 'narr', text: `時計の針は ${formatTime(this.day!.time)} を指していた。` },
            { who: 'wife', text: '……今、何時だと思ってるの？' },
            { who: 'wife', text: '午前1時、過ぎてるんだけど。' },
            { who: 'wife', text: '言い訳は、朝ごはんの時に聞きます。' },
          ]
        : [
            // 酔って寝落ちした妻は何も聞かなかったが、翌朝、残っていた証拠を見つけた
            ...(morning
              ? say('narr', ['玄関で、妻が寝落ちしていた。……今夜は、何も聞かれなかった。', '──翌朝。', '妻は、玄関に残っていた「証拠」を見つけてしまった。'])
              : inside
                ? []
                : [{ who: 'narr' as const, text: this.day!.flags.has(KEY_RATTLED) ? 'ガチャガチャガチャ！ ……バンッ！ 内側から、勢いよくドアが開いた。' : this.day!.flags.has('rang') ? 'ピンポーン……' : 'ガチャ……' }]),
            ...say('wife', causes[0].angerLines),
            // 続けて言わずにいられない火種（空気の読めない相談など）は、セリフごと足す
            ...spoken.flatMap((c) => say('wife', c.angerLines)),
            ...(unspoken > 0 ? [{ who: 'narr' as const, text: `さらに${unspoken}件の火種が燃え上がった……！` }] : []),
          ];
    const reason = { dawn: '朝帰り', late: '遅すぎる帰宅', angry: '妻の怒り' }[kind];
    this.talk('angry', lines, this.toGameOver(reason, { causes }), {
      late: kind !== 'angry',
      image: causes[0]?.angerImage as ImageKey | undefined,
    });
  }

  /** 暴言を送っていた日: 火種に関係なく、ドアの向こうに魔王 */
  private demonEnding(demonLines: string[], reason = DEMON_REASON) {
    this.recordEnding(endingId('normal', 'demon'));
    this.audio.playSe('se_door');
    this.playSeAt('se_demon', 300);
    const alone = this.day!.homeAlone;
    const lines: Line[] = [
      ...(alone ? [{ who: 'narr' as const, text: '実家にいるはずの妻の靴が、玄関にある。' }] : []),
      ...(this.day!.flags.has(KEY_RATTLED)
        ? say('narr', ['ガチャガチャガチャ！', 'バンッ！ ……内側から、勢いよくドアが開いた。'])
        : this.day!.flags.has('rang')
          ? say('narr', ['ピンポーン……', 'ガチャ……と、内側からドアが開いた。'])
          : say('narr', ['ガチャ……'])),
      { who: 'narr', text: '玄関の空気が、凍りついた。' },
      ...say('wife', demonLines),
      { who: 'narr', text: '妻は、人であることをやめた。' },
    ];
    this.talk('demon', lines, this.toGameOver(reason, { demon: true }));
  }

  /** 酔った勢いの悪ふざけを送っていた日: 送った文面ごとの結末 */
  private prankEnding(templateId: string) {
    this.audio.playSe('se_door');
    this.playEnding(CHAT_MAP[templateId].prankEnding!);
  }

  /** 強すぎる酒（スピリタス）: 画面がぐるぐる回って暗転し、病院で目を覚ます */
  private collapseEnding(itemId: string) {
    const e = ITEM_MAP[itemId].collapse!;
    this.modal = null;
    this.render();
    this.root.classList.add('collapse-spin');
    window.setTimeout(() => {
      this.root.classList.remove('collapse-spin');
      this.audio.playSe('se_angry');
      this.playEnding(e);
    }, COLLAPSE_SPIN_MS);
  }

  /** 悪ふざけ・病院送り・交番などの、1本道の結末を流してゲームオーバーへ */
  private playEnding(e: PrankEnding) {
    this.talk('prank', e.lines, this.toGameOver(e.title), {
      bgm: e.bgm,
      scene: { kind: 'bg', image: e.scene as ImageKey, fallback: e.fallback as ImageKey },
    });
  }

  // ---------------------------------------------------------------- フィナーレ（暴言4種コンプリート）

  private finaleScene(f: Finale): Scene {
    if (f.scene === 'demon' || f.scene === 'loop') return { kind: 'demon', final: this.finalForm, kishin: this.kishin };
    return { kind: 'bg', image: f.scene, fallback: f.scene === 'bg_battle' ? 'bg_town' : 'bg_door_dark' };
  }

  /** 家庭裁判のカメラ: 話している人の席を映す（その絵が無ければ法廷全体） */
  private courtCamera(line: Line): Scene {
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
    const insults = CHAT_TEMPLATES.filter((t) => t.insult && this.day!.insultIds.includes(t.id));
    return lines.flatMap((l): Line[] =>
      l.evidence
        ? insults.map((t, i) => ({ who: 'other', name: l.name, text: `証拠第${i + 1}号。`, card: sentText(this.day!, t.id) }))
        : [
            {
              who: l.who,
              name: l.name,
              text: l.text,
              fx: l.fx,
              testimony: l.testimony,
              // 鬼神に変身する行で、背景の魔王を切り替える
              scene: l.transform ? { kind: 'demon' as const, final: this.finalForm, kishin: true } : undefined,
            },
          ],
    );
  }

  private playFinale(id: FinaleId) {
    const base = FINALES[id];
    // 缶ビール3本で暴言を送りきった日は、魔王が最終形態になっている
    const ff = base.finalForm && drunkLevel(this.day!) >= 3 ? base.finalForm : undefined;
    // つぶやきーで3つともバズらせた日は、その話から始まる
    const intro = ff && this.day!.flags.has('finale_by_tweet') ? (ff.tweetIntro ?? ff.intro) : ff?.intro;
    const f: Finale = ff && intro && base.choice ? { ...base, intro, choice: { ...base.choice, ...ff } } : base;
    this.finalForm = !!ff;
    this.kishin = false;
    this.recordEnding(endingId('finale', ff ? `${id}_final` : id));
    this.court = f.choice?.style === 'court';
    this.audio.playSe('se_door');
    this.playSeAt('se_demon', 300);
    const outro = () => this.finaleOutro(f);
    let hp = f.choice?.hp ?? 0;
    let last: FinaleCounter | undefined;
    // スピリタスを飲ませてしまうと、魔王が酔っぱらって凶暴化する
    let drunkDemon = false;
    // tools: 「どうぐ」を選んで、お酒を持っていたときの持ち物メニュー
    const choice = (tools = false) => {
      if (!f.choice) return outro();
      const c = f.choice;
      const court = c.style === 'court';
      // 家庭裁判はゲージを絵で出す。それ以外（魔王城）は文字で出す
      const gauge = (now: number, lost?: number): Gauge | undefined =>
        court && c.hp ? { label: c.gauge ?? 'こころのHP', now: Math.max(0, now), max: c.hp, lost } : undefined;
      const text = !court && c.hp ? `\n【あなたの ${c.gauge ?? 'こころのHP'}: ${Math.max(0, hp)} / ${c.hp}】` : '';
      // お酒は「どうぐ」の中。持っているものだけ出る
      const inventory = this.day!.inventory;
      const toolsOption = c.options.find((o) => o.tools);
      const held = c.options.filter((o) => o.item && inventory.includes(o.item));
      const back: FinaleChoice = { label: 'もどる', replies: [] };
      const options = tools && toolsOption
        ? [...held, { label: 'ポケットを さぐる', replies: toolsOption.replies }, back]
        : c.options.filter((o) => !o.item);
      this.go({
        name: 'choice',
        prompt: (tools ? 'どの　どうぐを　つかう？' : c.prompt) + text,
        options,
        court,
        gauge: gauge(hp),
        onPick: (o) => {
          if (o === back) return choice();
          if (o.tools && held.length) return choice(true);
          const before = hp;
          if (o.kishin) {
            this.kishin = true;
            this.recordEnding(endingId('finale', this.finalForm ? `${id}_final_kishin` : `${id}_kishin`));
          }
          const replies = this.finalForm && o.finalReplies ? o.finalReplies : o.replies;
          let lines = this.expand(pick(Math.random, replies)).map((l) => ({ ...l, gauge: gauge(before) }));
          let next = () => (o.end ? outro() : choice());
          if (o.item) inventory.splice(inventory.indexOf(o.item), 1);
          if (o.enrage) drunkDemon = true;
          // 鬼神 ＞ 酔った魔王 ＞ いつもの魔王 の順に強い反撃
          const counters = this.kishin && c.kishinCounters?.length ? c.kishinCounters : drunkDemon && c.drunkCounters?.length ? c.drunkCounters : c.counters;
          if (o.selfDamage) {
            // 反撃の代わりに、一発で大ダメージ
            hp -= o.selfDamage;
            lines = lines.map((l, i, all) => (i === all.length - 1 ? { ...l, gauge: gauge(hp, o.selfDamage) } : l));
            if (hp <= 0) {
              lines = lines.concat(this.expand(c.knockout ?? []).map((l) => ({ ...l, gauge: gauge(hp) })));
              next = () => outro();
            }
          } else if (!o.end && counters?.length) {
            // 相手の反撃。1ターンごとに必ず返ってくる
            const counter = pick(Math.random, counters.length > 1 ? counters.filter((x) => x !== last) : counters);
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
          this.talk('finale', lines, next);
        },
      });
    };
    if (f.loop) {
      this.go({ name: 'loop', level: 1 });
      return;
    }
    const afterIntro = f.battle ? () => this.go({ name: 'battle', finale: f, step: 0, after: outro }) : choice;
    this.talk('finale', this.expand(f.intro), afterIntro, { scene: this.finaleScene(f) });
  }

  /** 無限玄関ループ: ドアを開けるたびに1段ずつおかしくなる。最後は魔王 */
  private nextLoop(level: number) {
    const f = FINALES.loop;
    this.audio.playSe('se_door');
    if (level < f.loop!.length) {
      this.go({ name: 'loop', level: level + 1 });
      return;
    }
    this.playSeAt('se_demon', 300);
    this.finaleOutro(f, this.finaleScene(f));
  }

  private goHome(successLines: string[], special?: 'drunk' | 'reset' | 'party') {
    if (special === 'party') this.recordEnding(endingId('party'));
    this.audio.playSe('se_door');
    this.playSeAt('se_success', 300);
    const alone = this.day!.homeAlone;
    const grudging = this.day!.grudging && !special;
    const asleep = this.day!.asleepLines;
    const image: ImageKey | undefined =
      special === 'party' ? 'drunk_party' : special === 'reset' ? 'wife_drunk_sleep' : special === 'drunk' ? 'wife_drunk_amae' : undefined;
    const lines: Line[] = special === 'party'
      ? [
          // 夫婦そろって酔っ払い: 火種はうやむや
          { who: 'narr', text: 'ガチャ……' },
          { who: 'wife', text: 'あ〜〜！ おかえり〜〜！ のんでる〜？' },
          { who: 'me', text: 'のんでる〜〜！' },
          { who: 'wife', text: 'かんぱ〜〜い！！' },
          ...say('narr', ['玄関で、夫婦の二次会が始まった。', '火種のことなんて、二人とも、もう覚えていない。', '──翌朝。', '二人そろって、ひどい二日酔いだった。']),
        ]
      : special === 'reset'
      ? [
          // 妻は玄関で寝落ち。話は何も覚えていない
          { who: 'me', text: 'ただいま……' },
          ...say('narr', ['玄関で、妻が寝落ちしていた。', 'ワイングラスを抱えたまま、幸せそうにいびきをかいている。']),
          { who: 'wife', text: 'ん〜……おかえり〜……なんか、おこってたきがする……けど……わすれた……zzz' },
          { who: 'narr', text: '……今夜は、何も聞かれなかった。' },
        ]
      : asleep.length && !alone
      ? [
          // 妻は先に寝ている: 誰も出てこない。ほかの火種への一言は翌朝に聞く
          { who: 'me', text: 'ただいま……（小声）' },
          { who: 'narr', text: '……返事はない。妻は、もう寝ているようだ。' },
          ...say('narr', asleep),
          { who: 'narr', text: '……今日も、平穏な1日だった。' },
          ...(successLines.length ? [{ who: 'narr' as const, text: '──翌朝。' }, ...say('wife', successLines)] : []),
        ]
      : alone
      ? [
          { who: 'me', text: 'ただいま……' },
          { who: 'narr', text: 'シーン……。返事はない。' },
          ...say('narr', successLines),
          // 妻がいないうちに、買ってしまった鬼のお面を隠す
          ...(this.day!.inventory.includes('oni_mask') ? [{ who: 'narr' as const, text: '……鬼のお面は、妻が帰ってくる前に、押し入れの一番奥に封印した。' }] : []),
        ]
      : [
          { who: 'me', text: 'ただいま……' },
          { who: 'wife', text: special === 'drunk' ? 'おかえり〜〜♡ ひっく' : grudging ? '……おかえり。' : 'おかえり。' },
          ...say('wife', successLines),
        ];
    const cleared = advanceRun(this.run, this.day!);
    // 連続帰宅が伸びるのは帰宅できたときだけなので、最高記録の更新もここだけ
    if (saveBest(this.run.streak)) this.best = this.run.streak;
    this.talk('home', lines, () => (cleared ? this.go({ name: 'clear' }) : this.beginDay()), {
      // 寝落ちの妻の絵が無いあいだは、暗い玄関で代用（笑顔の妻が立っているのはおかしいので）
      alone: special === 'reset' ? !this.images.get('wife_drunk_sleep') : (alone || asleep.length > 0) && !image,
      grudging,
      image,
    });
  }

  /** 会話画面を最初の行から始める */
  private talk(mood: TalkScreen['mood'], lines: Line[], after: () => void, extra: Partial<TalkScreen> = {}) {
    this.go({ name: 'talk', mood, lines, index: 0, after, ...extra });
  }

  /** 会話のあとにゲームオーバー画面へ */
  private toGameOver(reason: string, extra: Partial<Extract<Screen, { name: 'gameover' }>> = {}) {
    return () => this.go({ name: 'gameover', reason, causes: [], ...extra });
  }

  /** フィナーレの締め（outro があれば見せてからゲームオーバー） */
  private finaleOutro(f: Finale, scene?: Scene) {
    const end = this.toGameOver(f.title, { finale: f.id });
    if (f.outro.length) this.talk('finale', this.expand(f.outro), end, { scene });
    else end();
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
      case 'collection':
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
    const trapped = !!this.day?.finale && !!FINALES[this.day.finale].trap;
    const moved = this.act({ type: 'travel', to });
    // 魔王城の結界に弾かれた: 白い光がはじけて、画面が跳ね返される
    if (trapped && !moved) this.barrierFlash();
  }

  /** 通知のバナーが画面上部に次々と降ってくる。件数が少なければ似た通知で水増しして「鳴りやまない」感じにする */
  private notificationFlood(texts: string[]) {
    const calls = texts.some((t) => t.startsWith('📞'));
    const filler = calls
      ? ['📞 不在着信（妻）', '📞 不在着信（妻）', '💬 妻: 電話に出て！！', '📞 不在着信（妻）', '💬 妻: どこにいるの！？']
      : ['🔁 あなたの投稿がリポストされました', '♥ あなたの投稿に「いいね」されました', '💬 返信: 「奥さん見てますよ」', '🔁 あなたの投稿がリポストされました', '💬 返信: 「これ特定されてない？」', '♥ あなたの投稿に「いいね」されました'];
    const list = [...texts];
    for (let i = 0; list.length < 9; i++) list.splice(Math.min(list.length, 1 + i * 2), 0, filler[i % filler.length]);
    const layer = h('div', { class: 'notif-flood' }, list.map((t, i) => h('div', { class: 'notif-banner', style: `animation-delay: ${i * 0.22}s` }, t)));
    this.root.append(layer);
    window.setTimeout(() => layer.remove(), list.length * 220 + 2600);
    for (let i = 0; i < Math.min(list.length, 5); i++) this.playSeAt('se_tap', i * 220);
    try {
      navigator.vibrate?.([120, 80, 120, 80, 120, 80, 300]);
    } catch {
      // 振動できない端末は無視
    }
  }

  private barrierFlash() {
    this.audio.playSe('se_angry');
    this.root.classList.remove('barrier-hit');
    void this.root.offsetWidth; // 連続で弾かれてもアニメーションをやり直す
    this.root.classList.add('barrier-hit');
    const flash = h('div', { class: 'barrier-flash' }, h('i', { class: 'ring' }), h('i', { class: 'ring late' }));
    this.root.append(flash);
    window.setTimeout(() => flash.remove(), 900);
    window.setTimeout(() => this.root.classList.remove('barrier-hit'), 600);
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
    // 酔っているあいだは霧がかかって画面が揺れる（ビールの本数で強くなる）。
    // 揺れるのは外を歩いている間（玄関前・街・コンビニ・ゴミ捨て場）だけ。ドアの向こうでは酔いがさめている
    const drunkPlaces: Location[] = ['door', 'town', 'konbini', 'trash'];
    const level = this.day && this.screen.name === 'play' && drunkPlaces.includes(this.day.location) ? drunkLevel(this.day) : 0;
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
      if (s.mood === 'prank') {
        bgm = s.bgm ?? 'bgm_angry';
        const line = s.lines[s.index];
        if (line.bg) this.renderer.setScene({ kind: 'bg', image: line.bg as ImageKey, fallback: (line.bgFallback ?? line.bg) as ImageKey });
        else if (s.index === 0 && s.scene) this.renderer.setScene(s.scene);
      } else if (s.mood === 'finale') {
        if (this.court) this.renderer.setScene(this.courtCamera(s.lines[s.index]));
        else if (s.lines[s.index].scene) this.renderer.setScene(s.lines[s.index].scene!);
        else if (s.index === 0 && s.scene) this.renderer.setScene(s.scene);
      } else if (s.index === 0) {
        this.renderer.setScene(
          s.mood === 'demon'
            ? { kind: 'demon' }
            : s.mood === 'home'
            ? s.alone
              ? { kind: 'bg', image: 'bg_door_dark' }
              : { kind: 'home', grudging: s.grudging, image: s.image }
            : { kind: 'angry', image: s.late ? 'wife_dark' : (s.image ?? 'wife_angry') },
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
      this.renderer.setScene({ kind: 'loop', level: s.level });
    } else if (s.name === 'gameover') {
      const demon = !!s.demon || !!s.finale;
      bgm = demon ? 'bgm_demon' : 'bgm_angry';
      // 魔王化・フィナーレのときは、結果画面の背後でもその場面が続く
      this.renderer.setScene(
        s.finale
          ? this.finaleScene(FINALES[s.finale])
          : demon
            ? { kind: 'demon' }
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
      case 'collection':
        return this.viewCollection();
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
        h('button', { class: 'btn', onclick: () => this.go({ name: 'collection' }) }, '異変コレクション'),
        h('p', { class: 'best' }, `最高連続帰宅: ${this.best} / ${GOAL_DAYS} 日`),
        h('p', { class: 'best' }, `異変回収率: ${collectionRate(this.seen)}%`),
      ),
    ];
  }

  /** 異変コレクション: 遭遇した異変は名前、まだのものは「???????」 */
  private viewCollection(): Child[] {
    const { got, total } = collectionCount(this.seen);
    let no = 0;
    return [
      h(
        'div',
        { class: 'center-card collection' },
        h('h2', {}, '異変コレクション'),
        h('p', { class: 'best' }, `回収率 ${collectionRate(this.seen)}%（${got} / ${total}）`),
        h(
          'div',
          { class: 'collection-list' },
          COLLECTION.map((g) => [
            h('h3', {}, g.label),
            h(
              'ol',
              {},
              g.scenarios.map((s) => {
                no += 1;
                const seen = this.seen.has(s.id);
                return h(
                  'li',
                  { class: seen ? 'seen' : 'unseen' },
                  h('span', { class: 'no' }, `No.${String(no).padStart(2, '0')}`),
                  seen ? s.title : '???????',
                );
              }),
            ),
          ]),
          // 異変ではないので回収率とは別に数える
          h('h3', { class: 'special' }, `エンディング（${SPECIAL_ENDINGS.filter((e) => this.endings.has(e.id)).length} / ${SPECIAL_ENDINGS.length}）`),
          h(
            'ol',
            {},
            SPECIAL_ENDINGS.map((e, i) => {
              const seen = this.endings.has(e.id);
              return h('li', { class: seen ? 'seen' : 'unseen' }, h('span', { class: 'no' }, `EX.${String(i + 1).padStart(2, '0')}`), seen ? e.title : '???????');
            }),
          ),
        ),
        h('button', { class: 'btn primary', onclick: () => this.go({ name: 'title' }) }, '戻る'),
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
          h('li', {}, `行動するたびに時間が進む。午前1:00を過ぎて帰るとアウト。2:00を過ぎるとチェーンロックで朝まで入れない。通販の特急便（翌朝着）は ${formatTime(EXPRESS_DEADLINE)} 締切。`),
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
        day.flags.has('drunk:1') ? h('small', { class: 'drunk-meter' }, `酔い ${'🍺'.repeat(drunkLevel(day))}`) : null,
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
        day.introLines.map((l) => h('p', { class: 'intro-hint' }, l)),
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
    else if (day.location === 'bench') {
      // 2:00 を過ぎて締め出されたら、ベンチは時間つぶしの場所になる
      const locked = day.time > LOCKOUT_TIME;
      out.push(
        this.sheet(
          '公園のベンチ',
          locked
            ? [
                h('p', { class: 'desc' }, '家にはチェーンロック。……朝の6時まで、ここで時間をつぶすしかない。'),
                day.time < DAWN_TIME
                  ? h('button', { class: 'btn primary', onclick: () => this.act({ type: 'wait' }, 'se_tap') }, `時間をつぶす（${COST.wait / 60}時間）`)
                  : h('p', { class: 'desc' }, '空が白んできた。……家に戻ろう。'),
              ]
            : this.viewShop(),
          () => this.travel('town'),
          '街へ戻る',
        ),
      );
    }

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
        : hasUnreadChat(day)
          ? btn('スマホ', '● 未読', () => this.openModal({ kind: 'phone', app: null }), 'badge')
          : btn('スマホ', null, () => this.openModal({ kind: 'phone', app: null })),
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
        // 鍵をなくして開かなかったら、インターホンを押すしかない
        keyless(day) && day.flags.has('door_locked')
          ? btn('インターホンを押す', null, () => this.openModal({ kind: 'confirmIntercom' }), 'danger')
          : btn('ドアを開ける', null, () => this.openModal({ kind: 'confirmDoor' }), 'danger'),
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

  /** 下から出るシート。aboveBar は店など、下部バーの上に出す場所（閉じるボタンの文言も変わる） */
  private sheet(title: string, body: Child, onClose: () => void, aboveBar?: string): HTMLElement {
    const closeLabel = aboveBar ?? '閉じる';
    return h(
      'div',
      { class: aboveBar ? 'sheet above-bar' : 'sheet' },
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
    return clues.map((c) => {
      // カレンダーの予定を断るなど、その場で取り消せる手がかり
      if (c.deletable && c.deleteLabel) {
        const deleted = this.day!.flags.has(`deleted:${c.id}`);
        return h(
          'div',
          { class: `sns-post mine${deleted ? ' deleted' : ''}` },
          h('p', { class: 'desc' }, deleted ? (c.deletedText ?? c.text) : c.text),
          deleted
            ? null
            : h('button', { class: 'btn small danger', onclick: () => this.act({ type: 'deletePost', clue: c.id! }, 'se_send') }, `${c.deleteLabel}（${COST.deletePost}分）`),
        );
      }
      return [this.illust(c.image, 'clue-img'), h('p', { class: 'desc' }, c.text)];
    });
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
                `${p.label}（${COST.pickup}分）`,
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
        // 開かなかったら閉じる（鍵をなくした日は、下のボタンがインターホンに変わる）
        return this.dialog('ドアを開ける？', '火種が残っていたら……', 'やめる', '開ける', () => {
          this.modal = null;
          this.act({ type: 'openDoor' });
        });
      case 'confirmIntercom':
        // 押さずに、もう一度ガチャガチャやることもできる（3回目で妻が飛び出してくる）
        return this.dialog('インターホンを押す？', '鍵をなくしたことは、確実にバレる……', 'やめる', '押す', () => this.act({ type: 'intercom' }), [
          'ガチャガチャ',
          () => {
            this.modal = null;
            this.act({ type: 'openDoor' }, 'se_tap');
          },
        ]);
      case 'confirmQuit':
        return this.dialog(
          'タイトルに戻る？',
          `今の連続帰宅（${this.run.streak}日）はここで途切れる。最高記録は残る。`,
          'つづける',
          'タイトルへ',
          () => this.go({ name: 'title' }),
        );
    }
  }

  /** 確認ダイアログ（やめる / 実行する） */
  /** extra: やめる と 決定 のあいだに置く、もう1つの選択肢 */
  private dialog(title: string, sub: string, cancel: string, ok: string, onOk: () => void, extra?: [string, () => void]): HTMLElement {
    return h(
      'div',
      { class: 'dialog-backdrop' },
      h(
        'div',
        { class: 'dialog' },
        h('p', {}, title),
        h('p', { class: 'dim' }, sub),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn', onclick: () => this.closeModal() }, cancel),
          extra ? h('button', { class: 'btn', onclick: extra[1] }, extra[0]) : null,
          h('button', { class: 'btn danger', onclick: onOk }, ok),
        ),
      ),
    );
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
        ? h('p', { class: 'desc' }, this.undressedText(day))
        : this.clueTexts(`slot:${slot}`, SLOT_BASE[slot]),
      slot === 'shirt' ? h('div', { class: 'row-actions' }, this.dressButtons(day)) : null,
      items.map((item) =>
        this.itemRow(
          item,
          item.desc,
          item.useLabel
            ? h('button', { class: 'btn small', onclick: () => this.act({ type: 'use', item: item.id }, 'se_tap') }, `${item.useLabel}（${COST.use}分）`)
            : null,
        ),
      ),
    ];
  }

  /** 脱いでいるときのワイシャツ欄の説明 */
  private undressedText(day: DayState): string {
    const shirt = day.flags.has('shirt_discarded') ? 'ワイシャツは、ゴミ捨て場に捨ててしまった。' : 'ワイシャツは脱いで手に持っている。';
    return shirt + (day.flags.has('pantsless') ? 'ズボンも脱いで、今はパンツ一丁だ。' : '今は肌着一枚だ。');
  }

  /** ワイシャツ欄の「脱ぐ・着る」ボタン。肌着で酔い3なら、ズボンも脱げる */
  private dressButtons(day: DayState): Child {
    const button = (label: string, action: Action, cost: number, danger = false) =>
      h('button', { class: `btn small${danger ? ' danger' : ''}`, onclick: () => this.act(action, 'se_tap') }, `${label}（${cost}分）`);
    if (!day.flags.has('undressed')) return button('脱ぐ', { type: 'undress' }, COST.undress);
    if (day.flags.has('pantsless')) return button('ズボンをはく', { type: 'dress' }, COST.dress);
    return [
      day.flags.has('shirt_discarded') ? null : button('着る', { type: 'dress' }, COST.dress),
      drunkLevel(day) >= MAX_DRUNK ? button('ズボンも脱ぐ', { type: 'undressPants' }, COST.undress, true) : null,
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
    else body = h('div', { class: `paper ${app}` }, this.clueTexts(`app:${app}`, APP_BASE[app] ?? ''));

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
    // 送れない定型文は出さない（条件を満たしたら現れる）。送信済みは ✓ 付きで残す
    const shown = (t: ChatTemplate) => canSendChat(day, t.id) || day.flags.has(`chat:${t.id}`);
    const button = (t: ChatTemplate, cls: string) => {
      const sent = day.flags.has(`chat:${t.id}`);
      return h(
        'button',
        { class: cls, disabled: !canSendChat(day, t.id), onclick: () => this.act({ type: 'sendChat', template: t.id }, 'se_send') },
        sent ? `✓ ${sentText(day, t.id)}` : chatText(day, t),
      );
    };
    // 定型文の枠: [見出し（無ければなし）, その枠に入る定型文, ボタンの class]
    const groups: [string | null, (t: ChatTemplate) => boolean, string][] = [
      [null, (t) => !t.insult && !t.snap && !t.finale && !t.prank && (!t.provokeLines || !!t.disguised), 'template'],
      ['😏 余計なひと言（※おすすめしない）', (t) => !t.prank && !t.disguised && !!(t.provokeLines || t.finale), 'template insult'],
      ['🍺 酔った勢いの悪ふざけ（※おすすめしない）', (t) => !!t.prank, 'template insult'],
      ['😤 感情のままに送る（※おすすめしない）', (t) => !!t.insult && !day.flags.has('snapped'), 'template insult'],
      ['💢 もう我慢できない', (t) => !!t.snap, 'template insult'],
    ];
    return [
      h(
        'div',
        { class: 'chat-log' },
        CHAT_HISTORY.map((m) => bubble(m.from, m.text, 'old')),
        chatTimeline(day).map((c) => {
          // 妻から写真つきで届いたメッセージ
          if (!c.text.startsWith(ME) && c.image && this.images.get(c.image as ImageKey))
            return h('div', { class: `bubble wife photo${c.unread ? ' unread' : ''}` }, this.illust(c.image, 'chat-photo'), c.text);
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
              : h('button', { class: 'btn small unsend', onclick: () => this.act({ type: 'unsend', clue: c.id! }, 'se_tap') }, `送信取消（${COST.unsend}分）`),
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
        h('small', { class: 'dim' }, `定型文を送る（${COST.sendChat}分）`),
        groups.map(([label, inGroup, cls]) => {
          const list = CHAT_TEMPLATES.filter((t) => inGroup(t) && shown(t));
          return list.length ? [label ? h('small', { class: 'insult-label' }, label) : null, list.map((t) => button(t, cls))] : null;
        }),
      ),
    ];
  }

  /**
   * SNS（つぶやきー）: 自分の投稿は削除できる。下の欄から投稿もできる。
   * 投稿できる文面は酔いの段階で変わり、酔うほど妻の悪口がひどくなる
   */
  private viewSns(): Child {
    const day = this.day!;
    const clues = visibleClues(day, 'app:sns');
    const level = drunkLevel(day);
    const posts = POSTS.filter((p) => (p.onlyWith ? onDay(day, p.onlyWith) : p.level === level) && day.posts[p.id] === undefined);
    return [
      clues.length
        ? h(
            'div',
            { class: 'sns-feed' },
            // 新しい投稿ほど上に
            [...clues].reverse().map((c) => {
              if (!c.deletable) return h('div', { class: 'sns-post' }, this.illust(c.image, 'clue-img'), h('p', { class: 'desc' }, c.text));
              const deleted = day.flags.has(`deleted:${c.id}`);
              return h(
                'div',
                { class: `sns-post mine${deleted ? ' deleted' : ''}` },
                deleted ? null : this.illust(c.image, 'clue-img'),
                h('p', { class: 'desc' }, deleted ? 'この投稿は削除されました' : c.text),
                deleted
                  ? null
                  : h('button', { class: 'btn small danger', onclick: () => this.act({ type: 'deletePost', clue: c.id! }, 'se_discard') }, `投稿を削除（${COST.deletePost}分）`),
              );
            }),
          )
        : h('div', { class: 'paper sns' }, APP_BASE.sns ?? ''),
      posts.length
        ? h(
            'div',
            { class: 'compose' },
            h('small', { class: 'dim' }, `つぶやく（${COST.post}分）`),
            level > 0 ? h('small', { class: 'insult-label' }, '🍺 酔った勢いでつぶやく（※おすすめしない）') : null,
            posts.map((p) =>
              h('button', { class: level > 0 ? 'template insult' : 'template', onclick: () => this.act({ type: 'post', post: p.id }, 'se_send') }, p.text),
            ),
          )
        : null,
    ];
  }

  private viewShop(): Child {
    const day = this.day!;
    const open = day.time <= EXPRESS_DEADLINE;
    const status = (id: string) => day.orders[id];
    const history = Object.entries(day.orders).filter(([, v]) => v === 'existing' || v === 'canceled');
    const shipped = day.time > CANCEL_DEADLINE;
    return [
      h(
        'div',
        { class: `banner${open ? '' : ' closed'}` },
        open
          ? `⚡ 特急便: ${formatTime(EXPRESS_DEADLINE)}までのご注文で翌朝お届け（あと${EXPRESS_DEADLINE - day.time + 1}分）`
          : '本日の特急便の受付は終了しました。今からのご注文は明後日のお届けです。',
      ),
      this.clueTexts('app:shop', ''),
      itemsAt('mail').filter((item) => !item.onlyWith || onDay(day, item.onlyWith)).map((item) => {
        const st = status(item.id);
        return this.itemRow(
          item,
          priceLine(item, item.desc),
          st === 'express'
            ? h('span', { class: 'tag ok' }, item.deliveryDays === 2 ? '明後日着' : '翌朝着')
            : st === 'late'
              ? h('span', { class: 'tag ng' }, '明後日着')
              : h('button', { class: 'btn small', onclick: () => this.act({ type: 'order', item: item.id }, 'se_order') }, `注文（${COST.order}分）`),
        );
      }),
      history.length
        ? h(
            'div',
            { class: 'history' },
            h('b', {}, '注文履歴（発送準備中）'),
            history.map(([id, v]) =>
                h(
                  'div',
                  { class: 'item' },
                  h('div', {}, h('b', {}, ITEM_MAP[id]?.name ?? id), h('small', {}, priceLine(ITEM_MAP[id], ITEM_MAP[id]?.cancelNote ?? '0:00 発送処理'))),
                  v === 'canceled'
                    ? h('span', { class: 'tag' }, 'キャンセル済み')
                    : h(
                        'button',
                        {
                          class: 'btn small',
                          disabled: shipped,
                          onclick: () => this.act({ type: 'cancelOrder', item: id }, 'se_tap'),
                        },
                        shipped ? '発送済み' : `キャンセル（${COST.cancelOrder}分）`,
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
        h('p', { class: 'dim' }, `いらっしゃいませー（1点 ${COST.buy}分）`),
        itemsAt('konbini').filter((item) => !item.onlyWith || onDay(this.day!, item.onlyWith)).map((item) =>
          this.itemRow(
            item,
            priceLine(item, item.desc),
            h('button', { class: 'btn small', onclick: () => this.act({ type: 'buy', item: item.id }, 'se_buy') }, item.buyLabel ?? '買う'),
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
    const shirtInHand = day.flags.has('undressed') && !day.flags.has('shirt_discarded');
    return this.sheet(
      'ゴミ捨て場',
      [
        h('p', { class: 'dim' }, `集積所とコンビニ前のゴミ箱。（1点 ${COST.discard}分）`),
        // 脱いで手に持っているワイシャツも捨てられる
        shirtInHand
          ? this.itemRow(
              ITEM_MAP.worn_shirt,
              ITEM_MAP.worn_shirt.desc,
              h('button', { class: 'btn small', onclick: () => this.act({ type: 'discardShirt' }, 'se_discard') }, '捨てる'),
            )
          : null,
        items.length === 0 && !shirtInHand ? h('p', { class: 'desc' }, '捨てられるものは持っていない。') : null,
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
    if (fx && this.sePlayed !== line) {
      // 演出の効果音は、その行を最初に出したときだけ
      this.sePlayed = line;
      const se = FX_SE[fx];
      if (se) this.audio.playSe(se);
      if (fx === 'gavel') this.playSeAt('se_gavel', 260, 520);
      if (fx === 'guilty') this.playSeAt('se_guilty', 600);
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
    if (this.sePlayed !== step) {
      // 効果音はそのコマを最初に出したときだけ
      this.sePlayed = step;
      if (step.anim === 'attack') this.playSeAt('se_send', 0, 120, 240, 360, 480, 600), this.playSeAt('se_slam', 1450, 1600, 1750);
      if (step.anim === 'zero') this.playSeAt('se_tap', 0);
      if (step.anim === 'charge') this.playSeAt('se_demon', 0);
      if (step.anim === 'finisher') this.playSeAt('se_objection', 0), this.playSeAt('se_demon', 400), this.playSeAt('se_slam', 1300, 1550, 1800, 2050);
      if (step.anim === 'shotdown') this.playSeAt('se_guilty', 300, 700, 1100);
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
      const drop = now < before;
      return h(
        'div',
        { class: `b-hp is-${who}` },
        h('small', {}, u.unit),
        h(
          'div',
          { class: 'b-hp-bar' },
          h('i', {
            class: drop ? 'drain' : '',
            style: `--from:${pct(before)};--to:${pct(now)};width:${pct(now)}`,
          }),
        ),
        // 減ったコマでは、ゲージが減り切ってから数値が切り替わる
        drop
          ? h('b', {}, 'HP ', h('span', { class: 'hp-swap' }, h('span', { class: 'hp-old' }, String(before)), h('span', { class: 'hp-new' }, String(now))), ` / ${u.hp}`)
          : h('b', {}, `HP ${now} / ${u.hp}`),
      );
    };
    const anim = step.anim ?? 'none';
    const heroDown = hpAt(s.step, 'hero') <= 0;
    const unit = (who: 'hero' | 'wife') =>
      h(
        'div',
        { class: `b-unit is-${who}` },
        this.illust(`robot_${who}`, 'b-unit-img') ?? h('div', { class: 'b-unit-box' }, b[who].unit),
      );
    // 主人公の機体のまわりに散らばる爆発の位置
    const BOOMS = [[58, 40], [44, 52], [66, 60], [40, 36], [54, 66], [50, 46], [62, 50]];
    const boom = (i: number, cls = 'boom') =>
      h('i', { class: cls, style: `--i:${i};--x:${BOOMS[i][0]}%;--y:${BOOMS[i][1]}%` });
    /**
     * カメラ: ロボット大戦のように、1カットに映るのは片方の機体だけ。
     * 攻撃のコマは「撃つ側のカット → 画面が切り替わって被弾する側のカット」の2カット構成。
     */
    type Cam = 'hero' | 'wife';
    type Part = 'solo' | 'fire' | 'hit';
    const twoShot = anim === 'attack' || anim === 'finisher';
    const attacker: Cam = anim === 'attack' ? 'hero' : 'wife';
    // 話し手の側（ナレーションは妻の側）。カメラと背景の流れる向きの既定
    const side: Cam = step.speaker === 'narr' ? 'wife' : step.speaker;
    const solo: Cam = step.cam ?? side;
    const shots: [Cam, Part][] = twoShot
      ? [
          [attacker, 'fire'],
          [attacker === 'hero' ? 'wife' : 'hero', 'hit'],
        ]
      : [[solo, 'solo']];
    const shot = (cam: Cam, part: Part, i: number) => {
      const fx: Child[] = [];
      if (anim === 'attack' && part === 'fire') fx.push(range(6).map((k) => h('i', { class: 'missile out', style: `--i:${k}` })));
      if (anim === 'attack' && part === 'hit') {
        fx.push(range(6).map((k) => h('i', { class: 'missile in', style: `--i:${k}` })));
        fx.push(range(4).map((k) => h('i', { class: 'puff', style: `--i:${k}` })));
      }
      if (anim === 'charge') fx.push(h('i', { class: 'aura' }), h('i', { class: 'converge' }));
      if (anim === 'finisher' && part === 'fire') fx.push(h('i', { class: 'aura' }), h('i', { class: 'beam out' }));
      if (anim === 'finisher' && part === 'hit') fx.push(h('i', { class: 'beam in' }), range(6).map((k) => boom(k)));
      if (anim === 'shotdown') fx.push(range(7).map((k) => boom(k, 'boom big')));
      if (step.damage && step.damage.to === cam && part !== 'fire') fx.push(h('b', { class: `b-damage is-${cam}` }, String(step.damage.value)));
      // 撃墜後のコマでは主人公の機体はもういない
      const gone = cam === 'hero' && heroDown && anim !== 'finisher' && anim !== 'shotdown';
      return h('div', { class: `b-shot cam-${cam} part-${part}${twoShot ? ` cut-${i + 1}` : ''}` }, gone ? null : unit(cam), fx);
    };
    const portrait =
      step.speaker === 'narr'
        ? null
        : (this.illust(`pilot_${step.speaker}`, 'b-face') ??
          this.illust(step.speaker === 'hero' ? 'hero' : 'wife_angry', 'b-face fallback'));
    // 背景は流れ続ける（主人公のターンは右→左、妻のターンは左→右）
    const turn = step.turn ?? side;
    const strip = this.battleStrip();
    return [
      h(
        'div',
        { class: `battle anim-${anim}`, onclick: next },
        strip
          ? h(
              'div',
              { class: 'b-bg' },
              h('div', { class: `b-bg-track scroll-${turn === 'hero' ? 'left' : 'right'}` }, h('img', { src: strip, alt: '' }), h('img', { src: strip, alt: '' })),
            )
          : null,
        // 味方（主人公）は右、敵（妻）は左
        h('div', { class: 'b-hud' }, hpPanel('wife'), hpPanel('hero')),
        h('div', { class: 'b-field' }, shots.map(([cam, part], i) => shot(cam, part, i))),
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

  /**
   * 横スクロール用の背景。縦長の bg_battle をそのまま並べると継ぎ目が出るので、
   * 左右反転したものと横に並べて、端どうしがつながる1枚にする（一度だけ作る）
   */
  private battleStrip(): string | null {
    if (this.stripUrl) return this.stripUrl;
    const img = this.images.get('bg_battle');
    if (!img) return null;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth * 2;
    c.height = img.naturalHeight;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    g.translate(c.width, 0);
    g.scale(-1, 1);
    g.drawImage(img, 0, 0);
    this.stripUrl = c.toDataURL('image/jpeg', 0.85);
    return this.stripUrl;
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
