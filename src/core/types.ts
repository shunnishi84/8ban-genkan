import type { FinaleId } from '../data/finales';
// ゲーム全体で使うデータ型。DOM に依存しないこと（Vitest から直接読み込むため）。

/** 時刻は「日付の 0:00 からの経過分」で持つ。23:00 = 1380, 翌 1:00 = 1500 */
export type Minutes = number;

/** 玄関前で調べられる場所 */
export type SpotId = 'door' | 'hallway' | 'window' | 'nameplate' | 'floor';

/** 持ち物の入れ物（手がかりの表示先） */
export type SlotId = 'bag' | 'shirt' | 'wallet' | 'cardcase';

/** スマホのアプリ */
export type AppId = 'chat' | 'calendar' | 'memo' | 'shop' | 'sns';

/** 手がかりが見つかる場所 */
export type ClueLocation =
  | `spot:${SpotId}`
  | `slot:${SlotId}`
  | `app:${AppId}`
  /** スマホのロック画面通知 */
  | 'notice';

/**
 * フラグ条件式。
 * - 文字列: そのフラグが立っていれば真
 * - { all }: すべて真
 * - { any }: どれか真
 *
 * フラグ名の規約（engine.ts が立てる）:
 *   bought:<item>  ordered:<item>  ordered_late:<item>  canceled:<item>
 *   discarded:<item>  used:<item>  picked:<item>  chat:<template>
 *   unsent:<clue>  deleted:<clue>  seen:<location>  read:chat
 */
export type Requirement = string | { all: Requirement[] } | { any: Requirement[] };

export interface Clue {
  at: ClueLocation;
  text: string;
  /** どの原因の手がかりか。省略時は「ニセ異変」（原因と無関係な紛らわしい描写） */
  cause?: string;
  /** チャットアプリ用: 妻からのメッセージを未読として表示する */
  unread?: boolean;
  /** unsendable 等で参照するための ID */
  id?: string;
  /** 自分が送ったチャット: 妻が既読にする前（0:00 まで）なら送信取消できる。取り消すと unsent:<id> */
  unsendable?: boolean;
  /** SNS アプリの自分の投稿: 「投稿を削除」できる（締切なし）。削除すると deleted:<id> */
  deletable?: boolean;
  /** 手がかりに添えるイラスト（assets/manifest.ts の IMAGES のキー） */
  image?: string;
  /** この条件を満たしたら表示しない（着替えたら口紅の描写が消える等） */
  hiddenWhen?: Requirement;
}

export interface Cause {
  id: string;
  /** 一覧・デバッグ用の短い名前 */
  title: string;
  /** これを満たせば解消済み */
  resolution: Requirement;
  /** 未解消でドアを開けたときの怒りシーン。妻のセリフ（1行ずつ表示） */
  angerLines: string[];
  /** 解消して帰宅したときの妻の一言 */
  successLine: string;
  /** 解消しても小言つきで渋々許す（帰宅時の妻が笑顔ではなく無表情になる） */
  grudging?: boolean;
}

/** シナリオ開始時に持っている（拾える）アイテム */
export interface StartItem {
  item: string;
}

/** 玄関前で拾えるアイテム（ゴミ袋など） */
export interface Pickup {
  at: SpotId;
  item: string;
  label: string;
  /** 拾ったら消える描画オーバーレイ */
  visual?: string;
  /** 拾ったときに大きく見せる絵と一言（写真集の付箋のページなど） */
  reveal?: { title: string; image: string; text: string };
}

export interface Scenario {
  id: string;
  title: string;
  /** 原因。空配列なら「異変なし」の日 */
  causes: Cause[];
  clues: Clue[];
  /** 開始時の所持品（店の名刺、レシートなど） */
  startItems?: StartItem[];
  pickups?: Pickup[];
  /** 通販アプリの注文履歴に最初から入っている注文（キャンセル対象） */
  startOrders?: string[];
  /** 玄関前の描画に足すオーバーレイ（manifest の画像キー） */
  visuals?: string[];
  /** 同じ日に組み合わせない シナリオID */
  conflictsWith?: string[];
  /** 妻が不在の日（実家に帰省中など）。帰宅シーンが「ただいま…（返事なし）」になる */
  homeAlone?: boolean;
  /** 異変なしの日の帰宅セリフ */
  successLine?: string;
  /**
   * 妻が先に寝ている日（「先に寝るね」と言われている）。無事に帰ると誰も出てこず、
   * successLine の代わりにこのナレーションで静かに1日が終わる
   */
  asleep?: string;
  /**
   * その日の状況に合わせた、定型文への妻の返事（定型文ID → 候補。ランダムに1つ）。
   * 火種が未解消のあいだはこれを使う。`<定型文ID>:after` は火種を消したあとの返事。
   * 異変なしの日は常にこれを使う。
   */
  chatReplies?: Record<string, string[]>;
}

export type ShopKind = 'konbini' | 'mail';

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  /** どこで手に入るか（none = シナリオでのみ入手） */
  source: ShopKind | 'none';
  price?: number;
  /** 所持品画面でどの入れ物に入っているか */
  slot: SlotId;
  /** ゴミ捨て場で捨てられるか */
  discardable?: boolean;
  /** 所持品画面のボタン（着替える、食べる 等）。押すと used:<id> が立つ */
  useLabel?: string;
  /** 使うのにこのアイテムを持っている必要がある（接着剤 → 割れたマグカップ） */
  useRequires?: string;
  /** 使ったあと useRequires のアイテムをこれに置き換える（割れたマグカップ → 直したマグカップ） */
  useResult?: string;
  /** 通販の注文履歴でキャンセル期限の代わりに出す説明（既定は「0:00 発送処理」） */
  cancelNote?: string;
  useMessage?: string;
  /** 1日に買える上限（無ければ無制限） */
  maxStock?: number;
  /** 飲むと酔いが1段階進む（ビール）。useMessages は 1杯目, 2杯目, … のメッセージ */
  drink?: boolean;
  useMessages?: string[];
}

export interface ChatTemplate {
  id: string;
  text: string;
  /** 送信できる条件（注文済みでないと「明日届く」とは言えない 等） */
  requires?: Requirement;
  /** 原因と関係あるとき（解消フラグに含まれるとき）の妻の返信 */
  replyRelevant: string;
  /** 関係ないときの返信。neutral でなければ時間ペナルティ */
  replyIrrelevant: string;
  /** 関係なくてもペナルティにならない無難なメッセージ */
  neutral?: boolean;
  /**
   * 暴言（おふざけ枠）。送ると insulted が立ち、どんなに火種を消していても
   * ドアを開けた瞬間（や時間切れ）に魔王化した妻が待っている。
   */
  insult?: boolean;
  /** 暴言を送ったあと、ドアの向こうの魔王が言うセリフ */
  demonLines?: string[];
  /** 酔うほどひどくなる文面（酔い1, 2, 3段階目）。暴言用 */
  drunkText?: string[];
  /** 送ると一緒に貼られる写真（manifest の画像キー） */
  image?: string;
  /** この原因（cause id）がある日だけ送れる */
  onlyWith?: string;
  /**
   * 余計なひと言（おふざけ枠）。送ると provoked:<id> が立ち、火種を全部消していても
   * 帰宅した瞬間に怒りシーン。妻のセリフ
   */
  provokeLines?: string[];
  /** 送った瞬間にこのフィナーレへ直行する（暴言扱い） */
  finale?: FinaleId;
}

export type Location = 'door' | 'town' | 'konbini' | 'trash' | 'bench';

export interface DayState {
  day: number;
  scenarioIds: string[];
  causes: Cause[];
  clues: Clue[];
  pickups: Pickup[];
  visuals: string[];
  startTime: Minutes;
  time: Minutes;
  location: Location;
  flags: Set<string>;
  inventory: string[];
  /** 通販の注文（item -> 状態） */
  orders: Record<string, 'express' | 'late' | 'canceled' | 'existing'>;
  /** その日に送ったチャット（妻の返信込み）。過去ログ・手がかりは含まない */
  chatLog: { from: 'me' | 'wife'; text: string; image?: string }[];
  successLines: string[];
  homeAlone: boolean;
  /** その日に送れる暴言（全種からランダムに4つ）。4つ全部送るとフィナーレ */
  insultIds: string[];
  /** 渋々許す火種がある日（帰宅時の妻が無表情） */
  grudging: boolean;
  /** 妻が先に寝ている日の、帰宅時のナレーション（空なら妻は起きている） */
  asleepLines: string[];
  /** その日の乱数（0〜1）。フィナーレの抽選に使う。テストでは固定できる */
  seed: number;
  /** 暴言を4種すべて送ったときに決まるフィナーレ */
  finale?: FinaleId;
}

export interface RunState {
  day: number;
  /** この周回で既に使ったシナリオ */
  used: string[];
  streak: number;
}

export type Action =
  | { type: 'inspect'; spot: SpotId }
  | { type: 'openSlot'; slot: SlotId }
  | { type: 'openApp'; app: AppId }
  | { type: 'sendChat'; template: string }
  | { type: 'order'; item: string }
  | { type: 'cancelOrder'; item: string }
  | { type: 'buy'; item: string }
  | { type: 'discard'; item: string }
  | { type: 'use'; item: string }
  | { type: 'pickup'; item: string }
  /** 着ているワイシャツを脱ぐ / 着直す */
  | { type: 'undress' }
  | { type: 'dress' }
  | { type: 'unsend'; clue: string }
  | { type: 'deletePost'; clue: string }
  | { type: 'travel'; to: Location }
  | { type: 'openDoor' };

export type Outcome =
  | { kind: 'continue' }
  | { kind: 'late' }
  | { kind: 'angry'; causes: Cause[] }
  /** 暴言を送っていた: 火種の有無に関係なく、魔王化した妻が待っている */
  | { kind: 'demon'; lines: string[] }
  /** 暴言を4種すべて送った: 7本からランダムに選ばれたフィナーレ */
  | { kind: 'finale'; finale: FinaleId }
  | { kind: 'home'; lines: string[] };

export interface ActionResult {
  ok: boolean;
  /** 画面に出すメッセージ */
  messages: string[];
  cost: Minutes;
  outcome: Outcome;
}
