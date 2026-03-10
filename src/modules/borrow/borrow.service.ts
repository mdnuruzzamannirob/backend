import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import BorrowRecord from "./borrow.model";
import Book from "../book/book.model";
import Member from "../member/member.model";
import AppError from "../../errors/AppError";
import { FineService } from "../fine/fine.service";
import { ReservationService } from "../reservation/reservation.service";

interface BorrowQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  member?: string;
  book?: string;
}

const FINE_PER_DAY = 1; // $1 per day overdue

const borrowBook = async (payload: any, issuedBy: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate book
    const book = await Book.findById(payload.book).session(session);
    if (!book) throw new AppError("Book not found", StatusCodes.NOT_FOUND);
    if (book.availableCopies <= 0) {
      throw new AppError("No copies available", StatusCodes.BAD_REQUEST);
    }

    // Validate member
    const member = await Member.findById(payload.member).session(session);
    if (!member) throw new AppError("Member not found", StatusCodes.NOT_FOUND);
    if (!member.isActive) {
      throw new AppError("Membership is inactive", StatusCodes.BAD_REQUEST);
    }
    if (member.membershipExpiry < new Date()) {
      throw new AppError("Membership has expired", StatusCodes.BAD_REQUEST);
    }
    if (member.currentBorrowed >= member.maxBooksAllowed) {
      throw new AppError(
        `Borrow limit reached (${member.maxBooksAllowed})`,
        StatusCodes.BAD_REQUEST,
      );
    }

    // Check for duplicate active borrow
    const activeBorrow = await BorrowRecord.findOne({
      book: payload.book,
      member: payload.member,
      status: { $in: ["borrowed", "overdue"] },
    }).session(session);
    if (activeBorrow) {
      throw new AppError(
        "Member already has this book borrowed",
        StatusCodes.CONFLICT,
      );
    }

    const dueDate = new Date(payload.dueDate);
    if (dueDate <= new Date()) {
      throw new AppError(
        "Due date must be in the future",
        StatusCodes.BAD_REQUEST,
      );
    }

    // Create record
    const [record] = await BorrowRecord.create(
      [
        {
          book: payload.book,
          member: payload.member,
          issuedBy,
          borrowDate: new Date(),
          dueDate,
          notes: payload.notes,
        },
      ],
      { session },
    );

    // Update counters
    await Book.findByIdAndUpdate(
      payload.book,
      { $inc: { availableCopies: -1 } },
      { session },
    );
    await Member.findByIdAndUpdate(
      payload.member,
      { $inc: { currentBorrowed: 1 } },
      { session },
    );

    await session.commitTransaction();

    return BorrowRecord.findById(record._id)
      .populate("book")
      .populate("member")
      .populate("issuedBy", "-password")
      .lean();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const returnBook = async (
  recordId: string,
  returnedBy: string,
  notes?: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const record = await BorrowRecord.findById(recordId).session(session);
    if (!record) {
      throw new AppError("Borrow record not found", StatusCodes.NOT_FOUND);
    }
    if (record.status === "returned") {
      throw new AppError("Book already returned", StatusCodes.BAD_REQUEST);
    }
    if (record.status === "lost") {
      throw new AppError(
        "Book marked as lost — cannot return",
        StatusCodes.BAD_REQUEST,
      );
    }

    const now = new Date();
    record.returnDate = now;
    record.returnedTo = new mongoose.Types.ObjectId(returnedBy);
    record.status = "returned";
    if (notes) record.notes = notes;
    await record.save({ session });

    // Restore book copy & decrement member count
    await Book.findByIdAndUpdate(
      record.book,
      { $inc: { availableCopies: 1 } },
      { session },
    );
    await Member.findByIdAndUpdate(
      record.member,
      { $inc: { currentBorrowed: -1 } },
      { session },
    );

    // Create fine if overdue
    if (record.dueDate < now) {
      const overdueDays = Math.ceil(
        (now.getTime() - record.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      await FineService.createFine(
        {
          member: record.member.toString(),
          borrowRecord: record._id.toString(),
          amount: overdueDays * FINE_PER_DAY,
          reason: `Overdue by ${overdueDays} day(s)`,
        },
        session,
      );
    }

    await session.commitTransaction();

    // Notify next person in reservation queue
    await ReservationService.notifyNextInQueue(record.book.toString());

    return BorrowRecord.findById(recordId)
      .populate("book")
      .populate("member")
      .populate("issuedBy", "-password")
      .populate("returnedTo", "-password")
      .lean();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const renewBook = async (recordId: string, newDueDate: string) => {
  const record = await BorrowRecord.findById(recordId);
  if (!record) {
    throw new AppError("Borrow record not found", StatusCodes.NOT_FOUND);
  }
  if (record.status !== "borrowed" && record.status !== "overdue") {
    throw new AppError(
      "Only active borrows can be renewed",
      StatusCodes.BAD_REQUEST,
    );
  }
  if (record.renewCount >= record.maxRenewals) {
    throw new AppError("Maximum renewals reached", StatusCodes.BAD_REQUEST);
  }

  const due = new Date(newDueDate);
  if (due <= new Date()) {
    throw new AppError(
      "New due date must be in the future",
      StatusCodes.BAD_REQUEST,
    );
  }

  record.dueDate = due;
  record.renewCount += 1;
  record.status = "borrowed";
  await record.save();

  return BorrowRecord.findById(recordId)
    .populate("book")
    .populate("member")
    .lean();
};

const markLost = async (recordId: string) => {
  const record = await BorrowRecord.findById(recordId);
  if (!record) {
    throw new AppError("Borrow record not found", StatusCodes.NOT_FOUND);
  }
  if (record.status === "returned") {
    throw new AppError(
      "Returned books cannot be marked lost",
      StatusCodes.BAD_REQUEST,
    );
  }
  if (record.status === "lost") {
    throw new AppError("Already marked as lost", StatusCodes.BAD_REQUEST);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    record.status = "lost";
    await record.save({ session });

    await Member.findByIdAndUpdate(
      record.member,
      { $inc: { currentBorrowed: -1 } },
      { session },
    );

    // Lost book fine (replacement cost, flat $50)
    await FineService.createFine(
      {
        member: record.member.toString(),
        borrowRecord: record._id.toString(),
        amount: 50,
        reason: "Book reported lost — replacement fee",
      },
      session,
    );

    await session.commitTransaction();
    return BorrowRecord.findById(recordId)
      .populate("book")
      .populate("member")
      .lean();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getAllBorrowRecords = async (options: BorrowQueryOptions) => {
  const { page = 1, limit = 10, status, member, book } = options;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (member) filter.member = member;
  if (book) filter.book = book;

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    BorrowRecord.find(filter)
      .populate("book", "title isbn")
      .populate("member", "membershipId")
      .populate("issuedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BorrowRecord.countDocuments(filter),
  ]);

  return {
    data: records,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getBorrowRecordById = async (id: string) => {
  const record = await BorrowRecord.findById(id)
    .populate("book")
    .populate("member")
    .populate("issuedBy", "-password")
    .populate("returnedTo", "-password")
    .lean();
  if (!record) {
    throw new AppError("Borrow record not found", StatusCodes.NOT_FOUND);
  }
  return record;
};

const getMyBorrowHistory = async (
  userId: string,
  options: BorrowQueryOptions,
) => {
  const { page = 1, limit = 10, status } = options;

  // Find the member by user id
  const member = await Member.findOne({ user: userId });
  if (!member) {
    throw new AppError("You are not a library member", StatusCodes.NOT_FOUND);
  }

  const filter: Record<string, unknown> = { member: member._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    BorrowRecord.find(filter)
      .populate("book", "title isbn authors")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BorrowRecord.countDocuments(filter),
  ]);

  return {
    data: records,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getOverdueRecords = async () => {
  const now = new Date();
  const records = await BorrowRecord.find({
    status: "borrowed",
    dueDate: { $lt: now },
  })
    .populate("book", "title isbn")
    .populate("member", "membershipId")
    .lean();

  // Also mark them overdue in DB
  await BorrowRecord.updateMany(
    { status: "borrowed", dueDate: { $lt: now } },
    { $set: { status: "overdue" } },
  );

  return records;
};

export const BorrowService = {
  borrowBook,
  returnBook,
  renewBook,
  markLost,
  getAllBorrowRecords,
  getBorrowRecordById,
  getMyBorrowHistory,
  getOverdueRecords,
};
