const kinds = { tips: 'Tips', refund: 'Refund received', transfer: 'Transfer / card payment', owner_contribution: 'Owner contribution', other_income: 'Other income' };
export function bankTransactionDisplay(transaction) {
  const credit = Number(transaction.amount) < 0;
  const text = `${transaction.name || ''} ${transaction.merchant_name || ''}`;
  const cardPayment = /payment thank you|payment to .*card ending|credit card payment/i.test(text)
    || transaction.plaid_category_detail === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT';
  if (transaction.deposit_kind) return { label: kinds[transaction.deposit_kind] || transaction.deposit_kind,
    explanation: transaction.deposit_kind === 'refund' ? 'Money returned for an earlier expense.' : transaction.deposit_kind === 'transfer' ? 'Moves money between accounts; does not count as income or a new expense.' : '' };
  if (cardPayment) return { label: 'Card payment', suggestedKind: credit ? 'transfer' : '', explanation: 'Pays down a card balance. Record the original purchases as expenses; counting the card payment again would duplicate them.' };
  if (credit) {
    if (transaction.suggested_kind === 'refund' || /\b(refund|reversal|returned purchase)\b/i.test(text)) return { label: 'Possible refund', suggestedKind: 'refund', explanation: 'Check whether this returns money for an earlier purchase. A refund reduces expenses rather than adding income.' };
    if (transaction.account_type === 'credit' && !transaction.suggested_kind) return { label: 'Card credit — review', explanation: 'This reduces your card balance. It may be a refund or adjustment; check the statement before choosing a category.' };
    if (transaction.suggested_kind === 'transfer') return { label: 'Incoming credit — review', suggestedKind: 'transfer', explanation: 'May be a transfer. Check the sender and purpose: a customer payment is income, while a transfer between your accounts is not.' };
    return { label: 'Incoming credit — review', explanation: 'Money credited to this account is not automatically income. Choose income, refund, or transfer after checking its purpose.' };
  }
  return { label: transaction.imported_expense_id || transaction.review_status === 'approved' ? 'Expense' : 'Money out — review', explanation: '' };
}
export const bankDate = value => String(value || '').slice(0, 10);
