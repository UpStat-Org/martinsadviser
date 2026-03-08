import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Mail, CalendarDays } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SettingsPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-success" /><CardTitle className="text-base">WhatsApp API</CardTitle></div>
            <CardDescription>{t("settings.configureWhatsapp")}</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" size="sm">{t("settings.configure")}</Button></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /><CardTitle className="text-base">SMS</CardTitle></div>
            <CardDescription>{t("settings.configureSms")}</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" size="sm">{t("settings.configure")}</Button></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Mail className="w-5 h-5 text-accent" /><CardTitle className="text-base">Email</CardTitle></div>
            <CardDescription>{t("settings.configureEmail")}</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" size="sm">{t("settings.configure")}</Button></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /><CardTitle className="text-base">Google Calendar</CardTitle></div>
            <CardDescription>{t("settings.syncCalendar")}</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" size="sm">{t("settings.connect")}</Button></CardContent>
        </Card>
      </div>
    </div>
  );
}
