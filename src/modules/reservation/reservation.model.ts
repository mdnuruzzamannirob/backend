import { Schema, model } from "mongoose";
import { IReservation, ReservationModel } from "./reservation.interface";

const reservationSchema = new Schema<IReservation, ReservationModel>(
  {
    book: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    member: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    status: {
      type: String,
      enum: ["pending", "ready", "fulfilled", "cancelled", "expired"],
      default: "pending",
    },
    reservedAt: { type: Date, default: Date.now },
    notifiedAt: { type: Date },
    fulfilledAt: { type: Date },
    position: { type: Number, default: 0 },
  },
  { timestamps: true },
);

reservationSchema.index({ book: 1, status: 1 });
reservationSchema.index({ member: 1, status: 1 });

const Reservation = model<IReservation, ReservationModel>(
  "Reservation",
  reservationSchema,
);

export default Reservation;
