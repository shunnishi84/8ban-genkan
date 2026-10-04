import type { AppId, SlotId, SpotId } from '../core/types';

/** 何も手がかりが無いときの「いつも通り」の描写。手がかりがある場所はこれが置き換わる */
export const SPOT_BASE: Record<SpotId, string> = {
  door: '見慣れた自宅のドア。傘立てには妻の花柄の傘と、自分の黒い傘。',
  hallway: 'マンションの共用廊下。蛍光灯が少しチカチカしている。いつも通りだ。',
  window: '廊下側の小窓。リビングの灯りがうっすら漏れている。いつも通りだ。',
  nameplate: '表札『田中』。いつも通り。',
  floor: '玄関マットは乾いている。足元に変わったところはない。',
};

export const SPOT_LABEL: Record<SpotId, string> = {
  door: 'ドア',
  hallway: '廊下',
  window: '窓',
  nameplate: '表札',
  floor: '足元',
};

export const SLOT_BASE: Record<SlotId, string> = {
  bag: '鞄の中には書類とノートPC。',
  shirt: '少しよれたワイシャツ。特に変わったところはない。',
  wallet: '財布。カードと小銭が少し。',
  cardcase: '名刺入れ。自分の名刺だけが入っている。',
};

export const SLOT_LABEL: Record<SlotId, string> = {
  bag: '鞄',
  shirt: 'ワイシャツ',
  wallet: '財布',
  cardcase: '名刺入れ',
};

export const APP_LABEL: Record<AppId, string> = {
  chat: 'チャット',
  calendar: 'カレンダー',
  memo: 'メモ',
  shop: 'ポチッとマート',
};

export const APP_BASE: Record<AppId, string> = {
  chat: '（妻とのトーク）',
  calendar: '今日: 予定なし',
  memo: 'メモはありません。',
  shop: '',
};

/** チャットの過去ログ（毎日共通の「いつもの」やり取り） */
export const CHAT_HISTORY: { from: 'me' | 'wife'; text: string }[] = [
  { from: 'wife', text: '（昨日）洗濯物取り込んどいたよ〜' },
  { from: 'me', text: '（昨日）ありがと！' },
];
