import type { Location, Minutes } from './types';

/** 何日連続で帰宅できたらクリアか */
export const GOAL_DAYS = 8;

export const hm = (h: number, m: number): Minutes => h * 60 + m;

/** これを過ぎてからドアを開けると「遅すぎる」でゲームオーバー（翌 1:00） */
export const TIME_LIMIT = hm(25, 0);
/** これを過ぎると妻は寝てしまい、チャットは既読にならず、ドアにはチェーンロック（翌 2:00） */
export const LOCKOUT_TIME = hm(26, 0);
/** 締め出されたまま公園で時間をつぶして、この時刻になるとチェーンが外れる（翌朝 6:00） */
export const DAWN_TIME = hm(30, 0);
/** 通販の特急便（翌朝着）締切。この時刻ちょうどまでに注文すれば翌朝届く */
export const EXPRESS_DEADLINE = hm(23, 59);
/** 既存注文のキャンセル締切（0:00 の発送処理より前）。誤爆メッセージの送信取消も同じ（0:00 に妻が既読にする） */
export const CANCEL_DEADLINE = hm(23, 59);
/** 時計が赤くなる時刻 */
export const WARN_TIME = hm(24, 30);

/** 開始時刻: 22:50 + (日-1)*4分 + 0〜10分のゆらぎ。日が進むほど飲み会が長引く */
export const startTimeFor = (day: number, jitter: number): Minutes =>
  hm(22, 50) + (day - 1) * 4 + Math.floor(jitter * 11);

/** 何日目に原因がいくつ重なるか */
export const causeCountFor = (day: number): number => (day >= 8 ? 3 : day >= 6 ? 2 : 1);

/** 酔いの段階の上限（缶ビール3本 / カップ清酒1杯） */
export const MAX_DRUNK = 3;

/** 「そろそろパソコンほしいな」の前振りが出る確率（1〜6日目、1周に1回まで） */
export const PC_HINT_RATE = 0.15;
/** ノートパソコンを注文してから届くまでの日数 */
export const PC_DELIVERY_DAYS = 2;

/** 妻が酔っている日になる確率 */
export const WIFE_DRUNK_RATE = 0.1;

/** 1〜5日目に「異変なし」の日になる確率 */
export const NO_ANOMALY_RATE = 0.25;

/** 各行動の所要時間（分） */
export const COST = {
  inspect: 1,
  openSlot: 1,
  openApp: 1,
  sendChat: 2,
  /** 関係ない謝罪・告白を送ると妻から電話で問い詰められる */
  chatPenalty: 8,
  order: 3,
  cancelOrder: 2,
  buy: 2,
  discard: 1,
  use: 2,
  pickup: 1,
  unsend: 2,
  deletePost: 2,
  /** つぶやきーに投稿する */
  post: 2,
  /** 締め出されたあと、公園のベンチで時間をつぶす */
  wait: 60,
  undress: 1,
  dress: 1,
} as const;

/** 移動時間。from→to。town を起点に放射状 */
export const TRAVEL: Record<Location, Partial<Record<Location, Minutes>>> = {
  door: { town: 5 },
  town: { door: 5, konbini: 3, trash: 2, bench: 1 },
  konbini: { town: 0 },
  trash: { town: 0 },
  bench: { town: 0 },
};

export const formatTime = (t: Minutes): string => {
  const h = Math.floor(t / 60) % 24;
  const m = t % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
};
