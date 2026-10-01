import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MyTasks from './MyTasks';
import { within } from '@testing-library/react';

jest.mock('../../apiConfig', () => ({ API_BASE_URL: 'https://ready.example' }));

test('only the six task teammates are offered and legacy names retain their tasks', async () => {
  const tasks = [
    { id: 1, text: 'Call the venue', category: 'Lyn' },
    { id: 2, text: 'Review expenses', category: 'Charlene Gray Bromfield' },
    { id: 3, text: 'Count stock', category: 'Matthew Lee' },
    { id: 4, text: 'Prepare supplies', category: 'Stitch' },
    { id: 5, text: 'Older assignment', category: 'Aminah' },
    { id: 6, text: 'Unassigned work', category: '' },
  ];
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => tasks }));
  render(<MyTasks />);
  await screen.findByText('Call the venue');
  const assignment = screen.getByRole('option', { name: 'Assign to...' }).parentElement;
  expect(within(assignment).getAllByRole('option').map(option => option.textContent)).toEqual(['Assign to...', 'Matt', 'Jaleesa', 'Caitlyn (Lyn)', 'Ace', 'Stitch', 'Charlene']);
  for (const [person, text] of [['Caitlyn (Lyn)', 'Call the venue'], ['Charlene', 'Review expenses'], ['Matt', 'Count stock'], ['Stitch', 'Prepare supplies'], ['Needs reassignment', 'Older assignment']]) {
    const section = screen.getByRole('button', { name: new RegExp(person.replace(/[()]/g, '\\$&')) }).closest('section');
    expect(within(section).getByText(text)).toBeInTheDocument();
  }
  expect(screen.getByText('Unassigned work')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('https://ready.example/tasks');
});

test('a task loading failure is visible instead of a silent blank board', async () => {
  global.fetch = jest.fn(async () => ({ ok: false }));
  render(<MyTasks />);
  expect(await screen.findByText('Unable to load tasks.')).toBeInTheDocument();
});

test('legacy owners can be reassigned to a teammate without losing the task', async () => {
  let task = { id: 9, text: 'Review old assignment', category: 'Aminah', priority: 'Medium', completed: false };
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'PATCH') task = { ...task, ...JSON.parse(options.body) };
    return { ok: true, json: async () => options ? task : [task] };
  });
  render(<MyTasks />);
  const row = (await screen.findByText(task.text)).closest('li');
  fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
  const assignee = within(row).getByRole('option', { name: 'Select a teammate...' }).parentElement;
  expect(within(assignee).queryByRole('option', { name: 'Aminah' })).not.toBeInTheDocument();
  fireEvent.change(assignee, { target: { value: 'Lyn' } });
  fireEvent.click(within(row).getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(task.category).toBe('Lyn'));
  const lynSection = screen.getByRole('button', { name: /Caitlyn \(Lyn\)/ }).closest('section');
  await waitFor(() => expect(within(lynSection).getByText(task.text)).toBeInTheDocument());
});



test('progress persists, supervisor filter works, and the check completes the task', async () => {
  let task = { id: 1, text: 'Count bottles', category: 'Charlene', priority: 'Medium', completed: false };
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'PATCH') task = { ...task, ...JSON.parse(options.body) };
    return { ok: true, json: async () => options ? task : [task] };
  });
  render(<MyTasks />);
  const status = await screen.findByLabelText('Status for Count bottles');
  expect(status).toHaveValue('not_started');
  fireEvent.change(status, { target: { value: 'needs_supervisor' } });
  await waitFor(() => expect(status).toHaveValue('needs_supervisor'));
  expect(JSON.parse(fetch.mock.calls.find(([, options]) => options?.method === 'PATCH')[1].body)).toEqual({ progress_status: 'needs_supervisor' });
  fireEvent.change(screen.getByLabelText('Filter tasks by status'), { target: { value: 'in_progress' } });
  expect(screen.queryByText('Count bottles')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Filter tasks by status'), { target: { value: 'needs_supervisor' } });
  fireEvent.click(screen.getByLabelText('Complete Count bottles'));
  await waitFor(() => expect(screen.queryByText('Count bottles')).not.toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Filter tasks by status'), { target: { value: 'completed' } });
  expect(screen.getByLabelText('Reopen Count bottles')).toBeChecked();
  expect(screen.getByLabelText('Status for Count bottles')).toHaveValue('completed');
  fireEvent.click(screen.getByLabelText('Reopen Count bottles'));
  await waitFor(() => expect(screen.queryByText('Count bottles')).not.toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Filter tasks by status'), { target: { value: 'needs_supervisor' } });
  expect(screen.getByLabelText('Status for Count bottles')).toHaveValue('needs_supervisor');
});
