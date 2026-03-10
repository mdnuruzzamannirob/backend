import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ReservationService } from "./reservation.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

const createReservation = catchAsync(async (req: Request, res: Response) => {
  const reservation = await ReservationService.createReservation(
    req.body.book,
    req.user!.userId,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: "Book reserved successfully",
    data: reservation,
  });
});

const cancelReservation = catchAsync(async (req: Request, res: Response) => {
  const reservation = await ReservationService.cancelReservation(
    req.params.id as string,
    req.user!.userId,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Reservation cancelled",
    data: reservation,
  });
});

const getAllReservations = catchAsync(async (req: Request, res: Response) => {
  const options = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status as string | undefined,
    member: req.query.member as string | undefined,
    book: req.query.book as string | undefined,
  };
  const result = await ReservationService.getAllReservations(options);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Reservations retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getMyReservations = catchAsync(async (req: Request, res: Response) => {
  const options = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status as string | undefined,
  };
  const result = await ReservationService.getMyReservations(
    req.user!.userId,
    options,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Your reservations retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const ReservationController = {
  createReservation,
  cancelReservation,
  getAllReservations,
  getMyReservations,
};
