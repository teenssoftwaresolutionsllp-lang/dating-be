import "dotenv/config";
import { db } from "./db/index";
import { users, profiles } from "./db/schema";
import { eq } from "drizzle-orm";

async function testUpdate() {
  // 1. Get first active user
  const [user] = await db.select().from(users).where(eq(users.status, "active")).limit(1);
  console.log("Testing with user:", user?.id, user?.email);

  if (!user) {
    console.error("No active user found in DB!");
    return;
  }

  // 2. Perform local fetch to http://localhost:5000/api/v1/profile/update-profile
  try {
    const res = await fetch("http://localhost:5000/api/v1/profile/update-profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
      },
      body: JSON.stringify({
        name: "Test Bunny",
        gender: "male",
        religion: "Hindu",
        city: "Hyderabad",
        heightCm: 178,
      }),
    });

    const data = await res.json();
    console.log("Response status:", res.status);
    console.log("Response body:", JSON.stringify(data, null, 2));

    // 3. Verify in DB
    const [updatedProfile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    console.log("DB Updated Profile:", JSON.stringify(updatedProfile, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testUpdate().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
