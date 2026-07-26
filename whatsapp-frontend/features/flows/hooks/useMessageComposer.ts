"use client";

import { useCallback, useRef } from "react";

/**
 * Insertion at the caret for the message composer. The whole reason this is a
 * hook: inserting an emoji or a `{{variavel}}` has to land where the cursor is,
 * not appended at the end — a user who clicks into the middle of a sentence and
 * picks an emoji expects it right there.
 *
 * After writing, focus goes back to the textarea with the caret just past what
 * was inserted, so typing continues naturally.
 */
export function useMessageComposer({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insert = useCallback(
    (snippet: string) => {
      const textarea = textareaRef.current;
      // No textarea mounted (or never focused) → append; better than dropping
      // the insertion on the floor.
      const start = textarea?.selectionStart ?? value.length;
      const end = textarea?.selectionEnd ?? value.length;

      const next = value.slice(0, start) + snippet + value.slice(end);
      onChange(next);

      requestAnimationFrame(() => {
        if (!textarea) return;
        const caret = start + snippet.length;
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
      });
    },
    [value, onChange],
  );

  return { textareaRef, insert };
}
