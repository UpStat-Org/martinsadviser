import { useState } from "react";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type Task } from "@/hooks/useTasks";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, GripVertical, Trash2, Pencil, Loader2, Tag, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const COLUMNS = [
  { id: "not_started", label: "Not Started", color: "bg-muted" },
  { id: "waiting", label: "Waiting", color: "bg-warning/10" },
  { id: "in_progress", label: "In Progress", color: "bg-primary/10" },
  { id: "completed", label: "Completed", color: "bg-success/10" },
  { id: "discarded", label: "Discarded", color: "bg-destructive/10" },
];

const TASK_TYPES = [
  "IFTA", "CT", "NY", "KYU", "NM", "Automatic", "UCR", "BOC-3", "MCS-150", "Other",
];

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
  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState("");
  const [clientId, setClientId] = useState("");
  const [operator, setOperator] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [formStatus, setFormStatus] = useState("not_started");

  const openNew = (status = "not_started") => {
    setEditingTask(null);
    setName("");
    setTaskType("");
    setClientId("");
    setOperator("");
    setTags([]);
    setTagInput("");
    setNotes("");
    setFormStatus(status);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setName(task.name);
    setTaskType(task.task_type || "");
    setClientId(task.client_id || "");
    setOperator(task.operator || "");
    setTags(task.tags || []);
    setTagInput("");
    setNotes(task.notes || "");
    setFormStatus(task.status);
    setDialogOpen(true);
  };

  const handleAddTag = () => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      task_type: taskType || undefined,
      client_id: clientId || undefined,
      operator: operator || undefined,
      tags,
      notes: notes || undefined,
      status: formStatus,
    };
    if (editingTask) {
      await updateTask.mutateAsync({ id: editingTask.id, ...payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDragStart = (taskId: string) => setDraggedTaskId(taskId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto">
        {COLUMNS.map((col) => {
          const colTasks = getColumnTasks(col.id);
          return (
            <div
              key={col.id}
              className="space-y-3 min-w-[220px]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-semibold text-sm text-foreground">{col.label}</h2>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openNew(col.id)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className={`rounded-xl p-2 min-h-[200px] space-y-2 ${col.color} border border-border/50`}>
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
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="font-medium text-sm text-foreground leading-tight truncate">{task.name}</span>
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

                      {task.task_type && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{task.task_type}</Badge>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.clients?.company_name && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {task.clients.company_name}
                          </Badge>
                        )}
                        {task.operator && (
                          <span className="text-[10px] text-muted-foreground">👤 {task.operator}</span>
                        )}
                      </div>

                      {task.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 bg-accent/50">
                              <Tag className="w-2.5 h-2.5 mr-0.5" />{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {task.notes && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{task.notes}</p>
                      )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingTask ? t("kanban.editTask") : t("kanban.newTask")}
            </DialogTitle>
            <DialogDescription>
              {editingTask ? t("kanban.editTaskDesc") : t("kanban.newTaskDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Task name" />
            </div>

            {/* Type & Client */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Client</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Operator */}
            <div>
              <label className="text-sm font-medium">Operator</label>
              <Input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Responsible person" />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tag and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs gap-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional notes..." />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSubmit} disabled={!name.trim() || createTask.isPending || updateTask.isPending}>
                {(createTask.isPending || updateTask.isPending) ? "Saving..." : editingTask ? t("common.save") : t("kanban.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
