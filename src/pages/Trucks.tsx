import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

export default function Trucks() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Caminhões</h1>
          <p className="text-muted-foreground mt-1">Gerencie a frota dos seus clientes</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Caminhão
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por placa, VIN..." className="pl-10" />
        </div>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum caminhão cadastrado ainda.</p>
          <Button variant="outline" className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar primeiro caminhão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
