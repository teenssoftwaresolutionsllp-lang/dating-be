import "dotenv/config";

import app from "./app";

const PORT: number = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Dating App Backend running on http://localhost:${PORT}`);
  console.log(`📡 Network accessible on http://0.0.0.0:${PORT}`);
});
