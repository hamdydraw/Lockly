import { useLayoutEffect, type KeyboardEvent, type RefObject } from 'react';
import { continueChecklist } from '../../lib/notes';

/** Grows a textarea with its content so a note never scrolls inside its own card. */
export function useAutoGrow(ref: RefObject<HTMLTextAreaElement>, value: string, minPx: number) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, minPx)}px`;
  }, [ref, value, minPx]);
}

/**
 * Enter inside a checklist item adds the next "- [ ] " automatically; Enter on
 * an empty item ends the list. Plain lines keep the browser's default.
 */
export function checklistKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, setBody: (body: string) => void) {
  if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.nativeEvent.isComposing) return;
  const el = e.currentTarget;
  if (el.selectionStart !== el.selectionEnd) return;
  const next = continueChecklist(el.value, el.selectionStart);
  if (!next) return;
  e.preventDefault();
  // Write the DOM value and caret synchronously. React's re-render then sees the
  // same value and leaves the caret alone, so keystrokes that arrive before the
  // next frame land in the right place (a deferred setSelectionRange scrambled them).
  el.value = next.body;
  el.setSelectionRange(next.caret, next.caret);
  setBody(next.body);
}

/** Inserts a "- [ ] " marker at the caret (on its own line) and puts the caret after it. */
export function insertChecklistItem(el: HTMLTextAreaElement | null, body: string, setBody: (body: string) => void) {
  const pos = el?.selectionStart ?? body.length;
  const before = body.slice(0, pos);
  const after = body.slice(pos);
  const prefix = before === '' || before.endsWith('\n') ? '- [ ] ' : '\n- [ ] ';
  const next = before + prefix + after;
  const caret = pos + prefix.length;
  if (el) {
    el.value = next;
    el.setSelectionRange(caret, caret);
    el.focus();
  }
  setBody(next);
}
