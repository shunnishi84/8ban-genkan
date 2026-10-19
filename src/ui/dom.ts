export type Child = Node | string | number | null | undefined | false | Child[];

type Props = {
  class?: string;
  disabled?: boolean;
  [event: `on${string}`]: ((e: Event) => void) | undefined;
} & Record<string, unknown>;

/** 小さな DOM ビルダー。h('button', { class: 'x', onclick }, '押す') */
export const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
};

const append = (el: HTMLElement, children: Child[]) => {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
};
