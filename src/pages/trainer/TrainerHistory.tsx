import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrainerHistory() {
  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">Session History</h1>
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Past sessions will appear here once they are completed.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
