import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreateDriver, useUpdateDriver, type Driver, type DriverInsert } from "@/hooks/useDrivers";
import { useClients } from "@/hooks/useClients";

interface DriverFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When omitted (e.g. the Drivers hub), the dialog shows a client picker. */
  clientId?: string;
  driver?: Driver | null;
  /** Prefill values for a new driver (e.g. name/email from an ELD match). */
  defaults?: Partial<Omit<DriverInsert, "client_id" | "user_id">>;
  /** Called after a successful create with the new driver row. */
  onCreated?: (driver: Driver) => void;
}

const EMPTY: Omit<DriverInsert, "client_id" | "user_id"> = {
  full_name: "",
  date_of_birth: null,
  ssn_last4: null,
  phone: null,
  email: null,
  cdl_number: null,
  cdl_state: null,
  cdl_class: null,
  cdl_endorsements: null,
  cdl_issued_on: null,
  cdl_expires_on: null,
  medical_card_expires_on: null,
  medical_examiner_name: null,
  hire_date: null,
  termination_date: null,
  status: "active",
  notes: null,
};

export function DriverFormDialog({ open, onOpenChange, clientId, driver, defaults, onCreated }: DriverFormDialogProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const createMut = useCreateDriver();
  const updateMut = useUpdateDriver();
  const [form, setForm] = useState(EMPTY);
  // Only fetch the client list when we actually need the picker (hub usage).
  const needsClientPicker = !clientId && !driver;
  const { data: clients } = useClients(needsClientPicker ? "" : undefined);
  const [pickedClient, setPickedClient] = useState<string>("");

  useEffect(() => {
    if (driver) {
      const { id, org_id, created_at, updated_at, client_id, user_id, ...rest } = driver;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, ...defaults });
      setPickedClient("");
    }
  }, [driver, open]);

  const targetClientId = clientId ?? pickedClient;

  const handleSubmit = async () => {
    if (driver) {
      await updateMut.mutateAsync({ id: driver.id, patch: form });
    } else {
      if (!user || !targetClientId) return;
      const payload: DriverInsert = { ...form, client_id: targetClientId, user_id: user.id };
      const created = await createMut.mutateAsync(payload);
      onCreated?.(created);
    }
    onOpenChange(false);
  };

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{driver ? t("drivers.form.edit") : t("drivers.form.new")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {needsClientPicker && (
            <div className="space-y-1.5">
              <Label>{t("drivers.form.client")}</Label>
              <Select value={pickedClient} onValueChange={setPickedClient}>
                <SelectTrigger><SelectValue placeholder={t("drivers.form.selectClient")} /></SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{t("drivers.form.fullName")}</Label>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t("drivers.form.dob")}</Label>
              <Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => set("date_of_birth", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("drivers.form.ssn4")}</Label>
              <Input maxLength={4} value={form.ssn_last4 ?? ""} onChange={(e) => set("ssn_last4", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("clients.status")}</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as Driver["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("drivers.status.active")}</SelectItem>
                  <SelectItem value="inactive">{t("drivers.status.inactive")}</SelectItem>
                  <SelectItem value="terminated">{t("drivers.status.terminated")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("drivers.form.phone")}</Label>
              <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("drivers.form.email")}</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value || null)} />
            </div>
          </div>

          <div className="rounded-md bg-muted/40 border border-border/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("drivers.form.cdlSection")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>{t("drivers.form.number")}</Label>
                <Input value={form.cdl_number ?? ""} onChange={(e) => set("cdl_number", e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("drivers.form.state")}</Label>
                <Input maxLength={2} value={form.cdl_state ?? ""} onChange={(e) => set("cdl_state", e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("drivers.form.class")}</Label>
                <Select value={form.cdl_class ?? "none"} onValueChange={(v) => set("cdl_class", v === "none" ? null : (v as "A" | "B" | "C"))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("drivers.form.endorsements")}</Label>
                <Input placeholder="H, N, P" value={form.cdl_endorsements ?? ""} onChange={(e) => set("cdl_endorsements", e.target.value || null)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("drivers.form.issued")}</Label>
                <Input type="date" value={form.cdl_issued_on ?? ""} onChange={(e) => set("cdl_issued_on", e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("drivers.form.expires")}</Label>
                <Input type="date" value={form.cdl_expires_on ?? ""} onChange={(e) => set("cdl_expires_on", e.target.value || null)} />
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted/40 border border-border/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("drivers.form.medCardSection")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("drivers.form.expires")}</Label>
                <Input type="date" value={form.medical_card_expires_on ?? ""} onChange={(e) => set("medical_card_expires_on", e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("drivers.form.examiner")}</Label>
                <Input value={form.medical_examiner_name ?? ""} onChange={(e) => set("medical_examiner_name", e.target.value || null)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("drivers.form.hireDate")}</Label>
              <Input type="date" value={form.hire_date ?? ""} onChange={(e) => set("hire_date", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("drivers.form.terminationDate")}</Label>
              <Input type="date" value={form.termination_date ?? ""} onChange={(e) => set("termination_date", e.target.value || null)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("drivers.form.notes")}</Label>
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.full_name.trim() || (!driver && !targetClientId)}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
