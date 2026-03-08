import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTrainers from "./pages/admin/AdminTrainers";
import AdminTrainees from "./pages/admin/AdminTrainees";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminSchedule from "./pages/admin/AdminSchedule";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminReports from "./pages/admin/AdminReports";
import AdminCancellation from "./pages/admin/AdminCancellation";
import TrainerSchedule from "./pages/trainer/TrainerSchedule";
import TrainerHistory from "./pages/trainer/TrainerHistory";
import TrainerProfile from "./pages/trainer/TrainerProfile";
import TraineePackage from "./pages/trainee/TraineePackage";
import TraineeBooking from "./pages/trainee/TraineeBooking";
import TraineeBookings from "./pages/trainee/TraineeBookings";
import Notifications from "./pages/shared/Notifications";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/trainers" element={<ProtectedRoute allowedRoles={["admin"]}><AdminTrainers /></ProtectedRoute>} />
            <Route path="/admin/trainees" element={<ProtectedRoute allowedRoles={["admin"]}><AdminTrainees /></ProtectedRoute>} />
            <Route path="/admin/packages" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPackages /></ProtectedRoute>} />
            <Route path="/admin/schedule" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSchedule /></ProtectedRoute>} />
            <Route path="/admin/pricing" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPricing /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={["admin"]}><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/cancellation" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCancellation /></ProtectedRoute>} />

            {/* Trainer routes */}
            <Route path="/trainer" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerSchedule /></ProtectedRoute>} />
            <Route path="/trainer/history" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerHistory /></ProtectedRoute>} />
            <Route path="/trainer/profile" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerProfile /></ProtectedRoute>} />
            <Route path="/trainer/notifications" element={<ProtectedRoute allowedRoles={["trainer"]}><Notifications /></ProtectedRoute>} />

            {/* Trainee routes */}
            <Route path="/trainee" element={<ProtectedRoute allowedRoles={["trainee"]}><TraineePackage /></ProtectedRoute>} />
            <Route path="/trainee/book" element={<ProtectedRoute allowedRoles={["trainee"]}><TraineeBooking /></ProtectedRoute>} />
            <Route path="/trainee/bookings" element={<ProtectedRoute allowedRoles={["trainee"]}><TraineeBookings /></ProtectedRoute>} />
            <Route path="/trainee/notifications" element={<ProtectedRoute allowedRoles={["trainee"]}><Notifications /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
