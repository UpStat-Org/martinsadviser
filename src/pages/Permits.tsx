import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter } from "lucide-react";

export default function Permits() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Permits</h1>
          <p className="text-muted-foreground mt-1">Controle de IRP, IFTA, UCR, Oversize e mais</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Permit
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar permits..." className="pl-10" />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
        <div className="flex gap-2">
          <Badge variant="outline">Todos</Badge>
          <Badge className="bg-success text-success-foreground">Ativos</Badge>
          <Badge className="bg-warning text-warning-foreground">Vencendo</Badge>
          <Badge variant="destructive">Vencidos</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum permit cadastrado ainda.</p>
          <Button variant="outline" className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar primeiro permit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
