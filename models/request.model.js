import mongoose, { Types } from "mongoose";

const requestSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "rejected"],
    },
    sender: {
      type: Types.ObjectId,
      ref: "User",
      require: true,
    },
    receiver: {
      type: Types.ObjectId,
      ref: "User",
      require: true,
    },
  },
  { timestamps: true }
);

export const Request = mongoose.model("Request", requestSchema);
