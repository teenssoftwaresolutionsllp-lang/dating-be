import { db } from "./db/index";
import { users } from "./db/schema/users";

const testDatabase = async (): Promise<void> => {
  try {
    const result = await db.select().from(users);

    console.log("✅ Database connected successfully!");
    console.log("Users:", result);

    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error);

    process.exit(1);
  }
};

testDatabase();
