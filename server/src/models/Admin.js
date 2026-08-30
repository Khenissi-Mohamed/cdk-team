import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    identifiant: { type: String, required: true, unique: true, trim: true, lowercase: true },
    motDePasseHash: { type: String, required: true },
    resetTokenHash: { type: String, default: null },
    resetTokenExpire: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);
