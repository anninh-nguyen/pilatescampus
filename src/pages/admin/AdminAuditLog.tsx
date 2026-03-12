import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  changed_by: string | null;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
}

const PAGE_SIZE = 20;

const TABLE_NAMES = [
  "bookings", "class_slots", "classes", "packages", "trainee_packages",
  "promotions", "trainers", "profiles", "cancellation_policies",
  "time_pricing", "site_settings", "voucher_codes", "trainer_compensation_rates",
];

export default function AdminAuditLog() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterTable, setFilterTable] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [searchUser, setSearchUser] = useState("");
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [page, filterTable, filterAction]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("changed_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterTable !== "all") query = query.eq("table_name", filterTable);
    if (filterAction !== "all") query = query.eq("action", filterAction);

    const { data, count, error } = await query;
    if (!error && data) {
      setLogs(data as AuditLog[]);
      setTotal(count || 0);

      // Fetch profile names for changed_by user IDs
      const userIds = [...new Set(data.map((l: AuditLog) => l.changed_by).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        if (profileData) {
          const map = new Map<string, Profile>();
          profileData.forEach((p: Profile) => map.set(p.user_id, p));
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return t("admin.auditLog.system");
    const p = profiles.get(userId);
    return p ? (p.full_name || p.email) : userId.slice(0, 8) + "…";
  };

  const actionColor = (action: string) => {
    switch (action) {
      case "INSERT": return "default";
      case "UPDATE": return "secondary";
      case "DELETE": return "destructive";
      default: return "outline";
    }
  };

  const filteredLogs = searchUser
    ? logs.filter((l) => {
        const name = getUserName(l.changed_by).toLowerCase();
        return name.includes(searchUser.toLowerCase());
      })
    : logs;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold">{t("admin.auditLog.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.auditLog.description")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filterTable} onValueChange={(v) => { setFilterTable(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("admin.auditLog.filterTable")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {TABLE_NAMES.map((tn) => (
              <SelectItem key={tn} value={tn}>{tn}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("admin.auditLog.filterAction")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder={t("admin.auditLog.searchUser")}
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          className="w-[200px]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.auditLog.dateTime")}</TableHead>
                  <TableHead>{t("admin.auditLog.user")}</TableHead>
                  <TableHead>{t("admin.auditLog.action")}</TableHead>
                  <TableHead>{t("admin.auditLog.table")}</TableHead>
                  <TableHead>{t("admin.auditLog.recordId")}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t("admin.auditLog.noLogs")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(log.changed_at), "yyyy-MM-dd HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-sm">{getUserName(log.changed_by)}</TableCell>
                      <TableCell>
                        <Badge variant={actionColor(log.action) as "default" | "secondary" | "destructive" | "outline"}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{log.table_name}</TableCell>
                      <TableCell className="text-sm font-mono truncate max-w-[120px]">{log.record_id}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDetailLog(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            {t("common.showing", { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, total), total })}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.auditLog.details")}</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>{t("admin.auditLog.action")}:</strong> <Badge variant={actionColor(detailLog.action) as "default" | "secondary" | "destructive" | "outline"}>{detailLog.action}</Badge></div>
                <div><strong>{t("admin.auditLog.table")}:</strong> {detailLog.table_name}</div>
                <div><strong>{t("admin.auditLog.user")}:</strong> {getUserName(detailLog.changed_by)}</div>
                <div><strong>{t("admin.auditLog.dateTime")}:</strong> {format(new Date(detailLog.changed_at), "yyyy-MM-dd HH:mm:ss")}</div>
              </div>
              {detailLog.old_data && (
                <div>
                  <h4 className="font-semibold mb-1">{t("admin.auditLog.oldData")}</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[200px]">
                    {JSON.stringify(detailLog.old_data, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.new_data && (
                <div>
                  <h4 className="font-semibold mb-1">{t("admin.auditLog.newData")}</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[200px]">
                    {JSON.stringify(detailLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
