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
import Notifications from "./pages/student/Notifications";
import StudentAssignments from "./pages/student/Assignments";
import StudentRecords from "./pages/student/Records";
import StudentAnnouncements from "./pages/student/Announcements";
import StudentProfile from "./pages/student/Profile";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminPending from "./pages/admin/AdminPending";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminTimetable from "./pages/admin/AdminTimetable";
import AdminAssignments from "./pages/admin/AdminAssignments";
import AdminRecords from "./pages/admin/AdminRecords";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminScan from "./pages/admin/AdminScan";
import AdminAttendanceEdit from "./pages/admin/AdminAttendanceEdit";
import AdminAttendanceReports from "./pages/admin/AdminAttendanceReports";
import StudentAttendanceHistory from "./pages/student/AttendanceHistory";
import StudentChatbot from "./pages/student/Chatbot";
import StudentSettings from "./pages/student/Settings";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminContent from "./pages/admin/AdminContent";
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
            <Route path="/notifications" element={<ProtectedRoute requireRole="student"><Notifications /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute requireRole="student"><StudentAssignments /></ProtectedRoute>} />
            <Route path="/records" element={<ProtectedRoute requireRole="student"><StudentRecords /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute requireRole="student"><StudentAnnouncements /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requireRole="student"><StudentProfile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminOverview /></ProtectedRoute>} />
            <Route path="/admin/pending" element={<ProtectedRoute requireRole="admin"><AdminPending /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute requireRole="admin"><AdminStudents /></ProtectedRoute>} />
            <Route path="/admin/attendance" element={<ProtectedRoute requireRole="admin"><AdminAttendance /></ProtectedRoute>} />
            <Route path="/admin/scan" element={<ProtectedRoute requireRole="admin"><AdminScan /></ProtectedRoute>} />
            <Route path="/admin/timetable" element={<ProtectedRoute requireRole="admin"><AdminTimetable /></ProtectedRoute>} />
            <Route path="/admin/assignments" element={<ProtectedRoute requireRole="admin"><AdminAssignments /></ProtectedRoute>} />
            <Route path="/admin/records" element={<ProtectedRoute requireRole="admin"><AdminRecords /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute requireRole="admin"><AdminAnnouncements /></ProtectedRoute>} />
            <Route path="/admin/edit-attendance" element={<ProtectedRoute requireRole="admin"><AdminAttendanceEdit /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requireRole="admin"><AdminAttendanceReports /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute requireRole="student"><StudentAttendanceHistory /></ProtectedRoute>} />
            <Route path="/chatbot" element={<ProtectedRoute requireRole="student"><StudentChatbot /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requireRole="admin"><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/content" element={<ProtectedRoute requireRole="admin"><AdminContent /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requireRole="student"><StudentSettings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
