"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

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
import type { BlockModalProps } from "@/features/flows/blocks/types";

export type RandomBranch = {
  id: string;
  label: string;
  percentage: number;
};

/** The data a randomizer block configures. */
export type RandomizerData = { branches: RandomBranch[] };

/** Below two there's no randomness left to distribute. */
const MIN_BRANCHES = 2;

export function totalPercentage(branches: RandomBranch[]): number {
  return branches.reduce((total, branch) => total + branch.percentage, 0);
}

/** Splits 100 across N, giving the remainder to the first so the total is
 *  always exactly 100 (3 branches → 34/33/33, never 33/33/33). */
export function distributeEvenly(branches: RandomBranch[]): RandomBranch[] {
  const base = Math.floor(100 / branches.length);
  const remainder = 100 - base * branches.length;
  return branches.map((branch, index) => ({
    ...branch,
    percentage: index === 0 ? base + remainder : base,
  }));
}

let sequence = 0;

export function RandomizerModal({
  data,
  onChange,
  onClose,
}: BlockModalProps<RandomizerData>) {
  const [branches, setBranches] = useState<RandomBranch[]>(data.branches);

  const total = totalPercentage(branches);
  const isValid = total === 100;

  function updateBranch(id: string, patch: Partial<RandomBranch>) {
    setBranches((current) =>
      current.map((branch) =>
        branch.id === id ? { ...branch, ...patch } : branch,
      ),
    );
  }

  function addBranch() {
    sequence += 1;
    setBranches((current) =>
      current.concat({
        id: `branch-${Date.now()}-${sequence}`,
        label: `Saída ${String.fromCharCode(65 + current.length)}`,
        percentage: 0,
      }),
    );
  }

  function removeBranch(id: string) {
    setBranches((current) => current.filter((branch) => branch.id !== id));
  }

  function save() {
    onChange({ branches });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Randomizar</DialogTitle>
        <DialogDescription>
          O fluxo segue por uma das saídas, sorteada conforme a porcentagem. O
          total precisa fechar em 100%.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        <div className="flex items-center justify-between">
          <Label>Saídas</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setBranches(distributeEvenly(branches))}
          >
            Distribuir igualmente
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {branches.map((branch) => (
            <div key={branch.id} className="flex items-center gap-2">
              <Input
                value={branch.label}
                placeholder="Nome da saída"
                onChange={(event) =>
                  updateBranch(branch.id, { label: event.target.value })
                }
              />
              <div className="flex w-28 shrink-0 items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={branch.percentage}
                  onChange={(event) =>
                    updateBranch(branch.id, {
                      percentage: Number(event.target.value) || 0,
                    })
                  }
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remover saída"
                disabled={branches.length <= MIN_BRANCHES}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => removeBranch(branch.id)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={addBranch}
        >
          <Plus className="size-4" />
          Adicionar saída
        </Button>

        {/* Live total: the rule is hard, so the feedback can't wait for save. */}
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
            isValid ? "bg-success-bg text-success" : "bg-danger-bg text-danger",
          )}
        >
          <span>Total</span>
          <span className="font-heading font-semibold">{total}%</span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={!isValid}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
