import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Check, Calendar, CreditCard, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ListControls, useListControls } from "@/components/ListControls";

interface Notification { id: string; title: string; message: string; type: string; is_read: boolean; created_at: string; }

const typeIcons: Record<string, typeof Bell> = {
  booking_reminder: Calendar,
  low_credits: CreditCard,
  package_expiry: Clock,
  reminder: Bell,
};

const typeBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  booking_reminder: "default",
  low_credits: "destructive",
  package_expiry: "secondary",
  reminder: "outline",
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const lc = useListControls<Notification>(notifications, (n, q) =>
    n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
  );

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

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    fetchNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">
          {t("notifications.title")}
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-3 text-xs">{unreadCount}</Badge>
          )}
        </h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="mr-2 h-4 w-4" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>
      <div className="mb-4">
        <ListControls search={lc.search} onSearchChange={lc.setSearch} page={lc.page} totalPages={lc.totalPages} onPageChange={lc.setPage} pageSize={lc.pageSize} onPageSizeChange={lc.setPageSize} totalItems={lc.totalItems} />
      </div>
      <div className="space-y-3">
        {lc.paginated.map((n) => {
          const Icon = typeIcons[n.type] || Bell;
          const badgeVariant = typeBadgeVariants[n.type] || "outline";
          return (
            <Card key={n.id} className={n.is_read ? "opacity-60" : ""}>
              <CardContent className="flex items-start gap-3 p-4">
                <Icon className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant={badgeVariant} className="text-xs capitalize">
                      {t(`notifications.types.${n.type}`, n.type.replace(/_/g, " "))}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{format(new Date(n.created_at), "PPP p")}</p>
                </div>
                {!n.is_read && (<Button variant="ghost" size="sm" onClick={() => markRead(n.id)}><Check className="h-4 w-4" /></Button>)}
              </CardContent>
            </Card>
          );
        })}
        {lc.paginated.length === 0 && (<Card><CardContent className="py-8 text-center text-muted-foreground">{t("notifications.empty")}</CardContent></Card>)}
      </div>
    </DashboardLayout>
  );
}
