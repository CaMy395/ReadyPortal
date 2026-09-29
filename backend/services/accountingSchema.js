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
    // The SQL file contains BEGIN/COMMIT. Keep it on one checked-out
    // connection and roll back failures before returning it to the pool.
    schemaReady = (async () => {
      const client = await pool.connect();
      try { await client.query(sql); }
      catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
      finally { client.release(); }
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
