import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, Loader2, Trash2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function AIChatPanel({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const SUGGESTIONS = [
    t("aichat.suggestion1"),
    t("aichat.suggestion2"),
    t("aichat.suggestion3"),
    t("aichat.suggestion4"),
  ];
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["ai_chat", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ai_chat_messages")
        .select("id, role, content, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ChatMsg[];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setSending(true);
    setInput("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { client_id: clientId, message, language },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      qc.invalidateQueries({ queryKey: ["ai_chat", clientId] });
    } catch (e: any) {
      toast({ title: t("aichat.error"), description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    const { error } = await (supabase as any).from("ai_chat_messages").delete().eq("client_id", clientId);
    if (error) {
      toast({ title: t("aichat.errorClear"), description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["ai_chat", clientId] });
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {t("aichat.title")} — {clientName}
        </CardTitle>
        {messages?.length ? (
          <Button variant="ghost" size="sm" onClick={clearHistory}>
            <Trash2 className="w-3 h-3 mr-1" /> {t("aichat.clear")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div ref={scrollRef} className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !messages?.length ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center py-2">
                {t("aichat.askAnything")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-xs p-3 rounded-lg border bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:!my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("aichat.thinking")}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t pt-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("aichat.placeholder")}
            rows={2}
            className="resize-none"
            disabled={sending}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <Button size="icon" className="shrink-0 self-end" disabled={!input.trim() || sending} onClick={() => send()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
