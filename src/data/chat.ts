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
    text: 'ゴミ、出しといたよ！',
    requires: 'discarded:garbage_bag',
    replyRelevant: 'えらい！',
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
  // ---------------------------------------------------------------- 暴言（おふざけ枠）
  // 送ると、どんなに火種を消していても魔王化した妻が待っている。
  {
    id: 'insult_oni',
    text: 'うるせえ、この鬼嫁',
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

export const CHAT_MAP: Record<string, ChatTemplate> = Object.fromEntries(CHAT_TEMPLATES.map((t) => [t.id, t]));
