"use client";

import { EmojiPicker as Frimousse } from "frimousse";

import { cn } from "@/lib/utils";

/**
 * Emoji picker, built on `frimousse` (headless) and dressed in ZapBot tokens.
 * The shadcn registry has no emoji picker, and the alternatives ship their own
 * CSS/theme — this one is ours down to the last colour.
 *
 * Note: frimousse fetches the Emojibase dataset from a public CDN on first
 * open, so the list appears after a short "Carregando…". Locale is pt so the
 * category names and search match what the user types.
 */
export function EmojiPicker({
  onSelect,
  className,
}: {
  onSelect: (emoji: string) => void;
  className?: string;
}) {
  return (
    <Frimousse.Root
      locale="pt"
      className={cn("isolate flex h-80 w-full flex-col", className)}
      onEmojiSelect={({ emoji }) => onSelect(emoji)}
    >
      <Frimousse.Search
        placeholder="Buscar emoji…"
        className="z-10 mb-2 h-9 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
      />

      <Frimousse.Viewport className="relative flex-1 outline-hidden">
        <Frimousse.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Carregando emojis…
        </Frimousse.Loading>
        <Frimousse.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Nenhum emoji encontrado.
        </Frimousse.Empty>

        <Frimousse.List
          className="select-none pb-1.5"
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div
                className="bg-popover px-2 pt-3 pb-1.5 text-xs font-medium text-muted-foreground"
                {...props}
              >
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div className="scroll-my-1.5 px-1" {...props}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button
                type="button"
                className={cn(
                  "flex size-8 cursor-pointer items-center justify-center rounded-md text-lg",
                  emoji.isActive && "bg-accent",
                )}
                {...props}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </Frimousse.Viewport>
    </Frimousse.Root>
  );
}
