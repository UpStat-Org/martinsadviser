import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PERMIT_DOCUMENTS_BUCKET } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

const PORTAL_DOCUMENT_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
};

export interface PortalService {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  billing_type: string;
}

export interface PortalOrderListItem {
  id: string;
  order_number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  sla_hours: number | null;
  quoted_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  renewal_of_id: string | null;
  service_name: string | null;
  assignee_name: string | null;
  pending_documents: number;
  open_requests: number;
}

export interface PortalChecklistItem {
  id: string;
  title: string;
  description: string | null;
  required: boolean;
  status: string;
  document_path: string | null;
  file_name: string | null;
  rejection_reason: string | null;
  due_date: string | null;
  updated_at: string;
}

export interface PortalQuestion {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  due_date: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface PortalSignature {
  id: string;
  checklist_item_id: string | null;
  document_name: string;
  signer_name: string;
  signer_email: string | null;
  signed_at: string;
  signature_data: string;
}

export interface PortalOrderDetail extends PortalOrderListItem {
  org_id: string;
  client_id: string;
  started_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  checklist: PortalChecklistItem[];
  permits: Array<{
    id: string;
    permit_type: string;
    permit_number: string | null;
    status: string;
    expiration_date: string | null;
    state: string | null;
  }>;
  questions: PortalQuestion[];
  signatures: PortalSignature[];
  timeline: Array<{
    id: string;
    event_type: string;
    from_value: string | null;
    to_value: string | null;
    created_at: string;
  }>;
}

export interface PortalQuote {
  id: string;
  quote_number: string | null;
  title: string;
  status: string;
  valid_until: string | null;
  notes: string | null;
  discount: number;
  subtotal: number;
  total: number;
  sent_at: string | null;
  accepted_at: string | null;
  client_response_note: string | null;
  client_responded_at: string | null;
  created_at: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    billing_type: string;
    position: number;
  }>;
}

export interface PortalInvoice {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_date: string | null;
  description: string | null;
  paid_via: string | null;
  created_at: string;
}

async function rpcJson<T>(name: "portal_list_services" | "portal_list_service_orders" | "portal_list_quotes" | "portal_list_invoices") {
  const { data, error } = await supabase.rpc(name);
  if (error) throw error;
  return data as unknown as T;
}

export function usePortalServices() {
  return useQuery({ queryKey: ["portal", "services"], queryFn: () => rpcJson<PortalService[]>("portal_list_services") });
}

export function usePortalOrders() {
  return useQuery({ queryKey: ["portal", "orders"], queryFn: () => rpcJson<PortalOrderListItem[]>("portal_list_service_orders") });
}

export function usePortalOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["portal", "orders", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_get_service_order", { p_order_id: id! });
      if (error) throw error;
      return data as unknown as PortalOrderDetail;
    },
  });
}

export function usePortalQuotes() {
  return useQuery({ queryKey: ["portal", "quotes"], queryFn: () => rpcJson<PortalQuote[]>("portal_list_quotes") });
}

export function usePortalInvoices() {
  return useQuery({ queryKey: ["portal", "invoices"], queryFn: () => rpcJson<PortalInvoice[]>("portal_list_invoices") });
}

export function usePortalCreateOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; serviceId?: string; renewalOfId?: string; permitIds?: string[] }) => {
      const { data, error } = await supabase.rpc("portal_create_service_order", {
        p_title: input.title,
        ...(input.description ? { p_description: input.description } : {}),
        ...(input.serviceId ? { p_service_id: input.serviceId } : {}),
        ...(input.renewalOfId ? { p_renewal_of_id: input.renewalOfId } : {}),
        p_permit_ids: input.permitIds ?? [],
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", "orders"] });
      toast({ title: tNow("portal2.requestCreated") });
    },
    onError: (error: Error) => toast({ title: tNow("common.error"), description: error.message, variant: "destructive" }),
  });
}

export function usePortalAnswerQuestion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ orderId: _orderId, questionId, answer }: { orderId: string; questionId: string; answer: string }) => {
      const { error } = await supabase.rpc("portal_answer_service_order_question", { p_question_id: questionId, p_answer: answer });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["portal", "orders", input.orderId] });
      qc.invalidateQueries({ queryKey: ["portal", "orders"] });
      toast({ title: tNow("portal2.answerSent") });
    },
    onError: (error: Error) => toast({ title: tNow("common.error"), description: error.message, variant: "destructive" }),
  });
}

export function usePortalUploadChecklistDocument() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ orgId, orderId, itemId, file }: { orgId: string; orderId: string; itemId: string; file: File }) => {
      if (file.size > 20 * 1024 * 1024) throw new Error(tNow("portal2.fileTooLarge"));
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const contentType = PORTAL_DOCUMENT_CONTENT_TYPES[ext];
      if (!contentType) throw new Error(tNow("portal2.fileTypeNotAllowed"));
      const path = `${orgId}/service-orders/${orderId}/${itemId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(PERMIT_DOCUMENTS_BUCKET).upload(path, file, { contentType });
      if (uploadError) throw uploadError;
      const { error } = await supabase.rpc("portal_attach_checklist_document", {
        p_item_id: itemId,
        p_document_path: path,
        p_file_name: file.name,
      });
      if (error) {
        await supabase.storage.from(PERMIT_DOCUMENTS_BUCKET).remove([path]);
        throw error;
      }
      return orderId;
    },
    onSuccess: (orderId) => {
      qc.invalidateQueries({ queryKey: ["portal", "orders", orderId] });
      qc.invalidateQueries({ queryKey: ["portal", "orders"] });
      toast({ title: tNow("portal2.documentSent") });
    },
    onError: (error: Error) => toast({ title: tNow("common.error"), description: error.message, variant: "destructive" }),
  });
}

export function usePortalSignDocument() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { orderId: string; itemId: string; documentName: string; signerName: string; signerEmail: string; signatureData: string }) => {
      const { error } = await supabase.rpc("portal_sign_service_order_document", {
        p_order_id: input.orderId,
        p_checklist_item_id: input.itemId,
        p_document_name: input.documentName,
        p_signer_name: input.signerName,
        p_signer_email: input.signerEmail,
        p_signature_data: input.signatureData,
      });
      if (error) throw error;
      return input.orderId;
    },
    onSuccess: (orderId) => {
      qc.invalidateQueries({ queryKey: ["portal", "orders", orderId] });
      toast({ title: tNow("portal2.signatureSaved") });
    },
    onError: (error: Error) => toast({ title: tNow("common.error"), description: error.message, variant: "destructive" }),
  });
}

export function usePortalRespondQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ quoteId, decision, note }: { quoteId: string; decision: "accepted" | "rejected"; note?: string }) => {
      const { error } = await supabase.rpc("portal_respond_quote", {
        p_quote_id: quoteId,
        p_decision: decision,
        ...(note ? { p_note: note } : {}),
      });
      if (error) throw error;
      return decision;
    },
    onSuccess: (decision) => {
      qc.invalidateQueries({ queryKey: ["portal", "quotes"] });
      toast({ title: tNow(decision === "accepted" ? "portal2.quoteAccepted" : "portal2.quoteRejected") });
    },
    onError: (error: Error) => toast({ title: tNow("common.error"), description: error.message, variant: "destructive" }),
  });
}

export function usePortalInvoiceCheckout() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke("portal-invoice-checkout", { body: { invoice_id: invoiceId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error(tNow("portal2.checkoutError"));
      window.location.assign(data.url);
    },
    onError: (error: Error) => toast({ title: tNow("common.error"), description: error.message, variant: "destructive" }),
  });
}
