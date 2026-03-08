import { useState } from "react";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type Task } from "@/hooks/useTasks";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, GripVertical, Trash2, Pencil, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

const COLUMNS = [
  { id: "todo", label: "A Fazer", color: "bg-muted" },
  { id: "in_progress", label: "Em Progresso", color: "bg-primary/10" },
  { id: "done", label: "Concluído", color: "bg-success/10" },
];

const PRIORITIES: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  medium: { label: "Média", className: "bg-warning/20 text-warning-foreground border-warning/30" },
  high: { label: "Alta", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

export default function KanbanPage() {
  const { data: tasks, isLoading } = useTasks();
  const { data: clients } = useClients();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { t } = useLanguage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [formStatus, setFormStatus] = useState("todo");

  const openNew = (status = "todo") => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setClientId("");
    setPriority("medium");
    setDueDate("");
    setFormStatus(status);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setClientId(task.client_id || "");
    setPriority(task.priority);
    setDueDate(task.due_date || "");
    setFormStatus(task.status);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description || undefined,
      client_id: clientId || undefined,
      priority,
      due_date: dueDate || undefined,
      status: formStatus,
    };
    if (editingTask) {
      await updateTask.mutateAsync({ id: editingTask.id, ...payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (draggedTaskId) {
      await updateTask.mutateAsync({ id: draggedTaskId, status: columnId });
      setDraggedTaskId(null);
    }
  };

  const getColumnTasks = (columnId: string) =>
    tasks?.filter((t) => t.status === columnId) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t("kanban.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("kanban.subtitle")}</p>
        </div>
        <Button onClick={() => openNew()}>
          <Plus className="w-4 h-4 mr-2" />
          {t("kanban.newTask")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const colTasks = getColumnTasks(col.id);
          return (
            <div
              key={col.id}
              className="space-y-3"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-semibold text-foreground">{col.label}</h2>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openNew(col.id)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className={`rounded-xl p-3 min-h-[200px] space-y-3 ${col.color} border border-border/50`}>
                {colTasks.map((task) => (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    className={`cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
                      draggedTaskId === task.id ? "opacity-50" : ""
                    }`}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="font-medium text-sm text-foreground leading-tight">{task.title}</span>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(task)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("kanban.deleteTask")}</AlertDialogTitle>
                                <AlertDialogDescription>{t("common.cannotUndo")}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTask.mutate(task.id)}>{t("common.delete")}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITIES[task.priority]?.className || ""}`}>
                          {PRIORITIES[task.priority]?.label || task.priority}
                        </Badge>
                        {task.clients?.company_name && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {task.clients.company_name}
                          </Badge>
                        )}
                        {task.due_date && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.due_date), "dd/MM")}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingTask ? t("kanban.editTask") : t("kanban.newTask")}
            </DialogTitle>
            <DialogDescription>
              {editingTask ? t("kanban.editTaskDesc") : t("kanban.newTaskDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("kanban.taskTitle")} *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("kanban.taskTitlePlaceholder")} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("kanban.taskDesc")}</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t("kanban.taskDescPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("kanban.priority")}</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{t("kanban.client")}</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("kanban.dueDate")}</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSubmit} disabled={!title.trim() || createTask.isPending || updateTask.isPending}>
                {(createTask.isPending || updateTask.isPending) ? "Salvando..." : editingTask ? t("common.save") : t("kanban.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
