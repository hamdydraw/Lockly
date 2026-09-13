import { Fragment, type ReactNode } from 'react';

const TOKEN = /\{(\w+)\}/g;

// First-strong isolate / pop directional isolate. Wrapping a user-supplied value
// stops its direction from reordering the translated text around it (e.g. an
// Arabic folder name inside an English toast). Display-only: t() output is never
// stored or copied, so the invisible marks cannot leak into user data.
const FSI = '⁨';
const PDI = '⁩';

/** Replaces {name} tokens. Strings are bidi-isolated; numbers go through `fmt`. */
export function interpolate(
  template: string,
  params: Record<string, string | number> | undefined,
  fmt: (n: number) => string,
): string {
  if (!params) return template;
  return template.replace(TOKEN, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    return typeof value === 'number' ? fmt(value) : FSI + value + PDI;
  });
}

/**
 * Like interpolate(), but params may be React nodes (links, emphasis). String
 * params are user content and render inside <bdi dir="auto">.
 */
export function interpolateNodes(
  template: string,
  params: Record<string, ReactNode>,
  fmt: (n: number) => string,
): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of template.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > last) out.push(template.slice(last, start));
    const value = params[match[1]!];
    if (value === undefined) out.push(match[0]);
    else if (typeof value === 'string') {
      out.push(
        <bdi key={key++} dir="auto">
          {value}
        </bdi>,
      );
    } else if (typeof value === 'number') out.push(fmt(value));
    else out.push(<Fragment key={key++}>{value}</Fragment>);
    last = start + match[0].length;
  }
  if (last < template.length) out.push(template.slice(last));
  return out;
}
