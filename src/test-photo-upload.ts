import "dotenv/config";
import { db, pool } from "./db/index";
import { users, profilePhotos } from "./db/schema";
import { eq } from "drizzle-orm";
import { generateTokens } from "./utils/jwt";

async function testPhotoUpload() {
  const [user] = await db.select().from(users).where(eq(users.status, "active")).limit(1);
  if (!user) {
    console.error("No active user in DB");
    return;
  }
  console.log("Testing photo upload for user:", user.id, user.phone);

  const form = new FormData();
  const dummyJpg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0xff, 0xd9
  ]);

  const blob = new Blob([dummyJpg], { type: "image/jpeg" });
  form.append("photo", blob, "test_avatar.jpg");

  const res = await fetch("http://localhost:5000/api/v1/profile/photos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${generateTokens(user).accessToken}`,
    },
    body: form,
  });

  const body = await res.json();
  console.log("Upload Status:", res.status);
  console.log("Upload Body:", JSON.stringify(body, null, 2));

  const photosInDb = await db.select().from(profilePhotos).where(eq(profilePhotos.userId, user.id));
  console.log("Photos now in DB:", JSON.stringify(photosInDb, null, 2));
}

testPhotoUpload()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Test photo upload failed:", err);
    await pool.end();
    process.exit(1);
  });
