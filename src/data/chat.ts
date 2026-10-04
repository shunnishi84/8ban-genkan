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
