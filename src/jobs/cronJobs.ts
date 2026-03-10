import cron from "node-cron";
import BorrowRecord from "../modules/borrow/borrow.model";
import Fine from "../modules/fine/fine.model";
import Member from "../modules/member/member.model";
import Reservation from "../modules/reservation/reservation.model";
import Book from "../modules/book/book.model";
import { sendEmail, emailTemplates } from "../utils/email";
import logger from "../utils/logger";

const FINE_PER_DAY = 1; // $1 per day

// Run every day at midnight — mark overdue & create fines
const markOverdueAndCreateFines = () => {
  cron.schedule("0 0 * * *", async () => {
    logger.info("CRON: Checking for overdue books...");
    try {
      const now = new Date();

      // Find borrowed records past due date
      const overdueRecords = await BorrowRecord.find({
        status: "borrowed",
        dueDate: { $lt: now },
      }).populate({
        path: "member",
        populate: { path: "user", select: "name email" },
      });

      for (const record of overdueRecords) {
        // Mark as overdue
        record.status = "overdue";
        await record.save();

        // Check if fine already exists for this record today
        const existingFine = await Fine.findOne({
          borrowRecord: record._id,
          status: "pending",
        });

        if (!existingFine) {
          const overdueDays = Math.ceil(
            (now.getTime() - record.dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          await Fine.create({
            member: record.member._id,
            borrowRecord: record._id,
            amount: overdueDays * FINE_PER_DAY,
            reason: `Overdue by ${overdueDays} day(s)`,
          });
        }
      }

      logger.info(`CRON: Marked ${overdueRecords.length} record(s) as overdue`);
    } catch (error) {
      logger.error("CRON: Error in overdue check", { error });
    }
  });
};

// Run every day at 9 AM — send overdue reminders
const sendOverdueReminders = () => {
  cron.schedule("0 9 * * *", async () => {
    logger.info("CRON: Sending overdue reminders...");
    try {
      const overdueRecords = await BorrowRecord.find({
        status: "overdue",
      })
        .populate("book", "title")
        .populate({
          path: "member",
          populate: { path: "user", select: "name email" },
        });

      for (const record of overdueRecords) {
        const member = record.member as any;
        const user = member?.user;
        const book = record.book as any;

        if (user?.email && book?.title) {
          const template = emailTemplates.overdueReminder(
            user.name,
            book.title,
            record.dueDate.toLocaleDateString(),
          );
          await sendEmail({
            to: user.email,
            subject: template.subject,
            html: template.html,
          });
        }
      }

      logger.info(`CRON: Sent ${overdueRecords.length} overdue reminder(s)`);
    } catch (error) {
      logger.error("CRON: Error sending overdue reminders", { error });
    }
  });
};

// Run every day at 8 AM — check membership expiry (7 days before)
const checkMembershipExpiry = () => {
  cron.schedule("0 8 * * *", async () => {
    logger.info("CRON: Checking membership expiry...");
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiringMembers = await Member.find({
        isActive: true,
        isDeleted: false,
        membershipExpiry: { $gte: today, $lte: sevenDaysFromNow },
      }).populate("user", "name email");

      for (const member of expiringMembers) {
        const user = member.user as any;
        if (user?.email) {
          const template = emailTemplates.membershipExpiry(
            user.name,
            member.membershipExpiry.toLocaleDateString(),
          );
          await sendEmail({
            to: user.email,
            subject: template.subject,
            html: template.html,
          });
        }
      }

      logger.info(
        `CRON: Notified ${expiringMembers.length} member(s) about expiry`,
      );
    } catch (error) {
      logger.error("CRON: Error checking membership expiry", { error });
    }
  });
};

// Run every hour — expire old reservations (48 hours)
const expireReservations = () => {
  cron.schedule("0 * * * *", async () => {
    logger.info("CRON: Checking expired reservations...");
    try {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const expiredReservations = await Reservation.find({
        status: "ready",
        notifiedAt: { $lt: cutoff },
      });

      for (const reservation of expiredReservations) {
        reservation.status = "expired";
        await reservation.save();

        // Restore book availability
        await Book.findByIdAndUpdate(reservation.book, {
          $inc: { availableCopies: 1 },
        });
      }

      // Also expire pending reservations that are too old (30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await Reservation.updateMany(
        { status: "pending", createdAt: { $lt: thirtyDaysAgo } },
        { status: "expired" },
      );

      logger.info(`CRON: Expired ${expiredReservations.length} reservation(s)`);
    } catch (error) {
      logger.error("CRON: Error expiring reservations", { error });
    }
  });
};

// Run every day at 2 AM — deactivate expired memberships
const deactivateExpiredMemberships = () => {
  cron.schedule("0 2 * * *", async () => {
    logger.info("CRON: Deactivating expired memberships...");
    try {
      const now = new Date();

      const result = await Member.updateMany(
        { isActive: true, membershipExpiry: { $lt: now } },
        { isActive: false },
      );

      logger.info(
        `CRON: Deactivated ${result.modifiedCount} expired membership(s)`,
      );
    } catch (error) {
      logger.error("CRON: Error deactivating memberships", { error });
    }
  });
};

// Run every day at 3 AM — update overdue fine amounts daily
const updateOverdueFines = () => {
  cron.schedule("0 3 * * *", async () => {
    logger.info("CRON: Updating overdue fine amounts...");
    try {
      const now = new Date();

      const overdueRecords = await BorrowRecord.find({
        status: "overdue",
      });

      for (const record of overdueRecords) {
        const overdueDays = Math.ceil(
          (now.getTime() - record.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        await Fine.findOneAndUpdate(
          { borrowRecord: record._id, status: "pending" },
          {
            amount: overdueDays * FINE_PER_DAY,
            reason: `Overdue by ${overdueDays} day(s)`,
          },
        );
      }

      logger.info(
        `CRON: Updated fines for ${overdueRecords.length} overdue record(s)`,
      );
    } catch (error) {
      logger.error("CRON: Error updating overdue fines", { error });
    }
  });
};

export const initCronJobs = () => {
  markOverdueAndCreateFines();
  sendOverdueReminders();
  checkMembershipExpiry();
  expireReservations();
  deactivateExpiredMemberships();
  updateOverdueFines();
  logger.info("All cron jobs initialized");
};
