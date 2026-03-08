import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface TraineePackage {
  id: string;
  remaining_credits: number;
  expires_at: string;
  is_active: boolean;
  packages: { name: string; credit_count: number; description: string | null } | null;
}

export default function TraineePackage() {
  const { user } = useAuth();
  const [pkg, setPkg] = useState<TraineePackage | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("trainee_packages")
      .select("*, packages(name, credit_count, description)")
      .eq("trainee_id", user.id)
      .eq("is_active", true)
      .single()
      .then(({ data }) => { if (data) setPkg(data as unknown as TraineePackage); });
  }, [user]);

  if (!pkg) {
    return (
      <DashboardLayout>
        <h1 className="mb-6 font-serif text-3xl font-bold">My Package</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You don't have an active package. Contact your admin to get one assigned.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const total = pkg.packages?.credit_count || 1;
  const used = total - pkg.remaining_credits;
  const pct = Math.round((pkg.remaining_credits / total) * 100);

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">My Package</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {pkg.packages?.name}
            <Badge variant={pkg.is_active ? "default" : "secondary"}>{pkg.is_active ? "Active" : "Inactive"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pkg.packages?.description && <p className="text-muted-foreground">{pkg.packages.description}</p>}
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Credits remaining</span>
              <span className="font-medium">{pkg.remaining_credits} / {total}</span>
            </div>
            <Progress value={pct} />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Sessions used: {used}</span>
            <span>Expires: {format(new Date(pkg.expires_at), "PPP")}</span>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
