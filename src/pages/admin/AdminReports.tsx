import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminReports() {
  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">Reports</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Attendance</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Attendance reports and charts will appear here once sessions are booked.</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Package Utilization</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Package usage and revenue data will be displayed here.</p></CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
