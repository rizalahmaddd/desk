import Link from "next/link";
import { RotateCcw, Search, User } from "lucide-react";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

export function ProjectFilters({
  query,
  status,
  archived,
  clientId,
  clientsList = [],
}: {
  query?: string;
  status?: string;
  archived: boolean;
  clientId?: string;
  clientsList?: { id: string; name: string; company?: string | null }[];
}) {
  const hasFilter = Boolean(
    query ||
    (status && status !== "all") ||
    (clientId && clientId !== "all"),
  );

  const selectedClient = clientsList.find((c) => c.id === clientId);

  return (
    <div className="mb-6 space-y-3">
      <form className="flex flex-col gap-2.5 sm:flex-row" method="get">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Cari nama project, kode, atau nama client..."
            className="h-11 rounded-xl pl-10 pr-4 text-sm shadow-2xs"
          />
        </div>

        {clientsList.length > 0 ? (
          <NativeSelect
            name="client"
            defaultValue={clientId ?? "all"}
            className="h-11 rounded-xl sm:w-48 text-sm shadow-2xs"
          >
            <option value="all">Semua Customer</option>
            {clientsList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `(${c.company})` : ""}
              </option>
            ))}
          </NativeSelect>
        ) : null}

        <NativeSelect
          name="status"
          defaultValue={status ?? "all"}
          className="h-11 rounded-xl sm:w-44 text-sm shadow-2xs"
        >
          <option value="all">Semua Status</option>
          {PROJECT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PROJECT_STATUS_LABELS[value]}
            </option>
          ))}
        </NativeSelect>

        {archived ? <input type="hidden" name="archived" value="1" /> : null}

        <Button
          type="submit"
          className="h-11 rounded-xl px-5 font-medium shadow-xs"
        >
          Terapkan
        </Button>

        {hasFilter ? (
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-xl gap-1.5 px-4 font-medium"
          >
            <Link href={archived ? "/projects?archived=1" : "/projects"}>
              <RotateCcw className="size-3.5" />
              <span>Reset</span>
            </Link>
          </Button>
        ) : null}
      </form>

      {hasFilter ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Filter aktif:</span>
          {query ? (
            <span className="rounded-md border border-border/80 bg-muted/50 px-2 py-0.5 font-medium text-foreground">
              Kata kunci: “{query}”
            </span>
          ) : null}
          {selectedClient ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-medium text-primary">
              <User className="size-3" />
              Customer: {selectedClient.name}
            </span>
          ) : null}
          {status && status !== "all" ? (
            <span className="rounded-md border border-border/80 bg-muted/50 px-2 py-0.5 font-medium text-foreground">
              Status: {PROJECT_STATUS_LABELS[status as keyof typeof PROJECT_STATUS_LABELS] ?? status}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
