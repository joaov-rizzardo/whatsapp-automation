"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlowEditor } from "@/features/flows/components/FlowEditor";
import { useFlowDocument } from "@/features/flows/hooks/useFlowDocument";
import { ApiError } from "@/lib/http";

/**
 * O container do editor: carrega o fluxo por id e só então monta o editor.
 *
 * A ordem não é estética — montar o editor antes do documento chegar armaria o
 * autosave sobre um canvas vazio, e o primeiro salvamento apagaria o fluxo do
 * usuário. O `key` faz o editor remontar ao trocar de automação, em vez de
 * herdar o estado da anterior.
 */
export function FlowEditorPage({ automationId }: { automationId: string }) {
  const { flow, isLoading, error } = useFlowDocument(automationId);

  if (isLoading) return <EditorSkeleton />;

  if (error || !flow) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <EmptyState
        title={notFound ? "Automação não encontrada" : "Não foi possível abrir este fluxo"}
        description={
          notFound
            ? "Ela pode ter sido excluída, ou pertencer a outra organização."
            : "Verifique sua conexão e tente abrir de novo."
        }
      />
    );
  }

  return <FlowEditor key={automationId} flow={flow} />;
}

function EditorSkeleton() {
  return (
    <div className="flex h-full w-full">
      <aside className="flex w-72 shrink-0 flex-col gap-3 border-r border-border bg-background p-4">
        <Skeleton className="h-9 w-full rounded-md" />
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-16 w-full rounded-lg" />
        ))}
      </aside>
      <div className="relative flex-1 bg-muted p-4">
        <Skeleton className="h-12 w-64 rounded-lg" />
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-muted px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-warning-bg text-warning">
        <TriangleAlert className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-semibold">{title}</h1>
        <p className="max-w-md text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="secondary">
        <Link href="/automacoes">Voltar para automações</Link>
      </Button>
    </div>
  );
}
