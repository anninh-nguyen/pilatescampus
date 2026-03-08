import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Notification { id: string; title: string; message: string; is_read: boolean; created_at: string; }

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setNotifications(data);
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 font-serif text-3xl font-bold">{t("notifications.title")}</h1>
      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className={n.is_read ? "opacity-60" : ""}>
            <CardContent className="flex items-start gap-3 p-4">
              <Bell className="mt-0.5 h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{format(new Date(n.created_at), "PPP p")}</p>
              </div>
              {!n.is_read && (<Button variant="ghost" size="sm" onClick={() => markRead(n.id)}><Check className="h-4 w-4" /></Button>)}
            </CardContent>
          </Card>
        ))}
        {notifications.length === 0 && (<Card><CardContent className="py-8 text-center text-muted-foreground">{t("notifications.empty")}</CardContent></Card>)}
      </div>
    </DashboardLayout>
  );
}
