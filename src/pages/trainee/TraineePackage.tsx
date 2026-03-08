import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Copy, Gift, Ticket, Link } from "lucide-react";

interface TraineePackageData {
  id: string; remaining_credits: number; expires_at: string; is_active: boolean;
  packages: { name: string; credit_count: number; description: string | null } | null;
}

export default function TraineePackage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pkg, setPkg] = useState<TraineePackageData | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("trainee_packages").select("*, packages(name, credit_count, description)")
      .eq("trainee_id", user.id).eq("is_active", true).single()
      .then(({ data }) => { if (data) setPkg(data as unknown as TraineePackageData); });

    // Load or create referral code
    loadReferralCode();
  }, [user]);

  const loadReferralCode = async () => {
    if (!user) return;
    const { data } = await supabase.from("referral_codes").select("code").eq("user_id", user.id).single();
    if (data) {
      setReferralCode(data.code);
      setReferralLink(`${window.location.origin}/r/${data.code}`);
    } else {
      // Generate a referral code
      const code = user.id.slice(0, 8).toUpperCase();
      const { error } = await supabase.from("referral_codes").insert({ user_id: user.id, code });
      if (!error) {
        setReferralCode(code);
        setReferralLink(`${window.location.origin}/r/${code}`);
      }
    }
  };

  const redeemVoucher = async () => {
    if (!user || !voucherCode.trim()) return;
    setRedeeming(true);
    const { data, error } = await supabase.rpc("redeem_voucher", {
      _code: voucherCode.trim().toUpperCase(),
      _user_id: user.id,
    });
    setRedeeming(false);

    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }

    const result = data as unknown as { success: boolean; credits?: number; error?: string };
    if (result.success) {
      toast({ title: t("trainee.promotions.voucherRedeemed"), description: t("trainee.promotions.creditsAdded", { credits: result.credits }) });
      setVoucherCode("");
      // Refresh package
      const { data: refreshed } = await supabase.from("trainee_packages").select("*, packages(name, credit_count, description)")
        .eq("trainee_id", user.id).eq("is_active", true).single();
      if (refreshed) setPkg(refreshed as unknown as TraineePackageData);
    } else {
      toast({ title: t("common.error"), description: result.error || "Failed", variant: "destructive" });
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: t("trainee.promotions.linkCopied") });
  };

  if (!pkg) {
    return (
      <DashboardLayout>
        <h1 className="mb-6 font-serif text-3xl font-bold">{t("trainee.package.title")}</h1>
        <Card><CardContent className="py-8 text-center text-muted-foreground">{t("trainee.package.noPackage")}</CardContent></Card>
      </DashboardLayout>
    );
  }

  const total = pkg.packages?.credit_count || 1;
  const used = Math.max(0, total - pkg.remaining_credits);
  const pct = Math.min(100, Math.round((pkg.remaining_credits / total) * 100));

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("trainee.package.title")}</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Package Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {pkg.packages?.name}
              <Badge variant={pkg.is_active ? "default" : "secondary"}>{pkg.is_active ? t("trainee.package.active") : t("trainee.package.inactive")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pkg.packages?.description && <p className="text-muted-foreground">{pkg.packages.description}</p>}
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>{t("trainee.package.creditsRemaining")}</span>
                <span className="font-medium">{pkg.remaining_credits} / {total}</span>
              </div>
              <Progress value={pct} />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t("trainee.package.sessionsUsed")}: {used}</span>
              <span>{t("trainee.package.expires")}: {format(new Date(pkg.expires_at), "PPP")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Voucher Redemption */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              {t("trainee.promotions.redeemVoucher")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("trainee.promotions.voucherDescription")}</p>
            <div className="flex gap-2">
              <Input
                placeholder={t("trainee.promotions.enterCode")}
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button onClick={redeemVoucher} disabled={redeeming || !voucherCode.trim()}>
                <Gift className="mr-2 h-4 w-4" />
                {redeeming ? t("common.loading") : t("trainee.promotions.redeem")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              {t("trainee.promotions.referralTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("trainee.promotions.referralDescription")}</p>
            {referralLink && (
              <div className="flex items-center gap-2">
                <Input readOnly value={referralLink} className="font-mono text-sm" />
                <Button variant="outline" onClick={copyReferralLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  {t("trainee.promotions.copy")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
