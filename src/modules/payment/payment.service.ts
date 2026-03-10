import { randomBytes } from "crypto";
import { StatusCodes } from "http-status-codes";
import stripe from "../../config/stripe";
import Payment from "./payment.model";
import Fine from "../fine/fine.model";
import Member from "../member/member.model";
import AppError from "../../errors/AppError";
import { sendEmail, emailTemplates } from "../../utils/email";

interface PaymentQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  member?: string;
  method?: string;
}

const generateTransactionId = (): string => {
  return `TXN-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
};

// Create a Stripe payment intent for a fine
const createStripePayment = async (fineId: string, userId: string) => {
  const member = await Member.findOne({ user: userId }).populate(
    "user",
    "name email",
  );
  if (!member) {
    throw new AppError("You are not a library member", StatusCodes.NOT_FOUND);
  }

  const fine = await Fine.findById(fineId);
  if (!fine) {
    throw new AppError("Fine not found", StatusCodes.NOT_FOUND);
  }
  if (fine.status === "paid") {
    throw new AppError("Fine already paid", StatusCodes.BAD_REQUEST);
  }
  if (fine.status === "waived") {
    throw new AppError("Fine was waived", StatusCodes.BAD_REQUEST);
  }
  if (fine.member.toString() !== member._id.toString()) {
    throw new AppError(
      "This fine does not belong to you",
      StatusCodes.FORBIDDEN,
    );
  }

  // Check for existing pending payment
  const existingPayment = await Payment.findOne({
    fine: fineId,
    status: "pending",
  });
  if (existingPayment?.stripeClientSecret) {
    return {
      clientSecret: existingPayment.stripeClientSecret,
      paymentId: existingPayment._id,
    };
  }

  // Create Stripe payment intent (amount in cents)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(fine.amount * 100),
    currency: "usd",
    metadata: {
      fineId: fineId,
      memberId: member._id.toString(),
      transactionId: generateTransactionId(),
    },
  });

  const payment = await Payment.create({
    fine: fineId,
    member: member._id,
    amount: fine.amount,
    method: "stripe",
    status: "pending",
    stripePaymentIntentId: paymentIntent.id,
    stripeClientSecret: paymentIntent.client_secret ?? undefined,
    transactionId:
      paymentIntent.metadata.transactionId ?? generateTransactionId(),
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentId: payment._id,
  };
};

// Record cash/card payment (admin action)
const recordManualPayment = async (fineId: string, method: "cash" | "card") => {
  const fine = await Fine.findById(fineId);
  if (!fine) {
    throw new AppError("Fine not found", StatusCodes.NOT_FOUND);
  }
  if (fine.status === "paid") {
    throw new AppError("Fine already paid", StatusCodes.BAD_REQUEST);
  }
  if (fine.status === "waived") {
    throw new AppError("Fine was waived", StatusCodes.BAD_REQUEST);
  }

  const payment = await Payment.create({
    fine: fineId,
    member: fine.member,
    amount: fine.amount,
    method,
    status: "completed",
    transactionId: generateTransactionId(),
    paidAt: new Date(),
  });

  // Mark fine as paid
  fine.status = "paid";
  fine.paidAt = new Date();
  await fine.save();

  // Send payment confirmation email
  const member = await Member.findById(fine.member).populate(
    "user",
    "name email",
  );
  if (member) {
    const user = member.user as any;
    if (user?.email) {
      const template = emailTemplates.paymentConfirmation(
        user.name,
        fine.amount,
        fineId,
      );
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });
    }
  }

  return Payment.findById(payment._id)
    .populate("fine")
    .populate("member", "membershipId")
    .lean();
};

// Handle Stripe webhook for payment confirmation
const handleStripeWebhook = async (paymentIntentId: string) => {
  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntentId,
  });

  if (!payment) {
    throw new AppError("Payment record not found", StatusCodes.NOT_FOUND);
  }

  payment.status = "completed";
  payment.paidAt = new Date();
  await payment.save();

  // Mark fine as paid
  await Fine.findByIdAndUpdate(payment.fine, {
    status: "paid",
    paidAt: new Date(),
  });

  // Send payment confirmation email
  const member = await Member.findById(payment.member).populate(
    "user",
    "name email",
  );
  if (member) {
    const user = member.user as any;
    if (user?.email) {
      const template = emailTemplates.paymentConfirmation(
        user.name,
        payment.amount,
        payment.fine.toString(),
      );
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });
    }
  }
};

const handleStripePaymentFailed = async (paymentIntentId: string) => {
  await Payment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId },
    { status: "failed" },
  );
};

const getAllPayments = async (options: PaymentQueryOptions) => {
  const { page = 1, limit = 10, status, member, method } = options;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (member) filter.member = member;
  if (method) filter.method = method;

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("fine", "amount reason")
      .populate("member", "membershipId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return {
    data: payments,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getMyPayments = async (userId: string, options: PaymentQueryOptions) => {
  const member = await Member.findOne({ user: userId });
  if (!member) {
    throw new AppError("You are not a library member", StatusCodes.NOT_FOUND);
  }

  const { page = 1, limit = 10, status } = options;
  const filter: Record<string, unknown> = { member: member._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("fine", "amount reason")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return {
    data: payments,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

export const PaymentService = {
  createStripePayment,
  recordManualPayment,
  handleStripeWebhook,
  handleStripePaymentFailed,
  getAllPayments,
  getMyPayments,
};
