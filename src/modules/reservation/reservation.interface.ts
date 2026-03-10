import { Document, Model, Types } from "mongoose";

export type TReservationStatus =
  | "pending"
  | "ready"
  | "fulfilled"
  | "cancelled"
  | "expired";

export interface IReservation extends Document {
  book: Types.ObjectId;
  member: Types.ObjectId;
  status: TReservationStatus;
  reservedAt: Date;
  notifiedAt?: Date;
  fulfilledAt?: Date;
  position: number;
}

export type ReservationModel = Model<IReservation>;
