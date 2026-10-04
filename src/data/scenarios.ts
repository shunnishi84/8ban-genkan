import type { Scenario } from '../core/types';

/**
 * シナリオ定義。新しいシナリオはこの配列に足すだけで抽選対象になる。
 * 追加したら `npm test` で整合性チェック（解消不可能な原因が無いか）を通すこと。
 */
export const SCENARIOS: Scenario[] = [
  // ---------------------------------------------------------------- 1
  {
    id: 'dinner_unannounced',
    title: '飲み会を伝えてない',
    causes: [
      {
        id: 'dinner_unannounced',
        title: '飲み会の連絡忘れ',
        resolution: { all: ['chat:apology_dinner', 'bought:sweets'] },
        angerLines: [
          'ご飯作ったって、言ったよね？',
          '飲み会なら一言くらい連絡できるでしょ！！',
          '肉じゃが、3日連続で食べてもらいますから。',
        ],
        successLine: '…スイーツで許すと思ったら大間違いだからね。（うれしそう）',
      },
    ],
    clues: [
      { at: 'app:chat', cause: 'dinner_unannounced', unread: true, text: '今日ご飯作ったよ🍲 何時に帰る？（19:02）' },
      { at: 'app:chat', cause: 'dinner_unannounced', unread: true, text: '……先に寝るね（22:15）' },
      { at: 'spot:door', cause: 'dinner_unannounced', text: 'ドアの隙間から、肉じゃがの匂いがふんわり漂ってくる。' },
      { at: 'spot:window', cause: 'dinner_unannounced', text: '台所の灯りだけがポツンとついている。' },
    ],
  },
  // ---------------------------------------------------------------- 2
  {
    id: 'shopping_forgot',
    title: '頼まれた買い物をしていない',
    causes: [
      {
        id: 'shopping_forgot',
        title: '買い物忘れ',
        resolution: {
          all: ['bought:milk', 'bought:eggs', 'ordered:detergent_refill', 'chat:report_detergent'],
        },
        angerLines: [
          '牛乳は？卵は？……手ぶら？？',
          '明日の朝ごはん、どうするつもり？',
          '洗剤も！ 他のブランドじゃダメって書いたよね！',
        ],
        successLine: '牛乳と卵ありがと。洗剤、明日の朝届くのね。助かる〜',
      },
    ],
    clues: [
      {
        at: 'app:memo',
        cause: 'shopping_forgot',
        text: '【妻より】帰りに買ってきて！\n・牛乳\n・卵\n・洗剤の詰め替え（サラサラ・ボタニカル！他のはダメ）',
      },
      { at: 'app:chat', cause: 'shopping_forgot', text: 'メモに書いたやつお願いね！洗剤は絶対いつものやつね（18:30）' },
      {
        at: 'slot:bag',
        cause: 'shopping_forgot',
        text: '鞄の中は書類だけ。買い物袋は……どこにも無い。',
        hiddenWhen: { all: ['bought:milk', 'bought:eggs'] },
      },
    ],
  },
  // ---------------------------------------------------------------- 3
  {
    id: 'birthday_forgot',
    title: '妻の誕生日を忘れている',
    conflictsWith: ['anniversary_forgot'],
    visuals: ['window_garland'],
    causes: [
      {
        id: 'birthday_forgot',
        title: '誕生日忘れ',
        resolution: { all: ['bought:cake', 'ordered:bouquet', 'chat:birthday'] },
        angerLines: [
          '今日、何の日か知ってる？',
          '飾り付け、ひとりでやったんだけど。',
          '来年からあなたの誕生日は平日扱いにします。',
        ],
        successLine: 'ケーキ…覚えててくれたんだ。花束も？ ふふ、許してあげる。',
      },
    ],
    clues: [
      { at: 'notice', cause: 'birthday_forgot', text: '📅 リマインダー（スヌーズ5回目）: 今日は妻の誕生日🎂' },
      { at: 'app:calendar', cause: 'birthday_forgot', text: '今日: 🎂 妻の誕生日（※絶対忘れないこと）' },
      { at: 'spot:window', cause: 'birthday_forgot', text: '窓の内側に「HAPPY BIRTHDAY」のガーランドが飾られている。' },
      { at: 'app:chat', cause: 'birthday_forgot', text: '今日は早く帰ってくるんだよね？☺️（12:10）' },
    ],
  },
  // ---------------------------------------------------------------- 4
  {
    id: 'cabaret_lipstick',
    title: 'キャバクラ帰りでシャツに口紅',
    startItems: [{ item: 'cabaret_card' }, { item: 'cabaret_receipt' }],
    causes: [
      {
        id: 'cabaret_lipstick',
        title: 'キャバクラの痕跡',
        resolution: {
          all: ['used:spare_shirt', 'discarded:cabaret_card', 'discarded:cabaret_receipt'],
        },
        angerLines: [
          '……ねえ、この口紅、だれの？',
          '『銀河の妖精』？ へぇ〜、宇宙まで飲みに行ってたんだ？',
          '今夜は玄関で寝てね。毛布はあげる。',
        ],
        successLine: '…あれ、シャツ新しくした？ まあいいや、お風呂わいてるよ',
      },
    ],
    clues: [
      {
        at: 'slot:shirt',
        cause: 'cabaret_lipstick',
        text: 'ワイシャツの襟に、くっきりと赤い口紅の跡が……！',
        image: 'shirt_lipstick',
        hiddenWhen: 'used:spare_shirt',
      },
      {
        at: 'slot:cardcase',
        cause: 'cabaret_lipstick',
        text: '見覚えのない、キラキラした名刺が混じっている。',
        hiddenWhen: 'discarded:cabaret_card',
      },
      {
        at: 'slot:wallet',
        cause: 'cabaret_lipstick',
        text: 'やけに長いレシートが入っている。',
        hiddenWhen: 'discarded:cabaret_receipt',
      },
    ],
  },
  // ---------------------------------------------------------------- 5
  {
    id: 'anniversary_forgot',
    title: '結婚記念日を忘れている',
    conflictsWith: ['birthday_forgot'],
    visuals: ['window_candle'],
    causes: [
      {
        id: 'anniversary_forgot',
        title: '結婚記念日忘れ',
        resolution: { all: ['bought:wine', 'ordered:pair_glass', 'chat:anniversary'] },
        angerLines: [
          '7年目の記念日に、午前様？',
          'キャンドル、3本燃え尽きたよ。',
          '8年目は来ないかもね〜（笑）（笑ってない）',
        ],
        successLine: 'ワイン買ってきてくれたの？ グラスは明日届くのね。…乾杯しよっか',
      },
    ],
    clues: [
      { at: 'notice', cause: 'anniversary_forgot', text: '📅 今日の予定: 💍 結婚記念日' },
      { at: 'app:calendar', cause: 'anniversary_forgot', text: '今日: 💍 結婚記念日（7年目）' },
      { at: 'spot:window', cause: 'anniversary_forgot', text: '窓の向こうで、キャンドルの灯りがゆらめいている。' },
      { at: 'app:chat', cause: 'anniversary_forgot', unread: true, text: '今日、何の日か覚えてる？🍷（20:00）' },
    ],
  },
  // ---------------------------------------------------------------- 6
  {
    id: 'garbage_forgot',
    title: 'ゴミ出し忘れ',
    pickups: [{ at: 'hallway', item: 'garbage_bag', label: 'ゴミ袋を持つ', visual: 'garbage_bag' }],
    visuals: ['garbage_bag'],
    causes: [
      {
        id: 'garbage_forgot',
        title: 'ゴミ出し忘れ',
        resolution: { all: ['discarded:garbage_bag', 'chat:garbage_done'] },
        angerLines: [
          'ゴミ袋、まだそこにあるよね？',
          '朝からずっと、あの袋が玄関で私を見てたよ。',
          '明日から、あなたの枕元に置いとくね。',
        ],
        successLine: 'ゴミ出してくれたんだ。えらいえらい。',
      },
    ],
    clues: [
      {
        at: 'spot:hallway',
        cause: 'garbage_forgot',
        text: '玄関脇に、パンパンのゴミ袋が置きっぱなしになっている。',
        hiddenWhen: 'picked:garbage_bag',
      },
      { at: 'app:chat', cause: 'garbage_forgot', unread: true, text: '朝ゴミ出してって言ったよね？？ 玄関に置いたままなんだけど（8:45）' },
      { at: 'app:memo', cause: 'garbage_forgot', text: '燃えるゴミ: 月・木（朝8時まで）\n→ 夜のうちに集積所に出してOK' },
    ],
  },
  // ---------------------------------------------------------------- 7
  {
    id: 'card_overuse',
    title: 'カード使いすぎ通知',
    startOrders: ['golf_club'],
    causes: [
      {
        id: 'card_overuse',
        title: '深夜の酔いどれポチり',
        resolution: { all: ['canceled:golf_club', 'chat:golf_cancel'] },
        angerLines: [
          '12万8千円のゴルフクラブ？ あなたゴルフしないよね？',
          'それで何を打つつもり？ 私の堪忍袋の緒？',
          'お小遣い、来月から3か月ゼロです。',
        ],
        successLine: 'キャンセルしたのね。…次やったらカード没収だからね。',
      },
    ],
    clues: [
      { at: 'notice', cause: 'card_overuse', text: '💳 カードご利用のお知らせ: ¥128,000（ポチッとマート）' },
      { at: 'app:shop', cause: 'card_overuse', text: '注文履歴に見覚えのない高額商品がある……。0:00の発送処理までならキャンセルできるらしい。' },
      { at: 'app:chat', cause: 'card_overuse', unread: true, text: '家族カードの通知来たんだけど。12万？？ なにこれ？（22:41）' },
    ],
  },
  // ---------------------------------------------------------------- 8
  {
    id: 'liver_holiday',
    title: '休肝日の約束を破った',
    startItems: [{ item: 'empty_can' }],
    causes: [
      {
        id: 'liver_holiday',
        title: '休肝日破り',
        resolution: { all: ['used:mint', 'discarded:empty_can'] },
        angerLines: [
          '……お酒の匂いがする。',
          '休肝日って、肝臓を休ませる日だよ？ 知ってた？',
          '明日から1週間、麦茶しか出しません。',
        ],
        successLine: '休肝日えらかったね〜！（……バレてない）',
      },
    ],
    clues: [
      { at: 'app:calendar', cause: 'liver_holiday', text: '毎週水曜: 🍵 休肝日（妻と約束）← 今日' },
      { at: 'app:chat', cause: 'liver_holiday', text: '今日は休肝日だよね？👀 えらいぞ〜（17:50）' },
      {
        at: 'spot:door',
        cause: 'liver_holiday',
        text: 'ドアの覗き窓に映る自分の顔が真っ赤だ。はぁ〜っ……息が酒臭い。',
        hiddenWhen: 'used:mint',
      },
      {
        at: 'slot:bag',
        cause: 'liver_holiday',
        text: '鞄の底で何かがカラカラ鳴っている。',
        hiddenWhen: 'discarded:empty_can',
      },
    ],
  },
  // ---------------------------------------------------------------- 9
  {
    id: 'mother_in_law',
    title: '義母の手土産を用意してない',
    causes: [
      {
        id: 'mother_in_law',
        title: '手土産忘れ',
        resolution: { all: ['ordered:kashiori', 'chat:kashiori'] },
        angerLines: [
          'お母さんの手土産、まさか忘れてないよね？',
          'コンビニのお菓子で誤魔化す気だった？',
          '明日はお母さんと私で、あなたの反省会を開きます。',
        ],
        successLine: '菓子折り、明日の朝届くのね。お母さん喜ぶよ。',
      },
    ],
    clues: [
      { at: 'app:calendar', cause: 'mother_in_law', text: '明日 10:00 お義母さん来訪（手土産よろしく！）' },
      { at: 'app:chat', cause: 'mother_in_law', unread: true, text: '明日のお母さんの手土産、用意してくれた？ 老舗のやつね。コンビニのはバレるから（21:03）' },
      { at: 'app:memo', cause: 'mother_in_law', text: '手土産: 老舗の菓子折り（※コンビニNG）' },
    ],
  },
  // ---------------------------------------------------------------- 10
  {
    id: 'umbrella_lost',
    title: '妻の傘を電車に忘れた',
    visuals: ['wet_floor'],
    causes: [
      {
        id: 'umbrella_lost',
        title: '傘の置き忘れ',
        resolution: { all: ['ordered:umbrella_same', 'chat:umbrella'] },
        angerLines: [
          '私の花柄の傘は？',
          '……電車に置いてきた？ あれ限定色なんだけど。',
          '明日からあなたはビニール傘で十分です。',
        ],
        successLine: '同じ傘、明日届くの？ ……まあ、許す。',
      },
    ],
    clues: [
      { at: 'spot:floor', cause: 'umbrella_lost', text: 'スーツの裾がびしょ濡れ。手には……傘がない。' },
      { at: 'spot:door', cause: 'umbrella_lost', text: '傘立てには自分の黒い傘だけ。……あれ？ 朝、妻の花柄の傘を借りて出なかったか？' },
      { at: 'app:chat', cause: 'umbrella_lost', unread: true, text: '朝、私の花柄の傘持ってったでしょ？ あれお気に入りなんだけど（23:10）' },
    ],
  },
  // ---------------------------------------------------------------- 11
  {
    id: 'ring_off',
    title: '結婚指輪を外したまま',
    startItems: [{ item: 'ring' }],
    causes: [
      {
        id: 'ring_off',
        title: '指輪外し',
        resolution: 'used:ring',
        angerLines: ['……指輪は？', '外して飲んでたの？ なんで？ ねえ、なんで？', '明日から指輪、瞬間接着剤でつけてあげるね。'],
        successLine: '（左手をチラッと見て）……よし。おかえり。',
      },
    ],
    clues: [
      { at: 'spot:door', cause: 'ring_off', text: 'ドアノブに手をかけた左手……薬指が妙に軽い。', hiddenWhen: 'used:ring' },
      { at: 'slot:wallet', cause: 'ring_off', text: '小銭入れの中で、何かがキラリと光る。', hiddenWhen: 'used:ring' },
      { at: 'app:chat', cause: 'ring_off', text: '最近、飲み会の日って指輪してないよね？（昨日）' },
    ],
  },
  // ---------------------------------------------------------------- 12
  {
    id: 'pudding_promise',
    title: '限定プリンの約束',
    causes: [
      {
        id: 'pudding_promise',
        title: 'プリンの約束忘れ',
        resolution: { all: ['ordered:limited_pudding', 'bought:konbini_pudding', 'chat:pudding'] },
        angerLines: ['プリンは？', '駅ナカ限定の、とろけるやつ。1か月前から言ってたよね？', 'あなたの冷蔵庫の段、今日から私のものです。'],
        successLine: 'コンビニプリンでつなぐ作戦ね。……明日の限定プリン、ふたつとも私のだから。',
      },
    ],
    clues: [
      { at: 'app:chat', cause: 'pudding_promise', unread: true, text: '限定プリン、買えた？😋 楽しみにしてる（20:30）' },
      { at: 'app:memo', cause: 'pudding_promise', text: '駅ナカ限定プリン（妻と約束！）\n※お店は21時閉店。お取り寄せも可' },
    ],
  },
  // ---------------------------------------------------------------- 13
  {
    id: 'tie_lost',
    title: '妻からもらったネクタイがない',
    causes: [
      {
        id: 'tie_lost',
        title: 'ネクタイ紛失',
        resolution: 'used:navy_tie',
        angerLines: ['……ネクタイは？', '私があげたやつ。誕生日に。覚えてる？', '次のプレゼントは、首輪にするね。'],
        successLine: 'おかえり。（暗くてネクタイの柄までは見えないようだ……）',
      },
    ],
    clues: [
      { at: 'slot:shirt', cause: 'tie_lost', text: '首元がスースーする。妻にもらったネクタイが……ない！', hiddenWhen: 'used:navy_tie' },
      { at: 'spot:door', cause: 'tie_lost', text: 'ドアの覗き窓に映る自分、なんだか首元が寂しい。', hiddenWhen: 'used:navy_tie' },
      { at: 'app:chat', cause: 'tie_lost', text: '今日、私があげたネクタイしてってくれたね☺️（8:05）' },
    ],
  },

  // ================================================================ 異変なし（ニセ異変入り）
  {
    id: 'ramen_receipt',
    title: '異変なし: 夜の蝶',
    causes: [],
    startItems: [{ item: 'ramen_receipt' }],
    successLine: 'おかえり。ラーメンの匂いする〜。お疲れさま',
    clues: [
      { at: 'slot:wallet', text: 'レシートが1枚。『夜の蝶』……!?' },
      { at: 'app:chat', text: '（あなた）今日飲み会で遅くなる！先寝てて（18:05）' },
      { at: 'app:chat', text: '了解〜。締めのラーメンはほどほどにね（18:07）' },
      { at: 'spot:nameplate', text: '表札が少し傾いている……と思ったら、自分の首が傾いていただけだ。' },
    ],
  },
  {
    id: 'ketchup_shirt',
    title: '異変なし: 襟の赤いシミ',
    causes: [],
    successLine: 'おかえり。…あ、ナポリタン食べたでしょ。シャツ浸けとくね',
    clues: [
      { at: 'slot:shirt', text: '襟に赤いシミが……！ くんくん。……ナポリタンの匂いだ。' },
      { at: 'app:calendar', text: '来月12日: 🎂 妻の誕生日' },
      { at: 'app:chat', text: '（あなた）飲み会、2次会は喫茶店で軽食！（21:40）' },
      { at: 'app:chat', text: 'はーい（21:41）' },
    ],
  },
  {
    id: 'neighbor_curry',
    title: '異変なし: どこからかカレーの匂い',
    causes: [],
    successLine: 'おかえり〜。私も今帰ってきたとこ！',
    clues: [
      { at: 'spot:door', text: 'カレーのいい匂いがする……。よく嗅ぐと、隣の部屋の換気扇からだ。' },
      { at: 'app:chat', text: '今日は友達とご飯行ってくる〜。そっちも楽しんで！（17:20）' },
      { at: 'spot:hallway', text: '廊下に不在票が落ちている……と思ったら、お隣さん宛てだった。' },
    ],
  },
];

export const SCENARIO_MAP: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
