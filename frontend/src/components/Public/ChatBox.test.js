import React from 'react';
import { render,screen,fireEvent,waitFor } from '@testing-library/react';
import ChatBox from './ChatBox';
import { chatRequest,ensureVisitorSession } from '../../liveVisitorChat';

jest.mock('../../liveVisitorChat',() => ({
  chatRequest:jest.fn(),ensureVisitorSession:jest.fn(),visitorMessagesPath:() => '/visitor/messages?visitorId=test&after=0',
  mergeChatMessages:(current,incoming) => Array.from(new Map([...current,...incoming].map(message => [message.id,message])).values()),
}));
const adminMessage={ id:'1',sender:'admin',sender_name:'Lyn',content:'Hi! How can I help?' };
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear();
  ensureVisitorSession.mockResolvedValue({ ready:true });
  chatRequest.mockResolvedValue({ visitor:{ team_active:false },messages:[] });
  window.fetch=jest.fn();
  Object.defineProperty(globalThis,'crypto',{ configurable:true,value:{ randomUUID:() => '12345678-1234-4234-8234-123456789012' } });
});
test('an admin greeting opens the visitor chat and pauses the assistant until live chat ends',async () => {
  chatRequest.mockResolvedValue({ visitor:{ team_active:true },messages:[adminMessage] });
  render(<ChatBox />);
  expect(await screen.findByText('Hi! How can I help?')).toBeTruthy();
  expect(screen.getByRole('button',{ name:'Ready Assistant' })).toBeDisabled();
  expect(screen.getByLabelText('Message the Ready team')).toBeTruthy();
  expect(screen.getByText('Lyn · Ready team')).toBeTruthy();
  chatRequest.mockResolvedValue({ visitor:{ team_active:false },messages:[] });
  fireEvent(document,new Event('visibilitychange'));
  await waitFor(() => expect(screen.getByRole('button',{ name:'Ready Assistant' })).not.toBeDisabled());
  expect(window.fetch).not.toHaveBeenCalled();
});
test('visitors can request the team without an account, and failed sends keep their draft for an idempotent retry',async () => {
  render(<ChatBox />);
  fireEvent.click(screen.getByRole('button',{ name:'Chat with Ready' }));
  fireEvent.click(screen.getByRole('button',{ name:'Talk to the team' }));
  await waitFor(() => expect(chatRequest).toHaveBeenCalledWith('/visitor/messages?visitorId=test&after=0',undefined,{ visitor:true }));
  const input=screen.getByLabelText('Message the Ready team');
  fireEvent.change(input,{ target:{ value:'Can you help with a booking?' } });
  let failSend=true;
  chatRequest.mockImplementation(async path => {
    if (path!=='/visitor/messages') return { visitor:{ team_active:false },messages:[] };
    if (failSend) { failSend=false; throw new Error('Temporary connection issue'); }
    return { message:{ id:'2',sender:'visitor',sender_name:'Anonymous visitor',content:'Can you help with a booking?' } };
  });
  fireEvent.click(screen.getByRole('button',{ name:'Send' }));
  expect(await screen.findByText(/Temporary connection issue/)).toBeTruthy();
  expect(input.value).toBe('Can you help with a booking?');
  const first=chatRequest.mock.calls.find(([path]) => path==='/visitor/messages')[1];
  fireEvent.click(screen.getByRole('button',{ name:'Send' }));
  await waitFor(() => expect(input.value).toBe(''));
  expect(screen.getByText('Can you help with a booking?')).toBeTruthy();
  const sends=chatRequest.mock.calls.filter(([path]) => path==='/visitor/messages');
  expect(sends[1][1].messageId).toBe(first.messageId);
  expect(input.value).toBe('');
  expect(window.fetch).not.toHaveBeenCalled();
});

test('moving into the admin portal keeps direct team messages available without a second public assistant',async () => {
  const view=render(<ChatBox />);
  fireEvent.click(screen.getByRole('button',{ name:'Chat with Ready' }));
  expect(screen.getByLabelText('Message Ready Assistant')).toBeTruthy();
  view.rerender(<ChatBox portal />);
  expect(await screen.findByLabelText('Message the Ready team')).toBeTruthy();
  expect(screen.queryByRole('button',{ name:'Ready Assistant' })).toBeNull();
  expect(screen.getByRole('button',{ name:'Team messages' })).toBeTruthy();
});
