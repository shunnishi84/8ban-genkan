// セーブは最高連続記録のみ。localStorage が使えない環境（プライベートモード等）でも落ちないこと。
const KEY = '8ban-genkan:best';

export const loadBest = (): number => {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
};

/** 記録を更新したら true */
export const saveBest = (streak: number): boolean => {
  if (streak <= loadBest()) return false;
  try {
    localStorage.setItem(KEY, String(streak));
  } catch {
    // 保存できなくてもゲームは続ける
  }
  return true;
};
