import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Mail, Phone, MessageCircle } from "lucide-react";

export default function Messages() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Mensagens</h1>
          <p className="text-muted-foreground mt-1">Envio automático por WhatsApp, SMS e Email</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Mensagem
        </Button>
      </div>

      <Tabs defaultValue="scheduled">
        <TabsList>
          <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
          <TabsTrigger value="sent">Enviadas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automations">Automações</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nenhuma mensagem agendada.</p>
              <Button variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Agendar mensagem
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nenhuma mensagem enviada ainda.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum template criado.</p>
              <Button variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Criar template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-success" />
                  <CardTitle className="text-sm">WhatsApp</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Configurar integração</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  <CardTitle className="text-sm">SMS</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Configurar integração</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-accent" />
                  <CardTitle className="text-sm">Email</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Configurar integração</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
