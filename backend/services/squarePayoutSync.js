import pool from "../db.js";
import { ensureAccountingSchema } from "./accountingSchema.js";

const configuredSquareEnvironment = process.env.SQUARE_ENVIRONMENT ||
  (process.env.NODE_ENV === "production" ? "production" : "sandbox");
const squareBaseUrl = String(configuredSquareEnvironment).toLowerCase() === "production"
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

async function squareGet(pathname) {
  if (!process.env.SQUARE_ACCESS_TOKEN) throw new Error("SQUARE_ACCESS_TOKEN is not configured");
  const response = await fetch(`${squareBaseUrl}${pathname}`, {
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.errors?.[0]?.detail || `Square request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function paymentIdForEntry(entry) {
  const detailKey = Object.keys(entry || {}).find((key) => key.startsWith("type_") && key.endsWith("_details"));
  return detailKey ? entry[detailKey]?.payment_id || null : null;
}

async function listAllPayoutEntries(payoutId) {
  const entries = [];
  let cursor;
  do {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const data = await squareGet(`/v2/payouts/${encodeURIComponent(payoutId)}/payout-entries${query}`);
    entries.push(...(data.payout_entries || []));
    cursor = data.cursor;
  } while (cursor);
  return entries;
}

export async function syncSquarePayout(payoutOrId) {
  await ensureAccountingSchema();
  const payout = typeof payoutOrId === "string"
    ? (await squareGet(`/v2/payouts/${encodeURIComponent(payoutOrId)}`)).payout
    : payoutOrId;
  if (!payout?.id) return null;

  const entries = await listAllPayoutEntries(payout.id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO square_payouts
        (payout_id,status,location_id,amount,arrival_date,created_at_square,updated_at_square,raw_json,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (payout_id) DO UPDATE SET status=EXCLUDED.status,
         location_id=EXCLUDED.location_id,amount=EXCLUDED.amount,
         arrival_date=EXCLUDED.arrival_date,created_at_square=EXCLUDED.created_at_square,
         updated_at_square=EXCLUDED.updated_at_square,raw_json=EXCLUDED.raw_json,updated_at=NOW()`,
      [
        payout.id,
        payout.status || null,
        payout.location_id || null,
        Number(payout.amount_money?.amount || 0) / 100,
        payout.arrival_date || null,
        payout.created_at || null,
        payout.updated_at || null,
        JSON.stringify(payout),
      ]
    );

    for (const entry of entries) {
      const paymentId = paymentIdForEntry(entry);
      await client.query(
        `INSERT INTO square_payout_entries
          (entry_id,payout_id,entry_type,payment_id,gross_amount,fee_amount,net_amount,effective_at,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (entry_id) DO UPDATE SET payout_id=EXCLUDED.payout_id,
           entry_type=EXCLUDED.entry_type,payment_id=EXCLUDED.payment_id,
           gross_amount=EXCLUDED.gross_amount,fee_amount=EXCLUDED.fee_amount,
           net_amount=EXCLUDED.net_amount,effective_at=EXCLUDED.effective_at,raw_json=EXCLUDED.raw_json`,
        [
          entry.id,
          payout.id,
          entry.type || null,
          paymentId,
          Number(entry.gross_amount_money?.amount || 0) / 100,
          Number(entry.fee_amount_money?.amount || 0) / 100,
          Number(entry.net_amount_money?.amount || 0) / 100,
          entry.effective_at || null,
          JSON.stringify(entry),
        ]
      );
      if (paymentId) {
        await client.query(
          `UPDATE profits SET square_payout_id=$2
           WHERE processor='Square' AND processor_txn_id=$1`,
          [paymentId, payout.id]
        );
      }
    }
    await client.query("COMMIT");
    return { payoutId: payout.id, entries: entries.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function syncSquarePayouts({ days = 90 } = {}) {
  await ensureAccountingSchema();
  const beginTime = new Date(Date.now() - days * 86400000).toISOString();
  const payouts = [];
  let cursor;
  do {
    const params = new URLSearchParams({
      status: "PAID",
      begin_time: beginTime,
      sort_order: "DESC",
      limit: "100",
    });
    if (cursor) params.set("cursor", cursor);
    const data = await squareGet(`/v2/payouts?${params.toString()}`);
    payouts.push(...(data.payouts || []));
    cursor = data.cursor;
  } while (cursor);

  const results = [];
  for (const payout of payouts) results.push(await syncSquarePayout(payout));
  return results;
}
