import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, CalendarDays, Package } from "lucide-react";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ trainees: 0, trainers: 0, upcomingSessions: 0, activePackages: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [trainees, trainers, sessions, packages] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "trainee"),
        supabase.from("trainers").select("id", { count: "exact", head: true }),
        supabase.from("class_slots").select("id", { count: "exact", head: true }).gte("start_time", new Date().toISOString()),
        supabase.from("trainee_packages").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      setStats({
        trainees: trainees.count || 0,
        trainers: trainers.count || 0,
        upcomingSessions: sessions.count || 0,
        activePackages: packages.count || 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { labelKey: "admin.dashboard.totalTrainees", value: stats.trainees, icon: Users, color: "text-primary" },
    { labelKey: "admin.dashboard.trainers", value: stats.trainers, icon: UserCheck, color: "text-success" },
    { labelKey: "admin.dashboard.upcomingSessions", value: stats.upcomingSessions, icon: CalendarDays, color: "text-warning" },
    { labelKey: "admin.dashboard.activePackages", value: stats.activePackages, icon: Package, color: "text-chart-4" },
  ];

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("admin.dashboard.title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.labelKey}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t(c.labelKey)}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
