import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Truck, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: t("signup.error"), description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-soft-lg animate-scale-in">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">{t("signup.success")}</h2>
            <p className="text-muted-foreground">{t("signup.successDesc")}</p>
            <Link to="/login">
              <Button variant="outline" className="mt-4">{t("signup.backToLogin")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full border-2 border-primary-foreground/30" />
          <div className="absolute bottom-32 right-16 w-96 h-96 rounded-full border-2 border-primary-foreground/20" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full border border-primary-foreground/20" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
              <Truck className="w-6 h-6" />
            </div>
            <h1 className="font-display text-3xl font-bold">MartinsAdviser</h1>
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight mb-4">
            Comece a organizar<br />sua operação
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Crie sua conta e tenha acesso à gestão completa de permits, compliance e comunicação.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">MartinsAdviser</h1>
          </div>

          <Card className="shadow-soft-lg border-border/50">
            <CardHeader className="text-center space-y-2 pb-4">
              <CardTitle className="font-display text-2xl">{t("signup.title")}</CardTitle>
              <CardDescription className="text-base">{t("signup.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">{t("signup.fullName")}</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" className="h-11 bg-muted/30 border-border/60 focus:bg-background transition-colors" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">{t("login.email")}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="h-11 bg-muted/30 border-border/60 focus:bg-background transition-colors" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">{t("login.password")}</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 bg-muted/30 border-border/60 focus:bg-background transition-colors" minLength={6} required />
                </div>
                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                  {loading ? t("signup.submitting") : t("signup.submit")}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                {t("signup.hasAccount")}{" "}
                <Link to="/login" className="text-primary hover:underline font-semibold">
                  {t("signup.login")}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
