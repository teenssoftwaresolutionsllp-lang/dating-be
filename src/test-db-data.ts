import "dotenv/config";
import { db } from "./db/index";
import { users, profiles, datingPreferences, education, profilePhotos } from "./db/schema";
import { eq } from "drizzle-orm";

async function inspectDb() {
  const allUsers = await db.select().from(users).limit(10);
  console.log("=== USERS IN DB ===");
  console.log(JSON.stringify(allUsers.map(u => ({ id: u.id, email: u.email, phone: u.phone, role: u.role, status: u.status })), null, 2));

  const allProfiles = await db.select().from(profiles).limit(10);
  console.log("=== PROFILES IN DB ===");
  console.log(JSON.stringify(allProfiles.map(p => ({ id: p.id, userId: p.userId, name: p.name, religion: p.religion, city: p.city, gender: p.gender })), null, 2));
}

inspectDb().then(() => process.exit(0)).catch(err => {
  console.error("DB inspection failed:", err);
  process.exit(1);
});
