import type { ArrestId } from '../data/arrests';
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
  /** SNS 以外で deletable なとき（カレンダーの予定を断るなど）のボタン名・メッセージ・消したあとの表示 */
  deleteLabel?: string;
  deleteMessages?: string[];
  deletedText?: string;
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
  /** 怒られるときの妻の絵（無ければ鬼の形相の妻） */
  angerImage?: string;
  /** ほかの火種で怒られているときも、このセリフを続けて言う（空気の読めないパソコンの相談など） */
  alwaysSay?: boolean;
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
  startItems?: string[];
  pickups?: Pickup[];
  /** 通販アプリの注文履歴に最初から入っている注文（キャンセル対象） */
  startOrders?: string[];
  /** 玄関前の描画に足すオーバーレイ（manifest の画像キー） */
  visuals?: string[];
  /** 同じ日に組み合わせない シナリオID */
  conflictsWith?: string[];
  /** 妻が不在の日（実家に帰省中など）。帰宅シーンが「ただいま…（返事なし）」になる */
  homeAlone?: boolean;
  /** ほかの異変に添えるだけの仕掛け（日をまたぐ異変の前振りなど）。帰宅のセリフや異変なし判定には数えない */
  extra?: boolean;
  /** その日の始まりの画面に出す一言 */
  introLine?: string;
  /** 異変なしの日の帰宅セリフ */
  successLine?: string;
  /**
   * 妻が先に寝ている日（「先に寝るね」と言われている）。無事に帰ると誰も出てこず、
   * successLine の代わりにこのナレーションで静かに1日が終わる
   */
  asleep?: string;
  /** 妻が酔っている日のシナリオ（通常の抽選には入らず、1/10 でほかのシナリオに重なる） */
  wifeDrunk?: WifeDrunk;
  /**
   * その日の状況に合わせた、定型文への妻の返事（定型文ID → 候補。ランダムに1つ）。
   * 火種が未解消のあいだはこれを使う。`<定型文ID>:after` は火種を消したあとの返事。
   * 異変なしの日は常にこれを使う。
   */
  chatReplies?: Record<string, string[]>;
  /** この持ち物を持ったまま帰ると、それ自体が新しい火種になる（メシマズの日の料理本など） */
  carryAnger?: { item: string; title: string; angerLines: string[] }[];
}

type ShopKind = 'konbini' | 'mail';

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  /** どこで手に入るか（none = シナリオでのみ入手） */
  source: ShopKind | 'none';
  /** その日（火種かシナリオの id）だけ店に並ぶ */
  onlyWith?: string;
  /** 特急便ではなく、注文から何日後に届くか（ノートパソコンは2日後） */
  deliveryDays?: number;
  /** コンビニの「買う」ボタンの代わりの文言（落とし物を受け取るなど） */
  buyLabel?: string;
  /** 呪われていて捨てられない（ゴミ捨て場の一覧には出るが、捨てようとするとこのメッセージで弾かれる。試すたびに次の文） */
  cursed?: string[][];
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
  /** 使うと服を着たことになる（替えのワイシャツ）。脱いだ状態が解消される */
  dresses?: boolean;
  /** 1日に買える上限（無ければ無制限） */
  maxStock?: number;
  /** 飲むと酔いが1段階進む（ビール）。useMessages は 1杯目, 2杯目, … のメッセージ */
  drink?: boolean;
  useMessages?: string[];
  /** 飲むと一気にこの酔いの段階まで進む（カップ清酒） */
  drunkTo?: number;
  /** 飲んだ瞬間に酔いつぶれて、この結末になる（スピリタス） */
  collapse?: PrankEnding;
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
  /** 余計なひと言だが、見た目は普通の定型文（普通の枠に並べる罠） */
  disguised?: boolean;
  /** 「ほんとにごめん…」のあとに続けて送れる謝罪（何段目か）。3段目まで送ると夫がブチギレる */
  sorryMore?: boolean;
  /** 謝りすぎてブチギレた夫の怒りのメッセージ。ブチギレたあとはこれしか送れず、送ると暴言と同じく魔王化 */
  snap?: boolean;
  /** 普通の定型文の顔をしているが、送ると暴言と同じく魔王化する（demonLines を使う） */
  demonTrap?: boolean;
  /** このフラグのどれかが立っていたら、もう送れない（勝手に注文したあとの事後相談など） */
  blockedBy?: string[];
  /** 条件を満たしているときは provokeLines の代わりにこちらで怒られる（温泉を予約済みなら温泉の話で返す等） */
  provokeLinesIf?: { when: Requirement; lines: string[] };
  /** この余計なひと言（by）を送ったあとに送ると、妻の返事がこれになる（もう手遅れ） */
  afterProvoked?: { by: string; reply: string };
  /** 酔った勢いの悪ふざけ（妻を心配させる嘘）。「余計なひと言」とは別の枠に出る */
  prank?: boolean;
  /** 悪ふざけを送っていた日の結末（火種に関係なく、ドアを開けるとこうなる） */
  prankEnding?: PrankEnding;
  /** 送った瞬間に増える手がかり（妻が方々に電話した通知など） */
  triggerClues?: Clue[];

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
  /** 妻が酔っている日なら、その酔い方 */
  wifeDrunk: WifeDrunk | null;
  /** その日の始まりの画面に出す一言（日をまたぐ異変の前振りなど） */
  introLines: string[];
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
  /** つぶやきーに投稿したもの（投稿 ID -> 妻がそれを見る時刻）。見られる前に消せばセーフ */
  posts: Record<string, Minutes>;
}

export interface RunState {
  day: number;
  /** この周回で既に使ったシナリオ */
  used: string[];
  streak: number;
  /** 「そろそろパソコンほしいな」の日をもう出したか（1周に1回） */
  pcHinted?: boolean;
  /** ノートパソコンを注文した: 届く日と、妻に相談して許してもらってから注文したか */
  pc?: { arriveDay: number; approved: boolean };
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
  /** 着ているワイシャツを脱ぐ */
  | { type: 'undress' }
  /** 肌着でさらに酔い3のとき、ズボンも脱ぐ */
  | { type: 'undressPants' }
  /** 脱いだワイシャツをゴミ捨て場に捨てる */
  | { type: 'discardShirt' }
  /** 脱いだワイシャツを着直す */
  | { type: 'dress' }
  /** 締め出されたあと、公園のベンチで1時間つぶす */
  | { type: 'wait' }
  | { type: 'unsend'; clue: string }
  | { type: 'deletePost'; clue: string }
  | { type: 'post'; post: string }
  | { type: 'travel'; to: Location }
  | { type: 'openDoor' }
  /** 鍵をなくして開けられないとき、インターホンを押して妻に開けてもらう */
  | { type: 'intercom' };

export type Outcome =
  | { kind: 'continue' }
  | { kind: 'late' }
  /** 2:00 を過ぎて締め出され、朝 6:00 にようやく家に入れた */
  | { kind: 'dawn' }
  /** morning: 酔って寝落ちした妻に、翌朝バレた */
  /** fakeHome: いったん普通に「おかえり」と迎えられてから怒られる（鬼のお面を持って帰った日など）。そのときの妻の一言 */
  | { kind: 'angry'; causes: Cause[]; morning?: boolean; fakeHome?: string[] }
  /** 暴言を送っていた: 火種の有無に関係なく、魔王化した妻が待っている */
  | { kind: 'demon'; lines: string[]; reason?: string }
  /** 酔った勢いの悪ふざけを送っていた: 送った文面ごとの結末 */
  | { kind: 'prank'; template: string }
  /** 強すぎる酒で酔いつぶれた: その酒の結末（病院送りなど） */
  | { kind: 'collapse'; item: string }
  /** 脱いだ格好で出歩いて、交番や留置場へ */
  | { kind: 'arrest'; ending: ArrestId }
  /** 暴言を4種すべて送った: 7本からランダムに選ばれたフィナーレ */
  | { kind: 'finale'; finale: FinaleId }
  /**
   * 帰宅成功。special は特別な帰宅: drunk = 酔った妻、reset = 妻が寝落ちで何も聞かれない、
   * party = 夫婦そろって酔っ払いの宴会
   */
  | { kind: 'home'; lines: string[]; special?: 'drunk' | 'reset' | 'party' };

export interface ActionResult {
  ok: boolean;
  /** 画面に出すメッセージ */
  messages: string[];
  cost: Minutes;
  outcome: Outcome;
}


/** 悪ふざけの結末。行ごとに背景（bg）を切り替えられる */
export interface PrankEnding {
  /** ゲームオーバー画面の「原因」 */
  title: string;
  /** 最初の背景（manifest の画像キー）と、その絵が無いときの代わり */
  scene: string;
  fallback: string;
  /** BGM。しんみりさせたいときは静かな曲 */
  bgm: 'bgm_angry' | 'bgm_home';
  lines: { who: Speaker; name?: string; text: string; bg?: string; bgFallback?: string }[];
}

/** セリフの話し手。other は名札（name）で誰かを示す */
/** つぶやきーに投稿できる文面。酔いの段階（level）ごとに出るものが変わる */
export interface Post {
  id: string;
  /** この酔いの段階のときだけ投稿できる（0 = しらふ） */
  level: number;
  text: string;
  /** 投稿についた反応（「♥ 3」など） */
  reaction: string;
  /** 妻の悪口。これがあると火種になり、妻に見られる前に消さないと怒られる */
  angerLines?: string[];
  /** 一瞬でバズって妻が魔王化する投稿（酔い3）。魔王のセリフ */
  demonLines?: string[];
  /** その日（火種かシナリオの id）だけ、酔いの段階に関係なく投稿できる */
  onlyWith?: string;
}

export type Speaker = 'me' | 'wife' | 'narr' | 'other';

/** 妻の酔い方: からみ酒 / 甘え上戸 / 記憶リセット / 逆魔王 */
export type WifeDrunk = 'karami' | 'amae' | 'reset' | 'gyaku';
