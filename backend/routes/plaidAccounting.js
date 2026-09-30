import express from "express";
import { getPlaidClient, createLinkTokenHandler } from "../services/plaidClient.js";
import pool from "../db.js";
import { ensureAccountingSchema } from "../services/accountingSchema.js";
import { syncSquarePayouts } from "../services/squarePayoutSync.js";

import { DEPOSIT_KINDS, validateDepositRule, decideDeposit, suggestDeposit, depositPosting } from '../services/depositRules.js';

const router = express.Router();

function ensureSchema() {
  return ensureAccountingSchema();
}

const CATEGORY_MAP = {
  INCOME: "Other",
  FOOD_AND_DRINK: "Business",
  GENERAL_MERCHANDISE: "Office Supplies",
  GENERAL_SERVICES: "Business",
  GOVERNMENT_AND_NON_PROFIT: "Taxes / Fees",
  MEDICAL: "Other",
  PERSONAL_CARE: "Other",
  RENT_AND_UTILITIES: "Utilities",
  TRANSPORTATION: "Auto",
  TRAVEL: "Travel",
};

const NON_EXPENSE_PREFIXES = ["INCOME", "TRANSFER", "LOAN_PAYMENTS"];

function getPlaidCategory(transaction) {
  return transaction.personal_finance_category?.primary ||
    transaction.category?.[0] ||
    "GENERAL_SERVICES";
}

function mapCategory(transaction) {
  const primary = getPlaidCategory(transaction);
  if (primary === "RENT_AND_UTILITIES") {
    const detail = transaction.personal_finance_category?.detailed || "";
    return /RENT/i.test(detail) ? "Rent" : "Utilities";
  }
  return CATEGORY_MAP[primary] || "Other";
}

function shouldAutoPost(transaction) {
  const primary = getPlaidCategory(transaction);
  return (
    !transaction.pending &&
    Number(transaction.amount) > 0 &&
    !NON_EXPENSE_PREFIXES.some((prefix) => primary.startsWith(prefix))
  );
}

function isIncomeDeposit(transaction) {
  return !transaction.pending && Number.isFinite(Number(transaction.amount)) && Number(transaction.amount) < 0;
}

async function upsertAccounts(itemId, accessToken, client = pool) {
  const response = await getPlaidClient().accountsGet({ access_token: accessToken });
  for (const account of response.data.accounts || []) {
    await client.query(
      `INSERT INTO plaid_accounts
        (account_id, item_id, name, official_name, mask, type, subtype,
         current_balance, available_balance, iso_currency_code,persistent_account_id,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT (account_id) DO UPDATE SET
         name=EXCLUDED.name, official_name=EXCLUDED.official_name,
         mask=EXCLUDED.mask, type=EXCLUDED.type, subtype=EXCLUDED.subtype,
         current_balance=EXCLUDED.current_balance,
         available_balance=EXCLUDED.available_balance,
         iso_currency_code=EXCLUDED.iso_currency_code,
         persistent_account_id=EXCLUDED.persistent_account_id,updated_at=NOW()`,
      [
        account.account_id,
        itemId,
        account.name || null,
        account.official_name || null,
        account.mask || null,
        account.type || null,
        account.subtype || null,
        account.balances?.current ?? null,
        account.balances?.available ?? null,
        account.balances?.iso_currency_code || null,
        account.persistent_account_id || null,
      ]
    );
  }
}

async function removePostedExpense(client, transactionId) {
  await client.query(
    `DELETE FROM profits WHERE processor='Plaid' AND processor_txn_id=$1`,
    [`plaid:${transactionId}`]
  );
  await client.query(
    `DELETE FROM expenses WHERE plaid_transaction_id=$1`,
    [transactionId]
  );
  await client.query('UPDATE plaid_transactions SET refunded_expense_id=NULL,imported_expense_id=NULL WHERE transaction_id=$1', [transactionId]);
}

async function unlinkBankReconciliation(client, transactionId) {
  const payout = await client.query(
    `UPDATE square_payouts SET bank_transaction_id=NULL,bank_reconciled_at=NULL,updated_at=NOW()
     WHERE bank_transaction_id=$1 RETURNING payout_id`,
    [transactionId]
  );
  for (const row of payout.rows) {
    await client.query(
      `UPDATE profits SET bank_verified_at=NULL WHERE square_payout_id=$1`,
      [row.payout_id]
    );
  }
  await client.query(
    `UPDATE profits SET bank_transaction_id=NULL,bank_reconciled_at=NULL
     WHERE bank_transaction_id=$1`,
    [transactionId]
  );
  await client.query(
    `UPDATE plaid_transactions SET linked_profit_id=NULL,linked_square_payout_id=NULL
     WHERE transaction_id=$1`,
    [transactionId]
  );
}

async function reconcileSquarePayout(client, transaction) {
  const candidates = await client.query(
    `SELECT payout_id FROM square_payouts
     WHERE status='PAID' AND amount > 0 AND bank_transaction_id IS NULL
       AND ABS(amount - $1::numeric) < 0.01
       AND COALESCE(arrival_date,created_at_square::date)
         BETWEEN $2::date - 7 AND $2::date + 7`,
    [Math.abs(Number(transaction.amount)), transaction.date]
  );
  if (candidates.rowCount !== 1) return candidates.rowCount > 1 ? 'ambiguous' : false;
  if (!/\bSQUARE\b|\bSQ\s*\*/i.test(`${transaction.name || ''} ${transaction.merchant_name || ''}`)) return 'ambiguous';

  const payoutId = candidates.rows[0].payout_id;
  await client.query(
    `UPDATE square_payouts SET bank_transaction_id=$2,bank_reconciled_at=NOW(),updated_at=NOW()
     WHERE payout_id=$1`,
    [payoutId, transaction.transaction_id]
  );
  await client.query(
    `UPDATE profits SET bank_verified_at=NOW() WHERE square_payout_id=$1`,
    [payoutId]
  );
  await client.query(
    `UPDATE plaid_transactions SET review_status='square_payout_reconciled',
     linked_square_payout_id=$2,linked_profit_id=NULL WHERE transaction_id=$1`,
    [transaction.transaction_id, payoutId]
  );
  return true;
}

async function findReconciliationCandidates(client, transaction, days = 3) {
  return client.query(
    `SELECT id,description,amount,type,paid_at,created_at,processor,processor_txn_id
     FROM profits
     WHERE amount > 0
       AND LOWER(COALESCE(type,'')) NOT LIKE '%expense%'
       AND COALESCE(processor,'') <> 'Plaid'
       AND square_payout_id IS NULL
       AND (bank_transaction_id IS NULL OR bank_transaction_id=$1)
       AND ABS(amount - $2::numeric) < 0.01
       AND COALESCE(paid_at::date,created_at::date)
         BETWEEN $3::date - $4::integer AND $3::date + $4::integer
     ORDER BY ABS(COALESCE(paid_at::date,created_at::date) - $3::date),id DESC`,
    [transaction.transaction_id, Math.abs(Number(transaction.amount)), transaction.date, days]
  );
}

async function reconcileDeposit(client, transaction) {
  await unlinkBankReconciliation(client, transaction.transaction_id);
  const squareMatch = await reconcileSquarePayout(client, transaction);
  if (squareMatch === true) return 'matched';
  const candidates = await findReconciliationCandidates(client, transaction, 7);
  const canAutoMatch = getPlaidCategory(transaction).startsWith('INCOME') && !suggestDeposit(transaction);
  if (squareMatch === 'ambiguous' || candidates.rowCount !== 1 || !canAutoMatch) {
    await client.query(
      `UPDATE plaid_transactions SET review_status='deposit_unmatched',linked_profit_id=NULL
       WHERE transaction_id=$1`,
      [transaction.transaction_id]
    );
    return squareMatch === 'ambiguous' || candidates.rowCount > 0 ? "ambiguous" : "unmatched";
  }

  const profitId = candidates.rows[0].id;
  await client.query(
    `UPDATE profits SET bank_transaction_id=$2,bank_reconciled_at=NOW() WHERE id=$1`,
    [profitId, transaction.transaction_id]
  );
  await client.query(
    `UPDATE plaid_transactions SET review_status='bank_reconciled',linked_profit_id=$2
     WHERE transaction_id=$1`,
    [transaction.transaction_id, profitId]
  );
  return "matched";
}

export async function postDeposit(client, transaction, kind, source, ruleId = null) {
  await removePostedExpense(client, transaction.transaction_id);
  await unlinkBankReconciliation(client, transaction.transaction_id);
  await client.query('UPDATE plaid_transactions SET refunded_expense_id=NULL WHERE transaction_id=$1', [transaction.transaction_id]);
  const posting = depositPosting(kind, transaction.amount);
  let refundedExpenseId = null;
  if (kind === 'refund' && transaction.merchant_name) {
    const candidates = await client.query(`SELECT e.id,e.category FROM expenses e
      WHERE LOWER(TRIM(e.vendor))=LOWER(TRIM($1)) AND ABS(e.amount-$2::numeric)<0.01
        AND e.expense_date BETWEEN $3::date-60 AND $3::date
        AND NOT EXISTS (SELECT 1 FROM plaid_transactions t WHERE t.refunded_expense_id=e.id)
      ORDER BY e.expense_date DESC LIMIT 2`,
    [transaction.merchant_name, Math.abs(Number(transaction.amount)), transaction.date]);
    if (candidates.rowCount === 1) {
      refundedExpenseId = candidates.rows[0].id;
      posting.category = candidates.rows[0].category;
    }
  }
  if (posting) {
    await client.query(`INSERT INTO profits(category,description,amount,type,paid_at,processor,processor_txn_id)
      VALUES ($1,$2,$3,$4,$5,'Plaid',$6)
      ON CONFLICT (processor_txn_id) WHERE processor_txn_id IS NOT NULL
      DO UPDATE SET category=EXCLUDED.category,description=EXCLUDED.description,
        amount=EXCLUDED.amount,type=EXCLUDED.type,paid_at=EXCLUDED.paid_at`,
    [posting.category,transaction.merchant_name || transaction.name,posting.amount,posting.type,transaction.date,`plaid:${transaction.transaction_id}`]);
  }
  await client.query(`UPDATE plaid_transactions SET review_status='deposit_classified',
    deposit_kind=$2,deposit_source=$3,deposit_rule_id=$4,refunded_expense_id=$5,
    app_category=$6,imported_expense_id=NULL,review_note=$7,updated_at=NOW() WHERE transaction_id=$1`,
  [transaction.transaction_id,kind,source,ruleId,refundedExpenseId,posting?.category || kind,
    kind === 'refund' && !refundedExpenseId ? 'Refund recorded as an expense reduction; original expense not matched.' : null]);
}

export async function processDeposit(client, transaction, saved) {
  // Explicit reviews are not silently overwritten by subsequent syncs.
  if (saved.deposit_source === 'manual' && DEPOSIT_KINDS.includes(saved.deposit_kind)) {
    await postDeposit(client, transaction, saved.deposit_kind, 'manual');
    return;
  }
  const match = await reconcileDeposit(client, transaction);
  if (match === 'matched') {
    await client.query(`UPDATE plaid_transactions SET deposit_kind=NULL,deposit_source=NULL,
      deposit_rule_id=NULL,refunded_expense_id=NULL,review_note=NULL WHERE transaction_id=$1`, [transaction.transaction_id]);
    return;
  }
  if (match === 'ambiguous') {
    await client.query("UPDATE plaid_transactions SET deposit_kind=NULL,deposit_source=NULL,deposit_rule_id=NULL,refunded_expense_id=NULL,review_note='Multiple existing payments could match. Review before categorizing.' WHERE transaction_id=$1", [transaction.transaction_id]);
    return;
  }
  const rules = await client.query('SELECT * FROM bank_deposit_rules WHERE enabled=TRUE ORDER BY id');
  let decision = decideDeposit(transaction, rules.rows);
  // Processor payouts can arrive before their individual payments. Never
  // automatically manufacture income for an unmatched Square settlement.
  if (/\bSQUARE\b|\bSQ\s*\*/i.test(`${transaction.name || ''} ${transaction.merchant_name || ''}`)) {
    decision = { kind: null, reason: 'Possible Square payout. Wait for payment matching or review it.' };
  }
  if (decision.kind) {
    await postDeposit(client, transaction, decision.kind, 'rule', decision.ruleId);
  } else {
    await client.query(`UPDATE plaid_transactions SET review_status='deposit_unmatched',review_note=$2,
      deposit_kind=NULL,deposit_source=NULL,deposit_rule_id=NULL,refunded_expense_id=NULL WHERE transaction_id=$1`,
    [transaction.transaction_id, decision.reason]);
  }
}

async function retryUnmatchedDeposits(itemId) {
  const pending = await pool.query(
    `SELECT raw_json FROM plaid_transactions
     WHERE item_id=$1 AND review_status IN ('deposit_unmatched','auto_ignored')
       AND amount < 0 AND pending=FALSE AND removed=FALSE`,
    [itemId]
  );
  if (!pending.rowCount) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query('SELECT pg_advisory_xact_lock(721946)');
    for (const row of pending.rows) {
      const locked = await client.query('SELECT * FROM plaid_transactions WHERE transaction_id=$1 FOR UPDATE', [row.raw_json.transaction_id]);
      if (['deposit_unmatched','auto_ignored'].includes(locked.rows[0]?.review_status) && !locked.rows[0].removed && !locked.rows[0].pending) {
        await processDeposit(client, locked.rows[0].raw_json, locked.rows[0]);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function postExpense(client, transaction, category) {
  const description = transaction.merchant_name || transaction.name || "Bank transaction";
  const account = await client.query(
    `SELECT name, mask FROM plaid_accounts WHERE account_id=$1`,
    [transaction.account_id]
  );
  const paymentMethod = account.rows[0]
    ? `${account.rows[0].name}${account.rows[0].mask ? ` ••••${account.rows[0].mask}` : ""}`
    : "Plaid";

  const expense = await client.query(
    `INSERT INTO expenses
      (expense_date, category, amount, description, vendor, payment_method,
       plaid_transaction_id, plaid_account_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL
     DO UPDATE SET expense_date=EXCLUDED.expense_date, category=EXCLUDED.category,
       amount=EXCLUDED.amount, description=EXCLUDED.description,
       vendor=EXCLUDED.vendor, payment_method=EXCLUDED.payment_method,
       plaid_account_id=EXCLUDED.plaid_account_id
     RETURNING id`,
    [
      transaction.date,
      category,
      Math.abs(Number(transaction.amount)),
      description,
      transaction.merchant_name || null,
      paymentMethod,
      transaction.transaction_id,
      transaction.account_id,
    ]
  );

  await client.query(
    `INSERT INTO profits
      (category, description, amount, type, paid_at, processor, processor_txn_id)
     VALUES ($1,$2,$3,'expense',$4,'Plaid',$5)
     ON CONFLICT (processor_txn_id) WHERE processor_txn_id IS NOT NULL
     DO UPDATE SET category=EXCLUDED.category, description=EXCLUDED.description,
       amount=EXCLUDED.amount, paid_at=EXCLUDED.paid_at`,
    [
      category,
      description,
      -Math.abs(Number(transaction.amount)),
      transaction.date,
      `plaid:${transaction.transaction_id}`,
    ]
  );
  return expense.rows[0]?.id || null;
}

export async function saveTransaction(client, itemId, transaction) {
  const primary = getPlaidCategory(transaction);
  const detail = transaction.personal_finance_category?.detailed || null;
  const category = mapCategory(transaction);
  const autoPost = shouldAutoPost(transaction);

  const saved = await client.query(
    `INSERT INTO plaid_transactions
      (transaction_id,item_id,account_id,transaction_date,authorized_date,name,
       merchant_name,amount,pending,removed,payment_channel,plaid_category,
       plaid_category_detail,app_category,review_status,raw_json,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE,$10,$11,$12,$13,$14,$15,NOW())
     ON CONFLICT (transaction_id) DO UPDATE SET
       account_id=EXCLUDED.account_id, transaction_date=EXCLUDED.transaction_date,
       authorized_date=EXCLUDED.authorized_date, name=EXCLUDED.name,
       merchant_name=EXCLUDED.merchant_name, amount=EXCLUDED.amount,
       pending=EXCLUDED.pending, removed=FALSE,
       payment_channel=EXCLUDED.payment_channel,
       plaid_category=EXCLUDED.plaid_category,
       plaid_category_detail=EXCLUDED.plaid_category_detail,
       app_category=COALESCE(plaid_transactions.app_category, EXCLUDED.app_category),
       raw_json=EXCLUDED.raw_json, updated_at=NOW()
     RETURNING review_status,app_category,deposit_kind,deposit_source`,
    [
      transaction.transaction_id,
      itemId,
      transaction.account_id,
      transaction.date,
      transaction.authorized_date || null,
      transaction.name || "Bank transaction",
      transaction.merchant_name || null,
      Number(transaction.amount),
      Boolean(transaction.pending),
      transaction.payment_channel || null,
      primary,
      detail,
      category,
      autoPost ? "approved" : "auto_ignored",
      JSON.stringify(transaction),
    ]
  );

  const savedStatus = saved.rows[0]?.review_status;
  const savedCategory = saved.rows[0]?.deposit_kind ? category : saved.rows[0]?.app_category || category;
  if (isIncomeDeposit(transaction)) {
    await removePostedExpense(client, transaction.transaction_id);
    if (savedStatus === "ignored") {
      await unlinkBankReconciliation(client, transaction.transaction_id);
      return;
    }
    await processDeposit(client, transaction, saved.rows[0]);
    return;
  }
  await unlinkBankReconciliation(client, transaction.transaction_id);
  if (saved.rows[0]?.deposit_kind && Number(transaction.amount) >= 0) {
    await removePostedExpense(client, transaction.transaction_id);
    await client.query(`UPDATE plaid_transactions SET deposit_kind=NULL,deposit_source=NULL,
      deposit_rule_id=NULL,review_note=NULL WHERE transaction_id=$1`, [transaction.transaction_id]);
  }
  if (autoPost && savedStatus !== "ignored") {
    const expenseId = await postExpense(client, transaction, savedCategory);
    await client.query(
      `UPDATE plaid_transactions SET imported_expense_id=$2, review_status='approved'
       WHERE transaction_id=$1`,
      [transaction.transaction_id, expenseId]
    );
  } else if (savedStatus === "ignored") {
    await removePostedExpense(client, transaction.transaction_id);
  } else {
    await removePostedExpense(client, transaction.transaction_id);
    await client.query(
      `UPDATE plaid_transactions SET imported_expense_id=NULL,
       review_status=CASE WHEN $2::numeric <= 0 OR $3 THEN 'auto_ignored' ELSE 'pending' END
       WHERE transaction_id=$1`,
      [transaction.transaction_id, Number(transaction.amount), Boolean(transaction.pending)]
    );
  }
}

const activeItemSyncs = new Map();

async function syncPlaidItemInternal(itemId) {
  await ensureSchema();
  const itemResult = await pool.query(
    `SELECT access_token, cursor FROM plaid_items WHERE item_id=$1`,
    [itemId]
  );
  if (!itemResult.rowCount) throw new Error("Plaid Item not found");

  const { access_token: accessToken } = itemResult.rows[0];
  let cursor = itemResult.rows[0].cursor || undefined;
  let hasMore = true;
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  await upsertAccounts(itemId, accessToken);

  while (hasMore) {
    const response = await getPlaidClient().transactionsSync({
      access_token: accessToken,
      cursor,
      count: 500,
    });
    const page = response.data;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query('SELECT pg_advisory_xact_lock(721946)');
      for (const transaction of [...(page.added || []), ...(page.modified || [])]) {
        await saveTransaction(client, itemId, transaction);
      }
      for (const removed of page.removed || []) {
        await removePostedExpense(client, removed.transaction_id);
        await unlinkBankReconciliation(client, removed.transaction_id);
        await client.query(
          `UPDATE plaid_transactions SET removed=TRUE, imported_expense_id=NULL,
           review_status='ignored', refunded_expense_id=NULL, updated_at=NOW() WHERE transaction_id=$1`,
          [removed.transaction_id]
        );
      }
      cursor = page.next_cursor;
      await client.query(
        `UPDATE plaid_items SET cursor=$2,last_synced_at=NOW(),status='active',
         error_code=NULL,updated_at=NOW() WHERE item_id=$1`,
        [itemId, cursor]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    addedCount += page.added?.length || 0;
    modifiedCount += page.modified?.length || 0;
    removedCount += page.removed?.length || 0;
    hasMore = Boolean(page.has_more);
  }
  await retryUnmatchedDeposits(itemId);
  return { itemId, addedCount, modifiedCount, removedCount };
}

export function syncPlaidItem(itemId) {
  if (activeItemSyncs.has(itemId)) return activeItemSyncs.get(itemId);
  const sync = syncPlaidItemInternal(itemId).finally(() => activeItemSyncs.delete(itemId));
  activeItemSyncs.set(itemId, sync);
  return sync;
}

export async function syncAllPlaidItems() {
  await ensureSchema();
  try {
    await syncSquarePayouts({ days: 14 });
  } catch (error) {
    console.error("Square payout sync failed before Plaid sync:", error.message || error);
  }
  const items = await pool.query(`SELECT item_id FROM plaid_items WHERE status='active'`);
  const results = [];
  for (const { item_id: itemId } of items.rows) {
    try {
      results.push(await syncPlaidItem(itemId));
    } catch (error) {
      await pool.query(
        `UPDATE plaid_items SET status='error',error_code=$2,updated_at=NOW()
         WHERE item_id=$1`,
        [itemId, error.response?.data?.error_code || error.code || "SYNC_ERROR"]
      );
      console.error(`Plaid sync failed for ${itemId}:`, error.response?.data || error);
    }
  }
  return results;
}

router.post("/create-link-token", createLinkTokenHandler());

router.post("/exchange-token", async (req, res) => {
  try {
    await ensureSchema();
    const exchanged = await getPlaidClient().itemPublicTokenExchange({
      public_token: req.body?.public_token,
    });
    const { access_token: accessToken, item_id: itemId } = exchanged.data;
    const metadata = req.body?.metadata || {};
    const accountResponse = await getPlaidClient().accountsGet({ access_token: accessToken });
    const persistentIds = (accountResponse.data.accounts || [])
      .map((account) => account.persistent_account_id)
      .filter(Boolean);
    if (persistentIds.length) {
      const duplicate = await pool.query(
        `SELECT institution_name FROM plaid_accounts a
         JOIN plaid_items i ON i.item_id=a.item_id
         WHERE a.persistent_account_id=ANY($1::text[]) LIMIT 1`,
        [persistentIds]
      );
      if (duplicate.rowCount) {
        await getPlaidClient().itemRemove({ access_token: accessToken }).catch(() => {});
        return res.status(409).json({
          error: `${duplicate.rows[0].institution_name || "This bank account"} is already connected.`,
        });
      }
    }
    await pool.query(
      `INSERT INTO plaid_items
        (item_id,access_token,institution_id,institution_name,status,updated_at)
       VALUES ($1,$2,$3,$4,'active',NOW())
       ON CONFLICT (item_id) DO UPDATE SET access_token=EXCLUDED.access_token,
         institution_id=EXCLUDED.institution_id,
         institution_name=EXCLUDED.institution_name,status='active',updated_at=NOW()`,
      [
        itemId,
        accessToken,
        metadata.institution?.institution_id || null,
        metadata.institution?.name || null,
      ]
    );
    const sync = await syncPlaidItem(itemId);
    res.json({ itemId, sync });
  } catch (error) {
    console.error("Plaid exchange error:", error.response?.data || error);
    res.status(500).json({ error: "Failed to connect and sync account" });
  }
});

router.get("/items", async (_req, res) => {
  try {
    await ensureSchema();
    const result = await pool.query(
      `SELECT i.item_id,i.institution_name,i.status,i.error_code,i.last_synced_at,
       COALESCE(json_agg(json_build_object('account_id',a.account_id,'name',a.name,
       'mask',a.mask,'type',a.type,'subtype',a.subtype,'current_balance',a.current_balance))
       FILTER (WHERE a.account_id IS NOT NULL),'[]') AS accounts
       FROM plaid_items i LEFT JOIN plaid_accounts a ON a.item_id=i.item_id
       GROUP BY i.item_id ORDER BY i.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Plaid items error:", error);
    res.status(500).json({ error: "Failed to load connected accounts" });
  }
});

router.get('/deposit-rules', async (_req, res) => {
  try {
    await ensureSchema();
    const result = await pool.query(`SELECT r.*,a.name AS account_name,a.mask FROM bank_deposit_rules r
      LEFT JOIN plaid_accounts a ON a.account_id=r.account_id ORDER BY r.id DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Deposit rules error:', error);
    res.status(500).json({ error: 'Could not load deposit rules.' });
  }
});

router.patch('/deposit-rules/:id', async (req, res) => {
  try {
    await ensureSchema();
    if (typeof req.body?.enabled !== 'boolean' || !/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Choose a valid rule and enabled setting.' });
    const result = await pool.query('UPDATE bank_deposit_rules SET enabled=$2 WHERE id=$1 RETURNING id,enabled', [req.params.id, req.body.enabled]);
    if (!result.rowCount) return res.status(404).json({ error: 'Rule not found.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Deposit rule update error:', error);
    res.status(500).json({ error: 'Could not update deposit rule.' });
  }
});

router.get("/accounting-transactions", async (req, res) => {
  try {
    await ensureSchema();
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 100)));
    const result = await pool.query(
      `SELECT t.transaction_id,t.transaction_date,t.name,t.merchant_name,t.amount,
       t.pending,t.removed,t.plaid_category,t.app_category,t.review_status,
       t.account_id,t.deposit_kind,t.deposit_source,t.review_note,t.refunded_expense_id,
       t.imported_expense_id,t.linked_profit_id,t.linked_square_payout_id,
       a.name AS account_name,a.mask,
       p.description AS linked_profit_description,p.amount AS linked_profit_amount
       FROM plaid_transactions t
       LEFT JOIN plaid_accounts a ON a.account_id=t.account_id
       LEFT JOIN profits p ON p.id=t.linked_profit_id
       WHERE t.removed=FALSE
       ORDER BY (t.review_status='deposit_unmatched') DESC,t.transaction_date DESC,t.created_at DESC LIMIT $1`,
      [limit]
    );
    res.json(result.rows.map(row => ({ ...row, suggested_kind: suggestDeposit({
      name: row.name, merchant_name: row.merchant_name,
      personal_finance_category: { primary: row.plaid_category },
    }) })));
  } catch (error) {
    console.error("Plaid transactions error:", error);
    res.status(500).json({ error: "Failed to load bank transactions" });
  }
});

router.get("/accounting-transactions/:transactionId/reconciliation-candidates", async (req, res) => {
  try {
    await ensureSchema();
    const result = await pool.query(
      `SELECT raw_json FROM plaid_transactions WHERE transaction_id=$1`,
      [req.params.transactionId]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Bank transaction not found" });
    const candidates = await findReconciliationCandidates(pool, result.rows[0].raw_json, 7);
    res.json(candidates.rows);
  } catch (error) {
    console.error("Plaid reconciliation candidates error:", error);
    res.status(500).json({ error: "Failed to load possible payment matches" });
  }
});

router.patch("/accounting-transactions/:transactionId", async (req, res) => {
  let client;
  try {
    await ensureSchema();
    client = await pool.connect();
    const { transactionId } = req.params;
    const action = req.body?.action;
    const appCategory = req.body?.appCategory;
    await client.query("BEGIN");
    await client.query('SELECT pg_advisory_xact_lock(721946)');
    const result = await client.query(
      `SELECT * FROM plaid_transactions WHERE transaction_id=$1 AND removed=FALSE FOR UPDATE`,
      [transactionId]
    );
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Bank transaction not found" });
    }

    if (action === "classify_deposit") {
      const row = result.rows[0];
      const transaction = row.raw_json;
      const kind = req.body?.kind;
      if (!isIncomeDeposit(transaction) || !DEPOSIT_KINDS.includes(kind) || ['bank_reconciled','square_payout_reconciled'].includes(row.review_status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Choose an unmatched, posted deposit and a valid category.' });
      }
      // Recheck payment matches at save time before adding any income.
      await removePostedExpense(client, transactionId);
      const match = await reconcileDeposit(client, transaction);
      if (match !== 'unmatched' && req.body.confirmUnmatched !== true) {
        await client.query('ROLLBACK');
        return res.status(409).json({ code: 'PAYMENT_MATCH_REVIEW', error: 'This deposit has possible existing payment matches. Review those before categorizing it.' });
      }
      if (req.body.saveRule) {
        let rule;
        try { rule = validateDepositRule({ ...req.body.rule, kind, accountId: transaction.account_id }); }
        catch (error) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: error.message });
        }
        const candidate = { enabled: true, account_id: rule.accountId, match_field: rule.matchField, match_value: rule.matchValue, kind, id: 0 };
        if (!decideDeposit(transaction, [candidate]).kind) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'The rule must match this deposit.' });
        }
        await client.query(`INSERT INTO bank_deposit_rules(match_field,match_value,account_id,kind) VALUES ($1,$2,$3,$4)`,
          [rule.matchField,rule.matchValue,rule.accountId,kind]);
      }
      await postDeposit(client, transaction, kind, 'manual');
    } else if (action === "reconcile") {
      const profitId = Number(req.body?.profitId);
      const transaction = result.rows[0].raw_json;
      if (!profitId || !isIncomeDeposit(transaction)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Choose a valid income payment to reconcile" });
      }
      const profit = await client.query(
        `SELECT id FROM profits WHERE id=$1 AND amount > 0
         AND LOWER(COALESCE(type,'')) NOT LIKE '%expense%'
       AND COALESCE(processor,'') <> 'Plaid'
       AND square_payout_id IS NULL
         AND (bank_transaction_id IS NULL OR bank_transaction_id=$2)
         AND ABS(amount - $3::numeric) < 0.01
         AND COALESCE(paid_at::date,created_at::date)
           BETWEEN $4::date - 7 AND $4::date + 7 FOR UPDATE`,
        [profitId, transactionId, Math.abs(Number(transaction.amount)), transaction.date]
      );
      if (!profit.rowCount) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "That payment is already matched or unavailable" });
      }
      await removePostedExpense(client, transactionId);
      await unlinkBankReconciliation(client, transactionId);
      await client.query(
        `UPDATE profits SET bank_transaction_id=$2,bank_reconciled_at=NOW() WHERE id=$1`,
        [profitId, transactionId]
      );
      await client.query(
        `UPDATE plaid_transactions SET review_status='bank_reconciled',linked_profit_id=$2,refunded_expense_id=NULL,deposit_kind=NULL,deposit_source=NULL,
         updated_at=NOW() WHERE transaction_id=$1`,
        [transactionId, profitId]
      );
    } else if (action === "unreconcile") {
      if (!['bank_reconciled','square_payout_reconciled'].includes(result.rows[0].review_status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Only matched deposits can be unmatched.' });
      }
      await unlinkBankReconciliation(client, transactionId);
      await client.query(
        `UPDATE plaid_transactions SET review_status='deposit_unmatched',updated_at=NOW()
         WHERE transaction_id=$1`,
        [transactionId]
      );
    } else if (action === "ignore") {
      await removePostedExpense(client, transactionId);
      await unlinkBankReconciliation(client, transactionId);
      await client.query(
        `UPDATE plaid_transactions SET review_status='ignored',imported_expense_id=NULL,refunded_expense_id=NULL,
         app_category=COALESCE($2,app_category),updated_at=NOW() WHERE transaction_id=$1`,
        [transactionId, appCategory || null]
      );
    } else if (action === "approve") {
      const transaction = result.rows[0].raw_json;
      const category = appCategory || result.rows[0].app_category || mapCategory(transaction);
      if (transaction.pending || Number(transaction.amount) <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Only posted expense transactions can be approved" });
      }
      const expenseId = await postExpense(client, transaction, category);
      await client.query(
        `UPDATE plaid_transactions SET review_status='approved',app_category=$2,
         imported_expense_id=$3,updated_at=NOW() WHERE transaction_id=$1`,
        [transactionId, category, expenseId]
      );
    } else {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid transaction action" });
    }
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Plaid transaction review error:", error);
    res.status(500).json({ error: "Failed to update bank transaction" });
  } finally {
    client?.release();
  }
});

router.post("/sync", async (req, res) => {
  try {
    await ensureSchema();
    let squarePayouts = [];
    try {
      squarePayouts = await syncSquarePayouts();
    } catch (error) {
      console.error("Square payout sync failed:", error.message || error);
    }
    const ids = req.body?.itemId
      ? [req.body.itemId]
      : (await pool.query(`SELECT item_id FROM plaid_items WHERE status='active'`)).rows.map(
          (row) => row.item_id
        );
    const results = [];
    for (const id of ids) results.push(await syncPlaidItem(id));
    res.json({ synced: results, squarePayouts });
  } catch (error) {
    console.error("Plaid sync error:", error.response?.data || error);
    res.status(500).json({ error: "Failed to sync bank transactions" });
  }
});

router.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  if (req.body?.webhook_type === "TRANSACTIONS" && req.body?.item_id) {
    syncPlaidItem(req.body.item_id).catch(async (error) => {
      console.error("Plaid webhook sync error:", error.response?.data || error);
      await pool.query(
        `UPDATE plaid_items SET status='error',error_code=$2,updated_at=NOW()
         WHERE item_id=$1`,
        [req.body.item_id, error.response?.data?.error_code || error.code || "SYNC_ERROR"]
      ).catch(() => {});
    });
  }
});

export default router;
