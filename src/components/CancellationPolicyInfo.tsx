import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";

interface Tier {
  hours_before: number;
  refund_percentage: number;
}

export function CancellationPolicyInfo() {
  const { t } = useTranslation();
  const [tiers, setTiers] = useState<Tier[]>([]);

  useEffect(() => {
    supabase
      .from("cancellation_policies")
      .select("hours_before, refund_percentage")
      .order("hours_before", { ascending: false })
      .then(({ data }) => {
        if (data) setTiers(data as unknown as Tier[]);
      });
  }, []);

  if (tiers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Info className="h-4 w-4 text-muted-foreground" />
          {t("cancellationInfo.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {tiers.map((tier, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {tier.hours_before === 0
                ? t("cancellationInfo.lessThan", { hours: tiers[i - 1]?.hours_before || "—" })
                : t("cancellationInfo.atLeast", { hours: tier.hours_before })}
            </span>
            <Badge
              variant={tier.refund_percentage === 100 ? "default" : tier.refund_percentage === 0 ? "destructive" : "secondary"}
            >
              {tier.refund_percentage}% {t("cancellationInfo.refund")}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
