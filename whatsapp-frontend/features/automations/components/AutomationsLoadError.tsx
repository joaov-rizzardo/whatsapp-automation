"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * A lista não carregou. Nunca some em silêncio nem finge lista vazia: sem
 * automação e "não deu para saber" são coisas diferentes, e só uma delas se
 * resolve tentando de novo.
 */
export function AutomationsLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="items-center gap-4 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-warning-bg text-warning">
        <TriangleAlert className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold">
          Não foi possível carregar suas automações
        </h2>
        <p className="mx-auto max-w-md text-muted-foreground">
          Verifique sua conexão e tente de novo.
        </p>
      </div>
      <Button type="button" variant="secondary" onClick={onRetry}>
        <RefreshCw />
        Tentar novamente
      </Button>
    </Card>
  );
}
