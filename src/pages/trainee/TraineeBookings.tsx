import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours } from "date-fns";
import { ListControls, useListControls } from "@/components/ListControls";

interface Booking {
  id: string; status: string; is_recurring: boolean; trainee_package_id: string;
  class_slots: { title: string; start_time: string; end_time: string; class_type: string } | null;
}

export default function TraineeBookings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredByStatus = statusFilter === "all" ? bookings : bookings.filter((b) => b.status === statusFilter);

  const lc = useListControls<Booking>(filteredByStatus, (b, q) =>
    (b.class_slots?.title || "").toLowerCase().includes(q) || b.status.toLowerCase().includes(q)
  );

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase.from("bookings").select("id, status, is_recurring, trainee_package_id, class_slots(title, start_time, end_time, class_type)").eq("trainee_id", user.id).order("created_at", { ascending: false });
    if (data) setBookings(data as unknown as Booking[]);
  };

  useEffect(() => { fetchBookings(); }, [user]);

  const cancel = async (booking: Booking) => {
    if (!booking.class_slots) return;
    const hoursUntil = differenceInHours(new Date(booking.class_slots.start_time), new Date());
    if (hoursUntil < 24) { toast({ title: t("trainee.bookings.cannotCancel"), description: t("trainee.bookings.cancelPolicy"), variant: "destructive" }); return; }
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    const { data: pkg } = await supabase.from("trainee_packages").select("remaining_credits").eq("id", booking.trainee_package_id).single();
    if (pkg) { await supabase.from("trainee_packages").update({ remaining_credits: pkg.remaining_credits + 1 }).eq("id", booking.trainee_package_id); }
    toast({ title: t("trainee.bookings.bookingCancelled"), description: t("trainee.bookings.creditRefunded") });
    fetchBookings();
  };

  const statusFilterElement = (
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("common.all")}</SelectItem>
        <SelectItem value="confirmed">Confirmed</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("trainee.bookings.title")}</h1>
      <div className="mb-4">
        <ListControls search={lc.search} onSearchChange={lc.setSearch} page={lc.page} totalPages={lc.totalPages} onPageChange={lc.setPage} pageSize={lc.pageSize} onPageSizeChange={lc.setPageSize} totalItems={lc.totalItems} filterElement={statusFilterElement} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("trainee.bookings.class")}</TableHead>
                <TableHead>{t("trainee.bookings.dateTime")}</TableHead>
                <TableHead>{t("trainee.bookings.type")}</TableHead>
                <TableHead>{t("trainee.bookings.status")}</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lc.paginated.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.class_slots?.title || "—"}</TableCell>
                  <TableCell>{b.class_slots ? format(new Date(b.class_slots.start_time), "PPP p") : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="capitalize">{b.class_slots?.class_type || "—"}</Badge>
                      {b.is_recurring && <Badge variant="outline">{t("trainee.bookings.recurring")}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"} className="capitalize">{b.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {b.status === "confirmed" && <Button variant="ghost" size="sm" onClick={() => cancel(b)}>{t("trainee.bookings.cancel")}</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {lc.paginated.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("trainee.bookings.noBookings")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
