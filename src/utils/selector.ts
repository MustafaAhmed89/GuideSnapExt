/**
 * Generates the shortest unique CSS selector for a DOM element.
 * Priority: #id > tag.classes > nth-child path (max 5 levels).
 */
export function generateCSSSelector(element: Element): string {
  // 1. id
  if (element.id && /^[a-zA-Z][\w-]*$/.test(element.id)) {
    const sel = `#${element.id}`;
    try {
      if (document.querySelector(sel) === element) return sel;
    } catch {
      // invalid id syntax — fall through
    }
  }

  // 2. tag + classes
  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter((c) => /^[a-zA-Z][\w-]*$/.test(c))
    .slice(0, 3)
    .join('.');
  if (classes) {
    const sel = `${tag}.${classes}`;
    try {
      if (document.querySelector(sel) === element) return sel;
    } catch {
      // fall through
    }
  }

  // 3. nth-child path (walk up max 5 ancestors)
  return nthChildPath(element, 5);
}

function nthChildPath(element: Element, maxDepth: number): string {
  const parts: string[] = [];
  let current: Element | null = element;
  let depth = 0;

  while (current && current !== document.documentElement && depth < maxDepth) {
    const tag = current.tagName.toLowerCase();
    const parent = current.parentElement;
    if (!parent) break;

    const siblings = Array.from(parent.children).filter(
      (c) => c.tagName === current!.tagName
    );
    if (siblings.length > 1) {
      const idx = siblings.indexOf(current) + 1;
      parts.unshift(`${tag}:nth-of-type(${idx})`);
    } else {
      parts.unshift(tag);
    }

    current = parent;
    depth++;
  }

  return parts.join(' > ') || tag;
}
