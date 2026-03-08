import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
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
  BarChart3,
  Calendar,
  History,
  Bell,
  CreditCard,
  BookOpen,
  LogOut,
} from "lucide-react";

const adminLinks = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Trainers", icon: UserCheck, path: "/admin/trainers" },
  { label: "Trainees", icon: Users, path: "/admin/trainees" },
  { label: "Packages", icon: Package, path: "/admin/packages" },
  { label: "Schedule", icon: CalendarDays, path: "/admin/schedule" },
  { label: "Reports", icon: BarChart3, path: "/admin/reports" },
];

const trainerLinks = [
  { label: "My Schedule", icon: Calendar, path: "/trainer" },
  { label: "Session History", icon: History, path: "/trainer/history" },
  { label: "Notifications", icon: Bell, path: "/trainer/notifications" },
];

const traineeLinks = [
  { label: "My Package", icon: CreditCard, path: "/trainee" },
  { label: "Book Sessions", icon: BookOpen, path: "/trainee/book" },
  { label: "My Bookings", icon: CalendarDays, path: "/trainee/bookings" },
  { label: "Notifications", icon: Bell, path: "/trainee/notifications" },
];

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links = role === "admin" ? adminLinks : role === "trainer" ? trainerLinks : traineeLinks;
  const roleLabel = role === "admin" ? "Administrator" : role === "trainer" ? "Trainer" : "Trainee";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h2 className="font-serif text-lg font-bold text-sidebar-primary-foreground">
          Pilates Campus
        </h2>
        <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => (
                <SidebarMenuItem key={link.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === link.path}
                    onClick={() => navigate(link.path)}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
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
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
