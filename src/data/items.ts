import type { ItemDef } from '../core/types';

/**
 * アイテム定義。source でどこで手に入るかが決まる。
 * - konbini: コンビニで購入（bought:<id>）
 * - mail:    通販アプリで注文（ordered:<id> / 締切後は ordered_late:<id>）
 * - none:    シナリオの初期所持品・拾得物のみ
 */
export const ITEMS: ItemDef[] = [
  // --- コンビニ ---
  { id: 'milk', name: '牛乳 1L', desc: 'いつもの牛乳。', source: 'konbini', price: 268, slot: 'bag' },
  { id: 'eggs', name: '卵 6個入り', desc: '割らないように鞄の一番上へ。', source: 'konbini', price: 248, slot: 'bag' },
  { id: 'sweets', name: 'プレミアムとろけるロール', desc: 'お詫びの定番スイーツ。', source: 'konbini', price: 380, slot: 'bag' },
  { id: 'cake', name: 'いちごショートケーキ（2個入り）', desc: 'コンビニ最後の1個だった。', source: 'konbini', price: 598, slot: 'bag' },
  { id: 'wine', name: '赤ワイン ハーフボトル', desc: '記念日にもギリギリ使える顔つき。', source: 'konbini', price: 980, slot: 'bag' },
  {
    id: 'spare_shirt',
    name: '替えのワイシャツ',
    desc: '出張用の白ワイシャツ。',
    source: 'konbini',
    price: 1980,
    slot: 'shirt',
    useLabel: '着替える',
    useMessage: 'コンビニのトイレで新しいワイシャツに着替えた。古いシャツは鞄の奥へ封印。',
  },
  {
    id: 'mint',
    name: '息リフレッシュ粒',
    desc: '飲み会帰りの強い味方。',
    source: 'konbini',
    price: 298,
    slot: 'bag',
    useLabel: '口に放り込む',
    useMessage: 'ガリガリ噛み砕いた。息がミントの暴風になった。',
  },
  { id: 'konbini_pudding', name: 'なめらかプリン', desc: 'コンビニのプリン。これはこれでおいしい。', source: 'konbini', price: 198, slot: 'bag' },
  {
    id: 'navy_tie',
    name: 'ネクタイ（紺・無地）',
    desc: 'コンビニの緊急用ネクタイ。暗ければ…いける？',
    source: 'konbini',
    price: 1280,
    slot: 'shirt',
    useLabel: '締める',
    useMessage: '紺のネクタイをキュッと締めた。暗いし、紺ならバレない……はず。',
  },
  // 紛らわしい商品（買っても何も解決しない）
  { id: 'detergent_generic', name: '洗剤 詰め替え（ノーブランド）', desc: '…いつものとは違うやつ。', source: 'konbini', price: 358, slot: 'bag' },
  { id: 'vinyl_umbrella', name: 'ビニール傘', desc: '透明。花柄ではない。', source: 'konbini', price: 550, slot: 'bag' },
  { id: 'snack_box', name: 'お菓子詰め合わせ', desc: 'コンビニ感がにじみ出ている。', source: 'konbini', price: 698, slot: 'bag' },
  { id: 'beer', name: '缶ビール', desc: 'まだ飲む気か。', source: 'konbini', price: 248, slot: 'bag', discardable: true },

  // --- 通販（ポチッとマート）。特急便は 23:59 までの注文で翌朝着 ---
  { id: 'detergent_refill', name: 'サラサラ・ボタニカル 詰め替え 大容量', desc: '妻指定のブランド。コンビニには売っていない。', source: 'mail', price: 1280, slot: 'bag' },
  { id: 'bouquet', name: '季節の花束（特急便）', desc: 'メッセージカード付き。', source: 'mail', price: 4980, slot: 'bag' },
  { id: 'pair_glass', name: '名入れペアグラス', desc: '記念日ギフトの大定番。', source: 'mail', price: 6800, slot: 'bag' },
  { id: 'umbrella_same', name: '花柄ジャンプ傘（限定色）', desc: '妻と同じモデル。在庫ラスト1。', source: 'mail', price: 3800, slot: 'bag' },
  { id: 'limited_pudding', name: '駅ナカ限定 窯出しとろけるプリン（お取り寄せ）', desc: '妻が楽しみにしていたやつ。', source: 'mail', price: 1620, slot: 'bag' },
  { id: 'kashiori', name: '老舗の菓子折り「千年最中」', desc: '義母が好きなやつ。', source: 'mail', price: 3240, slot: 'bag' },

  // --- シナリオ専用 ---
  { id: 'golf_club', name: '高級ドライバー「ギャラクシー460」', desc: '酔った勢いでポチったらしい。', source: 'none', price: 128000, slot: 'bag' },
  { id: 'cabaret_card', name: '店の名刺', desc: '『Club 銀河の妖精　あやね♡』ハートの手書き付き。', source: 'none', slot: 'cardcase', discardable: true },
  { id: 'cabaret_receipt', name: '店のレシート', desc: '『Club 銀河の妖精　セット ¥24,000／あやねドリンク ¥8,000』', source: 'none', slot: 'wallet', discardable: true },
  { id: 'empty_can', name: '空き缶（ハイボール）', desc: '帰り道で飲んだらしい。カラカラ鳴る。', source: 'none', slot: 'bag', discardable: true },
  { id: 'garbage_bag', name: '燃えるゴミの袋', desc: 'パンパン。ずっしり重い。', source: 'none', slot: 'bag', discardable: true },
  {
    id: 'ring',
    name: '結婚指輪',
    desc: '飲み会でなぜか外したらしい。',
    source: 'none',
    slot: 'wallet',
    useLabel: '指にはめる',
    useMessage: '左手の薬指に指輪をはめ直した。しっくりくる。',
  },
  { id: 'ramen_receipt', name: 'ラーメン屋のレシート', desc: '『麺処 夜の蝶 — 特製味噌ラーメン ¥980／餃子 ¥380』', source: 'none', slot: 'wallet', discardable: true },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const itemsAt = (source: ItemDef['source']): ItemDef[] => ITEMS.filter((i) => i.source === source);
