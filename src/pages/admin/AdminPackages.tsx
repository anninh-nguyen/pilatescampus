import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil } from "lucide-react";

type Pkg = { id: string; name: string; description: string | null; credit_count: number; price: number; expiry_days: number; is_active: boolean; };

export default function AdminPackages() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState({ name: "", description: "", credit_count: 10, price: 100, expiry_days: 30 });
  const { toast } = useToast();

  const fetchPackages = async () => {
    const { data } = await supabase.from("packages").select("*").order("created_at", { ascending: false });
    if (data) setPackages(data as Pkg[]);
  };
  useEffect(() => { fetchPackages(); }, []);

  const handleSave = async () => {
    if (editing) {
      const { error } = await supabase.from("packages").update(form).eq("id", editing.id);
      if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("packages").insert(form);
      if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? t("admin.packages.packageUpdated") : t("admin.packages.packageCreated") });
    setOpen(false); setEditing(null);
    setForm({ name: "", description: "", credit_count: 10, price: 100, expiry_days: 30 });
    fetchPackages();
  };

  const toggleActive = async (pkg: Pkg) => {
    await supabase.from("packages").update({ is_active: !pkg.is_active }).eq("id", pkg.id);
    fetchPackages();
  };

  const openEdit = (pkg: Pkg) => {
    setEditing(pkg);
    setForm({ name: pkg.name, description: pkg.description || "", credit_count: pkg.credit_count, price: pkg.price, expiry_days: pkg.expiry_days });
    setOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">{t("admin.packages.title")}</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />{t("admin.packages.newPackage")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? t("admin.packages.editPackage") : t("admin.packages.createPackage")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t("admin.packages.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("admin.packages.description")}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>{t("admin.packages.credits")}</Label><Input type="number" value={form.credit_count} onChange={(e) => setForm({ ...form, credit_count: +e.target.value })} /></div>
                <div className="space-y-2"><Label>{t("admin.packages.price")}</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
                <div className="space-y-2"><Label>{t("admin.packages.expiryDays")}</Label><Input type="number" value={form.expiry_days} onChange={(e) => setForm({ ...form, expiry_days: +e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleSave}>{editing ? t("common.update") : t("common.create")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.packages.name")}</TableHead>
                <TableHead>{t("admin.packages.credits")}</TableHead>
                <TableHead>{t("admin.packages.price")}</TableHead>
                <TableHead>{t("admin.packages.expiry")}</TableHead>
                <TableHead>{t("admin.packages.active")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.credit_count}</TableCell>
                  <TableCell>${p.price}</TableCell>
                  <TableCell>{p.expiry_days} {t("admin.packages.expiryDays").toLowerCase().includes("ngày") ? "" : "days"}</TableCell>
                  <TableCell><Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} /></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {packages.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("admin.packages.noPackages")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
