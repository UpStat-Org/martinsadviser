import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BookmarkPlus, Bookmark, Trash2, Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useSavedViews,
  useCreateSavedView,
  useDeleteSavedView,
  type SavedView,
  type SavedViewScope,
} from "@/hooks/useSavedViews";

interface Props<Filters extends Record<string, unknown>> {
  scope: SavedViewScope;
  currentFilters: Filters;
  onApply: (filters: Filters) => void;
}

export function SavedViewsToolbar<Filters extends Record<string, unknown>>({
  scope,
  currentFilters,
  onApply,
}: Props<Filters>) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: views } = useSavedViews(scope);
  const createMut = useCreateSavedView();
  const deleteMut = useDeleteSavedView();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", shared: false });

  const save = async () => {
    if (!user || !form.name.trim()) return;
    await createMut.mutateAsync({
      user_id: user.id,
      scope,
      name: form.name.trim(),
      filters: currentFilters,
      shared: form.shared,
    });
    setOpen(false);
    setForm({ name: "", shared: false });
  };

  return (
    <div className="inline-flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="w-3.5 h-3.5" />
            {t("savedViews.title")}
            {views && views.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{views.length}</Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t("savedViews.title")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!views?.length ? (
            <DropdownMenuItem disabled>{t("savedViews.empty")}</DropdownMenuItem>
          ) : (
            views.map((v: SavedView) => (
              <DropdownMenuItem
                key={v.id}
                onSelect={(e) => {
                  e.preventDefault();
                  onApply(v.filters as Filters);
                }}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Bookmark className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{v.name}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {v.shared ? t("savedViews.shared") : t("savedViews.private")}
                  </Badge>
                </div>
                {v.user_id === user?.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMut.mutate(v.id);
                    }}
                    className="text-destructive hover:text-destructive/80 shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>
            <BookmarkPlus className="w-3.5 h-3.5 mr-2" />
            {t("savedViews.save")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("savedViews.dialogTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("savedViews.nameLabel")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("savedViews.namePlaceholder")}
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <Label className="cursor-pointer">{t("savedViews.sharedLabel")}</Label>
              <Switch checked={form.shared} onCheckedChange={(v) => setForm({ ...form, shared: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={!form.name.trim() || createMut.isPending} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
