import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Calendário</h1>
          <p className="text-muted-foreground mt-1">Vencimentos de permits e eventos</p>
        </div>
        <Button variant="outline">
          <CalendarDays className="w-4 h-4 mr-2" />
          Sincronizar Google Calendar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-4 flex justify-center">
            <Calendar mode="single" selected={date} onSelect={setDate} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Eventos — {date?.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Nenhum evento para esta data.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
