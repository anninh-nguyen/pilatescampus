import { useEffect, useState } from "react";
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

interface Trainer { id: string; user_id: string; specialty: string | null; profiles: { full_name: string } | null; }
interface ClassSlot {
  id: string;
  title: string;
  trainer_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  class_type: string;
  trainers: { profiles: { full_name: string } | null } | null;
}

export default function AdminSchedule() {
  const [slots, setSlots] = useState<ClassSlot[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [form, setForm] = useState({ title: "", trainer_id: "", startHour: "09", startMin: "00", endHour: "10", endMin: "00", capacity: 8, class_type: "group" });
  const { toast } = useToast();

  const fetchSlots = async () => {
    const { data } = await supabase
      .from("class_slots")
      .select("*, trainers(profiles:profiles!trainers_user_id_fkey(full_name))")
      .order("start_time", { ascending: true });
    if (data) setSlots(data as unknown as ClassSlot[]);
  };
  const fetchTrainers = async () => {
    const { data } = await supabase.from("trainers").select("id, user_id, specialty, profiles!trainers_user_id_fkey(full_name)");
    if (data) setTrainers(data as unknown as Trainer[]);
  };

  useEffect(() => { fetchSlots(); fetchTrainers(); }, []);

  const handleCreate = async () => {
    const startTime = new Date(date);
    startTime.setHours(+form.startHour, +form.startMin, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(+form.endHour, +form.endMin, 0, 0);

    const { error } = await supabase.from("class_slots").insert({
      title: form.title,
      trainer_id: form.trainer_id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      capacity: form.capacity,
      class_type: form.class_type,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Class slot created" });
    setOpen(false);
    fetchSlots();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("class_slots").delete().eq("id", id);
    toast({ title: "Slot deleted" });
    fetchSlots();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">Class Schedule</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Class</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Class Slot</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Morning Reformer" /></div>
              <div className="space-y-2">
                <Label>Trainer</Label>
                <Select value={form.trainer_id} onValueChange={(v) => setForm({ ...form, trainer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                  <SelectContent>
                    {trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.profiles?.full_name || t.specialty || t.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <div className="flex gap-1">
                    <Input className="w-16" value={form.startHour} onChange={(e) => setForm({ ...form, startHour: e.target.value })} placeholder="HH" />
                    <span className="self-center">:</span>
                    <Input className="w-16" value={form.startMin} onChange={(e) => setForm({ ...form, startMin: e.target.value })} placeholder="MM" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <div className="flex gap-1">
                    <Input className="w-16" value={form.endHour} onChange={(e) => setForm({ ...form, endHour: e.target.value })} placeholder="HH" />
                    <span className="self-center">:</span>
                    <Input className="w-16" value={form.endMin} onChange={(e) => setForm({ ...form, endMin: e.target.value })} placeholder="MM" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.class_type} onValueChange={(v) => setForm({ ...form, class_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{(s.trainers as any)?.profiles?.full_name || "—"}</TableCell>
                  <TableCell>{format(new Date(s.start_time), "PPP p")} – {format(new Date(s.end_time), "p")}</TableCell>
                  <TableCell>{s.capacity}</TableCell>
                  <TableCell className="capitalize">{s.class_type}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {slots.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No classes scheduled</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
