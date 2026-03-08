import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Gift, Ticket, Users, UserPlus, RotateCcw } from "lucide-react";
import { format, addDays } from "date-fns";
import { ListControls, useListControls } from "@/components/ListControls";

type PromotionType = "first_time" | "campaign" | "voucher" | "referral" | "returning";

interface Promotion {
  id: string;
  type: PromotionType;
  name: string;
  description: string | null;
  credit_amount: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

interface VoucherCode {
  id: string;
  promotion_id: string;
  code: string;
  created_by: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  expires_at: string;
  created_at: string;
}

const PROMO_TYPES: PromotionType[] = ["first_time", "campaign", "voucher", "referral", "returning"];

const typeIcons: Record<PromotionType, typeof Gift> = {
  first_time: Gift,
  campaign: Users,
  voucher: Ticket,
  referral: UserPlus,
  returning: RotateCcw,
};

function generateCode(): string {
  return Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
}

export default function AdminPromotions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPromo, setEditPromo] = useState<Promotion | null>(null);

  // Form state
  const [formType, setFormType] = useState<PromotionType>("first_time");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCredits, setFormCredits] = useState("1");
  const [formActive, setFormActive] = useState(true);
  const [formStartDate, setFormStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formEndDate, setFormEndDate] = useState("");

  // Voucher codes
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [vouchers, setVouchers] = useState<VoucherCode[]>([]);
  const [voucherCount, setVoucherCount] = useState("5");
  const [generating, setGenerating] = useState(false);

  const lc = useListControls<Promotion>(promotions, (p, q) =>
    p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
  );

  const fetchPromotions = async () => {
    const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
    if (data) setPromotions(data as unknown as Promotion[]);
  };

  useEffect(() => { fetchPromotions(); }, []);

  const openCreate = () => {
    setEditPromo(null);
    setFormType("first_time");
    setFormName("");
    setFormDesc("");
    setFormCredits("1");
    setFormActive(true);
    setFormStartDate(format(new Date(), "yyyy-MM-dd"));
    setFormEndDate("");
    setDialogOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditPromo(p);
    setFormType(p.type);
    setFormName(p.name);
    setFormDesc(p.description || "");
    setFormCredits(String(p.credit_amount));
    setFormActive(p.is_active);
    setFormStartDate(p.start_date);
    setFormEndDate(p.end_date || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      type: formType,
      name: formName.trim(),
      description: formDesc.trim() || null,
      credit_amount: parseFloat(formCredits) || 1,
      is_active: formActive,
      start_date: formStartDate,
      end_date: formEndDate || null,
    };

    if (editPromo) {
      const { error } = await supabase.from("promotions").update(payload).eq("id", editPromo.id);
      if (error) { toast.error(error.message); return; }
      toast.success(t("admin.promotions.updated"));
    } else {
      const { error } = await supabase.from("promotions").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(t("admin.promotions.created"));
    }
    setDialogOpen(false);
    fetchPromotions();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("promotions").delete().eq("id", id);
    toast.success(t("admin.promotions.deleted"));
    fetchPromotions();
  };

  // Voucher management
  const openVouchers = async (promo: Promotion) => {
    setSelectedPromo(promo);
    const { data } = await supabase.from("voucher_codes").select("*").eq("promotion_id", promo.id).order("created_at", { ascending: false });
    setVouchers((data || []) as unknown as VoucherCode[]);
    setVoucherDialogOpen(true);
  };

  const generateVouchers = async () => {
    if (!selectedPromo || !user) return;
    setGenerating(true);
    const count = parseInt(voucherCount, 10) || 1;
    const codes = Array.from({ length: count }, () => ({
      promotion_id: selectedPromo.id,
      code: generateCode(),
      created_by: user.id,
      expires_at: addDays(new Date(), 7).toISOString(),
    }));
    const { error } = await supabase.from("voucher_codes").insert(codes);
    if (error) { toast.error(error.message); } else { toast.success(t("admin.promotions.vouchersGenerated", { count })); }
    setGenerating(false);
    // Refresh
    const { data } = await supabase.from("voucher_codes").select("*").eq("promotion_id", selectedPromo.id).order("created_at", { ascending: false });
    setVouchers((data || []) as unknown as VoucherCode[]);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t("admin.promotions.codeCopied"));
  };

  // Campaign send
  const sendCampaign = async (promo: Promotion) => {
    const { error } = await supabase.functions.invoke("process-promotions", {
      body: { action: "send_campaign", promotion_id: promo.id },
    });
    if (error) { toast.error(error.message); } else { toast.success(t("admin.promotions.campaignSent")); }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">{t("admin.promotions.title")}</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{t("admin.promotions.addPromotion")}</Button>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">{t("admin.promotions.description")}</p>

      <div className="mb-4">
        <ListControls search={lc.search} onSearchChange={lc.setSearch} page={lc.page} totalPages={lc.totalPages} onPageChange={lc.setPage} pageSize={lc.pageSize} onPageSizeChange={lc.setPageSize} totalItems={lc.totalItems} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.promotions.promoName")}</TableHead>
                <TableHead>{t("admin.promotions.promoType")}</TableHead>
                <TableHead>{t("admin.promotions.credits")}</TableHead>
                <TableHead>{t("admin.promotions.dateRange")}</TableHead>
                <TableHead>{t("admin.promotions.status")}</TableHead>
                <TableHead>{t("admin.trainees.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lc.paginated.map((p) => {
                const Icon = typeIcons[p.type];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Icon className="h-3 w-3" />
                        {t(`admin.promotions.types.${p.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.credit_amount}</TableCell>
                    <TableCell className="text-sm">
                      {p.start_date}{p.end_date ? ` → ${p.end_date}` : ` → ∞`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? t("admin.packages.active") : t("trainee.package.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      {p.type === "voucher" && (
                        <Button variant="ghost" size="icon" onClick={() => openVouchers(p)}><Ticket className="h-4 w-4" /></Button>
                      )}
                      {p.type === "campaign" && (
                        <Button variant="ghost" size="icon" onClick={() => sendCampaign(p)} title={t("admin.promotions.sendCampaign")}><Users className="h-4 w-4" /></Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {lc.paginated.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t("admin.promotions.noPromotions")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPromo ? t("admin.promotions.editPromotion") : t("admin.promotions.addPromotion")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("admin.promotions.promoType")}</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as PromotionType)} disabled={!!editPromo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROMO_TYPES.map((pt) => (
                    <SelectItem key={pt} value={pt}>{t(`admin.promotions.types.${pt}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("admin.promotions.promoName")}</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.packages.description")}</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.promotions.credits")}</Label>
              <Input type="number" min={0} step={0.1} value={formCredits} onChange={(e) => setFormCredits(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("admin.promotions.startDate")}</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.promotions.endDate")}</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} id="promo-active" />
              <Label htmlFor="promo-active">{t("admin.packages.active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>{editPromo ? t("common.update") : t("common.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voucher Codes Dialog */}
      <Dialog open={voucherDialogOpen} onOpenChange={setVoucherDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("admin.promotions.voucherCodes")} — {selectedPromo?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <Input type="number" min={1} max={50} value={voucherCount} onChange={(e) => setVoucherCount(e.target.value)} className="w-24" />
            <Button onClick={generateVouchers} disabled={generating}>
              <Plus className="mr-2 h-4 w-4" />{t("admin.promotions.generateVouchers")}
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.promotions.code")}</TableHead>
                  <TableHead>{t("admin.promotions.expiresAt")}</TableHead>
                  <TableHead>{t("admin.promotions.status")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">{v.code}</TableCell>
                    <TableCell className="text-sm">{format(new Date(v.expires_at), "PPp")}</TableCell>
                    <TableCell>
                      {v.redeemed_by ? (
                        <Badge variant="secondary">{t("admin.promotions.redeemed")}</Badge>
                      ) : new Date(v.expires_at) < new Date() ? (
                        <Badge variant="destructive">{t("admin.promotions.expired")}</Badge>
                      ) : (
                        <Badge variant="default">{t("admin.promotions.available")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!v.redeemed_by && new Date(v.expires_at) >= new Date() && (
                        <Button variant="ghost" size="icon" onClick={() => copyCode(v.code)}><Copy className="h-4 w-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {vouchers.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="py-4 text-center text-muted-foreground">{t("admin.promotions.noVouchers")}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
