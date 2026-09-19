import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import IntakeSection from './IntakeSection';

const form = { id: 23, full_name: 'Test Client', event_date: '2026-10-03', email: 'client@example.com' };

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

function openActions() {
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Test Client' }));
}

test('intake menu keeps the gig editor and quote workflow intact', () => {
  render(<MemoryRouter><IntakeSection intakeForms={[form]} /></MemoryRouter>);
  openActions();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Add to Gigs' }));
  expect(screen.getByText('Edit Gig Before Adding')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  openActions();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Quote' }));
  expect(JSON.parse(sessionStorage.getItem('preQuote'))).toMatchObject({ clientName: 'Test Client', eventDate: '2026-10-03' });
});

test('Remove still hides an intake form without deleting its record', () => {
  render(<MemoryRouter><IntakeSection intakeForms={[form]} /></MemoryRouter>);
  openActions();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));
  expect(screen.queryByText('Test Client')).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('hidden_intake-forms'))).toEqual([23]);
  fireEvent.click(screen.getByRole('button', { name: 'Show Removed' }));
  expect(screen.getByText('Test Client')).toBeVisible();
});
