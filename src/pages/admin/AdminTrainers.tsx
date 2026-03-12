import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { ListControls, useListControls } from "@/components/ListControls";

const TRAINER_LEVELS = ["trainee_trainer", "junior", "senior", "master"] as const;

interface TrainerRow { id: string; user_id: string; specialty: string | null; bio: string | null; level: string; full_name: string; email: string; }

export default function AdminTrainers() {
  const { t } = useTranslation();
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleTrainer, setRoleTrainer] = useState<TrainerRow | null>(null);
  const [newRole, setNewRole] = useState("");
  const [changingRole, setChangingRole] = useState(false);
  const { toast } = useToast();

  const lc = useListControls<TrainerRow>(trainers, (tr, q) =>
    tr.full_name.toLowerCase().includes(q) || tr.email.toLowerCase().includes(q) || (tr.specialty || "").toLowerCase().includes(q)
  );

  const fetchTrainers = async () => {
    const { data: trainerData } = await supabase.from("trainers").select("id, user_id, specialty, bio, level").order("created_at", { ascending: false });
    if (!trainerData || trainerData.length === 0) { setTrainers([]); return; }
    const userIds = trainerData.map((t) => t.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    setTrainers(trainerData.map((tr) => {
      const profile = profileMap.get(tr.user_id);
      return { ...tr, level: (tr as any).level || "trainee_trainer", full_name: profile?.full_name || "", email: profile?.email || "" };
    }));
  };

  const handleLevelChange = async (trainerId: string, newLevel: string) => {
    const { error } = await supabase.from("trainers").update({ level: newLevel as any }).eq("id", trainerId);
    if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); }
    else { toast({ title: t("admin.trainers.levelUpdated") }); fetchTrainers(); }
  };

  useEffect(() => { fetchTrainers(); }, []);

  const handleAdd = async () => {
    setIsLoading(true);
    const { data: profile } = await supabase.from("profiles").select("user_id").eq("email", email).single();
    if (!profile) { toast({ title: t("admin.trainers.userNotFound"), description: t("admin.trainers.userNotFoundDesc"), variant: "destructive" }); setIsLoading(false); return; }
    await supabase.from("user_roles").upsert({ user_id: profile.user_id, role: "trainer" as const });
    await supabase.from("user_roles").delete().eq("user_id", profile.user_id).eq("role", "trainee");
    const { error } = await supabase.from("trainers").insert({ user_id: profile.user_id, specialty });
    if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); } else { toast({ title: t("admin.trainers.trainerAdded") }); setOpen(false); setEmail(""); setSpecialty(""); fetchTrainers(); }
    setIsLoading(false);
  };

  const handleDelete = async (trainer: TrainerRow) => {
    await supabase.from("trainers").delete().eq("id", trainer.id);
    await supabase.from("user_roles").delete().eq("user_id", trainer.user_id).eq("role", "trainer");
    await supabase.from("user_roles").upsert({ user_id: trainer.user_id, role: "trainee" as const });
    toast({ title: t("admin.trainers.trainerRemoved") }); fetchTrainers();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">{t("admin.trainers.title")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />{t("admin.trainers.addTrainer")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("admin.trainers.addTrainer")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t("admin.trainers.userEmail")}</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="trainer@example.com" /></div>
              <div className="space-y-2"><Label>{t("admin.trainers.specialty")}</Label><Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Reformer, Mat" /></div>
            </div>
            <DialogFooter><Button onClick={handleAdd} disabled={isLoading}>{isLoading ? t("admin.trainers.adding") : t("admin.trainers.addTrainer")}</Button></DialogFooter>
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
                <TableHead>{t("admin.trainers.name")}</TableHead>
                <TableHead>{t("admin.trainers.email")}</TableHead>
                <TableHead>{t("admin.trainers.specialty")}</TableHead>
                <TableHead>{t("admin.trainers.level")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lc.paginated.map((tr) => (
                <TableRow key={tr.id}>
                  <TableCell>{tr.full_name || "—"}</TableCell>
                  <TableCell>{tr.email || "—"}</TableCell>
                  <TableCell>{tr.specialty || "—"}</TableCell>
                  <TableCell>
                    <Select value={tr.level} onValueChange={(v) => handleLevelChange(tr.id, v)}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRAINER_LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>{t(`admin.compensation.levels.${lvl}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(tr)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {lc.paginated.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("admin.trainers.noTrainers")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
