import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";

export default function TrainerHistory() {
  const { t } = useTranslation();
  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("trainer.history.title")}</h1>
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">{t("trainer.history.empty")}</CardContent>
      </Card>
    </DashboardLayout>
  );
}
