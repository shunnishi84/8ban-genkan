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

// 遭遇した異変（シナリオ ID）と、見た特殊エンディング。異変コレクションに使う
const SEEN_KEY = '8ban-genkan:seen';
const ENDINGS_KEY = '8ban-genkan:endings';

const loadSet = (key: string): Set<string> => {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
};

/** 新しく増えたものがあれば保存 */
const addToSet = (key: string, set: Set<string>, ids: string[]): void => {
  const fresh = ids.filter((id) => !set.has(id));
  if (!fresh.length) return;
  fresh.forEach((id) => set.add(id));
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // 保存できなくてもゲームは続ける
  }
};

export const loadSeen = (): Set<string> => loadSet(SEEN_KEY);
/** 遭遇した異変を記録する */
export const saveSeen = (seen: Set<string>, ids: string[]): void => addToSet(SEEN_KEY, seen, ids);

export const loadEndings = (): Set<string> => loadSet(ENDINGS_KEY);
/** 見た特殊エンディングを記録する */
export const saveEnding = (endings: Set<string>, id: string): void => addToSet(ENDINGS_KEY, endings, [id]);
