import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminReports() {
  const { t } = useTranslation();
  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("admin.reports.title")}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("admin.reports.attendance")}</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">{t("admin.reports.attendanceDesc")}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("admin.reports.packageUtilization")}</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">{t("admin.reports.packageUtilizationDesc")}</p></CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
