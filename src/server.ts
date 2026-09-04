import "dotenv/config";

import app from "./app";

const PORT: number = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(
    `🚀 Dating App Backend running on http://localhost:${PORT}`
  );
});
