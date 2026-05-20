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

export type Density = "comfortable" | "compact";

interface ColumnOption {
  key: string;
  label: string;
}

interface TablePreferencesToolbarProps {
  density: Density;
  onDensityChange: (density: Density) => void;
  columns: Record<string, boolean>;
  columnOptions: ColumnOption[];
  onColumnsChange: (columns: any) => void;
}

export function TablePreferencesToolbar({
  density,
  onDensityChange,
  columns,
  columnOptions,
  onColumnsChange,
}: TablePreferencesToolbarProps) {
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
                onColumnsChange({ ...columns, [option.key]: Boolean(checked) })
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
