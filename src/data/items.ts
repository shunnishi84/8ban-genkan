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
  // メシマズでバズった日に買うと、送った瞬間に火に油
  {
    id: 'saru_recipe',
    name: 'サルでも出来る簡単レシピ（料理本）',
    desc: 'レジ横の新刊コーナーに平積みされていた料理本。帯には「料理が苦手なあの人に！」',
    source: 'konbini',
    price: 990,
    slot: 'bag',
    discardable: true,
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
  { id: 'ice_cream', name: 'プレミアムバニラアイス', desc: 'ちょっと高いやつ。妻の機嫌が直る（はず）。', source: 'konbini', price: 324, slot: 'bag' },
  {
    id: 'glue',
    name: '強力瞬間接着剤',
    desc: '陶器もくっつく。',
    source: 'konbini',
    price: 440,
    slot: 'bag',
    useLabel: '割れたマグカップを直す',
    useRequires: 'broken_mug',
    useResult: 'fixed_mug',
    useMessage: '破片をひとつずつ接着した。ヒビは残ったが、形は元どおりだ。',
  },
  // 紛らわしい商品（買っても何も解決しない）
  { id: 'detergent_generic', name: '洗剤 詰め替え（ノーブランド）', desc: '…いつものとは違うやつ。', source: 'konbini', price: 358, slot: 'bag' },
  { id: 'vinyl_umbrella', name: 'ビニール傘', desc: '透明。花柄ではない。', source: 'konbini', price: 550, slot: 'bag' },
  { id: 'snack_box', name: 'お菓子詰め合わせ', desc: 'コンビニ感がにじみ出ている。', source: 'konbini', price: 698, slot: 'bag' },
  {
    id: 'beer',
    name: '缶ビール',
    desc: 'まだ飲む気か。（1日3本まで）',
    source: 'konbini',
    price: 248,
    slot: 'bag',
    discardable: true,
    maxStock: 3,
    drink: true,
    useLabel: '飲む',
    useMessages: [
      'プシュッ。……ぷはぁ。なんだか気が大きくなってきた。',
      'プシュッ。……ぐびぐび。地面が、ちょっと揺れている。',
      'プシュッ。……ぷはぁ〜〜。世界がぐるぐる回っている。怖いものなんて、何もない。',
    ],
  },

  // --- 通販（ポチッとマート）。特急便は 23:59 までの注文で翌朝着 ---
  { id: 'detergent_refill', name: 'サラサラ・ボタニカル 詰め替え 大容量', desc: '妻指定のブランド。コンビニには売っていない。', source: 'mail', price: 1280, slot: 'bag' },
  { id: 'bouquet', name: '季節の花束（特急便）', desc: 'メッセージカード付き。', source: 'mail', price: 4980, slot: 'bag' },
  { id: 'pair_glass', name: '名入れペアグラス', desc: '記念日ギフトの大定番。', source: 'mail', price: 6800, slot: 'bag' },
  { id: 'umbrella_same', name: '花柄ジャンプ傘（限定色）', desc: '妻と同じモデル。在庫ラスト1。', source: 'mail', price: 3800, slot: 'bag' },
  { id: 'limited_pudding', name: '駅ナカ限定 窯出しとろけるプリン（お取り寄せ）', desc: '妻が楽しみにしていたやつ。', source: 'mail', price: 1620, slot: 'bag' },
  { id: 'onsen_ticket', name: '温泉ペア宿泊ギフト（eギフト）', desc: '箱根の老舗旅館。明朝メールで届く。', source: 'mail', price: 39800, slot: 'bag' },
  { id: 'spa_ticket', name: 'スパ＆マッサージ ペアチケット（eチケット）', desc: '都内ホテルのスパ。明朝メールで届く。', source: 'mail', price: 24000, slot: 'bag' },
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
  { id: 'broken_mug', name: '割れたマグカップ', desc: '新聞紙にくるんだ妻の青いマグカップ。昨日割った。', source: 'none', slot: 'bag' },
  { id: 'fixed_mug', name: '直したマグカップ', desc: 'ヒビは残ったが、ちゃんと使える。', source: 'none', slot: 'bag' },
  {
    id: 'av_subscription',
    name: '動画配信「ミッドナイトシアター＋」月額プラン',
    desc: '大人向けの専門チャンネル。昨夜、テレビでつけっぱなしにして寝落ちした。',
    source: 'none',
    price: 1980,
    slot: 'bag',
    cancelNote: '0:00 自動更新',
  },
  {
    id: 'gravure_book',
    name: '水着グラビア写真集『夏、渚で。』',
    desc: 'ベッドの下に隠していたはずの一冊。',
    source: 'none',
    slot: 'bag',
    discardable: true,
  },
  { id: 'ramen_receipt', name: 'ラーメン屋のレシート', desc: '『麺処 夜の蝶 — 特製味噌ラーメン ¥980／餃子 ¥380』', source: 'none', slot: 'wallet', discardable: true },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const itemsAt = (source: ItemDef['source']): ItemDef[] => ITEMS.filter((i) => i.source === source);
