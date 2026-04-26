import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminPending from "./pages/admin/AdminPending";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminTimetable from "./pages/admin/AdminTimetable";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login admin />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminOverview /></ProtectedRoute>} />
            <Route path="/admin/pending" element={<ProtectedRoute requireRole="admin"><AdminPending /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute requireRole="admin"><AdminStudents /></ProtectedRoute>} />
            <Route path="/admin/attendance" element={<ProtectedRoute requireRole="admin"><AdminAttendance /></ProtectedRoute>} />
            <Route path="/admin/timetable" element={<ProtectedRoute requireRole="admin"><AdminTimetable /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
