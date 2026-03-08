import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, ShieldAlert } from "lucide-react";

interface CancellationTier {
  id: string;
  hours_before: number;
  refund_percentage: number;
}

export default function AdminCancellation() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tiers, setTiers] = useState<CancellationTier[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ hoursBefore: 24, refundPercentage: 100 });

  const fetchTiers = async () => {
    const { data } = await supabase
      .from("cancellation_policies")
      .select("*")
      .order("hours_before", { ascending: false });
    if (data) setTiers(data as unknown as CancellationTier[]);
  };

  useEffect(() => { fetchTiers(); }, []);

  const resetForm = () => { setForm({ hoursBefore: 24, refundPercentage: 100 }); setEditId(null); };
  const openEdit = (tier: CancellationTier) => {
    setForm({ hoursBefore: tier.hours_before, refundPercentage: tier.refund_percentage });
    setEditId(tier.id);
    setOpen(true);
  };

  const handleSave = async () => {
    const payload = { hours_before: form.hoursBefore, refund_percentage: form.refundPercentage };
    if (editId) {
      const { error } = await supabase.from("cancellation_policies").update(payload).eq("id", editId);
      if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
      toast({ title: t("admin.cancellation.tierUpdated") });
    } else {
      const { error } = await supabase.from("cancellation_policies").insert(payload);
      if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
      toast({ title: t("admin.cancellation.tierCreated") });
    }
    setOpen(false); resetForm(); fetchTiers();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cancellation_policies").delete().eq("id", id);
    toast({ title: t("admin.cancellation.tierDeleted") });
    fetchTiers();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">{t("admin.cancellation.title")}</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />{t("admin.cancellation.addTier")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? t("admin.cancellation.editTier") : t("admin.cancellation.addTier")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.cancellation.hoursBefore")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.hoursBefore}
                  onChange={(e) => setForm({ ...form, hoursBefore: +e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.cancellation.refundPercentage")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.refundPercentage}
                  onChange={(e) => setForm({ ...form, refundPercentage: +e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave}>{editId ? t("common.update") : t("common.create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" />
            {t("admin.cancellation.description")}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.cancellation.hoursBefore")}</TableHead>
                <TableHead>{t("admin.cancellation.refundPercentage")}</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">
                    {tier.hours_before === 0
                      ? t("admin.cancellation.lessThanMin")
                      : `≥ ${tier.hours_before}h`}
                  </TableCell>
                  <TableCell className="font-bold">{tier.refund_percentage}%</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tier)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(tier.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tiers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    {t("admin.cancellation.noTiers")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
