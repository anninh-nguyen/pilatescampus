import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send, FileText, Loader2 } from "lucide-react";

type SettingsMap = Record<string, string>;

const SENDER_KEYS = ["email_sender_name", "email_reply_to"] as const;

const TEMPLATE_GROUPS = [
  { id: "invitation", icon: Send },
  { id: "booking_reminder", icon: Mail },
  { id: "low_credits", icon: Mail },
  { id: "package_expiry", icon: Mail },
  { id: "promotion", icon: FileText },
] as const;

export default function AdminEmailSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");
      if (!error && data) {
        const map: SettingsMap = {};
        data.forEach((row) => { map[row.key] = row.value; });
        setSettings(map);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = Object.entries(settings).map(([key, value]) =>
      supabase.from("site_settings").update({ value }).eq("key", key)
    );
    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);
    setSaving(false);
    if (hasError) {
      toast.error(t("admin.emailSettings.saveFailed"));
    } else {
      toast.success(t("admin.emailSettings.saveSuccess"));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">{t("admin.emailSettings.title")}</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("common.loading") : t("common.save")}
        </Button>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Sender Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {t("admin.emailSettings.senderInfo")}
            </CardTitle>
            <CardDescription>{t("admin.emailSettings.senderInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("admin.emailSettings.senderName")}</Label>
              <Input
                value={settings.email_sender_name || ""}
                onChange={(e) => updateSetting("email_sender_name", e.target.value)}
                placeholder="Pilates Campus"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.emailSettings.replyTo")}</Label>
              <Input
                type="email"
                value={settings.email_reply_to || ""}
                onChange={(e) => updateSetting("email_reply_to", e.target.value)}
                placeholder="hello@yourdomain.com"
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Email Templates */}
        <h2 className="font-serif text-xl font-semibold">{t("admin.emailSettings.templates")}</h2>
        <p className="text-sm text-muted-foreground">{t("admin.emailSettings.templatesDesc")}</p>

        {TEMPLATE_GROUPS.map(({ id, icon: Icon }) => (
          <Card key={id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4" />
                {t(`admin.emailSettings.template.${id}`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.emailSettings.subject")}</Label>
                <Input
                  value={settings[`email_subject_${id}`] || ""}
                  onChange={(e) => updateSetting(`email_subject_${id}`, e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.emailSettings.body")}</Label>
                <Textarea
                  value={settings[`email_body_${id}`] || ""}
                  onChange={(e) => updateSetting(`email_body_${id}`, e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
