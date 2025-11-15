// src/components/Admin/Expenses.js (or wherever you keep ExtraPayouts)
import React, { useState, useEffect } from 'react';

const Expenses = () => {
  const [expenseDate, setExpenseDate] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [expenses, setExpenses] = useState([]);

  const categories = [
    'Rent',
    'Utilities',
    'Office Supplies',
    'Marketing / Advertising',
    'Software / Subscriptions',
    'Travel',
    'Inventory / Bar Supplies',
    'Wages / Labor',
    'Taxes / Fees',
    'Other'
  ];

  const paymentMethods = [
    '',
    'Cash',
    'Debit Card',
    'Credit Card',
    'Bank Transfer',
    'Zelle',
    'Cash App',
    'Venmo',
    'PayPal',
  ];

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses`);
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!expenseDate || !category || !amount || !description) {
      setErrorMessage('Please fill in date, category, amount, and description.');
      setSuccessMessage('');
      return;
    }

    const finalCategory = category === 'Other' && customCategory.trim()
      ? customCategory.trim()
      : category;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expense_date: expenseDate,
          category: finalCategory,
          amount: parseFloat(amount),
          description,
          vendor,
          payment_method: paymentMethod || null,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add expense');
      }

      const data = await response.json();
      console.log('Expense added:', data);

      setSuccessMessage('Expense added successfully!');
      setErrorMessage('');
      setExpenseDate('');
      setCategory('');
      setCustomCategory('');
      setAmount('');
      setDescription('');
      setVendor('');
      setPaymentMethod('');
      setNotes('');

      // Refresh list
      fetchExpenses();

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('An error occurred while adding the expense. Please try again.');
      setSuccessMessage('');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Manual Expenses</h2>
      <p>Use this page to log business expenses (like QuickBooks but inside your portal).</p>

      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem', maxWidth: '500px' }}>
        <label>
          Date:
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </label>

        <label>
          Category:
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>

        {category === 'Other' && (
          <label>
            Custom Category:
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Ex: Cleaning, Licenses, etc."
            />
          </label>
        )}

        <label>
          Amount:
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <label>
          Description:
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: February studio rent"
            required
          />
        </label>

        <label>
          Vendor (optional):
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Ex: Amazon, Landlord name"
          />
        </label>

        <label>
          Payment Method (optional):
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {paymentMethods.map((pm) => (
              <option key={pm} value={pm}>{pm || 'Select method'}</option>
            ))}
          </select>
        </label>

        <label>
          Notes (optional):
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </label>

        <button type="submit">Add Expense</button>
      </form>

      <hr style={{ margin: '1.5rem 0' }} />

      <h3>Recent Expenses</h3>
      {expenses.length === 0 ? (
        <p>No expenses recorded yet.</p>
      ) : (
        <table style={{ width: '100%', maxWidth: '900px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Date</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Category</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Description</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Amount</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Vendor</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Payment Method</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id}>
                <td style={{ padding: '0.25rem 0.5rem' }}>
                  {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : ''}
                </td>
                <td style={{ padding: '0.25rem 0.5rem' }}>{exp.category}</td>
                <td style={{ padding: '0.25rem 0.5rem' }}>{exp.description}</td>
                <td style={{ padding: '0.25rem 0.5rem' }}>
                  ${Number(exp.amount).toFixed(2)}
                </td>
                <td style={{ padding: '0.25rem 0.5rem' }}>{exp.vendor || '-'}</td>
                <td style={{ padding: '0.25rem 0.5rem' }}>{exp.payment_method || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Expenses;
