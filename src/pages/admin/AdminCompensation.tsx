import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Award } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const LEVELS = ["trainee_trainer", "junior", "senior", "master"] as const;

interface CompRate {
  id: string;
  level: string;
  rate_type: string;
  rate_value: number;
}

export default function AdminCompensation() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [rates, setRates] = useState<CompRate[]>([]);
  const [editRate, setEditRate] = useState<CompRate | null>(null);
  const [form, setForm] = useState({ rateType: "fixed", rateValue: 0 });

  const fetchRates = async () => {
    const { data } = await supabase
      .from("trainer_compensation_rates")
      .select("*")
      .order("level");
    if (data) setRates(data as unknown as CompRate[]);
  };

  useEffect(() => { fetchRates(); }, []);

  const openEdit = (rate: CompRate) => {
    setEditRate(rate);
    setForm({ rateType: rate.rate_type, rateValue: rate.rate_value });
  };

  const handleSave = async () => {
    if (!editRate) return;
    const { error } = await supabase
      .from("trainer_compensation_rates")
      .update({ rate_type: form.rateType, rate_value: form.rateValue })
      .eq("id", editRate.id);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.compensation.rateUpdated") });
      setEditRate(null);
      fetchRates();
    }
  };

  const levelOrder = (level: string) => LEVELS.indexOf(level as any);

  const sorted = [...rates].sort((a, b) => levelOrder(a.level) - levelOrder(b.level));

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold">{t("admin.compensation.title")}</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4" />
            {t("admin.compensation.description")}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.compensation.level")}</TableHead>
                <TableHead>{t("admin.compensation.rateType")}</TableHead>
                <TableHead>{t("admin.compensation.rateValue")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {t(`admin.compensation.levels.${rate.level}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {t(`admin.compensation.types.${rate.rate_type}`)}
                  </TableCell>
                  <TableCell className="font-bold">
                    {rate.rate_type === "percentage" ? `${rate.rate_value}%` : `${rate.rate_value}`}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(rate)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    {t("admin.compensation.noRates")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editRate} onOpenChange={(v) => { if (!v) setEditRate(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("admin.compensation.editRate")} — {editRate && t(`admin.compensation.levels.${editRate.level}`)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("admin.compensation.rateType")}</Label>
              <Select value={form.rateType} onValueChange={(v) => setForm({ ...form, rateType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t("admin.compensation.types.fixed")}</SelectItem>
                  <SelectItem value="percentage">{t("admin.compensation.types.percentage")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {form.rateType === "percentage"
                  ? t("admin.compensation.percentageLabel")
                  : t("admin.compensation.fixedLabel")}
              </Label>
              <Input
                type="number"
                min={0}
                max={form.rateType === "percentage" ? 100 : undefined}
                step="0.01"
                value={form.rateValue}
                onChange={(e) => setForm({ ...form, rateValue: +e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
