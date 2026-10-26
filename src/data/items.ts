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
    dresses: true,
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
  // コンビニのプリンでは一番高いやつ（お取り寄せの窯出しプリンには及ばない）。なめらかプリンとは別物
  { id: 'pudding_premium', name: '贅沢窯焼きプリン', desc: 'コンビニのプリンでは一番高いやつ。妻のお気に入り。', source: 'konbini', price: 480, slot: 'bag' },
  // 鍵をなくした日だけ。店員が預かっていた落とし物を受け取る
  // 洗濯物についたティッシュ片を取る
  { id: 'lint_roller', name: 'コロコロ（粘着クリーナー）', desc: '替えテープ3巻つき。今夜は長くなりそうだ。', source: 'konbini', price: 398, slot: 'bag' },
  // 妻に頼まれた通販の払込。払込用紙のある日だけ
  { id: 'bill_payment', name: '通販の払込（受領証）', desc: '預かっていた2万円で払った。受領証とお釣りは財布に。', source: 'konbini', price: 18600, slot: 'wallet', onlyWith: 'payment_slip', buyLabel: '支払う' },
  { id: 'house_key', name: '家の鍵（落とし物）', desc: 'レジ横で店員が預かっていた。キーホルダーは妻とおそろいのクマ。', source: 'konbini', price: 0, slot: 'wallet', onlyWith: 'key_lost', buyLabel: '受け取る' },
  // 持って帰ると、必ず妻が鬼になる
  {
    id: 'oni_mask',
    name: '鬼のお面',
    desc: '節分の売れ残り。赤鬼。……なぜ買う？',
    source: 'konbini',
    price: 330,
    slot: 'bag',
    discardable: true,
    // 一度買ったら最後、捨てられない
    cursed: [
      ['お面をゴミ袋に押し込んだ。……と思ったら、手の中に戻っていた。', '……不思議な力が働いている。'],
      ['思いきりゴミ箱に投げ込んだ。', 'お面はくるりと宙返りして、鞄の中に飛び込んだ。'],
      ['お面と目が合った。', '……ニヤリと笑った気がする。手が、動かない。'],
      ['ゴミ捨て場の看板に「鬼のお面は回収できません」と書き足されている。', '……さっきまで、こんな文字あったか？'],
    ],
  },
  {
    id: 'cup_sake',
    name: 'カップ清酒「千鳥足」',
    desc: 'ガラスのカップに並々と。……これ一杯で、ビール3本ぶん回る。（1日1本まで）',
    source: 'konbini',
    price: 290,
    slot: 'bag',
    discardable: true,
    maxStock: 1,
    drink: true,
    drunkTo: 3,
    useLabel: '飲む',
    useMessage: 'キュポッ。……ぐびぐびぐび。一気に、頭のてっぺんまで回った。世界がぐるぐる回っている。怖いものなんて、何もない。',
  },
  {
    id: 'spirytus',
    name: 'スピリタス（アルコール96度）',
    desc: '世界最強の酒。ラベルに「火気厳禁」。……本気か？',
    source: 'konbini',
    price: 2980,
    slot: 'bag',
    discardable: true,
    maxStock: 1,
    drink: true,
    useLabel: '飲む',
    collapse: {
      title: '急性アルコール中毒（病院送り）',
      scene: 'bg_town',
      fallback: 'bg_door_dark',
      bgm: 'bgm_angry',
      lines: [
        { who: 'narr', text: 'キュッ。……ストレートで、ひと口。' },
        { who: 'narr', text: '喉が、燃えた。地面が、ぐんぐん近づいてくる……。' },
        { who: 'narr', text: '──ピーポー、ピーポー……。' },
        { who: 'narr', text: '気がつくと、白い天井が見えた。腕には点滴がつながっている。', bg: 'hospital_wife', bgFallback: 'wife_angry' },
        { who: 'other', name: '看護師', text: '目が覚めました？ 奥さま、いらっしゃってますよ。' },
        { who: 'wife', text: '……アルコール度数、96%。' },
        { who: 'wife', text: 'コンビニで買って、路上で、ストレートで。' },
        { who: 'wife', text: '救急車の中で、何回「ごめんなさい」って言ったか覚えてる？ 37回よ。' },
        { who: 'wife', text: '点滴が終わったら、ゆっくりお話ししましょうね。……朝まで、時間はたっぷりあるから。' },
        { who: 'narr', text: '病室の空気が、凍りついた。' },
      ],
    },
  },

  // --- 通販（ポチッとマート）。特急便は 23:59 までの注文で翌朝着 ---
  { id: 'detergent_refill', name: 'サラサラ・ボタニカル 詰め替え 大容量', desc: '妻指定のブランド。コンビニには売っていない。', source: 'mail', price: 1280, slot: 'bag' },
  { id: 'bouquet', name: '季節の花束（特急便）', desc: 'メッセージカード付き。', source: 'mail', price: 4980, slot: 'bag' },
  { id: 'pair_glass', name: '名入れペアグラス', desc: '記念日ギフトの大定番。', source: 'mail', price: 6800, slot: 'bag' },
  { id: 'umbrella_same', name: '花柄ジャンプ傘（限定色）', desc: '妻と同じモデル。在庫ラスト1。', source: 'mail', price: 3800, slot: 'bag' },
  { id: 'limited_pudding', name: '駅ナカ限定 窯出しとろけるプリン（お取り寄せ）', desc: '妻が楽しみにしていたやつ。', source: 'mail', price: 1620, slot: 'bag' },
  { id: 'dinner_reservation', name: 'ペアディナー予約（駅前のイタリアン）', desc: '土曜の夜、2名で予約。明朝、確定メールが届く。', source: 'mail', price: 12000, slot: 'bag' },
  // 「そろそろパソコンほしいな」の日だけ並ぶ。2日後に届く（妻に相談してから買うこと）
  { id: 'laptop', name: 'ノートパソコン「ポチPC Air 14」（2日後お届け）', desc: '本日限定セール。……19万8千円。', source: 'mail', price: 198000, slot: 'bag', onlyWith: 'pc_hint', deliveryDays: 2 },
  { id: 'blouse_same', name: '白いブラウス（同じもの・特急便）', desc: '妻のお気に入りと同じブランド、同じサイズ。', source: 'mail', price: 5900, slot: 'bag' },
  { id: 'headspa_ticket', name: 'ヘッドスパ＆マッサージ券（eチケット）', desc: '頭皮をほぐす90分コース。明朝メールで届く。', source: 'mail', price: 8800, slot: 'bag' },
  { id: 'bento_box', name: '曲げわっぱの弁当箱（特急便）', desc: '職人の手作り。……今度こそ毎日洗って持って帰る。', source: 'mail', price: 4200, slot: 'bag' },
  { id: 'onsen_ticket', name: '温泉ペア宿泊ギフト（eギフト）', desc: '箱根の老舗旅館。明朝メールで届く。', source: 'mail', price: 39800, slot: 'bag' },
  { id: 'spa_ticket', name: 'スパ＆マッサージ ペアチケット（eチケット）', desc: '都内ホテルのスパ。明朝メールで届く。', source: 'mail', price: 24000, slot: 'bag' },
  { id: 'kashiori', name: '老舗の菓子折り「千年最中」', desc: '義母が好きなやつ。', source: 'mail', price: 3240, slot: 'bag' },

  // --- シナリオ専用 ---
  { id: 'golf_club', name: '高級ドライバー「ギャラクシー460」', desc: '酔った勢いでポチったらしい。', source: 'none', price: 128000, slot: 'bag' },
  { id: 'cabaret_card', name: '店の名刺', desc: '『Club 銀河の妖精　あやね♡』ハートの手書き付き。', source: 'none', slot: 'cardcase', discardable: true },
  { id: 'cabaret_receipt', name: '店のレシート', desc: '『Club 銀河の妖精　セット ¥24,000／あやねドリンク ¥8,000』', source: 'none', slot: 'wallet', discardable: true },
  { id: 'strong_can', name: 'ストロング缶（9%・未開封）', desc: '帰り道のコンビニで、つい。……健診の紙には「節酒」の赤字。', source: 'none', slot: 'bag', discardable: true },
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
  // 脱いで手に持っているワイシャツ（持ち物には入らない。ゴミ捨て場の表示用）
  { id: 'worn_shirt', name: '脱いだワイシャツ', desc: 'さっきまで着ていたやつ。少し汗くさい。', source: 'none', slot: 'shirt' },
  { id: 'ramen_receipt', name: 'ラーメン屋のレシート', desc: '『麺処 夜の蝶 — 特製味噌ラーメン ¥980／餃子 ¥380』', source: 'none', slot: 'wallet', discardable: true },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const itemsAt = (source: ItemDef['source']): ItemDef[] => ITEMS.filter((i) => i.source === source);
