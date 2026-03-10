import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import { PaymentService } from "./payment.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { config } from "../../config";
import logger from "../../utils/logger";

const createStripePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.createStripePayment(
    req.body.fineId,
    req.user!.userId,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Payment intent created",
    data: result,
  });
});

const recordManualPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.recordManualPayment(
    req.body.fineId,
    req.body.method,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Payment recorded successfully",
    data: result,
  });
});

const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(config.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    logger.error("Stripe webhook signature verification failed", {
      error: err.message,
    });
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await PaymentService.handleStripeWebhook(paymentIntent.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await PaymentService.handleStripePaymentFailed(paymentIntent.id);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook processing error", { error });
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const options = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status as string | undefined,
    member: req.query.member as string | undefined,
    method: req.query.method as string | undefined,
  };
  const result = await PaymentService.getAllPayments(options);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Payments retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const options = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status as string | undefined,
  };
  const result = await PaymentService.getMyPayments(req.user!.userId, options);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Your payments retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const PaymentController = {
  createStripePayment,
  recordManualPayment,
  stripeWebhook,
  getAllPayments,
  getMyPayments,
};
