import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { addDays } from "date-fns";

interface TraineeRow {
  user_id: string;
  profiles: { full_name: string; email: string } | null;
  trainee_packages: { remaining_credits: number; is_active: boolean; packages: { name: string } | null }[];
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

  const fetchTrainees = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, profiles!user_roles_user_id_fkey(full_name, email)")
      .eq("role", "trainee");
    if (!data) return;
    const enriched: TraineeRow[] = [];
    for (const row of data) {
      const { data: pkgs } = await supabase
        .from("trainee_packages")
        .select("remaining_credits, is_active, packages(name)")
        .eq("trainee_id", row.user_id);
      enriched.push({
        user_id: row.user_id,
        profiles: row.profiles as unknown as { full_name: string; email: string },
        trainee_packages: (pkgs || []) as unknown as TraineeRow["trainee_packages"],
      });
    }
    setTrainees(enriched);
  };

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase
        .from("packages")
        .select("id, name, credit_count, expiry_days")
        .eq("is_active", true);
      if (data) setPackages(data);
    };
    fetchTrainees();
    fetchPackages();
  }, []);

  const openAssignDialog = (trainee: TraineeRow) => {
    setSelectedTrainee(trainee);
    setSelectedPackageId("");
    setDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedTrainee || !selectedPackageId) return;
    setAssigning(true);
    const pkg = packages.find((p) => p.id === selectedPackageId);
    if (!pkg) return;

    const { error } = await supabase.from("trainee_packages").insert({
      trainee_id: selectedTrainee.user_id,
      package_id: selectedPackageId,
      remaining_credits: pkg.credit_count,
      expires_at: addDays(new Date(), pkg.expiry_days).toISOString(),
    });

    setAssigning(false);
    if (error) {
      toast.error(t("admin.trainees.assignFailed"));
    } else {
      toast.success(t("admin.trainees.packageAssigned"));
      setDialogOpen(false);
      fetchTrainees();
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("admin.trainees.title")}</h1>
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
              {trainees.map((tr) => {
                const activePkg = tr.trainee_packages.find((p) => p.is_active);
                return (
                  <TableRow key={tr.user_id}>
                    <TableCell>{tr.profiles?.full_name || "—"}</TableCell>
                    <TableCell>{tr.profiles?.email || "—"}</TableCell>
                    <TableCell>
                      {activePkg?.packages?.name || (
                        <Badge variant="secondary">{t("admin.trainees.none")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{activePkg ? activePkg.remaining_credits : "—"}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => openAssignDialog(tr)}>
                        <Package className="mr-1 h-4 w-4" />
                        {t("admin.trainees.assignPackage")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {trainees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t("admin.trainees.noTrainees")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.trainees.assignPackage")} — {selectedTrainee?.profiles?.full_name}
            </DialogTitle>
          </DialogHeader>
          <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
            <SelectTrigger>
              <SelectValue placeholder={t("admin.trainees.selectPackage")} />
            </SelectTrigger>
            <SelectContent>
              {packages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name} ({pkg.credit_count} {t("admin.packages.credits")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAssign} disabled={!selectedPackageId || assigning}>
              {assigning ? t("admin.trainees.assigning") : t("admin.trainees.assignPackage")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
