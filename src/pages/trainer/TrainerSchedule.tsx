import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface SessionRow {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  class_type: string;
  bookings: { trainee_id: string; status: string; profiles: { full_name: string } | null }[];
}

export default function TrainerSchedule() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get trainer record
      const { data: trainer } = await supabase.from("trainers").select("id").eq("user_id", user.id).single();
      if (!trainer) return;
      const { data } = await supabase
        .from("class_slots")
        .select("id, title, start_time, end_time, class_type, bookings(trainee_id, status, profiles:profiles!bookings_trainee_id_fkey(full_name))")
        .eq("trainer_id", trainer.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });
      if (data) setSessions(data as unknown as SessionRow[]);
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">My Schedule</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Trainees</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{format(new Date(s.start_time), "PPP p")}</TableCell>
                  <TableCell className="capitalize">{s.class_type}</TableCell>
                  <TableCell>
                    {s.bookings.filter((b) => b.status === "confirmed").map((b) => (
                      <Badge key={b.trainee_id} variant="secondary" className="mr-1">
                        {(b as any).profiles?.full_name || "Trainee"}
                      </Badge>
                    ))}
                    {s.bookings.filter((b) => b.status === "confirmed").length === 0 && <span className="text-muted-foreground">No bookings</span>}
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No upcoming sessions</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
