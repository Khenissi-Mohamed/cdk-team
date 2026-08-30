import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "./config/db.js";
import Cours from "./models/Cours.js";
import Coach from "./models/Coach.js";
import Tarif from "./models/Tarif.js";

/**
 * Semaine et tarifs D'EXEMPLE, pour que le site soit visible avant la saisie
 * réelle. Volontairement séparé de `seed.js` : celui-ci crée le compte admin
 * et ne doit jamais inventer de contenu.
 *
 *   npm run seed:exemple            remplit
 *   npm run seed:exemple -- --vider vide ces trois collections
 *
 * Refuse d'écrire si des cours existent déjà : on n'écrase pas un planning
 * saisi à la main.
 */
async function seed() {
  await connectDb();
  const vider = process.argv.includes("--vider");

  if (vider) {
    await Promise.all([Cours.deleteMany({}), Coach.deleteMany({}), Tarif.deleteMany({})]);
    console.log("[exemple] cours, coachs et tarifs vidés.");
    await mongoose.disconnect();
    return;
  }

  if ((await Cours.countDocuments()) > 0) {
    console.log("[exemple] des cours existent déjà, rien n'a été touché.");
    await mongoose.disconnect();
    return;
  }

  const coachs = await Coach.insertMany([
    { nom: "Prénom Nom", role: "Fondateur · professeur principal", ceinture: "noire", degres: 2, ordre: 0 },
    { nom: "Prénom Nom", role: "Section enfants", ceinture: "marron", degres: 1, ordre: 1 },
    { nom: "Prénom Nom", role: "No-gi · préparation compétition", ceinture: "violette", degres: 0, ordre: 2 },
  ]);
  const [principal, enfants, nogi] = coachs;

  await Cours.insertMany([
    { jour: 1, heureDebut: "07:00", duree: 60, type: "nogi", libelle: "No-gi", niveau: "Tous niveaux", coach: nogi._id },
    { jour: 1, heureDebut: "17:30", duree: 60, type: "kids", libelle: "Kids 6-9", niveau: "6 à 9 ans", coach: enfants._id },
    { jour: 1, heureDebut: "19:30", duree: 90, type: "gi", libelle: "Gi", niveau: "Tous niveaux", coach: principal._id },

    { jour: 2, heureDebut: "12:15", duree: 60, type: "gi", libelle: "Gi", niveau: "Pause déjeuner", coach: principal._id },
    { jour: 2, heureDebut: "18:30", duree: 60, type: "kids", libelle: "Kids 10-14", niveau: "10 à 14 ans", coach: enfants._id },
    { jour: 2, heureDebut: "19:30", duree: 90, type: "gi", libelle: "Gi", niveau: "Tous niveaux", coach: principal._id },

    { jour: 3, heureDebut: "07:00", duree: 60, type: "nogi", libelle: "No-gi", niveau: "Tous niveaux", coach: nogi._id },
    { jour: 3, heureDebut: "17:30", duree: 60, type: "kids", libelle: "Kids 6-9", niveau: "6 à 9 ans", coach: enfants._id },
    { jour: 3, heureDebut: "19:30", duree: 90, type: "competition", libelle: "Compétition", niveau: "Sur sélection", coach: principal._id },

    { jour: 4, heureDebut: "12:15", duree: 60, type: "gi", libelle: "Gi", niveau: "Pause déjeuner", coach: principal._id },
    { jour: 4, heureDebut: "18:30", duree: 60, type: "kids", libelle: "Kids 10-14", niveau: "10 à 14 ans", coach: enfants._id },
    { jour: 4, heureDebut: "19:30", duree: 90, type: "gi", libelle: "Gi", niveau: "Tous niveaux", coach: principal._id },

    { jour: 5, heureDebut: "07:00", duree: 60, type: "nogi", libelle: "No-gi", niveau: "Tous niveaux", coach: nogi._id },
    { jour: 5, heureDebut: "17:30", duree: 60, type: "kids", libelle: "Kids 10-14", niveau: "10 à 14 ans", coach: enfants._id },
    { jour: 5, heureDebut: "19:30", duree: 90, type: "openmat", libelle: "Open mat", niveau: "Libre, encadré", coach: nogi._id },

    { jour: 6, heureDebut: "10:00", duree: 60, type: "kids", libelle: "Kids", niveau: "Toutes catégories", coach: enfants._id },
    { jour: 6, heureDebut: "11:00", duree: 120, type: "openmat", libelle: "Open mat", niveau: "Libre, encadré", coach: principal._id },
  ]);

  await Tarif.insertMany([
    { libelle: "Découverte", montant: 0, mention: "2 séances · kimono prêté", misEnAvant: true, ordre: 0 },
    { libelle: "Adulte", montant: 420, mention: "Saison complète · tous les créneaux", ordre: 1 },
    { libelle: "Enfant", montant: 290, mention: "Saison · 2 séances par semaine", ordre: 2 },
    { libelle: "Compétiteur", montant: 520, mention: "Saison · stages et déplacements", ordre: 3 },
  ]);

  console.log("[exemple] 3 coachs, 17 cours et 4 tarifs insérés — à remplacer depuis l'admin.");
  await mongoose.disconnect();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
