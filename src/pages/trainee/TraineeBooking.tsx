import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClassSlot {
  id: string; title: string; start_time: string; end_time: string; capacity: number; class_type: string; booking_count: number;
  trainers: { profiles: { full_name: string } | null } | null;
}

export default function TraineeBooking() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<ClassSlot[]>([]);
  const [recurring, setRecurring] = useState(false);
  const [activePkgId, setActivePkgId] = useState<string | null>(null);
  const [remainingCredits, setRemainingCredits] = useState(0);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("trainee_packages").select("id, remaining_credits").eq("trainee_id", user.id).eq("is_active", true).single()
      .then(({ data }) => { if (data) { setActivePkgId(data.id); setRemainingCredits(data.remaining_credits); } });
  }, [user]);

  useEffect(() => {
    const fetchSlots = async () => {
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
      const { data } = await supabase.from("class_slots").select("*, trainers(profiles:profiles!trainers_user_id_fkey(full_name))")
        .gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString()).order("start_time", { ascending: true });
      if (data) {
        const enriched = await Promise.all(data.map(async (slot) => {
          const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("class_slot_id", slot.id).eq("status", "confirmed");
          return { ...slot, booking_count: count || 0 } as unknown as ClassSlot;
        }));
        setSlots(enriched);
      }
    };
    fetchSlots();
  }, [date]);

  const bookSlot = async (slot: ClassSlot) => {
    if (!user || !activePkgId) { toast({ title: t("trainee.booking.noActivePackage"), description: t("trainee.booking.needPackage"), variant: "destructive" }); return; }
    if (slot.booking_count >= slot.capacity) { toast({ title: t("trainee.booking.classFull"), description: t("trainee.booking.classFullDesc"), variant: "destructive" }); return; }
    setIsBooking(true);
    if (recurring) {
      let creditsLeft = remainingCredits;
      const { data: futureSlots } = await supabase.from("class_slots").select("id, start_time").gte("start_time", new Date().toISOString()).order("start_time", { ascending: true });
      const targetDay = new Date(slot.start_time).getDay();
      const targetHour = new Date(slot.start_time).getHours();
      const targetMin = new Date(slot.start_time).getMinutes();
      const matchingSlots = (futureSlots || []).filter((s) => { const d = new Date(s.start_time); return d.getDay() === targetDay && d.getHours() === targetHour && d.getMinutes() === targetMin; });
      const bookings: any[] = [];
      for (const s of matchingSlots) { if (creditsLeft <= 0) break; bookings.push({ trainee_id: user.id, class_slot_id: s.id, trainee_package_id: activePkgId, is_recurring: true }); creditsLeft--; }
      if (bookings.length === 0) { toast({ title: t("trainee.booking.noMatchingSlots"), description: t("trainee.booking.noMatchingSlotsDesc"), variant: "destructive" }); setIsBooking(false); return; }
      const { error } = await supabase.from("bookings").insert(bookings);
      if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); setIsBooking(false); return; }
      await supabase.from("trainee_packages").update({ remaining_credits: creditsLeft }).eq("id", activePkgId);
      setRemainingCredits(creditsLeft);
      toast({ title: t("trainee.booking.recurringCreated"), description: t("trainee.booking.sessionsBooked", { count: bookings.length }) });
    } else {
      if (remainingCredits <= 0) { toast({ title: t("trainee.booking.noCredits"), variant: "destructive" }); setIsBooking(false); return; }
      const { error } = await supabase.from("bookings").insert({ trainee_id: user.id, class_slot_id: slot.id, trainee_package_id: activePkgId });
      if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); setIsBooking(false); return; }
      await supabase.from("trainee_packages").update({ remaining_credits: remainingCredits - 1 }).eq("id", activePkgId);
      setRemainingCredits((c) => c - 1);
      toast({ title: t("trainee.booking.sessionBooked") });
    }
    setIsBooking(false);
    setDate(new Date(date));
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("trainee.booking.title")}</h1>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card><CardContent className="p-3"><Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="pointer-events-auto" /></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><Switch checked={recurring} onCheckedChange={setRecurring} id="recurring" /><Label htmlFor="recurring">{t("trainee.booking.bookRecurring")}</Label></CardContent></Card>
          {activePkgId && (<Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{t("trainee.booking.creditsRemaining")}</p><p className="text-2xl font-bold">{remainingCredits}</p></CardContent></Card>)}
        </div>
        <div className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">{t("trainee.booking.classesOn", { date: format(date, "EEEE, MMM d") })}</h2>
          {slots.map((s) => {
            const isFull = s.booking_count >= s.capacity;
            return (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(s.start_time), "p")} – {format(new Date(s.end_time), "p")} · {(s.trainers as any)?.profiles?.full_name || "TBD"}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="secondary" className="capitalize">{s.class_type}</Badge>
                      <Badge variant={isFull ? "destructive" : "default"}>{t("trainee.booking.spots", { booked: s.booking_count, total: s.capacity })}</Badge>
                    </div>
                  </div>
                  <Button onClick={() => bookSlot(s)} disabled={isFull || !activePkgId || isBooking}>
                    {isFull ? t("trainee.booking.full") : recurring ? t("trainee.booking.bookWeekly") : t("trainee.booking.book")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {slots.length === 0 && (<Card><CardContent className="py-8 text-center text-muted-foreground">{t("trainee.booking.noClasses")}</CardContent></Card>)}
        </div>
      </div>
    </DashboardLayout>
  );
}
