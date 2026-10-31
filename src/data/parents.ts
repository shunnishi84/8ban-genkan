import type { Scenario } from '../core/types';

/**
 * 日をまたぐ異変: 両親の来訪。
 * 前の日（parents_visit）に「お母さんたちの勘違いだよ、俺から伝えておく」とごまかすと、その夜は何事もなく帰れるが、
 * 翌日は本当に両親が来ていて、どうやっても炎上する（PARENTS_ARRIVED。通常の抽選には入らない）。
 */
export const PARENTS_ARRIVED: Scenario = {
  id: 'parents_arrived',
  title: '「勘違い」のはずの両親が本当に来ていた',
  introLine: '（……今日は、何か大事な日だった気がする）',
  chatReplies: {
    '*': ['今、お義母さんたちの相手で手が離せないの。'],
    coming_home: ['……早く帰ってきて。今すぐ。', 'お義父さん、あなたの帰りを待ってるわよ。……私も。'],
    sorry_generic: ['謝るのは、帰ってきてから。お義母さんたちの前で。'],
  },
  causes: [
    {
      id: 'parents_arrived',
      title: '両親が本当に来た',
      // 前の日にごまかした時点で手遅れ（解消のしようがない）
      resolution: 'parents_never',
      angerLines: [
        '……おかえり。お義母さんたち、朝から来てるわよ。',
        '「勘違い」だったんじゃなかったの？',
        '掃除もしてない家で、朝からずっと「あら、まだなのね」を聞かされてたんだから。',
        '……お義父さんたちが帰ったら、覚えておきなさい。',
      ],
      successLine: '',
      angerImage: 'wife_inlaws',
    },
  ],
  clues: [
    { at: 'spot:door', cause: 'parents_arrived', text: 'ドアの向こうから、聞き覚えのある笑い声。……実家の母の声だ。' },
    { at: 'spot:floor', cause: 'parents_arrived', text: '玄関前に、見覚えのある傘が2本立てかけてある。父の黒い傘と、母の花柄の傘。' },
    { at: 'notice', cause: 'parents_arrived', text: '📞 母: 着いたよ〜 お嫁さん、なんだかびっくりしてたけど？（11:02）' },
    { at: 'app:chat', cause: 'parents_arrived', unread: true, text: '……お義母さんたち、来てるんだけど。「勘違い」って言ったよね？（11:05）' },
  ],
};
