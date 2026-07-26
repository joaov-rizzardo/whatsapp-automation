"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { automationStatusFilters } from "../lib/automationStatus";
import type { AutomationSort, AutomationStatusFilter } from "../types/automation";

const sortOptions: { value: AutomationSort; label: string }[] = [
  { value: "recent", label: "Editadas recentemente" },
  { value: "name", label: "Nome (A–Z)" },
];

/**
 * Filtro por status, busca por nome e ordenação. As abas aqui são um controle
 * de filtro (não painéis): a lista fica fora delas, porque o mesmo estado também
 * governa o estado vazio de busca.
 */
export function AutomationsToolbar({
  status,
  onStatusChange,
  counts,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: {
  status: AutomationStatusFilter;
  onStatusChange: (status: AutomationStatusFilter) => void;
  counts: Record<AutomationStatusFilter, number>;
  search: string;
  onSearchChange: (search: string) => void;
  sort: AutomationSort;
  onSortChange: (sort: AutomationSort) => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <Tabs
        value={status}
        onValueChange={(value) => onStatusChange(value as AutomationStatusFilter)}
        className="min-w-0"
      >
        <TabsList
          aria-label="Filtrar automações por status"
          className="w-full justify-start overflow-x-auto lg:w-fit"
        >
          {automationStatusFilters.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value} className="shrink-0 px-3">
              {filter.label}
              <span className="rounded-full bg-muted-foreground/15 px-1.5 text-xs tabular-nums">
                {counts[filter.value]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar automação"
            aria-label="Buscar automação pelo nome"
            className="px-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {search !== "" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Limpar busca"
              onClick={() => onSearchChange("")}
              className="absolute top-1/2 right-1 -translate-y-1/2"
            >
              <X />
            </Button>
          )}
        </div>

        <Select value={sort} onValueChange={(value) => onSortChange(value as AutomationSort)}>
          <SelectTrigger aria-label="Ordenar automações" className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
