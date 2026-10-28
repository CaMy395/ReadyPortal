import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import AdminAvailabilityPage from './AdminAvailabilityPage';
jest.mock('axios', () => ({ get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() }));
jest.mock('lucide-react', () => ({ Clock3: () => null, Plus: () => null, Trash2: () => null, Pencil: () => null }));
const slot = { id: 17, weekday: 'Monday', start_time: '10:00:00', end_time: '12:00:00', appointment_type: 'Legacy interview' };
beforeEach(() => {
  jest.clearAllMocks();
  axios.get.mockResolvedValue({ data: [slot] });
  axios.put.mockResolvedValue({ data: { success: true } });
});
test('editing preloads an existing window and updates its ID without creating another', async () => {
  render(<AdminAvailabilityPage />);
  fireEvent.click(await screen.findByTitle('Edit availability'));
  expect(screen.getByLabelText('Weekday')).toHaveValue('Monday');
  expect(screen.getByLabelText('Start time')).toHaveValue('10:00');
  expect(screen.getByLabelText('Appointment type')).toHaveValue('Legacy interview');
  fireEvent.change(screen.getByLabelText('End time'), { target: { value: '11:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('Availability updated.');
  expect(axios.put).toHaveBeenCalledWith(expect.stringContaining('/admin-availability/17'), { weekday: 'Monday', start_time: '10:00', end_time: '11:00', appointment_type: 'Legacy interview' });
  expect(axios.post).not.toHaveBeenCalled();
});
test('cancel makes no request and invalid time ranges cannot be saved', async () => {
  render(<AdminAvailabilityPage />);
  fireEvent.click(await screen.findByTitle('Edit availability'));
  fireEvent.change(screen.getByLabelText('End time'), { target: { value: '09:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByText('End time must be later than start time.')).toBeInTheDocument();
  expect(axios.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Add window' })).toBeInTheDocument();
  expect(screen.getByLabelText('Start time')).toHaveValue('');
});
test('failed updates keep the entered details for retry', async () => {
  axios.put.mockRejectedValue({ response: { data: { error: 'Save failed' } } });
  render(<AdminAvailabilityPage />);
  fireEvent.click(await screen.findByTitle('Edit availability'));
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '10:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('Save failed');
  expect(screen.getByLabelText('Start time')).toHaveValue('10:30');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled());
});
