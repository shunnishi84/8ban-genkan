import type { Scenario } from '../core/types';

/** 相談して許してもらってから注文したパソコンが届いた日に立つフラグ（前振りの日から持ち越す） */
export const PC_APPROVED = 'pc_approved';

/**
 * 日をまたぐ異変: ノートパソコン。
 * 前振りの日（PC_HINT）は「そろそろパソコンほしいな」と出て、ポチッとマートにノートパソコンが並ぶ。
 * 注文すると2日後に届く（PC_DELIVERY / PC_SURPRISE）。その日のうちに妻に相談して許してもらっていれば
 * 届いた日にお礼を言えば済むが、相談なしで注文していたら、届いた日はどうやっても炎上する。
 */
export const PC_HINT: Scenario = {
  id: 'pc_hint',
  title: 'そろそろパソコンがほしい',
  extra: true,
  introLine: '（……そろそろ、新しいノートパソコンがほしいな）',
  causes: [],
  clues: [
    { at: 'app:memo', text: 'ほしいもの: 新しいノートパソコン（今のは7年目。起動に5分かかる）' },
    { at: 'app:shop', text: '🔥 本日限定セール: ノートパソコン「ポチPC Air 14」¥198,000（2日後お届け）' },
  ],
};

export const PC_DELIVERY: Scenario = {
  id: 'pc_delivery',
  title: '相談して買ったパソコンが届いた',
  chatReplies: {
    coming_home: ['パソコン、届いてたよ〜。玄関に置いてある', 'おかえり。新しいパソコン、楽しみだね'],
  },
  causes: [
    {
      id: 'pc_delivery',
      title: 'パソコンが届いた',
      resolution: { all: [PC_APPROVED, 'chat:pc_arrived'] },
      angerLines: ['……パソコン、届いてたけど。', '相談には乗ってあげたのに、届いたらひと言もなし？', '「ありがとう」の一言くらい、あってもいいんじゃない？'],
      successLine: 'ちゃんと相談してくれたもんね。……お小遣いからの返済、忘れないでよ？',
    },
  ],
  clues: [
    { at: 'spot:floor', cause: 'pc_delivery', text: '玄関前に大きな段ボールが置いてある。「精密機器・ノートパソコン 取扱注意」。' },
    { at: 'notice', cause: 'pc_delivery', text: '📦 ポチッとマート: ご注文の商品をお届けしました（置き配）' },
    { at: 'app:chat', cause: 'pc_delivery', text: 'パソコン届いてたよ〜 玄関に置いてある（21:40）' },
  ],
};

export const PC_SURPRISE: Scenario = {
  id: 'pc_surprise',
  title: '相談なしで買ったパソコンが届いた',
  chatReplies: {
    '*': ['それより、玄関の段ボールの話をしようか。'],
    coming_home: ['玄関に、19万8千円の段ボールが届いてるんだけど。', '帰ってきたら、段ボールの前で正座ね。'],
    sorry_generic: ['何に謝ってるの？ 段ボールのこと？', '謝るなら、注文する前に相談してほしかった。'],
    love: ['19万8千円のパソコンと、どっちを？'],
  },
  causes: [
    {
      id: 'pc_surprise',
      title: '相談なしの19万8千円',
      // 相談なしで注文した時点で、もう手遅れ（解消のしようがない）
      resolution: 'pc_never',
      angerLines: ['……この段ボール、なに？', 'ノートパソコン。19万8千円。', '相談、されたっけ？ ……されてないよね？', '返品の手続き、今から一緒にやろうか。'],
      successLine: '',
    },
  ],
  clues: [
    { at: 'spot:floor', cause: 'pc_surprise', text: '玄関前に大きな段ボールが置いてある。「精密機器・ノートパソコン 取扱注意」。……伝票の金額が、妙に目立つ。' },
    { at: 'notice', cause: 'pc_surprise', text: '📦 ポチッとマート: ご注文の商品をお届けしました（置き配）' },
    { at: 'app:chat', cause: 'pc_surprise', unread: true, text: 'ねえ、玄関の前にパソコンの箱が届いてるんだけど。19万8千円って書いてある（21:40）' },
  ],
};

export const PC_SCENARIOS: Scenario[] = [PC_HINT, PC_DELIVERY, PC_SURPRISE];
