import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MailCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { useLanguage } from "@/contexts/LanguageContext";

// /invite/<token> landing
//
// Public route. Looks up the invitation server-side via peek_invitation,
// then branches on the caller's auth state:
//
//   - not signed in           → "Sign in to accept" + "Create account to accept"
//                               (both routes preserve ?invite=<token> so the
//                                follow-up screen knows to call accept_invitation
//                                after auth succeeds)
//   - signed in, email match  → "Accept" button → accept_invitation → redirect /
//   - signed in, wrong email  → "Sign out and retry"
//
// The invitation row stores the email it was sent to; accept_invitation
// enforces email match server-side too.

interface PeekResultValid {
  valid: true;
  email: string;
  role: "owner" | "admin" | "member";
  org_name: string;
  org_slug: string;
  expires_at: string;
}
interface PeekResultInvalid {
  valid: false;
  reason: "not_found" | "expired" | "already_accepted" | string;
}

type PeekResult = PeekResultValid | PeekResultInvalid;

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh } = useOrg();
  const { t } = useLanguage();

  const peek = useQuery({
    queryKey: ["invite", token],
    enabled: !!token,
    queryFn: async (): Promise<PeekResult> => {
      const { data, error } = await supabase.rpc("peek_invitation", { p_token: token });
      if (error) throw error;
      return data as unknown as PeekResult;
    },
  });

  const [accepting, setAccepting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined);

  // Establish the current user's email once at mount so we can branch the UI.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserEmail(data.user?.email?.toLowerCase() ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const { error } = await supabase.rpc("accept_invitation", { p_token: token });
      if (error) throw error;
      await refresh();
      toast({ title: "Convite aceito!" });
      // Send the user into the dashboard of the org they just joined.
      navigate("/?welcome=invite");
    } catch (e: any) {
      toast({ title: "Falha ao aceitar", description: e.message, variant: "destructive" });
      setAccepting(false);
    }
  };

  const handleSignOutRetry = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Logo className="w-10 h-10 rounded-md" />
          <Wordmark size="lg" tone="dark" />
        </div>

        {peek.isLoading || userEmail === undefined ? (
          <Card className="border-border/50">
            <CardContent className="p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : !peek.data || !peek.data.valid ? (
          <InvalidCard reason={peek.data && "reason" in peek.data ? peek.data.reason : "not_found"} />
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-8 space-y-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <MailCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{t("inviteAccept.youAreInvited")}</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="font-semibold text-foreground">{peek.data.org_name}</span> está te
                  convidando como <span className="font-semibold text-foreground capitalize">{peek.data.role}</span>.
                </p>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-left text-xs space-y-1">
                <Row label="Email do convite" value={peek.data.email} mono />
                <Row label={t("startOrg.subdomainLabel")} value={`${peek.data.org_slug}.dotpilot.online`} mono />
              </div>

              {userEmail === null ? (
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link to={`/login?invite=${token}&email=${encodeURIComponent(peek.data.email)}`}>
                      Já tenho conta — entrar
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/signup?invite=${token}&email=${encodeURIComponent(peek.data.email)}`}>
                      Criar conta
                    </Link>
                  </Button>
                </div>
              ) : userEmail !== peek.data.email.toLowerCase() ? (
                <div className="space-y-2">
                  <div className="text-xs text-warning flex items-start gap-2 text-left p-3 rounded-md bg-warning/5 border border-warning/20">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Você está logado como <strong>{userEmail}</strong>. Este convite foi enviado pra <strong>{peek.data.email}</strong>.
                    </span>
                  </div>
                  <Button onClick={handleSignOutRetry} className="w-full">
                    Sair e trocar de conta
                  </Button>
                </div>
              ) : (
                <Button onClick={handleAccept} disabled={accepting} className="w-full gap-2">
                  {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Aceitar convite
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InvalidCard({ reason }: { reason: string }) {
  const { t } = useLanguage();
  const copy: Record<string, { title: string; desc: string }> = {
    not_found: {
      title: t("inviteAccept.notFound"),
      desc: t("inviteAccept.notFoundDesc"),
    },
    expired: {
      title: t("inviteAccept.notFound"),
      desc: t("inviteAccept.notFoundDesc"),
    },
    already_accepted: {
      title: t("inviteAccept.alreadyAccepted"),
      desc: t("inviteAccept.alreadyAcceptedDesc"),
    },
  };
  const c = copy[reason] ?? copy.not_found;
  return (
    <Card className="border-destructive/30">
      <CardContent className="p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-md bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{c.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/login">{t("common.goToLogin")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono font-semibold" : "font-semibold"}>{value}</span>
    </div>
  );
}
