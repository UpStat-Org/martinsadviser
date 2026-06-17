import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, UserPlus, X, Plug } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useEldDriverMatches,
  useLinkEldMatch,
  useIgnoreEldMatch,
  type EldDriverMatch,
} from "@/hooks/useEld";
import { useDrivers, type Driver } from "@/hooks/useDrivers";
import { DriverFormDialog } from "@/components/DriverFormDialog";
import { useLanguage } from "@/contexts/LanguageContext";

const PROVIDER_LABEL: Record<EldDriverMatch["provider"], string> = {
  motive: "Motive",
  samsara: "Samsara",
};

function MatchRow({ match, drivers }: { match: EldDriverMatch; drivers: Driver[] }) {
  const { t } = useLanguage();
  const link = useLinkEldMatch();
  const ignore = useIgnoreEldMatch();
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreated = (driver: Driver) => {
    link.mutate({ id: match.id, driverId: driver.id, provider: match.provider });
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">
            {match.external_name || match.external_email || match.external_key}
          </span>
          <Badge variant="outline" className="text-[10px] border-border/60">{PROVIDER_LABEL[match.provider]}</Badge>
          {match.violations_pending > 0 && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
              {t("eldMatch.violationsPending").replace("{count}", String(match.violations_pending))}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {match.external_email && match.external_name ? `${match.external_email} · ` : ""}
          {t("eldMatch.lastSeen")}: {formatDistanceToNow(new Date(match.last_seen_at), { addSuffix: true })}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Select
          onValueChange={(driverId) => link.mutate({ id: match.id, driverId, provider: match.provider })}
          disabled={link.isPending}
        >
          <SelectTrigger className="h-9 w-44">
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Link2 className="w-3.5 h-3.5" />
              <SelectValue placeholder={t("eldMatch.linkTo")} />
            </span>
          </SelectTrigger>
          <SelectContent>
            {drivers.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-3.5 h-3.5" />
          {t("eldMatch.createNew")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={t("eldMatch.ignore")}
          onClick={() => ignore.mutate(match.id)}
          disabled={ignore.isPending}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      <DriverFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaults={{ full_name: match.external_name ?? "", email: match.external_email ?? null }}
        onCreated={handleCreated}
      />
    </div>
  );
}

/**
 * Surfaces ELD driver identities that eld-sync couldn't map to a local driver.
 * Renders nothing when there is nothing to resolve. Shown on the Drivers hub.
 */
export function EldDriverMatchingPanel() {
  const { t } = useLanguage();
  const { data: matches } = useEldDriverMatches();
  const { data: drivers } = useDrivers();

  if (!matches || matches.length === 0) return null;

  return (
    <Card className="border-warning/40 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-warning to-warning/30" />
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-md bg-warning/10 border border-warning/20 flex items-center justify-center">
            <Plug className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">
              {t("eldMatch.title")} <span className="text-muted-foreground">({matches.length})</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("eldMatch.subtitle")}</p>
          </div>
        </div>
        <div className="space-y-2">
          {matches.map((m) => (
            <MatchRow key={m.id} match={m} drivers={drivers ?? []} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
