import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * O esqueleto enquanto a lista carrega. Existe porque, sem ele, o estado vazio
 * ("Nenhuma automação ainda") aparecia por um instante em toda visita — e
 * convidar a criar algo que já existe é a pior primeira impressão possível.
 */
export function AutomationsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <Skeleton key={tile} className="h-[76px] rounded-lg" />
        ))}
      </div>

      <Card className="gap-0 py-0">
        <ul className="divide-y divide-border">
          {[0, 1, 2].map((row) => (
            <li key={row} className="flex items-center gap-3 px-4 py-5 sm:px-6">
              <Skeleton className="size-9 shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="hidden h-4 w-24 md:block" />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
