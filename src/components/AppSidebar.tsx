import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Package,
  CalendarDays,
  DollarSign,
  BarChart3,
  ShieldAlert,
  Award,
  Calendar,
  History,
  Bell,
  CreditCard,
  BookOpen,
  UserPlus,
  ClipboardList,
  LogOut,
  User,
  Gift,
  Mail,
  ScrollText,
} from "lucide-react";

const adminLinks = [
  { labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/admin" },
  { labelKey: "nav.trainers", icon: UserCheck, path: "/admin/trainers" },
  { labelKey: "nav.trainees", icon: Users, path: "/admin/trainees" },
  { labelKey: "nav.packages", icon: Package, path: "/admin/packages" },
  { labelKey: "nav.schedule", icon: CalendarDays, path: "/admin/schedule" },
  { labelKey: "nav.pricing", icon: DollarSign, path: "/admin/pricing" },
  { labelKey: "nav.reports", icon: BarChart3, path: "/admin/reports" },
  { labelKey: "nav.cancellation", icon: ShieldAlert, path: "/admin/cancellation" },
  { labelKey: "nav.compensation", icon: Award, path: "/admin/compensation" },
  { labelKey: "nav.bookForTrainee", icon: UserPlus, path: "/admin/book-for-trainee" },
  { labelKey: "nav.manageBookings", icon: ClipboardList, path: "/admin/manage-bookings" },
  { labelKey: "nav.promotions", icon: Gift, path: "/admin/promotions" },
  { labelKey: "nav.emailSettings", icon: Mail, path: "/admin/email-settings" },
];

const trainerLinks = [
  { labelKey: "nav.mySchedule", icon: Calendar, path: "/trainer" },
  { labelKey: "nav.sessionHistory", icon: History, path: "/trainer/history" },
  { labelKey: "nav.myProfile", icon: User, path: "/trainer/profile" },
  { labelKey: "nav.notifications", icon: Bell, path: "/trainer/notifications" },
  { labelKey: "nav.bookForTrainee", icon: UserPlus, path: "/trainer/book-for-trainee" },
  { labelKey: "nav.manageBookings", icon: ClipboardList, path: "/trainer/manage-bookings" },
];

const traineeLinks = [
  { labelKey: "nav.myPackage", icon: CreditCard, path: "/trainee" },
  { labelKey: "nav.bookSessions", icon: BookOpen, path: "/trainee/book" },
  { labelKey: "nav.myBookings", icon: CalendarDays, path: "/trainee/bookings" },
  { labelKey: "nav.myProfile", icon: User, path: "/trainee/profile" },
  { labelKey: "nav.notifications", icon: Bell, path: "/trainee/notifications" },
];

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const links = role === "admin" ? adminLinks : role === "trainer" ? trainerLinks : traineeLinks;
  const roleLabel = t(`roles.${role || "trainee"}`);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h2 className="font-serif text-lg font-bold text-sidebar-primary-foreground">
          {t("common.appName")}
        </h2>
        <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("common.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => (
                <SidebarMenuItem key={link.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === link.path}
                    onClick={() => navigate(link.path)}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{t(link.labelKey)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="mb-2 text-sm text-sidebar-foreground/80 truncate">
          {profile?.full_name || profile?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={() => { signOut(); navigate("/login"); }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("common.signOut")}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
