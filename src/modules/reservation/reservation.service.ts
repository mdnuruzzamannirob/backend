import { StatusCodes } from "http-status-codes";
import Reservation from "./reservation.model";
import Book from "../book/book.model";
import Member from "../member/member.model";
import AppError from "../../errors/AppError";
import { sendEmail, emailTemplates } from "../../utils/email";

interface ReservationQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  member?: string;
  book?: string;
}

const createReservation = async (bookId: string, userId: string) => {
  const member = await Member.findOne({ user: userId });
  if (!member) {
    throw new AppError("You are not a library member", StatusCodes.NOT_FOUND);
  }
  if (!member.isActive) {
    throw new AppError("Membership is inactive", StatusCodes.BAD_REQUEST);
  }

  const book = await Book.findById(bookId);
  if (!book) {
    throw new AppError("Book not found", StatusCodes.NOT_FOUND);
  }

  // Check if already reserved by this member
  const existing = await Reservation.findOne({
    book: bookId,
    member: member._id,
    status: { $in: ["pending", "ready"] },
  });
  if (existing) {
    throw new AppError(
      "You already have an active reservation for this book",
      StatusCodes.CONFLICT,
    );
  }

  // If book is available, no need to reserve
  if (book.availableCopies > 0) {
    throw new AppError(
      "This book is currently available — no reservation needed",
      StatusCodes.BAD_REQUEST,
    );
  }

  // Calculate queue position
  const pendingCount = await Reservation.countDocuments({
    book: bookId,
    status: "pending",
  });

  const reservation = await Reservation.create({
    book: bookId,
    member: member._id,
    position: pendingCount + 1,
  });

  return Reservation.findById(reservation._id)
    .populate("book", "title isbn")
    .populate("member", "membershipId")
    .lean();
};

const cancelReservation = async (reservationId: string, userId: string) => {
  const member = await Member.findOne({ user: userId });
  const reservation = await Reservation.findById(reservationId);

  if (!reservation) {
    throw new AppError("Reservation not found", StatusCodes.NOT_FOUND);
  }

  // Allow member to cancel own or admin to cancel any
  if (member && reservation.member.toString() !== member._id.toString()) {
    throw new AppError(
      "You can only cancel your own reservations",
      StatusCodes.FORBIDDEN,
    );
  }

  if (!["pending", "ready"].includes(reservation.status)) {
    throw new AppError(
      "Only pending or ready reservations can be cancelled",
      StatusCodes.BAD_REQUEST,
    );
  }

  // If status was "ready", restore book availability
  if (reservation.status === "ready") {
    await Book.findByIdAndUpdate(reservation.book, {
      $inc: { availableCopies: 1 },
    });
  }

  reservation.status = "cancelled";
  await reservation.save();

  return Reservation.findById(reservationId)
    .populate("book", "title isbn")
    .populate("member", "membershipId")
    .lean();
};

const getAllReservations = async (options: ReservationQueryOptions) => {
  const { page = 1, limit = 10, status, member, book } = options;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (member) filter.member = member;
  if (book) filter.book = book;

  const skip = (page - 1) * limit;

  const [reservations, total] = await Promise.all([
    Reservation.find(filter)
      .populate("book", "title isbn")
      .populate("member", "membershipId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Reservation.countDocuments(filter),
  ]);

  return {
    data: reservations,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getMyReservations = async (
  userId: string,
  options: ReservationQueryOptions,
) => {
  const member = await Member.findOne({ user: userId });
  if (!member) {
    throw new AppError("You are not a library member", StatusCodes.NOT_FOUND);
  }

  const { page = 1, limit = 10, status } = options;
  const filter: Record<string, unknown> = { member: member._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [reservations, total] = await Promise.all([
    Reservation.find(filter)
      .populate("book", "title isbn authors")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Reservation.countDocuments(filter),
  ]);

  return {
    data: reservations,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// Called when a book is returned — notify next in queue
const notifyNextInQueue = async (bookId: string) => {
  const nextReservation = await Reservation.findOne({
    book: bookId,
    status: "pending",
  })
    .sort({ position: 1 })
    .populate({
      path: "member",
      populate: { path: "user", select: "name email" },
    })
    .populate("book", "title");

  if (nextReservation) {
    nextReservation.status = "ready";
    nextReservation.notifiedAt = new Date();
    await nextReservation.save();

    // Reserve a copy
    await Book.findByIdAndUpdate(bookId, {
      $inc: { availableCopies: -1 },
    });

    // Send email notification
    const member = nextReservation.member as any;
    const user = member?.user;
    const book = nextReservation.book as any;

    if (user?.email && book?.title) {
      const template = emailTemplates.reservationReady(user.name, book.title);
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });
    }
  }
};

export const ReservationService = {
  createReservation,
  cancelReservation,
  getAllReservations,
  getMyReservations,
  notifyNextInQueue,
};
