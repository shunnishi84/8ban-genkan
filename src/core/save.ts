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

// 遭遇した異変（シナリオ ID）。異変コレクションの回収率に使う
const SEEN_KEY = '8ban-genkan:seen';

export const loadSeen = (): Set<string> => {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
};

/** 遭遇した異変を記録する。新しく増えたものがあれば保存 */
export const saveSeen = (seen: Set<string>, ids: string[]): void => {
  const fresh = ids.filter((id) => !seen.has(id));
  if (!fresh.length) return;
  fresh.forEach((id) => seen.add(id));
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // 保存できなくてもゲームは続ける
  }
};
