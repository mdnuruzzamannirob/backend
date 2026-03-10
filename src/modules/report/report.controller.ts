import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ReportService } from "./report.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

const getDashboardStats = catchAsync(async (_req: Request, res: Response) => {
  const stats = await ReportService.getDashboardStats();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Dashboard stats retrieved successfully",
    data: stats,
  });
});

const getPopularBooks = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const data = await ReportService.getPopularBooks(limit);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Popular books retrieved successfully",
    data,
  });
});

const getMostActiveMembers = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const data = await ReportService.getMostActiveMembers(limit);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Most active members retrieved successfully",
    data,
  });
});

const getCategoryDistribution = catchAsync(
  async (_req: Request, res: Response) => {
    const data = await ReportService.getCategoryDistribution();
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Category distribution retrieved successfully",
      data,
    });
  },
);

const getBorrowTrends = catchAsync(async (req: Request, res: Response) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const data = await ReportService.getBorrowTrends(days);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Borrow trends retrieved successfully",
    data,
  });
});

const getRevenueReport = catchAsync(async (req: Request, res: Response) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const data = await ReportService.getRevenueReport(days);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Revenue report retrieved successfully",
    data,
  });
});

const getOverdueReport = catchAsync(async (_req: Request, res: Response) => {
  const data = await ReportService.getOverdueReport();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Overdue report retrieved successfully",
    data,
  });
});

export const ReportController = {
  getDashboardStats,
  getPopularBooks,
  getMostActiveMembers,
  getCategoryDistribution,
  getBorrowTrends,
  getRevenueReport,
  getOverdueReport,
};
