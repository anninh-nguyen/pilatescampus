import { useEffect, useState } from "react";
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
    // Find user by email from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .single();

    if (!profile) {
      toast({ title: "User not found", description: "No account with that email exists.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // Add trainer role
    await supabase.from("user_roles").upsert({ user_id: profile.user_id, role: "trainer" as const });
    // Remove default trainee role if exists
    await supabase.from("user_roles").delete().eq("user_id", profile.user_id).eq("role", "trainee");
    // Insert into trainers table
    const { error } = await supabase.from("trainers").insert({ user_id: profile.user_id, specialty });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Trainer added" });
      setOpen(false);
      setEmail("");
      setSpecialty("");
      fetchTrainers();
    }
    setIsLoading(false);
  };

  const handleDelete = async (trainer: TrainerRow) => {
    await supabase.from("trainers").delete().eq("id", trainer.id);
    // Restore trainee role
    await supabase.from("user_roles").delete().eq("user_id", trainer.user_id).eq("role", "trainer");
    await supabase.from("user_roles").upsert({ user_id: trainer.user_id, role: "trainee" as const });
    toast({ title: "Trainer removed" });
    fetchTrainers();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">Trainers</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Trainer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Trainer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>User Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="trainer@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Specialty</Label>
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Reformer, Mat" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isLoading}>{isLoading ? "Adding…" : "Add Trainer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.profiles?.full_name || "—"}</TableCell>
                  <TableCell>{t.profiles?.email || "—"}</TableCell>
                  <TableCell>{t.specialty || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {trainers.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No trainers yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
