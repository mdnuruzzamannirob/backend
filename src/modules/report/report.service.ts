import Book from "../book/book.model";
import BorrowRecord from "../borrow/borrow.model";
import Member from "../member/member.model";
import Fine from "../fine/fine.model";
import Payment from "../payment/payment.model";
import User from "../user/user.model";
import Category from "../category/category.model";
import Reservation from "../reservation/reservation.model";

const getDashboardStats = async () => {
  const [
    totalBooks,
    totalMembers,
    activeMembers,
    totalBorrows,
    activeBorrows,
    overdueCount,
    totalFines,
    pendingFines,
    totalUsers,
    totalCategories,
    totalReservations,
    pendingReservations,
  ] = await Promise.all([
    Book.countDocuments(),
    Member.countDocuments(),
    Member.countDocuments({ isActive: true }),
    BorrowRecord.countDocuments(),
    BorrowRecord.countDocuments({ status: { $in: ["borrowed", "overdue"] } }),
    BorrowRecord.countDocuments({ status: "overdue" }),
    Fine.countDocuments(),
    Fine.countDocuments({ status: "pending" }),
    User.countDocuments(),
    Category.countDocuments(),
    Reservation.countDocuments(),
    Reservation.countDocuments({ status: "pending" }),
  ]);

  // Revenue stats
  const revenueResult = await Payment.aggregate([
    { $match: { status: "completed" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const pendingFineAmount = await Fine.aggregate([
    { $match: { status: "pending" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return {
    books: { total: totalBooks },
    members: { total: totalMembers, active: activeMembers },
    borrows: {
      total: totalBorrows,
      active: activeBorrows,
      overdue: overdueCount,
    },
    fines: {
      total: totalFines,
      pending: pendingFines,
      pendingAmount: pendingFineAmount[0]?.total || 0,
    },
    revenue: {
      total: revenueResult[0]?.totalRevenue || 0,
      transactions: revenueResult[0]?.count || 0,
    },
    users: { total: totalUsers },
    categories: { total: totalCategories },
    reservations: { total: totalReservations, pending: pendingReservations },
  };
};

const getPopularBooks = async (limit: number = 10) => {
  const result = await BorrowRecord.aggregate([
    { $group: { _id: "$book", borrowCount: { $sum: 1 } } },
    { $sort: { borrowCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "books",
        localField: "_id",
        foreignField: "_id",
        as: "book",
      },
    },
    { $unwind: "$book" },
    {
      $project: {
        _id: 0,
        bookId: "$_id",
        title: "$book.title",
        isbn: "$book.isbn",
        authors: "$book.authors",
        borrowCount: 1,
      },
    },
  ]);

  return result;
};

const getMostActiveMembers = async (limit: number = 10) => {
  const result = await BorrowRecord.aggregate([
    { $group: { _id: "$member", borrowCount: { $sum: 1 } } },
    { $sort: { borrowCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "members",
        localField: "_id",
        foreignField: "_id",
        as: "member",
      },
    },
    { $unwind: "$member" },
    {
      $lookup: {
        from: "users",
        localField: "member.user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        memberId: "$_id",
        membershipId: "$member.membershipId",
        name: "$user.name",
        email: "$user.email",
        borrowCount: 1,
      },
    },
  ]);

  return result;
};

const getCategoryDistribution = async () => {
  const result = await Book.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryInfo",
      },
    },
    { $unwind: "$categoryInfo" },
    {
      $group: {
        _id: "$category",
        categoryName: { $first: "$categoryInfo.name" },
        bookCount: { $sum: 1 },
        totalCopies: { $sum: "$totalCopies" },
        availableCopies: { $sum: "$availableCopies" },
      },
    },
    { $sort: { bookCount: -1 } },
  ]);

  return result;
};

const getBorrowTrends = async (days: number = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await BorrowRecord.aggregate([
    { $match: { borrowDate: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$borrowDate" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        borrowCount: "$count",
      },
    },
  ]);

  return result;
};

const getRevenueReport = async (days: number = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await Payment.aggregate([
    { $match: { status: "completed", paidAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
        },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        revenue: "$totalAmount",
        transactions: "$count",
      },
    },
  ]);

  return result;
};

const getOverdueReport = async () => {
  const records = await BorrowRecord.find({
    status: "overdue",
  })
    .populate("book", "title isbn")
    .populate({
      path: "member",
      populate: { path: "user", select: "name email" },
    })
    .sort({ dueDate: 1 })
    .lean();

  return records.map((record) => {
    const now = new Date();
    const overdueDays = Math.ceil(
      (now.getTime() - record.dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      ...record,
      overdueDays,
      estimatedFine: overdueDays * 1,
    };
  });
};

export const ReportService = {
  getDashboardStats,
  getPopularBooks,
  getMostActiveMembers,
  getCategoryDistribution,
  getBorrowTrends,
  getRevenueReport,
  getOverdueReport,
};
