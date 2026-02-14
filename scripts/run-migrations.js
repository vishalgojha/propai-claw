const fs = require("fs");
const path = require("path");
const { getDb } = require("../src/db");

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "..", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("No migrations directory found.");
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const db = await getDb();
  for (const fileName of files) {
    const fullPath = path.join(migrationsDir, fileName);
    const sql = fs.readFileSync(fullPath, "utf8");
    if (!sql.trim()) continue;
    await db.exec(sql);
    console.log(`Applied migration: ${fileName}`);
  }
}

if (require.main === module) {
  runMigrations().catch((error) => {
    console.error("Migration failed:", error.message);
    process.exit(1);
  });
}

module.exports = {
  runMigrations
};
