import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, Trash2 } from "lucide-react";
import { format, eachDayOfInterval, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import { ListControls, useListControls } from "@/components/ListControls";

interface Trainer { id: string; user_id: string; specialty: string | null; full_name: string; }
interface ClassRow {
  id: string; title: string; trainer_id: string; start_date: string; end_date: string;
  start_time: string; end_time: string; capacity: number; class_type: string;
  recurrence_days: number[]; trainer_name: string; slots_count: number;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export default function AdminSchedule() {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [form, setForm] = useState({
    title: "", trainer_id: "", startHour: "09", startMin: "00",
    endHour: "10", endMin: "00", capacity: 8, class_type: "group",
  });
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const { toast } = useToast();

  const lc = useListControls<ClassRow>(classes, (c, q) =>
    c.title.toLowerCase().includes(q) || c.trainer_name.toLowerCase().includes(q) || c.class_type.toLowerCase().includes(q)
  );

  const fetchTrainers = async () => {
    const { data: trainerData } = await supabase.from("trainers").select("id, user_id, specialty");
    if (!trainerData || trainerData.length === 0) { setTrainers([]); return; }
    const userIds = trainerData.map((t) => t.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    setTrainers(trainerData.map((tr) => ({ ...tr, full_name: profileMap.get(tr.user_id)?.full_name || "" })));
  };

  const fetchClasses = async () => {
    const { data: classData } = await supabase.from("classes").select("*").order("start_date", { ascending: true });
    if (!classData || classData.length === 0) { setClasses([]); return; }

    const trainerIds = [...new Set(classData.map((c: any) => c.trainer_id))];
    const { data: trainerRows } = await supabase.from("trainers").select("id, user_id").in("id", trainerIds);
    const userIds = (trainerRows || []).map((t) => t.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const trainerNameMap = new Map((trainerRows || []).map((t) => [t.id, profileMap.get(t.user_id)?.full_name || "—"]));

    // Count slots per class
    const classIds = classData.map((c: any) => c.id);
    const { data: slotCounts } = await supabase.from("class_slots").select("parent_class_id").in("parent_class_id", classIds);
    const countMap = new Map<string, number>();
    (slotCounts || []).forEach((s: any) => {
      countMap.set(s.parent_class_id, (countMap.get(s.parent_class_id) || 0) + 1);
    });

    setClasses(classData.map((c: any) => ({
      ...c,
      trainer_name: trainerNameMap.get(c.trainer_id) || "—",
      slots_count: countMap.get(c.id) || 0,
    })));
  };

  useEffect(() => { fetchClasses(); fetchTrainers(); }, []);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleCreate = async () => {
    if (selectedDays.length === 0) {
      toast({ title: t("common.error"), description: t("admin.schedule.recurrenceDays"), variant: "destructive" });
      return;
    }

    // 1. Create the class record
    const { data: newClass, error: classError } = await supabase.from("classes").insert({
      title: form.title,
      trainer_id: form.trainer_id,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      start_time: `${form.startHour}:${form.startMin}:00`,
      end_time: `${form.endHour}:${form.endMin}:00`,
      capacity: form.capacity,
      class_type: form.class_type,
      recurrence_days: selectedDays,
    }).select("id").single();

    if (classError || !newClass) {
      toast({ title: t("common.error"), description: classError?.message, variant: "destructive" });
      return;
    }

    // 2. Generate class_slots for each matching day
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const slots = days
      .filter((d) => selectedDays.includes(getDay(d)))
      .map((d) => {
        const st = new Date(d); st.setHours(+form.startHour, +form.startMin, 0, 0);
        const et = new Date(d); et.setHours(+form.endHour, +form.endMin, 0, 0);
        return {
          title: form.title,
          trainer_id: form.trainer_id,
          start_time: st.toISOString(),
          end_time: et.toISOString(),
          capacity: form.capacity,
          class_type: form.class_type,
          parent_class_id: newClass.id,
        };
      });

    if (slots.length > 0) {
      const { error: slotError } = await supabase.from("class_slots").insert(slots);
      if (slotError) {
        toast({ title: t("common.error"), description: slotError.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: t("admin.schedule.classCreated", { count: slots.length }) });
    setOpen(false);
    setSelectedDays([]);
    fetchClasses();
  };

  const handleDelete = async (id: string) => {
    // Cascade delete: deleting class will delete all class_slots via FK
    await supabase.from("classes").delete().eq("id", id);
    toast({ title: t("admin.schedule.classDeleted") });
    fetchClasses();
  };

  const dayLabels = DAY_KEYS.map((k) => t(`admin.schedule.${k}`));

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">{t("admin.schedule.title")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />{t("admin.schedule.newClass")}</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("admin.schedule.createClass")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t("admin.schedule.classTitle")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>{t("admin.schedule.trainer")}</Label>
                <Select value={form.trainer_id} onValueChange={(v) => setForm({ ...form, trainer_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("admin.schedule.selectTrainer")} /></SelectTrigger>
                  <SelectContent>{trainers.map((tr) => <SelectItem key={tr.id} value={tr.id}>{tr.full_name || tr.specialty || tr.id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.schedule.startDate")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{format(startDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.schedule.endDate")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{format(endDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.schedule.recurrenceDays")}</Label>
                <div className="flex flex-wrap gap-1">
                  {[1, 2, 3, 4, 5, 6, 0].map((day, i) => (
                    <Toggle
                      key={day}
                      pressed={selectedDays.includes(day)}
                      onPressedChange={() => toggleDay(day)}
                      size="sm"
                      variant="outline"
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {dayLabels[day]}
                    </Toggle>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.schedule.startTime")}</Label>
                  <div className="flex gap-1">
                    <Input className="w-16" value={form.startHour} onChange={(e) => setForm({ ...form, startHour: e.target.value })} placeholder="HH" />
                    <span className="self-center">:</span>
                    <Input className="w-16" value={form.startMin} onChange={(e) => setForm({ ...form, startMin: e.target.value })} placeholder="MM" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.schedule.endTime")}</Label>
                  <div className="flex gap-1">
                    <Input className="w-16" value={form.endHour} onChange={(e) => setForm({ ...form, endHour: e.target.value })} placeholder="HH" />
                    <span className="self-center">:</span>
                    <Input className="w-16" value={form.endMin} onChange={(e) => setForm({ ...form, endMin: e.target.value })} placeholder="MM" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t("admin.schedule.capacity")}</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>{t("admin.schedule.type")}</Label>
                  <Select value={form.class_type} onValueChange={(v) => setForm({ ...form, class_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">{t("admin.schedule.group")}</SelectItem>
                      <SelectItem value="private">{t("admin.schedule.private")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate}>{t("common.create")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mb-4">
        <ListControls search={lc.search} onSearchChange={lc.setSearch} page={lc.page} totalPages={lc.totalPages} onPageChange={lc.setPage} pageSize={lc.pageSize} onPageSizeChange={lc.setPageSize} totalItems={lc.totalItems} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.schedule.classTitle")}</TableHead>
                <TableHead>{t("admin.schedule.trainer")}</TableHead>
                <TableHead>{t("admin.schedule.recurrenceDays")}</TableHead>
                <TableHead>{t("admin.schedule.startDate")}</TableHead>
                <TableHead>{t("admin.schedule.endDate")}</TableHead>
                <TableHead>{t("admin.schedule.startTime")}</TableHead>
                <TableHead>{t("admin.schedule.capacity")}</TableHead>
                <TableHead>{t("admin.schedule.type")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lc.paginated.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.trainer_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(c.recurrence_days || []).sort().map((d) => (
                        <Badge key={d} variant="secondary" className="text-xs">{dayLabels[d]}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(c.start_date), "PP")}</TableCell>
                  <TableCell>{format(new Date(c.end_date), "PP")}</TableCell>
                  <TableCell>{c.start_time?.slice(0, 5)} – {c.end_time?.slice(0, 5)}</TableCell>
                  <TableCell>{c.capacity}</TableCell>
                  <TableCell className="capitalize">{c.class_type}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {lc.paginated.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">{t("admin.schedule.noClasses")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
