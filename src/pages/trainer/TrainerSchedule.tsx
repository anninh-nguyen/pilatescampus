import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ListControls, useListControls } from "@/components/ListControls";

interface TraineeProfile { full_name: string; email?: string; phone?: string | null }

interface SessionRow {
  id: string; start_time: string; end_time: string; title: string; class_type: string;
  bookings: { trainee_id: string; status: string; profiles: TraineeProfile | null }[];
}

export default function TrainerSchedule() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const lc = useListControls<SessionRow>(sessions, (s, q) =>
    s.title.toLowerCase().includes(q) || s.class_type.toLowerCase().includes(q)
  );

  useEffect(() => {
    if (!user) return;
    const fetchSchedule = async () => {
      const { data: trainer } = await supabase.from("trainers").select("id").eq("user_id", user.id).single();
      if (!trainer) return;
      const { data } = await supabase
        .from("class_slots")
        .select("id, title, start_time, end_time, class_type, bookings(trainee_id, status)")
        .eq("trainer_id", trainer.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });
      if (!data) return;

      // Get trainee names separately
      const traineeIds = [...new Set(data.flatMap((s: any) => (s.bookings || []).map((b: any) => b.trainee_id)).filter(Boolean))];
      let profileMap = new Map<string, TraineeProfile>();
      if (traineeIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", traineeIds);
        if (profiles) profiles.forEach((p) => profileMap.set(p.user_id, { full_name: p.full_name, email: p.email, phone: p.phone }));
      }

      const enriched = data.map((s: any) => ({
        ...s,
        bookings: (s.bookings || []).map((b: any) => ({
          ...b,
          profiles: profileMap.get(b.trainee_id) || { full_name: "Trainee" },
        })),
      }));
      setSessions(enriched as unknown as SessionRow[]);
    };
    fetchSchedule();
  }, [user]);

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("trainer.schedule.title")}</h1>
      <div className="mb-4">
        <ListControls search={lc.search} onSearchChange={lc.setSearch} page={lc.page} totalPages={lc.totalPages} onPageChange={lc.setPage} pageSize={lc.pageSize} onPageSizeChange={lc.setPageSize} totalItems={lc.totalItems} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("trainer.schedule.class")}</TableHead>
                <TableHead>{t("trainer.schedule.dateTime")}</TableHead>
                <TableHead>{t("trainer.schedule.type")}</TableHead>
                <TableHead>{t("trainer.schedule.trainees")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lc.paginated.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{format(new Date(s.start_time), "PPP p")}</TableCell>
                  <TableCell className="capitalize">{s.class_type}</TableCell>
                  <TableCell>
                    {s.bookings.filter((b) => b.status === "confirmed").map((b) => (
                      <Popover key={b.trainee_id}>
                        <PopoverTrigger asChild>
                          <Badge variant="secondary" className="mr-1 cursor-pointer">{b.profiles?.full_name || "Trainee"}</Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 text-sm">
                          <p className="font-semibold">{b.profiles?.full_name}</p>
                          {b.profiles?.email && <p className="text-muted-foreground">{b.profiles.email}</p>}
                          {b.profiles?.phone && <p className="text-muted-foreground">{b.profiles.phone}</p>}
                        </PopoverContent>
                      </Popover>
                    ))}
                    {s.bookings.filter((b) => b.status === "confirmed").length === 0 && <span className="text-muted-foreground">{t("trainer.schedule.noBookings")}</span>}
                  </TableCell>
                </TableRow>
              ))}
              {lc.paginated.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t("trainer.schedule.noSessions")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
