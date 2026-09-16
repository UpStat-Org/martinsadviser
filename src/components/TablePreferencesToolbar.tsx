import { Columns3, List, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Dispatch, SetStateAction } from "react";

export type Density = "comfortable" | "compact";

interface ColumnOption {
  key: string;
  label: string;
}

interface TablePreferencesToolbarProps<TColumns extends Record<string, boolean>> {
  density: Density;
  onDensityChange: (density: Density) => void;
  columns: TColumns;
  columnOptions: ColumnOption[];
  onColumnsChange: Dispatch<SetStateAction<TColumns>>;
}

export function TablePreferencesToolbar<TColumns extends Record<string, boolean>>({
  density,
  onDensityChange,
  columns,
  columnOptions,
  onColumnsChange,
}: TablePreferencesToolbarProps<TColumns>) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant={density === "compact" ? "default" : "outline"}
        size="sm"
        className="h-8 px-2.5 text-xs"
        onClick={() =>
          onDensityChange(density === "compact" ? "comfortable" : "compact")
        }
      >
        {density === "compact" ? (
          <Rows3 className="w-3.5 h-3.5 mr-1.5" />
        ) : (
          <List className="w-3.5 h-3.5 mr-1.5" />
        )}
        {density === "compact" ? t("table.compact") : t("table.comfortable")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs">
            <Columns3 className="w-3.5 h-3.5 mr-1.5" />
            {t("table.columns")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs">{t("table.visibleColumns")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {columnOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.key}
              checked={columns[option.key] !== false}
              onCheckedChange={(checked) =>
                onColumnsChange((previous) => ({
                  ...previous,
                  [option.key]: Boolean(checked),
                } as TColumns))
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
