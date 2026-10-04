// ゲーム全体で使うデータ型。DOM に依存しないこと（Vitest から直接読み込むため）。

/** 時刻は「日付の 0:00 からの経過分」で持つ。23:00 = 1380, 翌 1:00 = 1500 */
export type Minutes = number;

/** 玄関前で調べられる場所 */
export type SpotId = 'door' | 'hallway' | 'window' | 'nameplate' | 'floor';

/** 持ち物の入れ物（手がかりの表示先） */
export type SlotId = 'bag' | 'shirt' | 'wallet' | 'cardcase';

/** スマホのアプリ */
export type AppId = 'chat' | 'calendar' | 'memo' | 'shop';

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
 *   seen:<location>  read:chat
 */
export type Requirement = string | { all: Requirement[] } | { any: Requirement[] };

export interface Clue {
  at: ClueLocation;
  text: string;
  /** どの原因の手がかりか。省略時は「ニセ異変」（原因と無関係な紛らわしい描写） */
  cause?: string;
  /** チャットアプリ用: 妻からのメッセージを未読として表示する */
  unread?: boolean;
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
  /** 異変なしの日の帰宅セリフ */
  successLine?: string;
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
  useMessage?: string;
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
  chatLog: { from: 'me' | 'wife'; text: string }[];
  successLines: string[];
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
  | { type: 'travel'; to: Location }
  | { type: 'openDoor' };

export type Outcome =
  | { kind: 'continue' }
  | { kind: 'late' }
  | { kind: 'angry'; causes: Cause[] }
  | { kind: 'home'; lines: string[] };

export interface ActionResult {
  ok: boolean;
  /** 画面に出すメッセージ */
  messages: string[];
  cost: Minutes;
  outcome: Outcome;
}
