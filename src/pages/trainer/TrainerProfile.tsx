import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function TrainerProfile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
      }
      const { data: trainer } = await supabase
        .from("trainers")
        .select("bio, specialty")
        .eq("user_id", user.id)
        .single();
      if (trainer) {
        setBio(trainer.bio || "");
        setSpecialty(trainer.specialty || "");
      }
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("user_id", user.id);

    const { error: trainerErr } = await supabase
      .from("trainers")
      .update({ bio: bio.trim() || null, specialty: specialty.trim() || null })
      .eq("user_id", user.id);

    setSaving(false);
    if (profileErr || trainerErr) {
      toast.error(t("trainer.profile.updateFailed"));
    } else {
      toast.success(t("trainer.profile.updateSuccess"));
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("trainer.profile.title")}</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t("trainer.profile.personalInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("trainer.profile.fullName")}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("trainer.profile.phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("trainer.profile.specialty")}</Label>
            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("trainer.profile.bio")}</Label>
            <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
