import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Clock } from "lucide-react";

interface TimePricing {
  id: string;
  label: string;
  tier: string;
  start_time: string;
  end_time: string;
  credit_cost: number;
}

const TIER_OPTIONS = ["peak", "shoulder", "off_peak"] as const;

function tierBadgeVariant(tier: string): "destructive" | "default" | "secondary" {
  if (tier === "peak") return "destructive";
  if (tier === "shoulder") return "default";
  return "secondary";
}

export default function AdminPricing() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [periods, setPeriods] = useState<TimePricing[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", tier: "off_peak", startTime: "06:00", endTime: "09:00", creditCost: 1 });

  const fetchPeriods = async () => {
    const { data } = await supabase.from("time_pricing").select("*").order("start_time", { ascending: true });
    if (data) setPeriods(data as unknown as TimePricing[]);
  };

  useEffect(() => { fetchPeriods(); }, []);

  const resetForm = () => {
    setForm({ label: "", tier: "off_peak", startTime: "06:00", endTime: "09:00", creditCost: 1 });
    setEditId(null);
  };

  const openEdit = (p: TimePricing) => {
    setForm({ label: p.label, tier: p.tier, startTime: p.start_time.slice(0, 5), endTime: p.end_time.slice(0, 5), creditCost: p.credit_cost });
    setEditId(p.id);
    setOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      label: form.label,
      tier: form.tier,
      start_time: form.startTime,
      end_time: form.endTime,
      credit_cost: form.creditCost,
    };

    if (editId) {
      const { error } = await supabase.from("time_pricing").update(payload).eq("id", editId);
      if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
      toast({ title: t("admin.pricing.periodUpdated") });
    } else {
      const { error } = await supabase.from("time_pricing").insert(payload);
      if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
      toast({ title: t("admin.pricing.periodCreated") });
    }
    setOpen(false);
    resetForm();
    fetchPeriods();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("time_pricing").delete().eq("id", id);
    toast({ title: t("admin.pricing.periodDeleted") });
    fetchPeriods();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">{t("admin.pricing.title")}</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />{t("admin.pricing.addPeriod")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? t("admin.pricing.editPeriod") : t("admin.pricing.addPeriod")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.pricing.label")}</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Morning Peak" />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.pricing.tier")}</Label>
                <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map((tier) => (
                      <SelectItem key={tier} value={tier}>{t(`admin.pricing.${tier}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.pricing.startTime")}</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.pricing.endTime")}</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.pricing.creditCost")}</Label>
                <Input type="number" min={1} value={form.creditCost} onChange={(e) => setForm({ ...form, creditCost: +e.target.value })} />
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
            <Clock className="h-4 w-4" />
            {t("admin.pricing.description")}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.pricing.label")}</TableHead>
                <TableHead>{t("admin.pricing.tier")}</TableHead>
                <TableHead>{t("admin.pricing.timeRange")}</TableHead>
                <TableHead>{t("admin.pricing.creditCost")}</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.label}</TableCell>
                  <TableCell>
                    <Badge variant={tierBadgeVariant(p.tier)}>
                      {t(`admin.pricing.${p.tier}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.start_time.slice(0, 5)} – {p.end_time.slice(0, 5)}</TableCell>
                  <TableCell className="font-bold">{p.credit_cost} {p.credit_cost === 1 ? t("admin.pricing.credit") : t("admin.pricing.credits")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {periods.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{t("admin.pricing.noPeriods")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
