import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReadyFlashcards from './ReadyFlashcards';
jest.mock('../../data/ready_flashcards_full.json', () => [
  { id: 'one', category: 'Basics', q: 'First question?', a: 'First answer.', quiz: { answer: 'First answer.', distractors: ['First alternative.', 'Another first alternative.', 'Last first alternative.'] } },
  { id: 'two', category: 'Service', q: 'Second question?', a: 'Second answer.', quiz: { answer: 'Second answer.', distractors: ['Second alternative.'] } },
  { id: 'three', category: 'Service', q: 'Third question?', a: 'Third answer.', quiz: { answer: 'Third answer.', distractors: ['Third alternative.'] } },
  { id: 'four', category: 'Basics', q: 'Fourth question?', a: 'Fourth explanation.', quiz: { answer: 'Fourth answer.', distractors: ['Fourth alternative.'] } },
]);
beforeEach(() => localStorage.clear());
test('flip, keyboard navigation, and knowledge tracking persist', () => {
  render(<ReadyFlashcards />);
  const card = screen.getByRole('button', { name: 'Show answer' });
  fireEvent.click(card);
  expect(screen.getByText('First answer.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  expect(screen.getByText('Second question?')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem('ready-study-v2:guest')).known).toEqual(['one']);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Show answer' }), { key: 'ArrowRight' });
  expect(screen.getByText('Third question?')).toBeTruthy();
});
test('star filter, empty state, category and term search work', () => {
  render(<ReadyFlashcards />);
  fireEvent.click(screen.getByRole('button', { name: 'Star this card' }));
  fireEvent.click(screen.getByRole('button', { name: /Starred/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Unstar this card' }));
  expect(screen.getByText('No starred cards here yet')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Show all cards' }));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Service' } });
  expect(screen.getByText('Second question?')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /All terms/ }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search terms' }), { target: { value: 'Third' } });
  expect(screen.getByText('Third question?')).toBeTruthy();
  expect(screen.queryByText('Second question?')).toBeNull();
});
test('practice grades answers once and shows complete results', () => {
  render(<ReadyFlashcards />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Basics' } });
  fireEvent.click(screen.getByRole('button', { name: /Practice/ }));
  fireEvent.click(screen.getByRole('button', { name: /First answer/ }));
  expect(screen.getByText('That’s right. Nicely done!')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
  fireEvent.click(screen.getByRole('button', { name: /Fourth alternative/ }));
  expect(screen.getByText(/Keep practicing/)).toBeTruthy();
  expect(screen.getByText('Fourth explanation.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /See results/ }));
  expect(screen.getByText(/1 of 2 answers correct/)).toBeTruthy();
});

test('practice uses only the current question choices and locks grading after selection', () => {
  render(<ReadyFlashcards />);
  fireEvent.click(screen.getByRole('button', { name: /Practice/ }));
  expect(screen.getByRole('button', { name: /First alternative\./ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Second answer/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Fourth answer/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /First answer/ }));
  expect(screen.getByRole('button', { name: /First answer/ }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: /First alternative\./ }).disabled).toBe(true);
});
