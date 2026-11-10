import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./contexts/AuthContext";

import AdminLayout from "./components/layout/AdminLayout";
import CustomerLayout from "./components/layout/CustomerLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import VoucherManagementPage from "./pages/admin/VoucherManagementPage";
import FnbOrderQueuePage from "./pages/admin/FnbOrderQueuePage";
import StockCatalogPage from "./pages/admin/StockCatalogPage";
import GoodsReceiptPage from "./pages/admin/GoodsReceiptPage";
import InventoryReportPage from "./pages/admin/InventoryReportPage";
import RevenueReportPage from "./pages/admin/RevenueReportPage";
import AccessoryWastePage from "./pages/admin/AccessoryWastePage";
import StockCheckPage from "./pages/admin/StockCheckPage";

import CustomerHome from "./pages/customer/CustomerHome";
import CustomerBooking from "./pages/customer/CustomerBooking";
import CustomerTournaments from "./pages/customer/CustomerTournaments";
import CustomerPaymentPage from "./pages/customer/CustomerPaymentPage";
import CustomerRules from "./pages/customer/CustomerRules";
import CustomerNews from "./pages/customer/CustomerNews";
import CustomerFnB from "./pages/customer/CustomerFnB";
import CustomerPlaySession from "./pages/customer/CustomerPlaySession";
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
  EmployeesPage,
  NewsPage,
  SettingsPage,
} from "./pages/PlaceholderPage";

type UserRole = "admin" | "staff" | "cashier" | "warehouse" | "referee" | "customer";

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
      <Route path="/" element={<Navigate to="/customer" replace />} />

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

      <Route
        path="/forgot-password"
        element={
          user ? <Navigate to={getDefaultRedirectPath(user.role)} replace /> : <ForgotPasswordPage />
        }
      />

      {/* Management / POS / Staff routes */}
      <Route
        element={
          <ProtectedRoute roles={["admin", "staff"]}>
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
            <ProtectedRoute roles={["admin", "staff", "referee"]}>
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
            <ProtectedRoute roles={["admin", "staff", "warehouse"]}>
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

        {/* 2. Product and category management - integrated into /inventory?tab=catalog */}
        <Route
          path="/catalog-management"
          element={<Navigate to="/inventory?tab=catalog" replace />}
        />

        <Route
          path="/vouchers"
          element={
            <ProtectedRoute roles={["admin"]}>
              <VoucherManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fnb-orders"
          element={
            <ProtectedRoute roles={["admin", "staff", "cashier"]}>
              <FnbOrderQueuePage />
            </ProtectedRoute>
          }
        />

        {/* 3. Supplier management - integrated into /inventory?tab=suppliers */}
        <Route
          path="/suppliers"
          element={<Navigate to="/inventory?tab=suppliers" replace />}
        />

        {/* 4. Goods receipt */}
        <Route
          path="/goods-receipts"
          element={
            <ProtectedRoute roles={["admin", "warehouse"]}>
              <GoodsReceiptPage />
            </ProtectedRoute>
          }
        />

        {/* 5. Accessory waste (SCRUM-909) */}
        <Route
          path="/accessory-waste"
          element={
            <ProtectedRoute roles={["admin", "warehouse"]}>
              <AccessoryWastePage />
            </ProtectedRoute>
          }
        />

        {/* 6. Inventory report (SCRUM-985) */}
        <Route
          path="/inventory-report"
          element={
            <ProtectedRoute roles={["admin", "warehouse"]}>
              <InventoryReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/report"
          element={
            <ProtectedRoute roles={["admin", "warehouse"]}>
              <InventoryReportPage />
            </ProtectedRoute>
          }
        />

        {/* 7. Stock Check (SCRUM-1062) */}
        <Route
          path="/stock-checks"
          element={
            <ProtectedRoute roles={["admin", "warehouse"]}>
              <StockCheckPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <ProtectedRoute roles={["admin", "staff", "cashier"]}>
              <InvoicesPage />
            </ProtectedRoute>
          }
        />

        {/* Reconciliation tabs integrated into /invoices */}
        <Route
          path="/wallet-topups"
          element={<Navigate to="/invoices?tab=wallet" replace />}
        />

        <Route
          path="/tournament-fees"
          element={<Navigate to="/invoices?tab=tournament" replace />}
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={["admin"]}>
              <RevenueReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/revenue"
          element={<Navigate to="/reports?tab=revenue" replace />}
        />
        <Route
          path="/table-performance"
          element={<Navigate to="/reports?tab=performance" replace />}
        />
        <Route
          path="/reports/table-performance"
          element={<Navigate to="/reports?tab=performance" replace />}
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
        <Route
          path="booking"
          element={<CustomerBooking />}
        />
        <Route path="fnb" element={<CustomerFnB />} />
        <Route
          path="session"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerPlaySession />
            </ProtectedRoute>
          }
        />
        <Route path="tournaments" element={<CustomerTournaments />} />
        <Route
          path="tournaments/:id/payment"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerPaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="history"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="wallet"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerWallet />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerProfile />
            </ProtectedRoute>
          }
        />
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
