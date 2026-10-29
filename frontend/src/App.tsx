import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./contexts/AuthContext";

import AdminLayout from "./components/layout/AdminLayout";
import CustomerLayout from "./components/layout/CustomerLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import WalletTopupsPage from "./pages/admin/WalletTopupsPage";
import TournamentFeesPage from "./pages/admin/TournamentFeesPage";

// Three new management pages
import CatalogManagementPage from "./pages/admin/CatalogManagementPage";
import StockCatalogPage from "./pages/admin/StockCatalogPage";
import SupplierManagementPage from "./pages/admin/SupplierManagementPage";

import CustomerHome from "./pages/customer/CustomerHome";
import CustomerBooking from "./pages/customer/CustomerBooking";
import CustomerTournaments from "./pages/customer/CustomerTournaments";
import CustomerRules from "./pages/customer/CustomerRules";
import CustomerNews from "./pages/customer/CustomerNews";
import CustomerFnB from "./pages/customer/CustomerFnB";
import CustomerHistory from "./pages/customer/CustomerHistory";
import CustomerWallet from "./pages/customer/CustomerWallet";
import CustomerProfile from "./pages/customer/CustomerProfile";

import PosTableFloorPage from "./pages/pos/PosTableFloorPage";

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
} from "./pages/PlaceholderPage";

type UserRole = "admin" | "staff" | "cashier" | "customer";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role as UserRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const getDefaultRedirectPath = (role?: string): string => {
  if (role === "customer") return "/customer";
  if (role === "admin") return "/dashboard";
  if (role === "cashier") return "/wallet-topups";
  if (role === "warehouse") return "/stock-catalog";
  if (role === "referee") return "/tournaments";

  return "/pos";
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={user ? <Navigate to={getDefaultRedirectPath(user.role)} replace /> : <LoginPage />}
      />

      <Route
        path="/register"
        element={
          user ? <Navigate to={getDefaultRedirectPath(user.role)} replace /> : <RegisterPage />
        }
      />

      {/* Management / POS / Staff routes */}
      <Route
        element={
          <ProtectedRoute roles={["admin", "staff", "cashier"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pos"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <PosTableFloorPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tables"
          element={
            <ProtectedRoute roles={["admin"]}>
              <TablesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <BookingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tournaments"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <TournamentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fnb"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <FnBPage />
            </ProtectedRoute>
          }
        />

        {/* Existing inventory page */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        {/* 1. Product catalog and stock overview */}
        <Route
          path="/stock-catalog"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <StockCatalogPage />
            </ProtectedRoute>
          }
        />

        {/* 2. Product and category management */}
        <Route
          path="/catalog-management"
          element={
            <ProtectedRoute roles={["admin"]}>
              <CatalogManagementPage />
            </ProtectedRoute>
          }
        />

        {/* 3. Supplier management */}
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute roles={["admin"]}>
              <SupplierManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <InvoicesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/wallet-topups"
          element={
            <ProtectedRoute roles={["admin", "staff", "cashier"]}>
              <WalletTopupsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tournament-fees"
          element={
            <ProtectedRoute roles={["admin", "staff", "cashier"]}>
              <TournamentFeesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute roles={["admin"]}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/news"
          element={
            <ProtectedRoute roles={["admin"]}>
              <NewsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={["admin"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Legacy /admin redirects */}
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin/pos" element={<Navigate to="/pos" replace />} />
      <Route path="/admin/tables" element={<Navigate to="/tables" replace />} />
      <Route path="/admin/booking" element={<Navigate to="/booking" replace />} />
      <Route path="/admin/tournaments" element={<Navigate to="/tournaments" replace />} />
      <Route path="/admin/fnb" element={<Navigate to="/fnb" replace />} />
      <Route path="/admin/inventory" element={<Navigate to="/inventory" replace />} />
      <Route path="/admin/invoices" element={<Navigate to="/invoices" replace />} />
      <Route path="/admin/reports" element={<Navigate to="/reports" replace />} />
      <Route path="/admin/employees" element={<Navigate to="/employees" replace />} />
      <Route path="/admin/news" element={<Navigate to="/news" replace />} />
      <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />

      {/* Customer routes */}
      <Route path="/customer" element={<CustomerLayout />}>
        <Route index element={<CustomerHome />} />
        <Route path="booking" element={<CustomerBooking />} />
        <Route path="fnb" element={<CustomerFnB />} />
        <Route path="tournaments" element={<CustomerTournaments />} />
        <Route path="history" element={<CustomerHistory />} />
        <Route path="wallet" element={<CustomerWallet />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="rules" element={<CustomerRules />} />
        <Route path="news" element={<CustomerNews />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={getDefaultRedirectPath(user?.role)} replace />} />
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
