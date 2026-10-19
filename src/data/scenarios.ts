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
    asleep: 'テーブルに、ラップのかかった夕飯。……寝室は真っ暗だ。明日の朝、ちゃんと全部食べよう。',
    chatReplies: {
      '*': ['それより、ご飯の話は？ 作って待ってたんだけど。'],
      coming_home: ['……ご飯、冷めてるけど。', '今から？ 先に寝るって言ったよね。', 'ご飯、ラップしてあるから。勝手にどうぞ。'],
      'coming_home:after': ['……ご飯、明日の朝ね。気をつけて帰ってきて。'],
      sorry_generic: ['何に謝ってるのか、自分で言ってみて。', '「ごめん」だけ？ 作ったご飯のことは？', '謝るくらいなら、飲み会の連絡くらいして。'],
      love: ['愛してるなら、飲み会の連絡くらいして。', '……ご飯より先に言うこと、それ？'],
    },
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
    chatReplies: {
      coming_home: ['はーい。メモのやつ、忘れてないよね？', 'はーい！ 洗剤は絶対いつものやつね！'],
      sorry_generic: ['……ごめんって何？ まさか、メモのやつ忘れた？ 電話する'],
    },
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
    chatReplies: {
      '*': ['それより、今日が何の日か、先に言うことあるよね？'],
      'love:after': ['……ありがと。ちゃんと覚えててよね、来年は。'],
      coming_home: ['……今から？ 早く帰るって言ってたよね。', '今日が何の日か、わかってて言ってる？', 'ケーキのロウソク、もう溶けちゃったよ。'],
      'coming_home:after': ['……待ってる。'],
      sorry_generic: ['何に対してのごめん？ 今日が何の日か言ってみて。', '謝るってことは、忘れてたってことだよね。', '「ごめん」の前に「おめでとう」じゃないの？'],
      love: ['……それだけ？ 今日、何の日だと思ってる？', '愛してるなら、今日の日付くらい覚えてて。'],
      anniversary: ['記念日じゃなくて、誕生日。……本気で間違えてる？'],
    },
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
    startItems: ['cabaret_card', 'cabaret_receipt'],
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
    chatReplies: {
      '*': ['話をそらさないで。今日、何の日だと思ってるの？'],
      'love:after': ['……8年目も、よろしくね。'],
      coming_home: ['……「今から」なんだ。今日、何の日だっけ？', 'ワイン冷やして待ってたんだけど。もうぬるいよ。', '7年目の今日に、その一言？'],
      'coming_home:after': ['……グラス、出しとくね。'],
      sorry_generic: ['ごめん、じゃなくて。何の日か答えて。', '謝るってことは、忘れてたんだ。7年目なのに。', '謝るくらいなら、カレンダーくらい見て。'],
      love: ['愛してるなら、今日が何の日か言えるよね？', '……記念日に、それだけ？'],
      birthday: ['誕生日じゃなくて、結婚記念日なんだけど。……わざと？'],
    },
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
    chatReplies: {
      '*': ['それより、玄関のゴミ袋。'],
      coming_home: ['帰ってくるなら、ゴミもどうにかしてきて。', 'ゴミ袋がお出迎えしてくれると思うよ。', '玄関、ゴミ袋と一緒に待ってるね。'],
      sorry_generic: ['謝るくらいなら、朝ちゃんと出して。', 'ごめんでゴミは減らないんだけど。', '「ごめん」の前に、ゴミ袋持って。'],
      love: ['愛してるなら、ゴミ出して。', '愛でゴミは消えないよ。'],
    },
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
        successLine: '……出したのね。でも、朝出してって言ったよね？ 今度からちゃんと朝に出して。',
        grudging: true,
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
    chatReplies: {
      '*': ['話をそらさないで。12万の説明は？'],
      coming_home: ['帰ってきたら、12万の説明してね。', 'まず12万の話が先。', '12万円分、気をつけて帰ってきてね。'],
      sorry_generic: ['ごめんで12万は戻ってこないよ。', '謝る前に、キャンセルできるか確認して。', '謝るってことは、心当たりがあるんだ。'],
      love: ['12万円分の愛？ 重いね。', '愛してるなら、カード明細を見せて。'],
    },
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
        grudging: true,
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
    chatReplies: {
      coming_home: ['はーい！ 休肝日えらいね〜 まっすぐ帰ってきてね☺️', 'お茶いれて待ってる〜☺️'],
      sorry_generic: ['え、何が？？ ……まさか、飲んだ？ 電話する'],
    },
    startItems: ['empty_can'],
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
    chatReplies: {
      '*': ['……それより、明日の手土産は？'],
      coming_home: ['はーい。手土産、ちゃんと用意できた？', '帰ってきたら手土産見せてね。老舗のやつね。'],
      sorry_generic: ['……まさか、手土産忘れた？ 謝る前に何とかして。', '謝るってことは、用意してないんだ。明日なんだけど。'],
      love: ['愛してるなら、お母さんの手土産もよろしくね。'],
    },
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
    chatReplies: {
      '*': ['それより、私の傘は？'],
      coming_home: ['傘、ちゃんと持って帰ってきてね。', '今から？ 私の傘も一緒に帰ってくるよね？'],
      sorry_generic: ['……ごめんって何。まさか傘？', '謝るってことは、なくしたんだ。お気に入りだったのに。'],
      love: ['愛してるなら、花柄の傘も一緒に連れて帰ってきて。'],
    },
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
        grudging: true,
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
    chatReplies: {
      '*': ['……それより、指輪は？'],
      coming_home: ['はーい。……指輪、してる？', '左手、ちゃんと見せてね。'],
      sorry_generic: ['何に謝ってるの？ ……指輪？', 'ごめんって言うってことは、またしてないんだ。'],
      love: ['愛してるなら、指輪くらいしてきて。', '……左手の薬指、見てから言って。'],
    },
    startItems: ['ring'],
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
    chatReplies: {
      coming_home: ['プリン、忘れないでね😋', 'はーい！ プリンプリン〜😋'],
      sorry_generic: ['……ごめんって、まさかプリン？', '謝る前に、コンビニ寄って。'],
    },
    causes: [
      {
        id: 'pudding_promise',
        title: 'プリンの約束忘れ',
        resolution: { all: ['ordered:limited_pudding', 'bought:konbini_pudding', 'chat:pudding'] },
        angerLines: ['プリンは？', '駅ナカ限定の、とろけるやつ。1か月前から言ってたよね？', 'あなたの冷蔵庫の段、今日から私のものです。'],
        successLine: 'コンビニプリンでつなぐ作戦ね。……明日の限定プリン、ふたつとも私のだから。',
        grudging: true,
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
    chatReplies: {
      coming_home: ['はーい！ ネクタイ姿、楽しみにしてる☺️'],
      sorry_generic: ['何が？ ……ネクタイ、ちゃんとしてるよね？ 電話する'],
    },
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
  // ---------------------------------------------------------------- 14
  {
    id: 'morning_fight',
    title: '朝、喧嘩して出てきた',
    chatReplies: {
      '*': ['朝のことは、なかったことになったの？'],
      'love:after': ['……私も、朝は言いすぎた。'],
      'sorry_generic:after': ['……もういいよ。私も、ごめん。'],
      coming_home: ['……勝手にすれば。', '「もういい」って言ったよね。', '帰ってくるんだ。ふーん。'],
      'coming_home:after': ['……気をつけて帰ってきて。'],
      sorry_generic: ['朝もそれ言ってたよね。「悪かったって言ってるだろ」って。', '謝ればいいと思ってるでしょ。', '何が悪かったのか、言えるようになってから謝って。'],
      love: ['朝あんなこと言っておいて？', '今さら？'],
    },
    causes: [
      {
        id: 'morning_fight',
        title: '朝の喧嘩',
        resolution: { all: ['bought:ice_cream', 'chat:morning_sorry'] },
        angerLines: [
          '……朝のこと、まだ終わってないから。',
          '「悪かったって言ってるだろ」って、それ謝ってないよね？',
          '明日からあなたの朝ごはんは、自己責任です。',
        ],
        successLine: '……アイス、半分こなら許す。',
        grudging: true,
      },
    ],
    clues: [
      { at: 'app:chat', cause: 'morning_fight', text: '（あなた）だから悪かったって言ってるだろ（7:46）' },
      { at: 'app:chat', cause: 'morning_fight', text: 'もういい。（7:48）' },
      { at: 'spot:door', cause: 'morning_fight', text: 'ドアの向こうから、いつもの「おかえり」の気配がまったくしない。' },
      { at: 'slot:bag', cause: 'morning_fight', text: '朝、玄関で投げつけられたスリッパが鞄に挟まったままだ。' },
      { at: 'app:memo', cause: 'morning_fight', text: '【自分用】妻の機嫌が直るもの: ちょっと高いバニラアイス' },
    ],
  },
  // ---------------------------------------------------------------- 15
  {
    id: 'wrong_send',
    title: '妻の悪口を妻に誤爆した',
    asleep: '寝室から、静かな寝息が聞こえる。……誤爆は、誰にも読まれずに闇へ消えた。',
    chatReplies: {
      'sorry_generic:after': ['ん……なにが……？（寝ぼけた返信）'],
      'love:after': ['ん……わたしも……（寝ぼけた返信）'],
      '*': ['それより「鬼軍曹」の説明は？'],
      coming_home: ['……鬼軍曹が、お待ちしております。', '通知で起きた。「鬼軍曹かよｗ」……ね。', '口うるさい嫁で悪かったわね。気をつけて。'],
      'coming_home:after': ['ん……きをつけて……（寝ぼけた返信）'],
      sorry_generic: ['何がごめん？ 「鬼軍曹」のこと？', '謝るくらいなら最初から送らないで。……友達に、ね。', 'ごめんで「ｗ」は消えないよ。'],
      love: ['鬼軍曹を愛してるの？ ふーん。', 'さっき「口うるさい」って言ってた人が？'],
    },
    causes: [
      {
        id: 'wrong_send',
        title: '悪口の誤爆',
        resolution: 'unsent:wrong_send',
        angerLines: [
          '「鬼軍曹」って、誰のこと？',
          '口うるさくて悪かったわね。今から2時間、黙って説教を聞いてもらいます。',
          '……あ、ちなみにスクショは撮ってあるから。',
        ],
        successLine: '今日は早く寝ちゃった。……なんか送ってきた？（……セーフ）',
      },
    ],
    clues: [
      {
        at: 'app:chat',
        cause: 'wrong_send',
        id: 'wrong_send',
        unsendable: true,
        text: '（あなた）うちの嫁、最近マジで口うるさくてさ〜 鬼軍曹かよｗ（22:58）',
      },
      { at: 'app:chat', cause: 'wrong_send', text: '今日は疲れたから先に寝るね。0時までには寝る〜（21:00）' },
      {
        at: 'notice',
        cause: 'wrong_send',
        text: '💬 送信済み: 妻「うちの嫁、最近マジで…」 ……ん？ 友達に送ったはずでは？',
        hiddenWhen: 'unsent:wrong_send',
      },
    ],
  },
  // ---------------------------------------------------------------- 16
  {
    id: 'broken_mug',
    title: '妻のマグカップを割って隠している',
    chatReplies: {
      '*': ['それより、私のマグカップは？'],
      coming_home: ['青いマグカップ、知ってたら一緒に連れて帰ってきて。', '帰ってきたら、マグカップの話ね。'],
      sorry_generic: ['……ごめんって、まさかマグカップ？', '謝るってことは、知ってるんだ。'],
      love: ['あのマグカップも、あなたがくれたやつなんだけど。'],
    },
    startItems: ['broken_mug'],
    causes: [
      {
        id: 'broken_mug',
        title: 'マグカップ隠蔽',
        resolution: { all: ['used:glue', 'chat:mug_sorry'] },
        angerLines: [
          '青いマグカップ、知らないって言ったよね？',
          '……ゴミ箱の奥から、破片が出てきたんだけど。',
          'あなたのマグカップ、今日から紙コップです。',
        ],
        successLine: '……接着剤のあと、味があるかもね。正直に言ってくれてありがと。',
      },
    ],
    clues: [
      {
        at: 'slot:bag',
        cause: 'broken_mug',
        text: '鞄の奥に、新聞紙でくるんだ破片……。昨日割った妻の青いマグカップだ。隠したままだった。',
        hiddenWhen: 'used:glue',
      },
      { at: 'app:chat', cause: 'broken_mug', unread: true, text: '私の青いマグカップ知らない？ 食器棚にないんだけど（21:30）' },
      { at: 'app:memo', cause: 'broken_mug', text: '【自分用】マグカップの件、今日こそ言う' },
    ],
  },
  // ---------------------------------------------------------------- 17
  {
    id: 'tv_interview',
    title: 'テレビのインタビューで妻の悪口',
    chatReplies: {
      '*': ['それより、テレビの「鬼」の件は？'],
      coming_home: ['鬼の家に帰ってくるの？', '「うちの嫁は鬼です」……鬼がお待ちしております。', '全国放送の鬼より。気をつけてね。'],
      'coming_home:after': ['……鬼、待ってる。'],
      sorry_generic: ['謝るくらいなら、テレビで言わないで。', 'ごめんじゃ取り消せないよね。全国放送だよ？', '鬼に謝っても無駄だよ。'],
      love: ['鬼を愛してるの？', 'テレビでそれ言ってくれたら、許したかもね。'],
    },
    visuals: ['window_tv'],
    causes: [
      {
        id: 'tv_interview',
        title: 'テレビで悪口',
        resolution: { all: ['ordered:onsen_ticket', 'chat:tv_sorry'] },
        angerLines: [
          '「うちの嫁は鬼です」……全国放送で。',
          'モザイクなしで、ばっちり映ってたよ。',
          'お望みどおり、鬼になってあげる。',
        ],
        successLine: '温泉……？ まあ、鬼もたまには休みたいしね。',
      },
    ],
    clues: [
      { at: 'notice', cause: 'tv_interview', image: 'tv_capture', text: '📺 見逃し配信「街の声: 新橋のサラリーマンに聞いた 奥さんってどんな人？」' },
      { at: 'app:chat', cause: 'tv_interview', unread: true, text: 'ねえ、今テレビに出てたよね？ 「うちの嫁は鬼です」ってどういうこと？（22:30）' },
      { at: 'spot:window', cause: 'tv_interview', text: '窓の向こうでテレビの青い光がチラチラしている。……同じ場面を何度も巻き戻しているようだ。' },
      { at: 'app:calendar', cause: 'tv_interview', text: '今日 19:00 新橋で飲み会（駅前でテレビの取材に捕まった気がする）' },
    ],
  },
  // ---------------------------------------------------------------- 18
  {
    id: 'kouhai_chat',
    title: '後輩女子との仲良しチャットがバレた',
    chatReplies: {
      '*': ['話をそらさないで。「また二人で」は？'],
      coming_home: ['「また二人で」の説明を持って帰ってきて。', '佐藤さんのところじゃなくて、こっちに帰ってくるんだ？'],
      sorry_generic: ['何に謝ってるの？ やましいことがあったってこと？', 'ごめんじゃなくて、説明して。'],
      love: ['佐藤さんにも言ってる？', 'ハート付きで返したら？ 佐藤さんみたいに。'],
    },
    causes: [
      {
        id: 'kouhai_chat',
        title: '後輩とのチャット',
        resolution: { all: ['chat:kouhai_photo', 'chat:kouhai_explain'] },
        angerLines: [
          '「先輩♡」……ハート、ついてたね。',
          '「また二人で」？ どこへ？ 何回目？',
          '家のタブレット、今日からリビングのど真ん中に置きます。',
        ],
        successLine: '8人で焼き鳥ね。……部長の隣で目が死んでる写真、保存しといた。',
        grudging: true,
      },
    ],
    clues: [
      { at: 'notice', cause: 'kouhai_chat', image: 'kouhai_notice', text: '💬 佐藤（後輩）: 先輩、今日も楽しかったです♡ また二人で行きましょ〜' },
      { at: 'app:chat', cause: 'kouhai_chat', unread: true, text: '家のタブレットに通知来てたんだけど。「また二人で」って何？（22:50）' },
      { at: 'app:calendar', cause: 'kouhai_chat', text: '今日 18:30 課の飲み会（8名）＠焼き鳥 とり吉' },
    ],
  },

  // ---------------------------------------------------------------- 19〜21 SNS で妻の悪口がバズった（3パターン。同じ日には重ならない）
  {
    id: 'sns_kowai',
    title: 'SNSで「嫁がこわい」がバズった',
    chatReplies: {
      '*': ['それより、3.4万いいねの投稿は？'],
      coming_home: ['ホラーの家に帰ってくるの？ 勇気あるね。', '玄関、開けるの怖いんでしょ？ 無理しなくていいよ。', '3.4万人が応援してるよ。「強く生きて」って。'],
      'coming_home:after': ['……ホラー、ちょっとだけ休業してあげる。'],
      sorry_generic: ['謝るくらいなら、最初からつぶやかないで。', 'ごめんで3.4万いいねは消えないよね。', '私に謝る前に、まず投稿どうにかしたら？'],
      love: ['こわい嫁を愛してるの？ 3.4万人に言ってみたら？', 'それもつぶやけば？ バズるかもよ。'],
    },
    conflictsWith: ['sns_meshi', 'sns_meiru'],
    causes: [
      {
        id: 'sns_kowai',
        title: 'SNSで悪口がバズった',
        resolution: { all: ['deleted:post_kowai', 'bought:sweets', 'chat:sns_kowai_sorry'] },
        angerLines: ['こわい？ ……ふふ。', '3万4千人が、あなたの奥さんはこわいって知ってるの。', 'じゃあ、期待に応えないとね。'],
        successLine: '……スイーツに免じて、今日は「こわくない嫁」でいてあげる。',
        grudging: true,
      },
    ],
    clues: [
      {
        at: 'app:sns',
        cause: 'sns_kowai',
        id: 'post_kowai',
        deletable: true,
        text: '@tanaka_salaryman（あなた）\n「うちの嫁、マジでこわい。玄関開けるのが毎晩ホラー」\n🔁 1.2万　♥ 3.4万（21:12）',
      },
      {
        at: 'app:sns',
        text: 'リプライ: 「奥さん見てますよ」「これ特定されてない？」「わかりみが深い」「強く生きて」',
      },
      {
        at: 'notice',
        cause: 'sns_kowai',
        text: '📣 つぶやきー: あなたの投稿が話題になっています（🔁1.2万）',
        hiddenWhen: 'deleted:post_kowai',
      },
      { at: 'app:chat', cause: 'sns_kowai', unread: true, text: '「玄関開けるのが毎晩ホラー」……3.4万いいね、おめでとう（22:31）' },
    ],
  },
  {
    id: 'sns_meshi',
    title: 'SNSで「嫁の飯が不味い」がバズった',
    chatReplies: {
      '*': ['それより、トレンド入りした投稿は？ お母さんも見てるんだけど。'],
      coming_home: ['マズい飯の家に帰ってくるの？', '外で食べてくれば？ 唯一の楽しみなんでしょ。', '今日もマズいご飯、用意しとくね。'],
      'coming_home:after': ['……卵焼き、甘いのでいい？'],
      sorry_generic: ['謝るくらいなら、最初からつぶやかないで。', 'お母さんにも謝ってくれる？ 電話きたんだけど。', 'ごめんでトレンドは消えないよ。'],
      love: ['マズい飯を作る嫁を？', '「唯一の楽しみ」はどうしたの？'],
    },
    conflictsWith: ['sns_kowai', 'sns_meiru'],
    causes: [
      {
        id: 'sns_meshi',
        title: 'SNSで悪口がバズった',
        resolution: { all: ['deleted:post_meshi', 'bought:eggs', 'chat:sns_meshi_sorry'] },
        angerLines: ['マズい飯、7年間ありがとうございました。', '明日からは、お好きな外食をどうぞ。一生。', '……レシピ本、全部捨てといたから。'],
        successLine: '卵焼き、明日の朝ね。……マズかったら、私が投稿するから。',
        grudging: true,
      },
    ],
    clues: [
      {
        at: 'app:sns',
        cause: 'sns_meshi',
        id: 'post_meshi',
        deletable: true,
        text: '@tanaka_salaryman（あなた）\n「嫁の飯が今日もマズい。外で食べて帰るのが唯一の楽しみ」\n🔁 2.8万　♥ 5.1万（21:12）',
      },
      {
        at: 'app:sns',
        text: 'リプライ: 「奥さん見てますよ」「これ特定されてない？」「わかりみが深い」「強く生きて」',
      },
      {
        at: 'notice',
        cause: 'sns_meshi',
        text: '📣 つぶやきー: あなたの投稿が話題になっています（🔁2.8万）',
        hiddenWhen: 'deleted:post_meshi',
      },
      { at: 'app:chat', cause: 'sns_meshi', unread: true, text: '「嫁の飯がマズい」がトレンド入りしてるんだけど。お母さんからも電話来た（22:05）' },
    ],
  },
  {
    id: 'sns_meiru',
    title: 'SNSで「嫁といると気が滅入る」がバズった',
    chatReplies: {
      '*': ['それより、「気が滅入る」の投稿は？'],
      'love:after': ['……ため息、ひとつ減ったかも。'],
      coming_home: ['だから、帰ってこなくていいよ。', 'どこに帰るの？ 気が滅入る家に？', 'ため息ついて待ってるね。'],
      'coming_home:after': ['……帰ってきていいよ。'],
      sorry_generic: ['謝るくらいなら、最初からつぶやかないで。', 'ごめんでため息が減ると思う？', 'その「ごめん」、何いいねもらえるの？'],
      love: ['気が滅入る相手を愛してるの？ 器用だね。', '空気が重い家に、愛があるんだ。'],
    },
    conflictsWith: ['sns_kowai', 'sns_meshi'],
    causes: [
      {
        id: 'sns_meiru',
        title: 'SNSで悪口がバズった',
        resolution: { all: ['deleted:post_meiru', 'ordered:spa_ticket', 'chat:sns_meiru_sorry'] },
        angerLines: ['気が滅入る？ 奇遇ね。私もよ。', 'ため息、ついてあげましょうか。……はぁ〜〜〜〜〜。', '今夜から、空気の重さを思い知らせてあげる。'],
        successLine: 'スパ……。まあ、ため息はひとつ減ったかな。',
        grudging: true,
      },
    ],
    clues: [
      {
        at: 'app:sns',
        cause: 'sns_meiru',
        id: 'post_meiru',
        deletable: true,
        text: '@tanaka_salaryman（あなた）\n「家に帰ると気が滅入る。嫁のため息で空気が重い」\n🔁 8千　♥ 1.9万（21:12）',
      },
      {
        at: 'app:sns',
        text: 'リプライ: 「奥さん見てますよ」「これ特定されてない？」「わかりみが深い」「強く生きて」',
      },
      {
        at: 'notice',
        cause: 'sns_meiru',
        text: '📣 つぶやきー: あなたの投稿が話題になっています（🔁8千）',
        hiddenWhen: 'deleted:post_meiru',
      },
      { at: 'app:chat', cause: 'sns_meiru', unread: true, text: '気が滅入るなら、帰ってこなくていいよ（22:47）' },
    ],
  },
  // ---------------------------------------------------------------- 22
  {
    id: 'av_left_on',
    title: '昨夜アダルトビデオをつけっぱなしで寝落ちした',
    chatReplies: {
      '*': ['それより、テレビの「続きから再生」の件は？'],
      coming_home: ['帰ってきたら、あの番組の話ね。', '「続きから再生」、しないでね。'],
      sorry_generic: ['ごめんじゃなくて、まず解約して。', '謝るってことは、何のことかわかってるんだ。'],
      love: ['……テレビの女優さんにも言ってた？'],
    },
    startOrders: ['av_subscription'],
    causes: [
      {
        id: 'av_left_on',
        title: 'AVつけっぱなし寝落ち',
        resolution: { all: ['canceled:av_subscription', 'chat:av_sorry'] },
        angerLines: [
          '朝、リビングのテレビがついてたの。',
          '……音量、32だったわよ。',
          'お隣の奥さんに「昨夜はお楽しみでしたね」って言われた私の気持ち、わかる？',
          'テレビは今日から、リビングに一台もありません。',
        ],
        successLine: '……解約したならいいわ。リモコンは当分、私の管理です。',
        grudging: true,
      },
    ],
    clues: [
      { at: 'app:chat', cause: 'av_left_on', unread: true, text: '朝起きたらリビングのテレビ、つけっぱなしだったんだけど。……あれ、何？（7:12）' },
      { at: 'app:shop', cause: 'av_left_on', text: '注文履歴に、見覚えのある月額プランがある……。0:00 の自動更新までなら解約できる。' },
      { at: 'notice', cause: 'av_left_on', text: '📺 ミッドナイトシアター＋: 昨夜の「続きから再生」はこちら', hiddenWhen: 'canceled:av_subscription' },
      { at: 'spot:window', cause: 'av_left_on', text: 'リビングのテレビの前に、リモコンが一本だけ、正座するように置かれている。' },
    ],
  },
  // ---------------------------------------------------------------- 23
  {
    id: 'gravure_found',
    title: '隠していた水着グラビア写真集が見つかった',
    chatReplies: {
      '*': ['それより、玄関の写真集は？'],
      coming_home: ['玄関に置いといたから。お出迎えしてくれると思うよ。', 'はーい。お友達（写真集）が玄関で待ってるよ。'],
      sorry_generic: ['何に謝ってるの？ 写真集？ 隠してたこと？', 'ごめんで済むなら、付箋は要らないよね。'],
      love: ['写真集の子にも言ってる？', '水着じゃない私に？'],
    },
    pickups: [
      {
        at: 'floor',
        item: 'gravure_book',
        label: '写真集を拾う',
        visual: 'item_gravure_book',
        reveal: {
          title: '『夏、渚で。』',
          image: 'gravure_page',
          text: '拾い上げると、付箋のページがひとりでに開いた。……ここに付箋を貼ったのは、自分だ。',
        },
      },
    ],
    visuals: ['item_gravure_book'],
    causes: [
      {
        id: 'gravure_found',
        title: 'グラビア写真集の発覚',
        resolution: { all: ['discarded:gravure_book', 'chat:gravure_sorry'] },
        angerLines: [
          '『夏、渚で。』……いい本ね。',
          'ベッドの下を掃除してたら、出てきたの。付箋まで貼ってあったわよ。',
          '今日からあなたの寝床は、そのベッドの下です。',
        ],
        successLine: '資源ゴミの日、ちゃんと覚えてたんだ。……付箋のページ、私も見たけどね。',
        grudging: true,
      },
    ],
    clues: [
      {
        at: 'spot:floor',
        cause: 'gravure_found',
        text: '玄関マットの上に、ベッドの下に隠していたはずの水着グラビア写真集が……きれいに置かれている。付箋つきで。',
        hiddenWhen: 'picked:gravure_book',
      },
      { at: 'app:chat', cause: 'gravure_found', unread: true, text: 'ベッドの下、掃除しといたよ。玄関に置いといたから（14:20）' },
      { at: 'app:memo', cause: 'gravure_found', text: '資源ゴミ（古紙・雑誌）: 今夜のうちに集積所へ出してOK' },
    ],
  },

  // ================================================================ 異変なし（ニセ異変入り）
  {
    id: 'ramen_receipt',
    title: '異変なし: 夜の蝶',
    asleep: 'リビングの灯りだけ、つけておいてくれていた。……ラーメンの匂いは、明日の朝までに消えるだろうか。',
    causes: [],
    startItems: ['ramen_receipt'],
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
    chatReplies: {
      coming_home: ['はーい！ 私ももうすぐ帰る〜', 'はーい！ こっちはまだ女子会中〜🍷'],
      apology_dinner: ['ご飯？ 今日は私も友達と外だよ？ 誰と間違えてるの？ 電話する'],
    },
    causes: [],
    successLine: 'おかえり〜。私も今帰ってきたとこ！',
    clues: [
      { at: 'spot:door', text: 'カレーのいい匂いがする……。よく嗅ぐと、隣の部屋の換気扇からだ。' },
      { at: 'app:chat', text: '今日は友達とご飯行ってくる〜。そっちも楽しんで！（17:20）' },
      { at: 'spot:hallway', text: '廊下に不在票が落ちている……と思ったら、お隣さん宛てだった。' },
    ],
  },
  {
    id: 'wife_away',
    title: '異変なし: 妻は実家に帰省中',
    chatReplies: {
      coming_home: ['はーい。私いないけど、鍵ちゃんと持ってる？', '実家だよ〜 冷蔵庫に作り置きあるからね'],
      apology_dinner: ['え、ご飯？ 私、実家だけど……。誰のご飯の話？ 電話する'],
      sorry_generic: ['何が？？ 私がいない間に何したの？ 電話する'],
    },
    causes: [],
    homeAlone: true,
    visuals: ['window_dark'],
    successLine: '（……そうだ、妻は実家に帰ってるんだった。カップ麺でも食べて寝よう）',
    clues: [
      { at: 'spot:window', text: '部屋の灯りが真っ暗だ……！ まさか、家出……!?' },
      { at: 'spot:door', text: '郵便受けにチラシが2日分たまっている。' },
      { at: 'app:calendar', text: '今日〜日曜: 妻、実家に帰省（お義母さんの手伝い）' },
      { at: 'app:chat', text: '実家着いた〜！ お母さんがよろしくって（18:20）' },
    ],
  },
];

export const SCENARIO_MAP: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
