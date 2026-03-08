import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface TraineeRow {
  user_id: string;
  profiles: { full_name: string; email: string } | null;
  trainee_packages: { remaining_credits: number; is_active: boolean; packages: { name: string } | null }[];
}

export default function AdminTrainees() {
  const { t } = useTranslation();
  const [trainees, setTrainees] = useState<TraineeRow[]>([]);

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, []);

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainees.map((tr) => {
                const activePkg = tr.trainee_packages.find((p) => p.is_active);
                return (
                  <TableRow key={tr.user_id}>
                    <TableCell>{tr.profiles?.full_name || "—"}</TableCell>
                    <TableCell>{tr.profiles?.email || "—"}</TableCell>
                    <TableCell>{activePkg?.packages?.name || <Badge variant="secondary">{t("admin.trainees.none")}</Badge>}</TableCell>
                    <TableCell>{activePkg ? activePkg.remaining_credits : "—"}</TableCell>
                  </TableRow>
                );
              })}
              {trainees.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t("admin.trainees.noTrainees")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
