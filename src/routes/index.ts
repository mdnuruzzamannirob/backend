import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.route";
import { CategoryRoutes } from "../modules/category/category.route";
import { BookRoutes } from "../modules/book/book.route";
import { MemberRoutes } from "../modules/member/member.route";
import { BorrowRoutes } from "../modules/borrow/borrow.route";
import { FineRoutes } from "../modules/fine/fine.route";
import { ReservationRoutes } from "../modules/reservation/reservation.route";
import { PaymentRoutes } from "../modules/payment/payment.route";
import { ReportRoutes } from "../modules/report/report.route";

const router = Router();

const moduleRoutes = [
  { path: "/auth", route: AuthRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/categories", route: CategoryRoutes },
  { path: "/books", route: BookRoutes },
  { path: "/members", route: MemberRoutes },
  { path: "/borrows", route: BorrowRoutes },
  { path: "/fines", route: FineRoutes },
  { path: "/reservations", route: ReservationRoutes },
  { path: "/payments", route: PaymentRoutes },
  { path: "/reports", route: ReportRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
