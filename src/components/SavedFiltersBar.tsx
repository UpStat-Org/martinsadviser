import { useState } from "react";
import { Bookmark, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSavedFilters, useCreateSavedFilter, useDeleteSavedFilter } from "@/hooks/useSavedFilters";

interface SavedFiltersBarProps {
  page: string;
  currentFilters: Record<string, any>;
  onApply: (filters: Record<string, any>) => void;
}

export function SavedFiltersBar({ page, currentFilters, onApply }: SavedFiltersBarProps) {
  const { data: filters } = useSavedFilters(page);
  const createFilter = useCreateSavedFilter();
  const deleteFilter = useDeleteSavedFilter();
  const [name, setName] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    createFilter.mutate(
      { name: name.trim(), page, filters: currentFilters },
      {
        onSuccess: () => {
          setName("");
          setPopoverOpen(false);
        },
      }
    );
  };

  const hasActiveFilters = Object.values(currentFilters).some(
    (v) => v !== "all" && v !== "" && v !== undefined
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Bookmark className="w-4 h-4 text-muted-foreground shrink-0" />

      {filters?.map((f) => (
        <Badge
          key={f.id}
          variant="outline"
          className="cursor-pointer hover:bg-accent transition-colors gap-1 pr-1"
          onClick={() => onApply(f.filters as Record<string, any>)}
        >
          {f.name}
          <button
            className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              deleteFilter.mutate({ id: f.id, page });
            }}
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </Badge>
      ))}

      {hasActiveFilters && (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <Plus className="w-3 h-3" />
              Salvar filtro
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              <Input
                placeholder="Nome do filtro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              <Button
                size="sm"
                className="w-full"
                onClick={handleSave}
                disabled={!name.trim() || createFilter.isPending}
              >
                {createFilter.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                Salvar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
