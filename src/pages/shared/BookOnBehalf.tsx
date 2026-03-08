import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClassSlot {
  id: string; title: string; start_time: string; end_time: string;
  capacity: number; class_type: string; booking_count: number; trainer_name: string;
}

interface TimePricing { start_time: string; end_time: string; credit_cost: number; }

interface TraineeOption {
  user_id: string; full_name: string; email: string;
  pkg_id: string | null; remaining_credits: number;
}

function getCreditCost(slotStartTime: string, pricingPeriods: TimePricing[]): number {
  const d = new Date(slotStartTime);
  const t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  for (const p of pricingPeriods) {
    if (t >= p.start_time.slice(0, 5) && t < p.end_time.slice(0, 5)) return p.credit_cost;
  }
  return 1;
}

export default function BookOnBehalf() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<ClassSlot[]>([]);
  const [trainees, setTrainees] = useState<TraineeOption[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<string>("");
  const [isBooking, setIsBooking] = useState(false);
  const [pricingPeriods, setPricingPeriods] = useState<TimePricing[]>([]);

  // Load pricing
  useEffect(() => {
    supabase.from("time_pricing").select("start_time, end_time, credit_cost").order("start_time")
      .then(({ data }) => { if (data) setPricingPeriods(data as unknown as TimePricing[]); });
  }, []);

  // Load trainees with active packages
  useEffect(() => {
    const fetchTrainees = async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email");
      if (!profiles) return;

      // Get all trainee role users
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "trainee");
      if (!roles) return;
      const traineeUserIds = new Set(roles.map((r) => r.user_id));

      // Get active packages
      const { data: pkgs } = await supabase.from("trainee_packages").select("id, trainee_id, remaining_credits").eq("is_active", true);

      const pkgMap = new Map<string, { id: string; remaining_credits: number }>();
      (pkgs || []).forEach((p) => {
        const existing = pkgMap.get(p.trainee_id);
        if (!existing || p.remaining_credits > existing.remaining_credits) {
          pkgMap.set(p.trainee_id, { id: p.id, remaining_credits: p.remaining_credits });
        }
      });

      const opts: TraineeOption[] = profiles
        .filter((p) => traineeUserIds.has(p.user_id))
        .map((p) => {
          const pkg = pkgMap.get(p.user_id);
          return {
            user_id: p.user_id,
            full_name: p.full_name,
            email: p.email,
            pkg_id: pkg?.id || null,
            remaining_credits: pkg?.remaining_credits || 0,
          };
        })
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      setTrainees(opts);
    };
    fetchTrainees();
  }, []);

  // Load slots for selected date (filtered for trainer's classes if trainer role)
  useEffect(() => {
    const fetchSlots = async () => {
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

      let query = supabase.from("class_slots").select("*, trainers(user_id)")
        .gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString())
        .order("start_time", { ascending: true });

      // If trainer, filter to their classes only
      if (role === "trainer" && user) {
        const { data: trainer } = await supabase.from("trainers").select("id").eq("user_id", user.id).single();
        if (!trainer) { setSlots([]); return; }
        query = supabase.from("class_slots").select("*, trainers(user_id)")
          .gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString())
          .eq("trainer_id", trainer.id)
          .order("start_time", { ascending: true });
      }

      const { data } = await query;
      if (data) {
        const trainerUserIds = [...new Set(data.map((s: any) => s.trainers?.user_id).filter(Boolean))];
        let profileMap = new Map<string, string>();
        if (trainerUserIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", trainerUserIds);
          if (profiles) profiles.forEach((p) => profileMap.set(p.user_id, p.full_name));
        }
        const enriched = await Promise.all(data.map(async (slot: any) => {
          const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("class_slot_id", slot.id).eq("status", "confirmed");
          const trainerName = slot.trainers?.user_id ? profileMap.get(slot.trainers.user_id) || "" : "";
          return { ...slot, booking_count: count || 0, trainer_name: trainerName } as unknown as ClassSlot;
        }));
        setSlots(enriched);
      }
    };
    fetchSlots();
  }, [date, user, role]);

  const selectedTraineeData = trainees.find((t) => t.user_id === selectedTrainee);

  const bookSlot = async (slot: ClassSlot) => {
    if (!selectedTraineeData) {
      toast({ title: t("bookOnBehalf.selectTraineeFirst"), variant: "destructive" });
      return;
    }
    if (!selectedTraineeData.pkg_id) {
      toast({ title: t("trainee.booking.noActivePackage"), description: t("trainee.booking.needPackage"), variant: "destructive" });
      return;
    }
    if (slot.booking_count >= slot.capacity) {
      toast({ title: t("trainee.booking.classFull"), description: t("trainee.booking.classFullDesc"), variant: "destructive" });
      return;
    }

    const cost = getCreditCost(slot.start_time, pricingPeriods);
    if (selectedTraineeData.remaining_credits < cost) {
      toast({ title: t("trainee.booking.noCredits"), variant: "destructive" });
      return;
    }

    setIsBooking(true);

    const { error } = await supabase.from("bookings").insert({
      trainee_id: selectedTraineeData.user_id,
      class_slot_id: slot.id,
      trainee_package_id: selectedTraineeData.pkg_id,
    });

    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      setIsBooking(false);
      return;
    }

    // Deduct credits
    const newCredits = selectedTraineeData.remaining_credits - cost;
    await supabase.from("trainee_packages").update({ remaining_credits: newCredits }).eq("id", selectedTraineeData.pkg_id);

    // Update local state
    setTrainees((prev) =>
      prev.map((tr) =>
        tr.user_id === selectedTrainee ? { ...tr, remaining_credits: newCredits } : tr
      )
    );

    toast({ title: t("bookOnBehalf.bookedSuccess", { name: selectedTraineeData.full_name }) });
    setIsBooking(false);
    // Refresh slots
    setDate(new Date(date));
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("bookOnBehalf.title")}</h1>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label>{t("bookOnBehalf.selectTrainee")}</Label>
              <Select value={selectedTrainee} onValueChange={setSelectedTrainee}>
                <SelectTrigger>
                  <SelectValue placeholder={t("bookOnBehalf.chooseTrainee")} />
                </SelectTrigger>
                <SelectContent>
                  {trainees.map((tr) => (
                    <SelectItem key={tr.user_id} value={tr.user_id}>
                      {tr.full_name || tr.email}
                      {tr.pkg_id ? ` (${tr.remaining_credits} cr)` : ` — ${t("bookOnBehalf.noPackage")}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="pointer-events-auto" />
            </CardContent>
          </Card>
          {selectedTraineeData?.pkg_id && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{t("trainee.booking.creditsRemaining")}</p>
                <p className="text-2xl font-bold">{selectedTraineeData.remaining_credits}</p>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">
            {t("trainee.booking.classesOn", { date: format(date, "EEEE, MMM d") })}
          </h2>
          {slots.map((s) => {
            const isFull = s.booking_count >= s.capacity;
            const cost = getCreditCost(s.start_time, pricingPeriods);
            const noCredits = selectedTraineeData ? selectedTraineeData.remaining_credits < cost : false;
            return (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(s.start_time), "p")} – {format(new Date(s.end_time), "p")} · {s.trainer_name || "TBD"}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="secondary" className="capitalize">{s.class_type}</Badge>
                      <Badge variant={isFull ? "destructive" : "default"}>
                        {t("trainee.booking.spots", { booked: s.booking_count, total: s.capacity })}
                      </Badge>
                      <Badge variant="outline">{t("trainee.booking.creditsCost", { cost })}</Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => bookSlot(s)}
                    disabled={isFull || !selectedTraineeData?.pkg_id || isBooking || noCredits}
                  >
                    {isFull ? t("trainee.booking.full") : t("trainee.booking.book")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {slots.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("trainee.booking.noClasses")}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
