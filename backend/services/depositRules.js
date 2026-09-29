export const DEPOSIT_KINDS = ['tips', 'refund', 'transfer', 'owner_contribution', 'other_income'];
const normalize = value => String(value || '').trim().toLowerCase();

export function validateDepositRule(input) {
  const matchField = input.matchField;
  const matchValue = String(input.matchValue || '').trim();
  if (!['merchant', 'description'].includes(matchField)) throw new Error('Choose a sender or description rule.');
  if (matchValue.length < 4 || matchValue.length > 160) throw new Error('Enter a specific matching phrase of 4–160 characters.');
  if (!DEPOSIT_KINDS.includes(input.kind)) throw new Error('Choose a deposit category.');
  const accountId = String(input.accountId || '').trim();
  if (!accountId || accountId.length > 200) throw new Error('Choose the bank account for this rule.');
  return { matchField, matchValue, accountId, kind: input.kind };
}

export function decideDeposit(transaction, rules) {
  if (transaction.pending || !Number.isFinite(Number(transaction.amount)) || Number(transaction.amount) >= 0) return { kind: null };
  const matches = rules.filter(rule => rule.enabled && rule.account_id === transaction.account_id && (
    rule.match_field === 'merchant'
      ? normalize(transaction.merchant_name) === normalize(rule.match_value)
      : normalize(transaction.name).includes(normalize(rule.match_value))
  ));
  if (matches.length > 1) return { kind: null, reason: 'More than one saved rule matches. Review this deposit.' };
  if (matches.length === 1) return { kind: matches[0].kind, ruleId: matches[0].id };
  return { kind: null, reason: 'No saved rule matches this deposit.' };
}

export function suggestDeposit(transaction) {
  const text = `${transaction.name || ''} ${transaction.merchant_name || ''}`;
  const primary = transaction.personal_finance_category?.primary || '';
  if (/\b(refund|reversal|returned purchase)\b/i.test(text)) return 'refund';
  if (/\b(tips?|gratuity|gratuities)\b/i.test(text)) return 'tips';
  if (primary.startsWith('TRANSFER') || /\btransfer\b/i.test(text)) return 'transfer';
  return '';
}

export function depositPosting(kind, amount) {
  if (kind === 'tips') return { category: 'Tips', type: 'Tips Income', amount: Math.abs(Number(amount)) };
  if (kind === 'other_income') return { category: 'Other', type: 'Other Income', amount: Math.abs(Number(amount)) };
  if (kind === 'refund') return { category: 'Refunds', type: 'expense_refund', amount: Math.abs(Number(amount)) };
  return null;
}
