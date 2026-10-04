import type { Requirement } from './types';

export const evaluate = (req: Requirement, flags: ReadonlySet<string>): boolean => {
  if (typeof req === 'string') return flags.has(req);
  if ('all' in req) return req.all.every((r) => evaluate(r, flags));
  return req.any.some((r) => evaluate(r, flags));
};

/** 条件式に出てくるフラグ名をすべて列挙する */
export const flagsIn = (req: Requirement): string[] => {
  if (typeof req === 'string') return [req];
  const children = 'all' in req ? req.all : req.any;
  return children.flatMap(flagsIn);
};

/**
 * 条件を満たすためのフラグ集合を1つ選ぶ（any は先頭から、can が真のものを優先）。
 * テストの自動解答とシナリオ整合性チェックで使う。満たせなければ null。
 */
export const pickSatisfyingFlags = (
  req: Requirement,
  can: (flag: string) => boolean,
): string[] | null => {
  if (typeof req === 'string') return can(req) ? [req] : null;
  if ('all' in req) {
    const out: string[] = [];
    for (const r of req.all) {
      const sub = pickSatisfyingFlags(r, can);
      if (!sub) return null;
      out.push(...sub);
    }
    return out;
  }
  for (const r of req.any) {
    const sub = pickSatisfyingFlags(r, can);
    if (sub) return sub;
  }
  return null;
};
