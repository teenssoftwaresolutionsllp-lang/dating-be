import { languages } from "../schema/languages.schema";
import { profileLanguages } from "../schema/profile-languages.schema";
import { db } from "../index";

const languageSeed = [
  { name: "English" },
  { name: "Hindi" },
  { name: "Telugu" },
  { name: "Tamil" },
  { name: "Kannada" },
  { name: "Malayalam" },
  { name: "Marathi" },
  { name: "Bengali" },
];

export const seedLanguages = async () => {
  await db.delete(profileLanguages);
  await db.delete(languages);

  await db.insert(languages).values(languageSeed);

  console.log(`Inserted ${languageSeed.length} language records.`);
};
