import mongoose from "mongoose";

const entrySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    mood: {
      type: String,
      enum: [
        "happy",
        "peaceful",
        "grateful",
        "sad",
        "anxious",
        "excited",
        "reflective",
      ],
      default: "reflective",
    },
    entryDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Entry", entrySchema);
