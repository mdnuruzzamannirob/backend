import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { BookService } from "./book.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { uploadToCloudinary } from "../../utils/fileUpload";
import AppError from "../../errors/AppError";

const createBook = catchAsync(async (req: Request, res: Response) => {
  const book = await BookService.createBook(req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: "Book created successfully",
    data: book,
  });
});

const getAllBooks = catchAsync(async (req: Request, res: Response) => {
  const options = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sortBy: req.query.sortBy as string | undefined,
    sortOrder: req.query.sortOrder as "asc" | "desc" | undefined,
    search: req.query.search as string | undefined,
    category: req.query.category as string | undefined,
    language: req.query.language as string | undefined,
    available:
      req.query.available !== undefined
        ? req.query.available === "true"
        : undefined,
  };
  const result = await BookService.getAllBooks(options);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Books retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getBookById = catchAsync(async (req: Request, res: Response) => {
  const book = await BookService.getBookById(req.params.id as string);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Book retrieved successfully",
    data: book,
  });
});

const updateBook = catchAsync(async (req: Request, res: Response) => {
  const book = await BookService.updateBook(req.params.id as string, req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Book updated successfully",
    data: book,
  });
});

const deleteBook = catchAsync(async (req: Request, res: Response) => {
  await BookService.deleteBook(req.params.id as string);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Book deleted successfully",
    data: null,
  });
});

const uploadCoverImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("No image file provided", StatusCodes.BAD_REQUEST);
  }

  const { url } = await uploadToCloudinary(req.file.buffer, "book-covers");
  const book = await BookService.updateBook(req.params.id as string, {
    coverImage: url,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Cover image uploaded successfully",
    data: book,
  });
});

export const BookController = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  uploadCoverImage,
};
