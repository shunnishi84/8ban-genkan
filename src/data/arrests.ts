import type { PrankEnding } from '../core/types';

/**
 * 脱いだ格好で出歩いたときの結末。
 * koban_park: 肌着で公園へ → 巡回中のお巡りさんに保護 → 交番に妻のお迎え
 * koban_konbini: 肌着（やパンツ一丁）で買い物を断られ続ける → 店員が通報 → 同じく交番
 * jail: パンツ一丁で夜の街へ → OL に悲鳴をあげられて通報 → 留置場
 */
export type ArrestId = 'koban_park' | 'koban_konbini' | 'jail';

/** 交番に連れて行かれてからの流れ（公園でもコンビニでも同じ） */
const KOBAN: PrankEnding['lines'] = [
  { who: 'narr', text: '──近くの交番。' },
  { who: 'other', name: '警察官', text: 'ご家族の方に、迎えに来てもらいましょうね。' },
  { who: 'narr', text: '30分後。パジャマにコートを羽織った妻が、交番の引き戸を開けた。', bg: 'koban_wife', bgFallback: 'wife_angry' },
  { who: 'wife', text: '……すみません。うちの主人が、ご迷惑をおかけしました。' },
  { who: 'wife', text: '（小声で）……シャツは？' },
  { who: 'wife', text: '帰ったら、ゆっくり話しましょうね。お巡りさんの前じゃ言えないこと、たくさんあるから。' },
  { who: 'narr', text: '調書の職業欄には「会社員（肌着）」と書かれた。' },
];

export const ARRESTS: Record<ArrestId, PrankEnding> = {
  koban_park: {
    title: '交番で保護（妻のお迎え）',
    scene: 'bg_bench',
    fallback: 'bg_town',
    bgm: 'bgm_angry',
    lines: [
      { who: 'narr', text: '肌着一枚のまま、公園のベンチに腰をおろした。' },
      { who: 'narr', text: '……懐中電灯の光が、顔に当たった。', bg: 'police_patrol', bgFallback: 'bg_bench' },
      { who: 'other', name: '警察官', text: 'こんばんは〜。ちょっといいですか？' },
      { who: 'other', name: '警察官', text: 'この寒いのに、肌着一枚で何してるんです？ ……お酒、入ってます？' },
      { who: 'me', text: 'い、いや、これは、その……' },
      ...KOBAN,
    ],
  },
  koban_konbini: {
    title: '交番で保護（店員の通報）',
    scene: 'bg_konbini',
    fallback: 'bg_town',
    bgm: 'bgm_angry',
    lines: [
      { who: 'other', name: '店員', text: '……少々、お待ちください。' },
      { who: 'narr', text: '店員が、レジの奥でそっと受話器を取った。' },
      { who: 'narr', text: '──3分後。自動ドアが開いた。', bg: 'police_patrol', bgFallback: 'bg_konbini' },
      { who: 'other', name: '警察官', text: '通報があったのは、こちらのお客さんですね？' },
      { who: 'other', name: '警察官', text: '服、どうされました？ ……ちょっと、お話聞かせてもらえます？' },
      ...KOBAN,
    ],
  },
  jail: {
    title: '留置場で一泊',
    scene: 'bg_town',
    fallback: 'bg_door_dark',
    bgm: 'bgm_angry',
    lines: [
      { who: 'narr', text: 'パンツ一丁で、夜の街に出た。……夜風が、すべてを通り抜けていく。' },
      { who: 'narr', text: '角を曲がったところで、会社帰りの OL と目が合った。', bg: 'ol_scream', bgFallback: 'bg_town' },
      { who: 'other', name: 'OL', text: 'きゃああああああああああっ！！！' },
      { who: 'narr', text: '彼女は、迷わず110番を押した。' },
      { who: 'narr', text: '──ピーポー、ピーポー。' },
      { who: 'other', name: '警察官', text: '……とりあえず、署まで来てもらおうか。ズボンは、どこに置いてきたの？' },
      { who: 'narr', text: '──留置場。冷たいコンクリートの床。鉄格子の向こうで、時計の針が3時を回った。', bg: 'jail_cell', bgFallback: 'bg_door_dark' },
      { who: 'narr', text: '翌朝。面会室のアクリル板の向こうに、妻が座った。' },
      { who: 'wife', text: '……ズボン、持ってきたわよ。' },
      { who: 'wife', text: 'ご近所にも、会社にも、もう知れ渡ってるから。' },
      { who: 'wife', text: '次の面会は、弁護士さんと来るわね。……離婚の。' },
    ],
  },
};
