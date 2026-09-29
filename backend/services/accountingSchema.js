import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let schemaReady;

export function ensureAccountingSchema() {
  if (!schemaReady) {
    const sql = fs.readFileSync(
      path.join(__dirname, "..", "sql", "plaid_accounting.sql"),
      "utf8"
    );
    schemaReady = pool.query(sql).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
