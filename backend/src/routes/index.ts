import { Router } from "express";

// Import router từ từng thư mục feature
import { authRoutes } from "./auth";
import { rbacProtectedRoutes } from "./user";
import { tablePublicRoutes, tableProtectedRoutes } from "./table";
import { bookingPublicRoutes, bookingProtectedRoutes } from "./booking";
import { productPublicRoutes, productProtectedRoutes } from "./product";
import { tournamentPublicRoutes, tournamentProtectedRoutes } from "./tournament";
import { pricingProtectedRoutes } from "./pricing";
import { walletProtectedRoutes } from "./wallet";
import { notificationProtectedRoutes } from "./notification";

// ============================================================================
// PUBLIC ROUTES: Các endpoint công khai (không yêu cầu token xác thực)
// ============================================================================
export const publicRouter = Router();

// 1. Feature: Auth
publicRouter.use("/auth", authRoutes);

// 2. Feature: Table & Floor (Public)
publicRouter.use(tablePublicRoutes);

// 3. Feature: Booking (Public)
publicRouter.use(bookingPublicRoutes);

// 4. Feature: Product & F&B (Public)
publicRouter.use(productPublicRoutes);

// 5. Feature: Tournament (Public)
publicRouter.use(tournamentPublicRoutes);

// ============================================================================
// PROTECTED ROUTES: Các endpoint yêu cầu JWT token (được gác authMiddleware tại app.ts)
// ============================================================================
export const protectedRouter = Router();

// 1. Feature: User & Role (RBAC)
protectedRouter.use(rbacProtectedRoutes);

// 2. Feature: Table & POS Session
protectedRouter.use(tableProtectedRoutes);

// 3. Feature: Booking
protectedRouter.use(bookingProtectedRoutes);

// 4. Feature: Pricing Tier
protectedRouter.use(pricingProtectedRoutes);

// 5. Feature: Product & Inventory Management
protectedRouter.use(productProtectedRoutes);

// 6. Feature: Tournament Management
protectedRouter.use(tournamentProtectedRoutes);

// 7. Feature: Wallet
protectedRouter.use(walletProtectedRoutes);

// 8. Feature: Notification
protectedRouter.use(notificationProtectedRoutes);

// ponytail: auth profile is on publicRouter but needs auth — kept on authRouter at /auth/profile
