import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours } from "date-fns";
import { ListControls, useListControls } from "@/components/ListControls";
import { X } from "lucide-react";

interface BookingRow {
  id: string;
  status: string;
  trainee_id: string;
  trainee_package_id: string;
  trainee_name: string;
  slot_title: string;
  slot_start: string;
  slot_end: string;
  slot_type: string;
}

interface CancellationTier { hours_before: number; refund_percentage: number; }

export default function ManageBookings() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  const lc = useListControls<BookingRow>(bookings, (b, q) =>
    b.trainee_name.toLowerCase().includes(q) ||
    b.slot_title.toLowerCase().includes(q) ||
    b.status.toLowerCase().includes(q)
  );

  const fetchBookings = async () => {
    if (!user) return;

    // Build query based on role
    let slotIds: string[] | null = null;

    if (role === "trainer") {
      // Get trainer's class slots only
      const { data: trainer } = await supabase.from("trainers").select("id").eq("user_id", user.id).single();
      if (!trainer) return;
      const { data: slots } = await supabase.from("class_slots").select("id").eq("trainer_id", trainer.id).gte("start_time", new Date().toISOString());
      if (!slots || slots.length === 0) { setBookings([]); return; }
      slotIds = slots.map((s) => s.id);
    }

    // Fetch bookings with class slot info
    let query = supabase.from("bookings")
      .select("id, status, trainee_id, trainee_package_id, class_slots(title, start_time, end_time, class_type)")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    if (slotIds) {
      query = query.in("class_slot_id", slotIds);
    }

    const { data } = await query;
    if (!data || data.length === 0) { setBookings([]); return; }

    // Get trainee names
    const traineeIds = [...new Set(data.map((b: any) => b.trainee_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", traineeIds);
    const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

    const rows: BookingRow[] = data
      .filter((b: any) => b.class_slots)
      .map((b: any) => ({
        id: b.id,
        status: b.status,
        trainee_id: b.trainee_id,
        trainee_package_id: b.trainee_package_id,
        trainee_name: nameMap.get(b.trainee_id) || "—",
        slot_title: b.class_slots.title,
        slot_start: b.class_slots.start_time,
        slot_end: b.class_slots.end_time,
        slot_type: b.class_slots.class_type,
      }))
      .sort((a: BookingRow, b: BookingRow) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime());

    setBookings(rows);
  };

  useEffect(() => { fetchBookings(); }, [user, role]);

  const cancelBooking = async (booking: BookingRow) => {
    const hoursUntil = differenceInHours(new Date(booking.slot_start), new Date());

    // Fetch cancellation tiers
    const { data: tiers } = await supabase
      .from("cancellation_policies")
      .select("hours_before, refund_percentage")
      .order("hours_before", { ascending: false });

    const sortedTiers: CancellationTier[] = (tiers as unknown as CancellationTier[]) || [];
    const matchedTier = sortedTiers.find((tier) => hoursUntil >= tier.hours_before);
    const refundPct = matchedTier ? matchedTier.refund_percentage : 0;

    // Admin/trainer can always cancel, even with 0% refund
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);

    // Refund credits based on percentage
    const { data: pkg } = await supabase.from("trainee_packages")
      .select("remaining_credits").eq("id", booking.trainee_package_id).single();

    if (pkg && refundPct > 0) {
      const creditCost = 1;
      const refunded = Math.round(((creditCost * refundPct) / 100) * 10) / 10;
      if (refunded > 0) {
        await supabase.from("trainee_packages")
          .update({ remaining_credits: pkg.remaining_credits + refunded })
          .eq("id", booking.trainee_package_id);
      }
    }

    const refundMsg = refundPct === 100
      ? t("trainee.bookings.fullRefund")
      : refundPct > 0
        ? t("trainee.bookings.partialRefund", { percentage: refundPct, refunded: Math.round(((1 * refundPct) / 100) * 10) / 10 })
        : t("manageBookings.noRefundApplied");

    toast({
      title: t("manageBookings.cancelledFor", { name: booking.trainee_name }),
      description: refundMsg,
    });
    fetchBookings();
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("manageBookings.title")}</h1>
      <div className="mb-4">
        <ListControls
          search={lc.search} onSearchChange={lc.setSearch}
          page={lc.page} totalPages={lc.totalPages} onPageChange={lc.setPage}
          pageSize={lc.pageSize} onPageSizeChange={lc.setPageSize} totalItems={lc.totalItems}
        />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("manageBookings.trainee")}</TableHead>
                <TableHead>{t("manageBookings.class")}</TableHead>
                <TableHead>{t("manageBookings.dateTime")}</TableHead>
                <TableHead>{t("manageBookings.type")}</TableHead>
                <TableHead>{t("manageBookings.status")}</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lc.paginated.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.trainee_name}</TableCell>
                  <TableCell>{b.slot_title}</TableCell>
                  <TableCell>{format(new Date(b.slot_start), "PPP p")}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{b.slot_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="capitalize">{b.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => cancelBooking(b)}>
                      <X className="mr-1 h-3 w-3" />
                      {t("common.cancel")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {lc.paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {t("manageBookings.noBookings")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
