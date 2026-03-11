export const WORD_GLUE = /^[-./\\@:_]$/;
export const WORD_SEP = /^[,;()\[\]{}"'!?<>]$/;
const ANY_WHITESPACE = /\s/u;
const INLINE_WHITESPACE = /[^\S\r\n]/u;

export function isAnyWhitespace(ch) {
  return ANY_WHITESPACE.test(ch);
}

export function isInlineWhitespace(ch) {
  return INLINE_WHITESPACE.test(ch);
}

export function isGlueBetween(textStr, endA, startB) {
  const gap = textStr.slice(endA, startB);
  if (gap.length === 0) return true;
  return [...gap].every((ch) => WORD_GLUE.test(ch) || isInlineWhitespace(ch));
}

export function postprocessTokenResults(results, text) {
  const merged = [];

  for (const r of results) {
    const baseEntity = r.entity.replace(/^[BI]-/, "");
    const last = merged[merged.length - 1];

    if (last && last._base === baseEntity && r.start - last.end <= 2 && isGlueBetween(text, last.end, r.start)) {
      last.end = r.end;
      last.word = text.slice(last.start, last.end);
      if (r.score > last.score) last.score = r.score;
    } else {
      merged.push({ ...r, _base: baseEntity });
    }
  }

  for (const r of merged) {
    while (r.start > 0) {
      const ch = text[r.start - 1];
      if (isAnyWhitespace(ch) || WORD_SEP.test(ch)) break;
      r.start--;
    }

    while (r.end < text.length) {
      const ch = text[r.end];
      if (isAnyWhitespace(ch) || WORD_SEP.test(ch)) break;
      r.end++;
    }

    r.word = text.slice(r.start, r.end);
    r.entity = r._base;
    delete r._base;
  }

  return merged;
}
