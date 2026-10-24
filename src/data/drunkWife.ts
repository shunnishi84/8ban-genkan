import type { Scenario } from '../core/types';

/**
 * 妻が酔っている日（毎日 1/10 で、ほかのシナリオに重ねて起きる）。酔い方は4タイプからランダム。
 * - karami: からみ酒。いつもは罠の「愛してるよ」がこの日だけ正解。送らないと理不尽に怒られる
 * - amae:   甘え上戸。アイスかプリンを買って帰れば、ほかの火種を1つだけ見逃してもらえる
 * - reset:  記憶リセット。寝落ちして火種を忘れているが、物的証拠が残っていると翌朝バレる
 * - gyaku:  逆魔王。妻のほうから暴言が飛んでくる。やさしくいなせば勝ち、無視すると絡まれる
 * 夫も缶ビール2本以上で酔っていたら、どのタイプでも「夫婦で宴会」の隠し結末になる。
 */
export const DRUNK_WIFE_SCENARIOS: Scenario[] = [
  {
    id: 'wife_drunk_karami',
    title: '妻が酔っている（からみ酒）',
    wifeDrunk: 'karami',
    chatReplies: {
      coming_home: ['いまから〜？ おそい！ おそすぎる！ なんで！？', 'かえってくるの〜？ ……で、いうことは？'],
      sorry_generic: ['なにがわるいか、わかってないでしょ〜！', 'あやまってほしいんじゃないの〜！ わかる！？'],
    },
    causes: [
      {
        id: 'wife_drunk_karami',
        title: '酔った妻にからまれた',
        resolution: 'chat:love',
        angerImage: 'wife_drunk_karami',
        angerLines: [
          'おそい〜〜！！',
          'なんで今日、「愛してる」って言わないの！？',
          'あと靴下の向き！ ぜんぶ気に入らない！',
          '……なんで怒ってるのか？ しらない！ ねる！',
        ],
        successLine: 'えへへ〜……しってる〜♡ ……ぐぅ。',
      },
    ],
    clues: [
      { at: 'app:chat', cause: 'wife_drunk_karami', text: 'ねぇ〜〜〜（22:38）' },
      { at: 'app:chat', cause: 'wife_drunk_karami', unread: true, text: 'わたしと しごと どっちが だいじ？？ 3びょういないに こたえて（22:41）' },
      { at: 'notice', cause: 'wife_drunk_karami', text: '💬 妻の友達: 今日〇〇ちゃん飲ませすぎちゃった🍷 ごめんね🙏 ちょっと絡み酒かも……' },
      { at: 'spot:door', cause: 'wife_drunk_karami', text: 'ドアの向こうから、テレビに向かって何か文句を言っている声がする。' },
    ],
  },
  {
    id: 'wife_drunk_amae',
    title: '妻が酔っている（甘え上戸）',
    wifeDrunk: 'amae',
    chatReplies: {
      coming_home: ['やった〜♡ はやく〜♡', 'まってる〜♡ アイスもまってる〜♡'],
      sorry_generic: ['なんで〜？ いいよ〜♡ アイスは？'],
      love: ['わたしも〜♡♡♡ アイスは？'],
    },
    causes: [
      {
        id: 'wife_drunk_amae',
        title: '甘えた妻のおねだり',
        resolution: { any: ['bought:ice_cream', 'bought:konbini_pudding'] },
        angerImage: 'wife_drunk_pout',
        angerLines: ['おかえり〜……あれ？', 'アイスはぁ！？', 'アイス買ってきてって言ったのにぃ〜〜……（号泣）'],
        successLine: 'アイスだ〜〜♡ だいすき〜♡ だっこ〜♡',
      },
    ],
    clues: [
      { at: 'app:chat', cause: 'wife_drunk_amae', unread: true, text: 'たらいま〜♡ 女子会たのしかった〜（22:35）' },
      { at: 'app:chat', cause: 'wife_drunk_amae', unread: true, text: 'アイス〜♡ かってきて〜♡ プリンでもいいよ〜♡ はやくかえってきて さみしい〜（22:44）' },
      { at: 'notice', cause: 'wife_drunk_amae', text: '💬 妻の友達: 〇〇ちゃん今日ご機嫌で甘えモードだよ〜🍷 迎えに行ってあげて笑' },
      { at: 'spot:door', cause: 'wife_drunk_amae', text: 'ドアの向こうから、ご機嫌な鼻歌が聞こえる。' },
    ],
  },
  {
    id: 'wife_drunk_reset',
    title: '妻が酔っている（記憶リセット）',
    wifeDrunk: 'reset',
    causes: [],
    chatReplies: {
      coming_home: ['ん〜……（スタンプ: 寝ているクマ）'],
      sorry_generic: ['ん〜……なにが〜……？ zzz'],
      love: ['ん〜……わたしも……zzz'],
    },
    clues: [
      { at: 'app:chat', text: '🍷🍷🍷🍷🍷（22:30）' },
      { at: 'app:chat', text: 'ねむい……げんかんで ねる……（22:52）' },
      { at: 'notice', text: '💬 妻の友達: 〇〇ちゃん、相当飲んでたからたぶん今日のこと何も覚えてないと思う笑' },
      { at: 'spot:door', text: 'ドアの向こうから、大きないびきが聞こえる。' },
    ],
  },
  {
    id: 'wife_drunk_gyaku',
    title: '妻が酔っている（逆魔王）',
    wifeDrunk: 'gyaku',
    chatReplies: {
      coming_home: ['かえってくんな〜！ ……うそ、かえってこい！ いますぐ！', 'はいはい、帰ってきたら説教ね〜〜！ｗ'],
      sorry_generic: ['あやまってすむと思うな〜！ｗｗ', 'ゆるさ〜ん！ｗ'],
      love: ['ば、ばか！！ ……もっと言え！'],
    },
    causes: [
      {
        id: 'wife_drunk_gyaku',
        title: '酔った妻の暴言',
        resolution: 'chat:drunk_calm',
        angerImage: 'wife_drunk_karami',
        angerLines: ['おそ〜〜い！ 既読無視とは、いい度胸ね〜！ｗ', 'この、ハゲ！ ……まだハゲてないか。じゃあ、未来のハゲ！', 'ほら、正座！ 朝まで！ わたしは寝るけど！'],
        successLine: '……おみず、ありがと。……さっきの、ぜんぶ、うそだからね。',
      },
    ],
    clues: [
      { at: 'app:chat', cause: 'wife_drunk_gyaku', unread: true, text: 'おそい！ このハゲ！ｗｗｗ（22:39）' },
      { at: 'app:chat', cause: 'wife_drunk_gyaku', unread: true, text: 'かえってきたら せっきょう だからな〜〜！！ 正座な！！ｗ（22:46）' },
      { at: 'notice', cause: 'wife_drunk_gyaku', text: '💬 妻の友達: ごめん、〇〇ちゃん酔って旦那さんに何か送ってたかも🙏 本気にしないであげて〜' },
      { at: 'spot:door', cause: 'wife_drunk_gyaku', text: 'ドアの向こうから「正座〜！」と叫ぶ声がする。' },
    ],
  },
];
