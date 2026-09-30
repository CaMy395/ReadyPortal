import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReadyFlashcards from './ReadyFlashcards';

test('real age questions show ages only and grade the right age after shuffling', () => {
  localStorage.clear();
  const { container } = render(<ReadyFlashcards />);
  fireEvent.click(screen.getByRole('button', { name: /Practice/ }));
  const choices = () => [...container.querySelectorAll('.study-choices button')];
  expect(choices()).toHaveLength(4);
  for (const button of choices()) expect(button.textContent).toMatch(/^\d\d+ years old\.$/);
  fireEvent.click(screen.getByRole('button', { name: /21 years old/ }));
  expect(screen.getByText('That’s right. Nicely done!')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
  expect(screen.getByText('Minimum age to SERVE alcohol in Florida?')).toBeTruthy();
  for (const button of choices()) expect(button.textContent).toMatch(/^\d\d+ years old\.$/);
  fireEvent.click(screen.getByRole('button', { name: /18 years old/ }));
  expect(screen.getByText('That’s right. Nicely done!')).toBeTruthy();
});
