"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tag } from "@/components/ui/tag";
import { triggerOptions } from "@/lib/describeTrigger";
import type { BlockModalProps } from "@/features/flows/blocks/types";
import type { AutomationTrigger, TriggerKind } from "@/types/automationTrigger";

/** O que o bloco de início configura: o gatilho do fluxo. */
export type StartData = { trigger: AutomationTrigger };

/** Compara ignorando caixa e espaços, que é como o WhatsApp chega na prática. */
function isDuplicate(keywords: string[], candidate: string): boolean {
  return keywords.some(
    (keyword) => keyword.toLowerCase() === candidate.toLowerCase(),
  );
}

export function StartModal({ data, onChange, onClose }: BlockModalProps<StartData>) {
  const [kind, setKind] = useState<TriggerKind>(data.trigger.kind);
  const [keywords, setKeywords] = useState<string[]>(
    data.trigger.kind === "keyword" ? data.trigger.keywords : [],
  );
  const [draft, setDraft] = useState("");

  const missingKeywords = kind === "keyword" && keywords.length === 0;
  const canSave = kind !== "none" && !missingKeywords;

  function addKeyword() {
    const candidate = draft.trim();
    if (candidate === "" || isDuplicate(keywords, candidate)) {
      setDraft("");
      return;
    }

    setKeywords((current) => [...current, candidate]);
    setDraft("");
  }

  function removeKeyword(target: string) {
    setKeywords((current) => current.filter((keyword) => keyword !== target));
  }

  function save() {
    if (kind === "none") return;

    onChange({
      trigger: kind === "keyword" ? { kind, keywords } : { kind },
    });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Quando este fluxo começa</DialogTitle>
        <DialogDescription>
          O gatilho decide o que faz o bot iniciar esta conversa. Sem ele, a
          automação não pode ser ativada.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <RadioGroup
          value={kind === "none" ? "" : kind}
          onValueChange={(value) => setKind(value as TriggerKind)}
          className="gap-2"
        >
          {triggerOptions.map((option) => (
            <Label
              key={option.kind}
              htmlFor={`trigger-${option.kind}`}
              className={cn(
                "flex items-start gap-3 rounded-md border border-border p-3 transition-colors duration-fast ease-standard hover:bg-muted",
                kind === option.kind && "border-brand-subtle-border bg-brand-subtle",
              )}
            >
              <RadioGroupItem
                id={`trigger-${option.kind}`}
                value={option.kind}
                className="mt-0.5"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{option.label}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {option.hint}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>

        {kind === "keyword" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="trigger-keyword-input">Palavras-chave</Label>

            <div className="flex items-center gap-2">
              <Input
                id="trigger-keyword-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  // Enter aqui adiciona a palavra; sem isso ele fecharia o modal.
                  event.preventDefault();
                  addKeyword();
                }}
                placeholder="oi, olá, orçamento…"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Adicionar palavra-chave"
                onClick={addKeyword}
                disabled={draft.trim() === ""}
              >
                <Plus />
              </Button>
            </div>

            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((keyword) => (
                  <Tag key={keyword} onRemove={() => removeKeyword(keyword)}>
                    {keyword}
                  </Tag>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Adicione ao menos uma palavra. A comparação ignora acentos e
                maiúsculas.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={!canSave}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
