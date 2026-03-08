import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export default function TraineeProfile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error(t("trainee.profile.updateFailed"));
    } else {
      toast.success(t("trainee.profile.updateSuccess"));
    }
  };

  const handleChangeEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !user) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error(t("trainee.profile.invalidEmail"));
      return;
    }

    if (trimmed === user.email) {
      toast.error(t("trainee.profile.sameEmail"));
      return;
    }

    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setChangingEmail(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("trainee.profile.emailChangeRequested"));
      setNewEmail("");
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("trainee.profile.title")}</h1>

      <div className="max-w-lg space-y-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("trainee.profile.personalInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("trainee.profile.fullName")}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("trainee.profile.phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
              {saving ? t("common.loading") : t("common.save")}
            </Button>
          </CardContent>
        </Card>

        {/* Change Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("trainee.profile.changeEmail")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("trainee.profile.currentEmail")}</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>{t("trainee.profile.newEmail")}</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t("trainee.profile.newEmailPlaceholder")}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("trainee.profile.emailChangeNote")}
            </p>
            <Button
              onClick={handleChangeEmail}
              disabled={changingEmail || !newEmail.trim()}
              variant="outline"
            >
              {changingEmail ? t("common.loading") : t("trainee.profile.changeEmail")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
