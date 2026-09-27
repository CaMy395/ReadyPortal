import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MyTasks from './MyTasks';

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
