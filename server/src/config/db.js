import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI manquant dans .env");

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  // Ne jamais journaliser l'URI : elle contient les identifiants MongoDB en
  // production et les logs Docker sont lisibles par les opérateurs du VPS.
  console.log("[db] connexion MongoDB établie.");
}
