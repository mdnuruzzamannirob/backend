import { Router } from "express";
import { BookController } from "./book.controller";
import { BookValidation } from "./book.validation";
import validateRequest from "../../middleware/validate";
import auth from "../../middleware/auth";
import { upload } from "../../middleware/upload";

const router = Router();

router
  .route("/")
  .get(auth("user", "admin"), BookController.getAllBooks)
  .post(
    auth("admin"),
    validateRequest(BookValidation.createBook),
    BookController.createBook,
  );

router
  .route("/:id")
  .get(
    auth("user", "admin"),
    validateRequest(BookValidation.getById),
    BookController.getBookById,
  )
  .patch(
    auth("admin"),
    validateRequest(BookValidation.updateBook),
    BookController.updateBook,
  )
  .delete(auth("admin"), BookController.deleteBook);

// Cover image upload
router.patch(
  "/:id/cover",
  auth("admin"),
  upload.single("coverImage"),
  BookController.uploadCoverImage,
);

export const BookRoutes = router;
