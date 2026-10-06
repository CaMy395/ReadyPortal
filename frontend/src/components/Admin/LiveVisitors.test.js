import React from 'react';
import { render,screen,fireEvent,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveVisitors from './LiveVisitors';
import { chatRequest } from '../../liveVisitorChat';

jest.mock('../../liveVisitorChat',() => ({
  chatRequest:jest.fn(),
  mergeChatMessages:(current,incoming) => Array.from(new Map([...current,...incoming].map(message => [message.id,message])).values()),
}));
const first={ visitor_id:'12345678-1234-4234-8234-123456789012',display_name:'Anonymous visitor',page_label:'weddings',last_seen:new Date().toISOString(),team_active:false };
const second={ visitor_id:'22345678-1234-4234-8234-123456789012',display_name:'Another visitor',page_label:'rentals',last_seen:new Date(Date.now()-60000).toISOString(),team_active:false };
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(globalThis,'crypto',{ configurable:true,value:{ randomUUID:() => '32345678-1234-4234-8234-123456789012' } });
  chatRequest.mockImplementation(async path => path==='/admin/visitors' ? { visitors:[first,second] }
    : { visitor:path.includes(second.visitor_id) ? second:first,messages:[] });
});
const show=() => render(<MemoryRouter initialEntries={[`/admin/live-visitors?visitor=${first.visitor_id}`]}><LiveVisitors /></MemoryRouter>);
test('a visitor alert opens its conversation and admins can send a greeting',async () => {
  show();
  const input=await screen.findByLabelText('Message this visitor');
  expect(screen.getByText('1 on site')).toBeTruthy();
  fireEvent.change(input,{ target:{ value:'Hi! Need any help?' } });
  chatRequest.mockResolvedValueOnce({ message:{ id:'1',sender:'admin',sender_name:'Lyn',content:'Hi! Need any help?',created_at:new Date().toISOString() } });
  fireEvent.click(screen.getByRole('button',{ name:'Send message' }));
  expect(await screen.findByRole('button',{ name:'End live chat' })).toBeTruthy();
  expect(screen.getByText('Hi! Need any help?')).toBeTruthy();
  expect(chatRequest).toHaveBeenCalledWith(`/admin/visitors/${first.visitor_id}/messages`,expect.objectContaining({ content:'Hi! Need any help?' }));
});
test('changing visitors while a send is pending cannot place a message in the wrong conversation',async () => {
  show();
  const input=await screen.findByLabelText('Message this visitor');
  fireEvent.change(input,{ target:{ value:'For the first visitor' } });
  let finish;
  chatRequest.mockImplementationOnce(() => new Promise(resolve => { finish=resolve; }));
  fireEvent.click(screen.getByRole('button',{ name:'Send message' }));
  await waitFor(() => expect(finish).toBeTruthy());
  fireEvent.click(screen.getByRole('button',{ name:/Another visitor/ }));
  await screen.findByText(/This visitor is away/);
  finish({ message:{ id:'1',sender:'admin',sender_name:'Lyn',content:'For the first visitor',created_at:new Date().toISOString() } });
  await waitFor(() => expect(screen.getByRole('button',{ name:'Send for their return' })).toBeDisabled());
  expect(screen.queryByText('For the first visitor')).toBeNull();
});
