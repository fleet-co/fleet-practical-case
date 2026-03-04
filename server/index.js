const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { createApp } = require("./app");

const PORT = process.env.PORT || 3001;
const dbPath = path.join(__dirname, "fleet.sqlite");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Could not open sqlite database", err);
  } else {
    console.log("Connected to sqlite database at", dbPath);
  }
});

const app = createApp(db);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
