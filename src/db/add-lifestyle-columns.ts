import { pool } from "./index";

async function addColumns() {
  const client = await pool.connect();
  try {
    console.log("Adding food_preference, drinking, smoking, vibes columns if not exists...");
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS food_preference VARCHAR(50),
      ADD COLUMN IF NOT EXISTS drinking VARCHAR(50),
      ADD COLUMN IF NOT EXISTS smoking VARCHAR(50),
      ADD COLUMN IF NOT EXISTS vibes JSONB;
    `);

    // Populate defaults for profiles that have null
    await client.query(`
      UPDATE profiles 
      SET 
        food_preference = COALESCE(food_preference, 'Foodie / Veg'),
        drinking = COALESCE(drinking, 'Socially'),
        smoking = COALESCE(smoking, 'No'),
        vibes = COALESCE(vibes, '["Movies", "Travel", "Food", "Fitness", "Music"]'::jsonb)
      WHERE food_preference IS NULL OR drinking IS NULL OR smoking IS NULL OR vibes IS NULL;
    `);

    console.log("✅ Columns added and defaults populated successfully!");
  } catch (err) {
    console.error("❌ Error adding columns:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

addColumns();
