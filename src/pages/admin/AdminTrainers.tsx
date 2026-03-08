import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface TrainerRow {
  id: string;
  user_id: string;
  specialty: string | null;
  bio: string | null;
  profiles: { full_name: string; email: string } | null;
}

export default function AdminTrainers() {
  const { t } = useTranslation();
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchTrainers = async () => {
    const { data } = await supabase
      .from("trainers")
      .select("id, user_id, specialty, bio, profiles!trainers_user_id_fkey(full_name, email)")
      .order("created_at", { ascending: false });
    if (data) setTrainers(data as unknown as TrainerRow[]);
  };

  useEffect(() => { fetchTrainers(); }, []);

  const handleAdd = async () => {
    setIsLoading(true);
    const { data: profile } = await supabase.from("profiles").select("user_id").eq("email", email).single();
    if (!profile) {
      toast({ title: t("admin.trainers.userNotFound"), description: t("admin.trainers.userNotFoundDesc"), variant: "destructive" });
      setIsLoading(false);
      return;
    }
    await supabase.from("user_roles").upsert({ user_id: profile.user_id, role: "trainer" as const });
    await supabase.from("user_roles").delete().eq("user_id", profile.user_id).eq("role", "trainee");
    const { error } = await supabase.from("trainers").insert({ user_id: profile.user_id, specialty });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.trainers.trainerAdded") });
      setOpen(false);
      setEmail("");
      setSpecialty("");
      fetchTrainers();
    }
    setIsLoading(false);
  };

  const handleDelete = async (trainer: TrainerRow) => {
    await supabase.from("trainers").delete().eq("id", trainer.id);
    await supabase.from("user_roles").delete().eq("user_id", trainer.user_id).eq("role", "trainer");
    await supabase.from("user_roles").upsert({ user_id: trainer.user_id, role: "trainee" as const });
    toast({ title: t("admin.trainers.trainerRemoved") });
    fetchTrainers();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">{t("admin.trainers.title")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />{t("admin.trainers.addTrainer")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("admin.trainers.addTrainer")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.trainers.userEmail")}</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="trainer@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.trainers.specialty")}</Label>
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Reformer, Mat" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isLoading}>{isLoading ? t("admin.trainers.adding") : t("admin.trainers.addTrainer")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.trainers.name")}</TableHead>
                <TableHead>{t("admin.trainers.email")}</TableHead>
                <TableHead>{t("admin.trainers.specialty")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainers.map((tr) => (
                <TableRow key={tr.id}>
                  <TableCell>{tr.profiles?.full_name || "—"}</TableCell>
                  <TableCell>{tr.profiles?.email || "—"}</TableCell>
                  <TableCell>{tr.specialty || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tr)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {trainers.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t("admin.trainers.noTrainers")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
