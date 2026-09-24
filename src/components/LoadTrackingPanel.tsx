import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, MapPinned, Square, Radio, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { LiveTrackingMap, type TrackingPosition } from "@/components/LiveTrackingMap";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackingCopy } from "@/lib/trackingCopy";

type Link = {
  id: string;
  load_id: string;
  status: "active" | "revoked" | "expired";
  expires_at: string;
  driver_name: string | null;
  started_at: string | null;
  stopped_at: string | null;
  last_seen_at: string | null;
  created_at: string;
};

// New migrations are intentionally consumed through this narrow untyped
// adapter until `supabase gen types` runs against the deployed database.
type DbError = { message: string } | null;
type DbResult<T> = { data: T | null; error: DbError };
type TrackingQuery<T> = PromiseLike<DbResult<T>> & {
  select: (columns: string) => TrackingQuery<T>;
  eq: (column: string, value: string) => TrackingQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => TrackingQuery<T>;
  limit: (count: number) => TrackingQuery<T>;
  update: (values: Record<string, unknown>) => TrackingQuery<T>;
};
const trackingDb = supabase as unknown as {
  from: (table: string) => TrackingQuery<unknown[]>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<DbResult<Record<string, unknown>>>;
};

function freshness(lastSeen: string | null, copy: typeof trackingCopy.en) {
  if (!lastSeen) return copy.waiting;
  const seconds = Math.max(0, Math.round((Date.now() - new Date(lastSeen).getTime()) / 1000));
  if (seconds < 60) return copy.updatedNow;
  return copy.updatedMinutes(Math.floor(seconds / 60));
}

export function LoadTrackingPanel({ loadId }: { loadId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const copy = trackingCopy[language];
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const links = useQuery({
    queryKey: ["load_tracking_links", loadId],
    queryFn: async () => {
      const { data, error } = await trackingDb.from("load_tracking_links")
        .select("id, load_id, status, expires_at, driver_name, started_at, stopped_at, last_seen_at, created_at")
        .eq("load_id", loadId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Link[];
    },
    refetchInterval: 10_000,
  });
  const active = useMemo(
    () => (links.data ?? []).find((link) => link.status === "active" && new Date(link.expires_at) > new Date()) ?? null,
    [links.data],
  );
  const positions = useQuery({
    queryKey: ["load_tracking_positions", active?.id],
    enabled: !!active,
    queryFn: async () => {
      const { data, error } = await trackingDb.from("load_tracking_positions")
        .select("latitude, longitude, recorded_at").eq("tracking_link_id", active!.id)
        .order("recorded_at", { ascending: true }).limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []) as TrackingPosition[];
    },
    refetchInterval: 10_000,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["load_tracking_links", loadId] });
    qc.invalidateQueries({ queryKey: ["load_tracking_positions"] });
  };
  const create = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const { data, error } = await trackingDb.rpc("create_load_tracking_link", {
        p_load_id: loadId, p_expires_at: expiresAt,
      });
      if (error) throw new Error(error.message);
      const token = data?.token as string | undefined;
      if (!token) throw new Error("Could not create tracking link");
      return `${window.location.origin}/track/${token}`;
    },
    onSuccess: async (url) => {
      setShareUrl(url);
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      refresh();
      toast({ title: copy.linkCreated, description: copy.linkCreatedDesc });
    },
    onError: (error: Error) => toast({ title: copy.createFailed, description: error.message, variant: "destructive" }),
  });
  const revoke = useMutation({
    mutationFn: async () => {
      if (!active) return;
      const { error } = await trackingDb.from("load_tracking_links")
        .update({ status: "revoked", stopped_at: new Date().toISOString() }).eq("id", active.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setShareUrl(null); refresh(); toast({ title: copy.stopSharing }); },
    onError: (error: Error) => toast({ title: copy.stopFailed, description: error.message, variant: "destructive" }),
  });
  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard?.writeText(shareUrl);
    toast({ title: copy.linkCopied });
  };

  return <Card className="border-border/50">
    <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
      <CardTitle className="text-base flex items-center gap-2"><MapPinned className="w-4 h-4" /> {copy.title}</CardTitle>
      {!active ? <Button size="sm" className="gap-1.5" disabled={create.isPending} onClick={() => create.mutate()}>
        {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />} {copy.createLink}
      </Button> : <Button size="sm" variant="outline" className="gap-1.5" disabled={revoke.isPending} onClick={() => revoke.mutate()}>
        {revoke.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />} {copy.stopSharing}
      </Button>}
    </CardHeader>
    <CardContent className="space-y-3">
      {!active ? <p className="text-sm text-muted-foreground">{copy.description}</p> : <>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><StatusBadge tone={active.started_at && !active.stopped_at ? "success" : "warning"} size="sm">{active.started_at && !active.stopped_at ? copy.live : copy.awaitingConsent}</StatusBadge></span>
          {active.driver_name && <span>{active.driver_name}</span>}
          <span>{freshness(active.last_seen_at, copy)}</span>
          <span>{copy.expires(new Date(active.expires_at).toLocaleString())}</span>
        </div>
        {shareUrl && <div className="flex gap-2"><input readOnly value={shareUrl} className="h-9 flex-1 min-w-0 rounded-md border bg-muted/30 px-2 text-xs" /><Button size="sm" variant="outline" onClick={copyLink}><Copy className="w-3.5 h-3.5" /></Button><Button size="sm" variant="outline" asChild><a href={shareUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a></Button></div>}
        {(positions.data ?? []).length > 0 ? <LiveTrackingMap positions={positions.data ?? []} language={language} className="h-80 w-full rounded-md border" /> : <div className="h-40 rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">{copy.mapWaiting}</div>}
      </>}
    </CardContent>
  </Card>;
}
