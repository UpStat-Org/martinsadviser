import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, FileCheck, AlertTriangle } from "lucide-react";

const stats = [
  { label: "Clientes", value: "0", icon: Users, color: "text-primary" },
  { label: "Caminhões", value: "0", icon: Truck, color: "text-primary" },
  { label: "Permits Ativos", value: "0", icon: FileCheck, color: "text-success" },
  { label: "Vencendo em 30 dias", value: "0", icon: AlertTriangle, color: "text-warning" },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do seu sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Permits Vencendo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Nenhum permit com vencimento próximo.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Mensagens Agendadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Nenhuma mensagem agendada.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
