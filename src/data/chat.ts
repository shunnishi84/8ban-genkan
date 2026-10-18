import type { ChatTemplate } from '../core/types';

/**
 * 送信できるチャットの定型文。
 * その日の原因の resolution に `chat:<id>` が含まれていれば「関係ある」扱い。
 * 関係ない謝罪を送ると妻から電話で問い詰められて時間を失う（neutral を除く）。
 */
export const CHAT_TEMPLATES: ChatTemplate[] = [
  {
    id: 'coming_home',
    text: '今から帰るね',
    neutral: true,
    replyRelevant: 'はーい',
    replyIrrelevant: 'はーい。気をつけてね',
  },
  {
    id: 'apology_dinner',
    text: 'ご飯作ってくれてたのにごめん！飲み会って伝え忘れてた…明日の朝ちゃんと食べる',
    replyRelevant: '……明日の朝、全部食べてね。',
    replyIrrelevant: 'え、ご飯？今日は作ってないけど…何の話？ ちょっと電話するね',
  },
  {
    id: 'report_detergent',
    text: '洗剤、いつものボタニカルを特急便で頼んだ！明日の朝届くよ',
    requires: 'ordered:detergent_refill',
    replyRelevant: 'ほんと？助かる〜',
    replyIrrelevant: '洗剤？まだたくさんあるけど…？ 電話するね',
  },
  {
    id: 'birthday',
    text: '誕生日おめでとう！遅くなってごめん。花束、明日の朝届くようにした',
    requires: 'ordered:bouquet',
    replyRelevant: '……覚えてたんだ。',
    replyIrrelevant: '…私の誕生日、来月だけど？ 誰の誕生日と間違えたの？ 電話します',
  },
  {
    id: 'anniversary',
    text: '結婚記念日おめでとう。プレゼント、明日の朝届くよ',
    requires: 'ordered:pair_glass',
    replyRelevant: '7年目だね。',
    replyIrrelevant: '記念日？…それ誰との記念日？ 電話するね',
  },
  {
    id: 'golf_cancel',
    text: 'ゴルフクラブの注文、キャンセルした。酔ってポチった…ごめん',
    requires: 'canceled:golf_club',
    replyRelevant: '次やったらカード没収ね',
    replyIrrelevant: 'ゴルフクラブ？？ 何の話？ 電話します',
  },
  {
    id: 'garbage_done',
    text: 'ゴミ、出しといたよ。朝はごめん',
    requires: 'discarded:garbage_bag',
    replyRelevant: '……「出しといた」じゃなくて、朝の約束だったよね。',
    replyIrrelevant: '？ゴミは朝私が出したけど…何を捨てたの？ 電話するね',
  },
  {
    id: 'kashiori',
    text: 'お義母さんの手土産、老舗の菓子折りを特急便で頼んだ。明日の朝届く！',
    requires: 'ordered:kashiori',
    replyRelevant: 'さすが！お母さん喜ぶよ',
    replyIrrelevant: 'お母さん来るの来週だけど…？ 電話するね',
  },
  {
    id: 'umbrella',
    text: '傘、電車に忘れた…ごめん。同じ傘を注文した、明日の朝届く',
    requires: 'ordered:umbrella_same',
    replyRelevant: '…限定色だったんだからね',
    replyIrrelevant: '傘？？ 何本買う気？ 電話するね',
  },
  {
    id: 'pudding',
    text: '限定プリン売り切れてた…お取り寄せ頼んだ！明日の朝届く。今日はコンビニプリンで許して',
    requires: 'ordered:limited_pudding',
    replyRelevant: '……ふたつ食べていいなら許す',
    replyIrrelevant: 'プリン？ 何の話？ 電話するね',
  },
  {
    id: 'morning_sorry',
    text: '朝はごめん。言いすぎた。アイス買ったから一緒に食べよう',
    requires: 'bought:ice_cream',
    replyRelevant: '……ハーフ＆ハーフね',
    replyIrrelevant: '朝？ 何かあったっけ？ ……電話するね',
  },
  {
    id: 'mug_sorry',
    text: '青いマグカップ、昨日割っちゃって隠してた。ごめん。接着剤で直した',
    requires: 'used:glue',
    replyRelevant: '……正直に言ったから、半分許す',
    replyIrrelevant: 'マグカップ？？ 何を割ったの？ 電話します',
  },
  {
    id: 'tv_sorry',
    text: 'テレビのあれ、編集で切られてて…本当は「嫁は鬼のように優しい」って言ったんだ。温泉予約したから一緒に行こう',
    requires: 'ordered:onsen_ticket',
    replyRelevant: '……苦しい言い訳。でも温泉は行く',
    replyIrrelevant: 'テレビ？ 何に出たの？ 電話するね',
  },
  {
    id: 'kouhai_photo',
    text: '【写真】今日の飲み会の集合写真。課の8人で焼き鳥だったよ',
    // 飲み会の集合写真は、後輩とのチャットがバレた日にしか手元にない（出番もない）
    onlyWith: 'kouhai_chat',
    image: 'group_photo',
    replyRelevant: '……部長の隣で目が死んでるね',
    replyIrrelevant: '急に写真？ 何かあったの？ 電話するね',
  },
  {
    id: 'kouhai_explain',
    text: '佐藤さんは同じ課の後輩で、「二人で」は課のノリ。誤解させる返信はもうしない',
    requires: 'chat:kouhai_photo',
    replyRelevant: 'ふーん。……信じてあげる',
    replyIrrelevant: '佐藤さんって誰？？ 今すぐ電話します',
  },
  // ゴミ出し忘れの日だけ出る、最悪の逆ギレ。送った瞬間に魔王城へ直行
  {
    id: 'garbage_yourself',
    text: 'だったら自分で捨てておいてくれよ',
    onlyWith: 'garbage_forgot',
    finale: 'castle',
    replyRelevant: '…………は？',
    replyIrrelevant: '…………は？',
    demonLines: ['「自分で捨てておいてくれよ」。', '……ええ、捨ててあげる。何もかも。'],
  },
  // AV つけっぱなしの日だけ出る「とぼける」。バレているのでもちろん火に油
  {
    id: 'av_drama',
    text: '最近のドラマは、ああいうシーンがあるんだよ',
    onlyWith: 'av_left_on',
    replyRelevant: 'へえ。「ミッドナイトシアター＋」のドラマね。',
    replyIrrelevant: 'へえ。「ミッドナイトシアター＋」のドラマね。',
    provokeLines: ['「最近のドラマ」。', '……じゃあ、そのドラマのタイトル、読み上げてあげようか？', '「続きから再生」、今ここで一緒に観る？'],
  },
  {
    id: 'av_nanino',
    text: '何の話？',
    onlyWith: 'av_left_on',
    replyRelevant: '……何の話か、帰ってきたら教えてあげる。',
    replyIrrelevant: '……何の話か、帰ってきたら教えてあげる。',
    provokeLines: ['「何の話？」って聞いたよね。', '視聴履歴、全部スクショしておいたから。', '何の話か、朝までじっくり説明してあげる。'],
  },
  {
    id: 'av_neko',
    text: '寝てる間にリモコン踏んじゃったのかも',
    onlyWith: 'av_left_on',
    replyRelevant: '踏んだら、月額プランに加入するんだ。',
    replyIrrelevant: '踏んだら、月額プランに加入するんだ。',
    provokeLines: ['リモコンを踏んだら、', '会員登録して、作品を選んで、音量を32にするのね。', '……器用な足ね。明日から靴下二重にしてあげる。'],
  },
  {
    id: 'av_shakai',
    text: 'あれは社会派のドキュメンタリーだよ。勉強のため',
    onlyWith: 'av_left_on',
    replyRelevant: '社会派。……何を勉強してたの？',
    replyIrrelevant: '社会派。……何を勉強してたの？',
    provokeLines: ['社会派ドキュメンタリー。', '……じゃあ、帰ったら感想文を原稿用紙5枚で提出してね。', '私が採点するから。'],
  },
  // 後輩チャットの日だけ出る「余計なひと言」。送ると火に油
  {
    id: 'kouhai_kawaii',
    text: 'かわいいだろ？ お前と違って',
    onlyWith: 'kouhai_chat',
    replyRelevant: '……へえ。',
    replyIrrelevant: '……へえ。',
    provokeLines: ['「お前と違って」。', '……そう。じゃあ、かわいくない嫁は今夜からリビングで寝るわね。', 'あなたが。'],
  },
  {
    id: 'kouhai_nakayoshi',
    text: '仲良くしてる後輩。それだけ',
    onlyWith: 'kouhai_chat',
    replyRelevant: '仲良く、ね。',
    replyIrrelevant: '仲良く、ね。',
    provokeLines: ['「仲良くしてる」。……ハート付きで？', '私とはここ半年、そんなに仲良くしてもらった記憶がないけど。', 'じっくり聞かせて。どれくらい仲良しなのか。'],
  },
  {
    id: 'kouhai_iidaro',
    text: '別にいいだろ、後輩と飲むくらい',
    onlyWith: 'kouhai_chat',
    replyRelevant: 'そうね。いいわよ。',
    replyIrrelevant: 'そうね。いいわよ。',
    provokeLines: ['「いいわよ」って言ったわよね。', '……本当にいいと思ってると思った？', '私も来週、男の後輩と「二人で」飲みに行ってくるわね。いいわよね？'],
  },
  {
    id: 'kouhai_shitto',
    text: '嫉妬してんの？ かわいいとこあるじゃん',
    onlyWith: 'kouhai_chat',
    replyRelevant: 'は？',
    replyIrrelevant: 'は？',
    provokeLines: ['嫉妬？ ……ふふ。', 'かわいいとこ、見せてあげましょうか。', '……あなたのお小遣い、今月から半分ね。'],
  },
  {
    id: 'sns_kowai_sorry',
    text: 'SNSの投稿、消しました。こわいなんて嘘です。いつも感謝してます。お詫びにスイーツ買いました',
    requires: { all: ['deleted:post_kowai', 'bought:sweets'] },
    replyRelevant: '……3.4万人に「こわい嫁」って思われたままだけどね',
    replyIrrelevant: 'SNS？ 何か投稿したの？ ……電話するね',
  },
  {
    id: 'sns_meshi_sorry',
    text: '投稿消しました。飯がマズいなんて大嘘。明日の朝ごはんは俺が作ります（卵焼き）',
    requires: { all: ['deleted:post_meshi', 'bought:eggs'] },
    replyRelevant: '……焦がしたら、もう一回バズらせてあげる',
    replyIrrelevant: 'ごはん？ 何の話？ 電話するね',
  },
  {
    id: 'sns_meiru_sorry',
    text: '投稿消しました。本当にごめん。週末、スパのペアチケット取ったので一緒に行こう',
    requires: { all: ['deleted:post_meiru', 'ordered:spa_ticket'] },
    replyRelevant: '……気が滅入らないように、ちゃんとエスコートしてね',
    replyIrrelevant: 'スパ？ 急にどうしたの？ 電話するね',
  },
  {
    id: 'av_sorry',
    text: 'テレビの件、本当にすみませんでした。あのサブスクは解約しました',
    requires: 'canceled:av_subscription',
    replyRelevant: '……リモコンは、しばらく私が預かります',
    replyIrrelevant: 'テレビの件？ 何のこと？ 電話するね',
  },
  {
    id: 'gravure_sorry',
    text: '写真集、資源ゴミに出してきました。すみませんでした',
    requires: 'discarded:gravure_book',
    replyRelevant: '……ベッドの下、他にも何かないでしょうね',
    replyIrrelevant: '写真集？？ 何の写真集？ 電話します',
  },
  // ---------------------------------------------------------------- 暴言（おふざけ枠）
  // 送ると、どんなに火種を消していても魔王化した妻が待っている。
  {
    id: 'insult_oni',
    text: 'うるせえ、この鬼嫁',
    drunkText: ['うるせえんだよ、この鬼嫁！ 角でも生えてんのか？', 'うるっせぇ〜〜！ 鬼嫁！ 節分に豆まいてやろうか！', 'おにーよめー！！ 鬼ヶ島に帰れ〜〜ｗｗｗ 桃太郎よんでくるぞ〜〜'],
    insult: true,
    replyRelevant: '',
    replyIrrelevant: '既読',
    demonLines: [
      '……鬼嫁？',
      'そう。鬼がお望みなのね。',
      'いいえ。鬼じゃ足りないわね。',
      '今夜から私は、この家の魔王です。',
    ],
  },
  {
    id: 'insult_komakai',
    text: 'いちいち細けえんだよ！ほっとけ！',
    drunkText: ['いちいち細けえんだよ！ 小姑か！', 'こまけぇ〜〜！ 電卓かお前は！ 家計簿と結婚しろ！', 'こまかすぎて顕微鏡いるわｗｗ ミジンコかよ〜〜 ほっとけほっとけ〜〜'],
    insult: true,
    replyRelevant: '',
    replyIrrelevant: '既読',
    demonLines: [
      '細かい？ ふふ……',
      'あなたが脱ぎっぱなしにした靴下の数、言ってあげましょうか。',
      '三百六十五足よ。今年だけで。',
      'ほっといてあげる。……永遠にね。',
    ],
  },
  {
    id: 'insult_kaachan',
    text: 'お前は俺の母ちゃんか！説教ならよそでやれ',
    drunkText: ['お前は俺の母ちゃんか！ 説教ならよそでやれ！', '母ちゃん2号かよ！ 本物の母ちゃんのほうがまだ優しいわ！', 'かーちゃーん！！ おこづかいちょーだーい！！ ｗｗｗ 説教はおことわりでーす'],
    insult: true,
    replyRelevant: '',
    replyIrrelevant: '既読',
    demonLines: [
      'お義母さんには、さっき電話しておいたわ。',
      '「育て方を間違えた」って泣いてらしたわよ。',
      'これからは私が、もう一度あなたを育て直してあげる。',
    ],
  },
  {
    id: 'insult_gunsou',
    text: '黙って寝てろ、この鬼軍曹',
    drunkText: ['黙って寝てろ、この鬼軍曹！ 敬礼でもしとけ！', 'イエッサー！ 鬼軍曹どの〜！ 本日は帰還しないであります！', 'ぐんそーどのー！！ ほんじつはー 無断外泊をー 決行するでありまーーす！！ｗｗ'],
    insult: true,
    replyRelevant: '',
    replyIrrelevant: '既読',
    demonLines: [
      '鬼軍曹……？ ずいぶん階級を低く見られたものね。',
      '本日付けで、大元帥に昇進しました。',
      '総員、玄関で正座。……総員って、あなた一人だけど。',
    ],
  },
  // 罠: どんな日でも関係ない扱いになり、問い詰められる
  {
    id: 'love',
    text: 'いつもありがとう。愛してるよ',
    replyRelevant: '',
    replyIrrelevant: '……急にどうしたの？ 何かやましいことでも？ 今から電話します',
  },
  {
    id: 'sorry_generic',
    text: 'ほんとにごめん…',
    replyRelevant: '',
    replyIrrelevant: '何が？？ ちょっと電話するね',
  },
];

/** 火種を全部消して仲直りしたあとの返事（シナリオ側に `:after` が無いとき）。電話は来ない */
export const AFTER_REPLIES: Record<string, string[]> = {
  coming_home: ['……気をつけて帰ってきてね。', 'はいはい。寄り道しないでね。', '……待ってる。'],
  sorry_generic: ['……もういいって。次は無いからね。', 'わかったから。早く帰ってきて。', '何回謝るの。……もういいよ。'],
  love: ['……はいはい。', '……知ってる。', '調子いいんだから。'],
};

/** 日付をまたいでから送ったときの返事（その日の状況に合う返事が無いとき） */
export const LATE_REPLIES: Record<string, string[]> = {
  coming_home: ['今から？ もう日付変わってるけど。', '「今から」が何時かわかってる？', 'はいはい。終電、間に合うといいね。'],
  sorry_generic: ['こんな時間に「ごめん」って、何したの？ 電話する', '……日付変わってから謝られても。何？ 電話するね'],
  love: ['こんな時間に？ 酔ってるでしょ。電話する', '……深夜の「愛してる」は信用しないことにしてるの。電話するね'],
};

/** 暴言を送ったあとの妻の返事。何を送っても取りつく島がない（順番に使う） */
export const COLD_REPLIES = ['は？', '知らない', '……', '既読', 'で？', '話しかけないで', 'ふーん', '……………'];

export const CHAT_MAP: Record<string, ChatTemplate> = Object.fromEntries(CHAT_TEMPLATES.map((t) => [t.id, t]));
