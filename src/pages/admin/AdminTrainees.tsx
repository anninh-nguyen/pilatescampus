import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Pencil, UserPlus } from "lucide-react";
import { addDays } from "date-fns";
import { ListControls, useListControls } from "@/components/ListControls";

interface TraineeRow {
  user_id: string;
  full_name: string;
  email: string;
  trainee_packages: { id: string; remaining_credits: number; is_active: boolean; packages: { name: string } | null }[];
}

interface PackageOption {
  id: string;
  name: string;
  credit_count: number;
  expiry_days: number;
}

export default function AdminTrainees() {
  const { t } = useTranslation();
  const [trainees, setTrainees] = useState<TraineeRow[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState<TraineeRow | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTrainee, setEditTrainee] = useState<TraineeRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editCredits, setEditCredits] = useState("");
  const [saving, setSaving] = useState(false);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviting, setInviting] = useState(false);

  const lc = useListControls<TraineeRow>(trainees, (tr, q) =>
    tr.full_name.toLowerCase().includes(q) || tr.email.toLowerCase().includes(q)
  );

  const fetchTrainees = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "trainee");
    if (!roles || roles.length === 0) { setTrainees([]); return; }
    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const enriched: TraineeRow[] = [];
    for (const role of roles) {
      const profile = profileMap.get(role.user_id);
      const { data: pkgs } = await supabase.from("trainee_packages").select("id, remaining_credits, is_active, packages(name)").eq("trainee_id", role.user_id);
      enriched.push({ user_id: role.user_id, full_name: profile?.full_name || "", email: profile?.email || "", trainee_packages: (pkgs || []) as unknown as TraineeRow["trainee_packages"] });
    }
    setTrainees(enriched);
  };

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase.from("packages").select("id, name, credit_count, expiry_days").eq("is_active", true);
      if (data) setPackages(data);
    };
    fetchTrainees();
    fetchPackages();
  }, []);

  const openAssignDialog = (trainee: TraineeRow) => { setSelectedTrainee(trainee); setSelectedPackageId(""); setDialogOpen(true); };

  const handleAssign = async () => {
    if (!selectedTrainee || !selectedPackageId) return;
    setAssigning(true);
    const pkg = packages.find((p) => p.id === selectedPackageId);
    if (!pkg) return;

    // Get current active package credits to make them cumulative
    let currentCredits = 0;
    const { data: activePkgs } = await supabase.from("trainee_packages").select("remaining_credits").eq("trainee_id", selectedTrainee.user_id).eq("is_active", true);
    if (activePkgs && activePkgs.length > 0) {
      currentCredits = activePkgs.reduce((sum, p) => sum + Number(p.remaining_credits), 0);
      // Deactivate old packages
      await supabase.from("trainee_packages").update({ is_active: false }).eq("trainee_id", selectedTrainee.user_id).eq("is_active", true);
    }

    const totalCredits = Math.round((currentCredits + Number(pkg.credit_count)) * 10) / 10;
    const { data: newPkg, error } = await supabase.from("trainee_packages").insert({ trainee_id: selectedTrainee.user_id, package_id: selectedPackageId, remaining_credits: totalCredits, expires_at: addDays(new Date(), pkg.expiry_days).toISOString() }).select("id").single();
    setAssigning(false);
    if (error) { toast.error(t("admin.trainees.assignFailed")); } else {
      toast.success(t("admin.trainees.packageAssigned"));
      // Check first-time and referral bonuses
      if (newPkg) {
        const { data: ftBonus } = await supabase.rpc("check_first_time_bonus", { _user_id: selectedTrainee.user_id, _package_id: newPkg.id });
        if (ftBonus && Number(ftBonus) > 0) {
          toast.success(t("admin.trainees.bonusAwarded", { credits: ftBonus, type: "first-time" }));
        }
        const { data: refBonus } = await supabase.rpc("check_referral_bonus", { _new_user_id: selectedTrainee.user_id, _package_id: newPkg.id });
        if (refBonus && Number(refBonus) > 0) {
          toast.success(t("admin.trainees.bonusAwarded", { credits: refBonus, type: "referral" }));
        }
      }
      setDialogOpen(false); fetchTrainees();
    }
  };

  const openEditDialog = (trainee: TraineeRow) => {
    setEditTrainee(trainee);
    setEditName(trainee.full_name);
    const activePkg = trainee.trainee_packages.find((p) => p.is_active);
    setEditCredits(activePkg ? String(activePkg.remaining_credits) : "");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTrainee) return;
    setSaving(true);
    // Update name
    const { error: nameErr } = await supabase.from("profiles").update({ full_name: editName.trim() }).eq("user_id", editTrainee.user_id);
    if (nameErr) { toast.error(t("admin.trainees.updateFailed")); setSaving(false); return; }

    // Update credits on active package if value provided
    const activePkg = editTrainee.trainee_packages.find((p) => p.is_active);
    if (activePkg && editCredits !== "") {
      const { error: creditErr } = await supabase.from("trainee_packages").update({ remaining_credits: parseInt(editCredits, 10) }).eq("id", activePkg.id);
      if (creditErr) { toast.error(t("admin.trainees.updateFailed")); setSaving(false); return; }
    }

    setSaving(false);
    toast.success(t("admin.trainees.updateSuccess"));
    setEditOpen(false);
    fetchTrainees();
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("admin.trainees.title")}</h1>
      <div className="mb-4">
        <ListControls search={lc.search} onSearchChange={lc.setSearch} page={lc.page} totalPages={lc.totalPages} onPageChange={lc.setPage} pageSize={lc.pageSize} onPageSizeChange={lc.setPageSize} totalItems={lc.totalItems} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.trainees.name")}</TableHead>
                <TableHead>{t("admin.trainees.email")}</TableHead>
                <TableHead>{t("admin.trainees.activePackage")}</TableHead>
                <TableHead>{t("admin.trainees.creditsLeft")}</TableHead>
                <TableHead>{t("admin.trainees.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lc.paginated.map((tr) => {
                const activePkg = tr.trainee_packages.find((p) => p.is_active);
                return (
                  <TableRow key={tr.user_id}>
                    <TableCell>{tr.full_name || "—"}</TableCell>
                    <TableCell>{tr.email || "—"}</TableCell>
                    <TableCell>{activePkg?.packages?.name || <Badge variant="secondary">{t("admin.trainees.none")}</Badge>}</TableCell>
                    <TableCell>{activePkg ? activePkg.remaining_credits : "—"}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(tr)}>
                        <Pencil className="mr-1 h-4 w-4" />{t("common.edit")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAssignDialog(tr)}>
                        <Package className="mr-1 h-4 w-4" />{t("admin.trainees.assignPackage")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {lc.paginated.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("admin.trainees.noTrainees")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Package Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("admin.trainees.assignPackage")} — {selectedTrainee?.full_name}</DialogTitle></DialogHeader>
          <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
            <SelectTrigger><SelectValue placeholder={t("admin.trainees.selectPackage")} /></SelectTrigger>
            <SelectContent>{packages.map((pkg) => <SelectItem key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.credit_count} {t("admin.packages.credits")})</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAssign} disabled={!selectedPackageId || assigning}>{assigning ? t("admin.trainees.assigning") : t("admin.trainees.assignPackage")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Trainee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("admin.trainees.editTrainee")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("admin.trainees.name")}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            {editTrainee?.trainee_packages.some((p) => p.is_active) && (
              <div className="space-y-2">
                <Label>{t("admin.trainees.credits")}</Label>
                <Input type="number" min={0} value={editCredits} onChange={(e) => setEditCredits(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleEdit} disabled={saving || !editName.trim()}>{saving ? t("admin.trainees.saving") : t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
