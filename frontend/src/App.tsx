import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AdminLayout from "./components/layout/AdminLayout";
import CustomerLayout from "./components/layout/CustomerLayout";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CustomerHome from "./pages/customer/CustomerHome";
import {
  TablesPage,
  BookingPage,
  TournamentsPage,
  FnBPage,
  InventoryPage,
  InvoicesPage,
  ReportsPage,
  EmployeesPage,
  NewsPage,
  SettingsPage,
  CustomerBooking,
  CustomerTournaments,
  CustomerNews,
} from "./pages/PlaceholderPage";

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to={user.role === "customer" ? "/customer" : "/admin"} replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={user.role === "customer" ? "/customer" : "/admin"} replace /> : <RegisterPage />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin", "staff", "cashier", "warehouse", "referee"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="tournaments" element={<TournamentsPage />} />
        <Route path="fnb" element={<FnBPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Customer routes */}
      <Route path="/customer" element={<CustomerLayout />}>
        <Route index element={<CustomerHome />} />
        <Route path="booking" element={<CustomerBooking />} />
        <Route path="tournaments" element={<CustomerTournaments />} />
        <Route path="news" element={<CustomerNews />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={user?.role === "customer" ? "/customer" : "/admin"} replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
