"use client";

import { Braces, Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useFlowVariablesContext } from "@/features/flows/components/FlowVariablesContext";
import { useMessageComposer } from "@/features/flows/hooks/useMessageComposer";
import { formatPlaceholder } from "@/features/flows/lib/interpolation";

/**
 * Writes the text a block sends: a textarea plus emoji and variable insertion,
 * both landing at the caret. Lives in `components/` rather than under the
 * content block because the media and button blocks (planned) compose the same
 * message.
 */
export function MessageComposer({
  value,
  onChange,
  id,
  placeholder = "Digite a mensagem que será enviada…",
  rows = 5,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  rows?: number;
}) {
  const { variables } = useFlowVariablesContext();
  const { textareaRef, insert } = useMessageComposer({ value, onChange });

  const custom = variables.filter((variable) => variable.origin === "custom");
  const system = variables.filter((variable) => variable.origin === "system");

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        id={id}
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        autoFocus
      />

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="secondary" size="sm">
              <Smile className="size-4" />
              Emoji
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-2">
            <EmojiPicker onSelect={insert} />
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="secondary" size="sm">
              <Braces className="size-4" />
              Inserir variável
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            {custom.length > 0 ? (
              <>
                <DropdownMenuLabel>Personalizadas</DropdownMenuLabel>
                {custom.map((variable) => (
                  <DropdownMenuItem
                    key={variable.id}
                    onSelect={() => insert(formatPlaceholder(variable.name))}
                  >
                    {variable.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : null}

            <DropdownMenuLabel>Do sistema</DropdownMenuLabel>
            {system.map((variable) => (
              <DropdownMenuItem
                key={variable.id}
                onSelect={() => insert(formatPlaceholder(variable.name))}
              >
                {variable.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
