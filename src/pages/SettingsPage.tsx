import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Mail, CalendarDays } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Integrações e preferências do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-success" />
              <CardTitle className="text-base">WhatsApp API</CardTitle>
            </div>
            <CardDescription>Configure a integração com WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">Configurar</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">SMS</CardTitle>
            </div>
            <CardDescription>Configure o provedor de SMS</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">Configurar</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-accent" />
              <CardTitle className="text-base">Email</CardTitle>
            </div>
            <CardDescription>Configure o provedor de email</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">Configurar</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Google Calendar</CardTitle>
            </div>
            <CardDescription>Sincronize vencimentos automaticamente</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">Conectar</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
