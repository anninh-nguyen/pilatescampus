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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Trainer { id: string; user_id: string; specialty: string | null; full_name: string; }
interface ClassSlot { id: string; title: string; trainer_id: string; start_time: string; end_time: string; capacity: number; class_type: string; trainer_name: string; }

export default function AdminSchedule() {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<ClassSlot[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [form, setForm] = useState({ title: "", trainer_id: "", startHour: "09", startMin: "00", endHour: "10", endMin: "00", capacity: 8, class_type: "group" });
  const { toast } = useToast();

  const fetchTrainers = async () => {
    const { data: trainerData } = await supabase.from("trainers").select("id, user_id, specialty");
    if (!trainerData || trainerData.length === 0) { setTrainers([]); return; }
    const userIds = trainerData.map((t) => t.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    setTrainers(trainerData.map((tr) => ({ ...tr, full_name: profileMap.get(tr.user_id)?.full_name || "" })));
  };

  const fetchSlots = async () => {
    const { data: slotData } = await supabase.from("class_slots").select("*").order("start_time", { ascending: true });
    if (!slotData || slotData.length === 0) { setSlots([]); return; }
    // Get trainer ids to resolve names
    const trainerIds = [...new Set(slotData.map((s) => s.trainer_id))];
    const { data: trainerRows } = await supabase.from("trainers").select("id, user_id").in("id", trainerIds);
    if (!trainerRows) { setSlots(slotData.map((s) => ({ ...s, trainer_name: "—" }))); return; }
    const userIds = trainerRows.map((t) => t.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const trainerNameMap = new Map(trainerRows.map((t) => [t.id, profileMap.get(t.user_id)?.full_name || "—"]));
    setSlots(slotData.map((s) => ({ ...s, trainer_name: trainerNameMap.get(s.trainer_id) || "—" })));
  };

  useEffect(() => { fetchSlots(); fetchTrainers(); }, []);

  const handleCreate = async () => {
    const startTime = new Date(date); startTime.setHours(+form.startHour, +form.startMin, 0, 0);
    const endTime = new Date(date); endTime.setHours(+form.endHour, +form.endMin, 0, 0);
    const { error } = await supabase.from("class_slots").insert({ title: form.title, trainer_id: form.trainer_id, start_time: startTime.toISOString(), end_time: endTime.toISOString(), capacity: form.capacity, class_type: form.class_type });
    if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("admin.schedule.slotCreated") });
    setOpen(false); fetchSlots();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("class_slots").delete().eq("id", id);
    toast({ title: t("admin.schedule.slotDeleted") }); fetchSlots();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">{t("admin.schedule.title")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />{t("admin.schedule.newClass")}</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("admin.schedule.createClassSlot")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t("admin.schedule.classTitle")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>{t("admin.schedule.trainer")}</Label>
                <Select value={form.trainer_id} onValueChange={(v) => setForm({ ...form, trainer_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("admin.schedule.selectTrainer")} /></SelectTrigger>
                  <SelectContent>{trainers.map((tr) => <SelectItem key={tr.id} value={tr.id}>{tr.full_name || tr.specialty || tr.id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.schedule.date")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{format(date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
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
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.schedule.classTitle")}</TableHead>
                <TableHead>{t("admin.schedule.trainer")}</TableHead>
                <TableHead>{t("admin.schedule.dateTime")}</TableHead>
                <TableHead>{t("admin.schedule.capacity")}</TableHead>
                <TableHead>{t("admin.schedule.type")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.trainer_name}</TableCell>
                  <TableCell>{format(new Date(s.start_time), "PPP p")} – {format(new Date(s.end_time), "p")}</TableCell>
                  <TableCell>{s.capacity}</TableCell>
                  <TableCell className="capitalize">{s.class_type}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {slots.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("admin.schedule.noClasses")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}