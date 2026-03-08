import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours } from "date-fns";

interface Booking {
  id: string;
  status: string;
  is_recurring: boolean;
  trainee_package_id: string;
  class_slots: { title: string; start_time: string; end_time: string; class_type: string } | null;
}

export default function TraineeBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookings")
      .select("id, status, is_recurring, trainee_package_id, class_slots(title, start_time, end_time, class_type)")
      .eq("trainee_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setBookings(data as unknown as Booking[]);
  };

  useEffect(() => { fetch(); }, [user]);

  const cancel = async (booking: Booking) => {
    if (!booking.class_slots) return;
    const hoursUntil = differenceInHours(new Date(booking.class_slots.start_time), new Date());
    if (hoursUntil < 24) {
      toast({ title: "Cannot cancel", description: "Cancellations must be made at least 24 hours before the session.", variant: "destructive" });
      return;
    }
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    // Refund credit
    const { data: pkg } = await supabase
      .from("trainee_packages")
      .select("remaining_credits")
      .eq("id", booking.trainee_package_id)
      .single();
    if (pkg) {
      await supabase.from("trainee_packages").update({ remaining_credits: pkg.remaining_credits + 1 }).eq("id", booking.trainee_package_id);
    }
    toast({ title: "Booking cancelled", description: "Credit has been refunded." });
    fetch();
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">My Bookings</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.class_slots?.title || "—"}</TableCell>
                  <TableCell>
                    {b.class_slots ? `${format(new Date(b.class_slots.start_time), "PPP p")}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="capitalize">{b.class_slots?.class_type || "—"}</Badge>
                      {b.is_recurring && <Badge variant="outline">Recurring</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"} className="capitalize">
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {b.status === "confirmed" && (
                      <Button variant="ghost" size="sm" onClick={() => cancel(b)}>Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No bookings yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
