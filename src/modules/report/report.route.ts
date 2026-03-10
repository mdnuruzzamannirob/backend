import { Router } from "express";
import { ReportController } from "./report.controller";
import auth from "../../middleware/auth";

const router = Router();

// All report routes are admin-only
router.get("/dashboard", auth("admin"), ReportController.getDashboardStats);
router.get("/popular-books", auth("admin"), ReportController.getPopularBooks);
router.get(
  "/active-members",
  auth("admin"),
  ReportController.getMostActiveMembers,
);
router.get(
  "/category-distribution",
  auth("admin"),
  ReportController.getCategoryDistribution,
);
router.get("/borrow-trends", auth("admin"), ReportController.getBorrowTrends);
router.get("/revenue", auth("admin"), ReportController.getRevenueReport);
router.get("/overdue", auth("admin"), ReportController.getOverdueReport);

export const ReportRoutes = router;
