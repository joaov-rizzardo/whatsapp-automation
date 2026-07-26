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
import { DurationField } from "@/features/flows/components/DurationField";
import type { BlockModalProps } from "@/features/flows/blocks/types";
import type { Duration } from "@/features/flows/types/duration";

/** The data a delay block configures. */
export type DelayData = { duration: Duration };

export function DelayModal({ data, onChange, onClose }: BlockModalProps<DelayData>) {
  const [duration, setDuration] = useState<Duration>(data.duration);

  function save() {
    onChange({ duration });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Configurar espera</DialogTitle>
        <DialogDescription>
          O fluxo fica parado neste bloco pelo tempo definido antes de seguir
          para o próximo.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2 py-2">
        <Label htmlFor="delay-duration">Tempo de espera</Label>
        <DurationField
          id="delay-duration"
          value={duration}
          onChange={setDuration}
        />
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={duration.value <= 0}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
