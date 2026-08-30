import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "./config/db.js";
import Admin from "./models/Admin.js";
import Setting from "./models/Setting.js";
import mongoose from "mongoose";

async function seed() {
  await connectDb();

  const identifiant = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const motDePasse = process.env.ADMIN_PASSWORD;

  if (!identifiant || !motDePasse) {
    throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env");
  }

  const existing = await Admin.findOne({ identifiant });
  if (existing) {
    console.log(`[seed] le compte admin "${identifiant}" existe déjà, rien à faire.`);
  } else {
    const motDePasseHash = await bcrypt.hash(motDePasse, 10);
    await Admin.create({ identifiant, motDePasseHash });
    console.log(`[seed] compte admin créé : ${identifiant}`);
  }

  const settings = await Setting.findOne();
  if (!settings) {
    await Setting.create({});
    console.log("[seed] document settings initialisé.");
  }

  await mongoose.disconnect();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
