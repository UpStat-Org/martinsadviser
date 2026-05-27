import { useState, useMemo } from "react";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type Task } from "@/hooks/useTasks";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  GripVertical,
  Trash2,
  Pencil,
  Loader2,
  Tag,
  X,
  Calendar as CalendarIcon,
  MessageSquare,
  Circle,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  XCircle,
  User,
  Flame,
  Sparkles,
  Kanban as KanbanIcon,
} from "lucide-react";
import { CommentsSection } from "@/components/CommentsSection";
import { TaskTimeLogger } from "@/components/TaskTimeLogger";
import { format, isPast, isToday } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

const COLUMNS = [
  {
    id: "not_started",
    labelKey: "kanban.column.notStarted",
    icon: Circle,
    gradient: "from-slate-500 to-zinc-500",
    tint: "bg-slate-500/5",
    border: "border-slate-500/20",
    dot: "bg-slate-500",
  },
  {
    id: "waiting",
    labelKey: "kanban.column.waiting",
    icon: PauseCircle,
    gradient: "from-amber-500 to-orange-500",
    tint: "bg-warning/5",
    border: "border-warning/20",
    dot: "bg-warning",
  },
  {
    id: "in_progress",
    labelKey: "kanban.column.inProgress",
    icon: PlayCircle,
    gradient: "from-indigo-500 to-violet-500",
    tint: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    dot: "bg-indigo-500",
  },
  {
    id: "completed",
    labelKey: "kanban.column.completed",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-teal-500",
    tint: "bg-success/5",
    border: "border-success/20",
    dot: "bg-success",
  },
  {
    id: "discarded",
    labelKey: "kanban.column.discarded",
    icon: XCircle,
    gradient: "from-rose-500 to-red-500",
    tint: "bg-destructive/5",
    border: "border-destructive/20",
    dot: "bg-destructive",
  },
];

const TASK_TYPES = [
  "IFTA", "CT", "NY", "KYU", "NM", "Automatic", "UCR", "BOC-3", "MCS-150", "Other",
];

const PRIORITY_STYLES: Record<string, { bar: string; badge: string; labelKey: string }> = {
  high: {
    bar: "bg-secondary text-secondary-foreground border border-border",    badge: "bg-destructive/10 text-destructive border-destructive/20",
    labelKey: "priority.high",
  },
  medium: {
    bar: "bg-secondary text-secondary-foreground border border-border",    badge: "bg-warning/10 text-warning border-warning/20",
    labelKey: "priority.medium",
  },
  low: {
    bar: "bg-secondary text-secondary-foreground border border-border",    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    labelKey: "priority.low",
  },
};

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-red-500",
  "from-fuchsia-500 to-pink-500",
];

function gradientFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

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
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState("");
  const [clientId, setClientId] = useState("");
  const [operator, setOperator] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [formStatus, setFormStatus] = useState("not_started");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [showComments, setShowComments] = useState<string | null>(null);

  const openNew = (status = "not_started") => {
    setEditingTask(null);
    setName("");
    setTaskType("");
    setClientId("");
    setOperator("");
    setTags([]);
    setTagInput("");
    setNotes("");
    setDueDate("");
    setPriority("medium");
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
    setDueDate(task.due_date || "");
    setPriority(task.priority || "medium");
    setFormStatus(task.status);
    setDialogOpen(true);
  };

  const handleAddTag = () => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) setTags([...tags, val]);
    setTagInput("");
  };
  const handleRemoveTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      task_type: taskType || undefined,
      client_id: clientId || undefined,
      operator: operator || undefined,
      tags,
      notes: notes || undefined,
      due_date: dueDate || undefined,
      priority: priority || undefined,
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
  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };
  const handleDragLeave = () => setDragOverColumn(null);
  const handleDrop = async (columnId: string) => {
    if (draggedTaskId) {
      await updateTask.mutateAsync({ id: draggedTaskId, status: columnId });
      setDraggedTaskId(null);
      setDragOverColumn(null);
    }
  };

  const getColumnTasks = (columnId: string) =>
    tasks?.filter((t) => t.status === columnId) || [];

  const stats = useMemo(() => {
    const total = tasks?.length ?? 0;
    const overdue =
      tasks?.filter(
        (t) =>
          t.due_date &&
          isPast(new Date(t.due_date)) &&
          t.status !== "completed" &&
          t.status !== "discarded"
      ).length ?? 0;
    const dueToday =
      tasks?.filter((t) => t.due_date && isToday(new Date(t.due_date))).length ?? 0;
    const completed =
      tasks?.filter((t) => t.status === "completed").length ?? 0;
    return { total, overdue, dueToday, completed };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis: Array<{ label: string; value: number; icon: typeof KanbanIcon; tone: "neutral" | "warning" | "danger" }> = [
    { label: t("kanban.stats.total"), value: stats.total, icon: KanbanIcon, tone: "neutral" },
    { label: t("kanban.stats.today"), value: stats.dueToday, icon: CalendarIcon, tone: "warning" },
    { label: t("kanban.stats.overdue"), value: stats.overdue, icon: Flame, tone: "danger" },
    { label: t("kanban.stats.completed"), value: stats.completed, icon: CheckCircle2, tone: "neutral" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("kanban.title")}
        description={t("kanban.subtitle")}
        actions={
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t("kanban.newTask")}
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {kpis.map((s) => {
          const toneBar =
            s.tone === "danger" ? "bg-destructive" : s.tone === "warning" ? "bg-warning" : null;
          return (
            <div
              key={s.label}
              className="relative rounded-md border border-border bg-card p-3.5 transition-colors hover:bg-muted/60 overflow-hidden"
            >
              {toneBar && (
                <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", toneBar)} />
              )}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </span>
                <s.icon className="w-4 h-4 text-muted-foreground/70" />
              </div>
              <div className="text-2xl font-semibold tracking-tight tabular mt-1.5">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* ============ BOARD ============ */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const colTasks = getColumnTasks(col.id);
          const Icon = col.icon;
          const isDragOver = dragOverColumn === col.id;
          return (
            <div
              key={col.id}
              className="space-y-3 min-w-0"
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div className="relative overflow-hidden rounded-md bg-card border border-border/50 p-3">
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-secondary text-secondary-foreground border border-border`}
                />
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center shadow-sm flex-shrink-0`}
                    >
                      <Icon className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-sm truncate">
                        {t(col.labelKey)}
                      </h2>
                      <span className="text-[10px] text-muted-foreground">
                        {colTasks.length} {t(colTasks.length === 1 ? "kanban.taskSingular" : "kanban.taskPlural")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openNew(col.id)}
                    className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Column body */}
              <div
                className={`rounded-md p-2 min-h-[200px] space-y-2 transition-all ${col.tint} border ${
                  isDragOver ? `${col.border} border-dashed border-2` : "border-transparent"
                }`}
              >
                {colTasks.length === 0 && !isDragOver && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div
                      className={`w-10 h-10 rounded-md ${col.tint} ${col.border} border flex items-center justify-center mb-2`}
                    >
                      <Icon className="w-4 h-4 text-muted-foreground/60" />
                    </div>
                    <p className="text-[11px] text-muted-foreground/70">
                      {t("kanban.dragHere")}
                    </p>
                  </div>
                )}

                {colTasks.map((task) => {
                  const prio = task.priority || "medium";
                  const prioStyle = PRIORITY_STYLES[prio];
                  const overdue =
                    task.due_date &&
                    isPast(new Date(task.due_date)) &&
                    task.status !== "completed" &&
                    task.status !== "discarded";
                  const today = task.due_date && isToday(new Date(task.due_date));
                  return (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className={`relative overflow-hidden cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:-translate-y-0.5 border-border/60 ${
                        draggedTaskId === task.id ? "opacity-40 rotate-2" : ""
                      }`}
                    >
                      {/* Priority bar */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1 ${prioStyle.bar}`} />

                      <CardContent className="p-3 pl-4 space-y-2">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-1.5 min-w-0 flex-1">
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                            <span className="font-semibold text-sm leading-snug line-clamp-2">
                              {task.name}
                            </span>
                          </div>
                          <div className="flex gap-0.5 shrink-0 opacity-60 group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowComments(task.id);
                              }}
                              className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                            >
                              <MessageSquare className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => openEdit(task)}
                              className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="w-6 h-6 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-colors">
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {t("kanban.deleteTask")}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("common.cannotUndo")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    {t("common.cancel")}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteTask.mutate(task.id)}
                                  >
                                    {t("common.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        {/* Type + Auto badge */}
                        {(task.task_type || task.notes?.startsWith("[Auto]")) && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {task.task_type && (
                              <span className="inline-flex items-center h-5 px-2 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/15">
                                {task.task_type}
                              </span>
                            )}
                            {task.notes?.startsWith("[Auto]") && (
                              <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[10px] font-bold bg-secondary text-secondary-foreground border border-border shadow-sm">
                                <Sparkles className="w-2.5 h-2.5" />
                                Auto
                              </span>
                            )}
                          </div>
                        )}

                        {/* Client */}
                        {task.clients?.company_name && (
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}
                            >
                              {initials(task.clients.company_name)}
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground truncate">
                              {task.clients.company_name}
                            </span>
                          </div>
                        )}

                        {/* Operator */}
                        {task.operator && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span className="truncate">{task.operator}</span>
                          </div>
                        )}

                        {/* Tags */}
                        {task.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {task.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-0.5 h-4 px-1.5 rounded text-[9px] font-semibold bg-muted/60 text-muted-foreground"
                              >
                                <Tag className="w-2 h-2" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer: date + priority */}
                        {(task.due_date || prio !== "medium") && (
                          <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
                            {task.due_date ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                                  overdue
                                    ? "text-destructive"
                                    : today
                                    ? "text-warning"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <CalendarIcon className="w-2.5 h-2.5" />
                                {format(new Date(task.due_date), "dd MMM")}
                                {overdue && ` · ${t("kanban.overdue")}`}
                                {today && !overdue && ` · ${t("common.today").toLowerCase()}`}
                              </span>
                            ) : (
                              <span />
                            )}
                            {prio !== "medium" && (
                              <span
                                className={`inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold border ${prioStyle.badge}`}
                              >
                                {t(prioStyle.labelKey)}
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============ TASK DIALOG ============ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center">
                {editingTask ? (
                  <Pencil className="w-4 h-4 text-secondary-foreground" />
                ) : (
                  <Plus className="w-4 h-4 text-secondary-foreground" />
                )}
              </div>
              {editingTask ? t("kanban.editTask") : t("kanban.newTask")}
            </DialogTitle>
            <DialogDescription>
              {editingTask ? t("kanban.editTaskDesc") : t("kanban.newTaskDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("kanban.taskTitle")} *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("kanban.taskTitlePlaceholder")}
                className="h-11 rounded-md mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.type")}
                </label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger className="h-11 rounded-md mt-1.5">
                    <SelectValue placeholder={t("kanban.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.client")}
                </label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="h-11 rounded-md mt-1.5">
                    <SelectValue placeholder={t("common.none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.none")}</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("kanban.dueDate")}
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-11 rounded-md mt-1.5"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("kanban.priority")}
                </label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-11 rounded-md mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("priority.low")}</SelectItem>
                    <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                    <SelectItem value="high">{t("priority.high")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("kanban.operator")}
              </label>
              <Input
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder={t("kanban.operatorPlaceholder")}
                className="h-11 rounded-md mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={t("kanban.tagPlaceholder")}
                  className="h-10 rounded-md"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  className="h-10 rounded-md"
                >
                  {t("common.add")}
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs gap-1 rounded-md"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("clients.notes")}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t("kanban.notesPlaceholder")}
                className="rounded-md mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="h-10 rounded-md"
              >
                {t("common.cancel")}
              </Button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || createTask.isPending || updateTask.isPending}
                className="group h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90 text-white text-sm font-semibold rounded-md inline-flex items-center gap-1.5 transition-all disabled:opacity-60 relative overflow-hidden"
              >
                <span className="absolute inset-0 bg-secondary text-secondary-foreground border border-border -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {createTask.isPending || updateTask.isPending
                  ? t("common.saving")
                  : editingTask
                  ? t("common.save")
                  : t("kanban.create")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ COMMENTS DIALOG ============ */}
      <Dialog
        open={!!showComments}
        onOpenChange={(v) => {
          if (!v) setShowComments(null);
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-secondary-foreground" />
              </div>
              {t("kanban.taskComments")}
            </DialogTitle>
          </DialogHeader>
          {showComments && (
            <>
              <CommentsSection entityType="task" entityId={showComments} />
              {(() => {
                const task = tasks?.find((tk) => tk.id === showComments);
                return task ? <TaskTimeLogger taskId={task.id} clientId={task.client_id ?? null} /> : null;
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
