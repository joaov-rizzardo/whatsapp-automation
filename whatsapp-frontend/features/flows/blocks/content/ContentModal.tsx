"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BlockModalProps } from "@/features/flows/blocks/types";

/** The data a content block configures. */
export type ContentData = { text: string };

/**
 * Config for a content block: a single message textarea. Renders the inner
 * fields only — the Dialog/DialogContent wrapper is owned by the modal host
 * (NodeConfigModal). "Salvar" writes back via `onChange` and closes; "Cancelar"
 * discards the local edit.
 */
export function ContentModal({
  data,
  onChange,
  onClose,
}: BlockModalProps<ContentData>) {
  const [text, setText] = useState(data.text);

  function save() {
    onChange({ text });
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

      <div className="flex flex-col gap-2 py-2">
        <Label htmlFor="content-text">Mensagem</Label>
        <Textarea
          id="content-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Digite a mensagem que será enviada…"
          rows={5}
          autoFocus
        />
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
