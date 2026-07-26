"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageComposer } from "@/features/flows/components/MessageComposer";
import type { BlockModalProps } from "@/features/flows/blocks/types";

/** The data a content block configures. */
export type ContentData = {
  text: string;
  /** Seconds of "digitando…" before the message goes out. 0 turns it off. */
  typingSeconds: number;
};

/**
 * Config for a content block: the message itself (with emoji and variable
 * insertion) and how long the bot appears to type it. Renders the inner fields
 * only — the Dialog/DialogContent wrapper is owned by the modal host
 * (NodeConfigModal). "Salvar" writes back via `onChange` and closes;
 * "Cancelar" discards the local edit.
 */
export function ContentModal({
  data,
  onChange,
  onClose,
}: BlockModalProps<ContentData>) {
  const [text, setText] = useState(data.text);
  const [typingSeconds, setTypingSeconds] = useState(data.typingSeconds);

  function save() {
    onChange({ text, typingSeconds });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Configurar conteúdo</DialogTitle>
        <DialogDescription>
          Escreva a mensagem de texto que este bloco vai enviar.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="content-text">Mensagem</Label>
          <MessageComposer id="content-text" value={text} onChange={setText} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="content-typing">Tempo de digitação</Label>
          <div className="flex items-center gap-2">
            <Input
              id="content-typing"
              type="number"
              min={0}
              className="w-28"
              value={typingSeconds}
              onChange={(event) =>
                setTypingSeconds(Number(event.target.value) || 0)
              }
            />
            <span className="text-sm text-muted-foreground">segundos</span>
          </div>
          <p className="text-xs text-muted-foreground">
            O contato vê &ldquo;digitando…&rdquo; por este tempo antes de receber
            a mensagem. Use 0 para enviar na hora.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save}>Salvar</Button>
      </DialogFooter>
    </>
  );
}
