import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardList, Plus, Pencil, Trash2, ListTodo } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useTaskTemplates,
  useUpsertTaskTemplate,
  useDeleteTaskTemplate,
  type TaskTemplate,
  type TaskTemplateItem,
} from "@/hooks/useTaskTemplates";

const PRIORITIES: TaskTemplateItem["priority"][] = ["low", "medium", "high"];

export default function TaskTemplatesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: templates } = useTaskTemplates();
  const upsertMut = useUpsertTaskTemplate();
  const deleteMut = useDeleteTaskTemplate();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; items: TaskTemplateItem[] }>({
    name: "",
    description: "",
    items: [],
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", items: [] });
    setOpen(true);
  };

  const openEdit = (tpl: TaskTemplate) => {
    setEditing(tpl);
    setForm({ name: tpl.name, description: tpl.description ?? "", items: tpl.items });
    setOpen(true);
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { name: "", task_type: "general", days_offset: 0, priority: "medium" }],
    });
  };

  const updateItem = (i: number, patch: Partial<TaskTemplateItem>) => {
    const items = [...form.items];
    items[i] = { ...items[i], ...patch };
    setForm({ ...form, items });
  };

  const removeItem = (i: number) => {
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  };

  const save = async () => {
    if (!user || !form.name.trim()) return;
    await upsertMut.mutateAsync({
      id: editing?.id,
      user_id: user.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      items: form.items.filter((i) => i.name.trim() !== ""),
    });
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl aurora-bg p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="orb w-80 h-80 bg-primary/30 -top-20 -right-20" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.2em] mb-2">Workflows</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text leading-tight">
              {t("taskTemplates.title")}
            </h1>
            <p className="text-white/70 mt-2 text-sm max-w-2xl">{t("taskTemplates.subtitle")}</p>
          </div>
          <Button onClick={openNew} className="btn-gradient text-white border-0 gap-1.5">
            <Plus className="w-4 h-4" />
            {t("taskTemplates.new")}
          </Button>
        </div>
      </div>

      {!templates?.length ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{t("taskTemplates.empty")}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md">
                      <ListTodo className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="font-display text-base">{tpl.name}</CardTitle>
                      {tpl.description && <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>}
                    </div>
                  </div>
                  <Badge variant="secondary">{t("taskTemplates.items").replace("{count}", String(tpl.items.length))}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {tpl.items.slice(0, 5).map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-mono w-12 justify-center">
                        {item.days_offset >= 0 ? `+${item.days_offset}d` : `${item.days_offset}d`}
                      </Badge>
                      <span className="truncate">{item.name}</span>
                    </li>
                  ))}
                  {tpl.items.length > 5 && (
                    <li className="text-[11px] text-muted-foreground pl-14">+{tpl.items.length - 5}…</li>
                  )}
                </ul>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/40">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(tpl)} className="gap-1.5">
                    <Pencil className="w-3 h-3" />
                    {t("common.edit")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate(tpl.id)} className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                    {t("common.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("taskTemplates.edit") : t("taskTemplates.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("taskTemplates.name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("taskTemplates.description")}</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t("taskTemplates.items").replace("{count}", String(form.items.length))}</Label>
                <Button size="sm" variant="outline" onClick={addItem} className="gap-1.5">
                  <Plus className="w-3 h-3" />
                  {t("taskTemplates.addItem")}
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start rounded-lg border border-border/50 p-2.5">
                    <Input
                      className="col-span-4 h-8 text-xs"
                      placeholder={t("taskTemplates.itemName")}
                      value={item.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                    />
                    <Input
                      className="col-span-2 h-8 text-xs"
                      placeholder={t("taskTemplates.itemType")}
                      value={item.task_type}
                      onChange={(e) => updateItem(i, { task_type: e.target.value })}
                    />
                    <Input
                      type="number"
                      className="col-span-2 h-8 text-xs"
                      placeholder={t("taskTemplates.itemOffset")}
                      value={item.days_offset}
                      onChange={(e) => updateItem(i, { days_offset: parseInt(e.target.value, 10) || 0 })}
                    />
                    <Select value={item.priority} onValueChange={(v) => updateItem(i, { priority: v as TaskTemplateItem["priority"] })}>
                      <SelectTrigger className="col-span-3 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="col-span-1 h-8">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                    <Textarea
                      rows={1}
                      className="col-span-12 text-xs"
                      placeholder={t("taskTemplates.itemNotes")}
                      value={item.notes ?? ""}
                      onChange={(e) => updateItem(i, { notes: e.target.value || undefined })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={!form.name.trim() || upsertMut.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
