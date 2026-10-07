import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import axios from 'axios';
import ClientSchedulingPage from './ClientSchedulingPage';
import Crafts from '../CraftCocktails';
import Mix from '../MixNsip';
import Classes from '../BartendingClasses';
jest.mock('axios',()=>({get:jest.fn(),post:jest.fn()}));
jest.mock('../ChatBox',()=>()=>null);
jest.mock('react-calendar',()=>({onChange})=><button onClick={()=>onChange(new Date(Date.now()+21*86400000))}>Choose test date</button>);
const dateKey=()=>{const d=new Date(Date.now()+21*86400000);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
beforeEach(()=>{
  jest.clearAllMocks();localStorage.clear();window.alert=jest.fn();
  axios.get.mockImplementation(async url=>({data:url.endsWith('/availability')?[{start_time:'10:00',end_time:'12:00'}]:url.endsWith('/blocked-times')?{blockedTimes:[]}:[]}));
  axios.post.mockResolvedValue({data:{}});
  window.fetch=jest.fn(async()=>({ok:true,json:async()=>({found:true,smsOptInAt:'already-answered'})}));
});
function start(path){return render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/craft-cocktails" element={<Crafts/>}/><Route path="/mix-n-sip" element={<Mix/>}/><Route path="/bartending-classes" element={<Classes/>}/><Route path="/rb/client-scheduling" element={<ClientSchedulingPage/>}/>
</Routes></MemoryRouter>);}
test.each([['/craft-cocktails','/api/craft-cocktails'],['/mix-n-sip','/api/mix-n-sip'],['/bartending-classes','/api/bartending-classes']])('calendar first carries the chosen slot through %s intake and payment',async(path,endpoint)=>{
  const view=start(path);
  await screen.findByText('Check Availability');
  expect(screen.queryByLabelText(/Full Name/)).toBeNull();
  expect(screen.queryByText('Client Email:')).toBeNull();
  fireEvent.click(screen.getByText('Choose test date'));
  const select=await screen.findByRole('button',{name:'Select time'});
  fireEvent.click(select);
  expect(await screen.findByText(/Selected appointment:/)).toHaveTextContent(dateKey());
  expect(window.fetch).not.toHaveBeenCalled();expect(axios.post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/Full Name/),{target:{value:'Test Client'}});
  fireEvent.change(screen.getByLabelText(/^Email/),{target:{value:'test@example.invalid'}});
  fireEvent.change(screen.getByLabelText(/Confirm Email/),{target:{value:'test@example.invalid'}});
  fireEvent.change(screen.getByLabelText(/^Phone/),{target:{value:'3055550123'}});
  if(path==='/bartending-classes')fireEvent.change(screen.getByLabelText(/How many classes/),{target:{value:'1'}});
  fireEvent.submit(view.container.querySelector('form'));
  await screen.findByText('Review Your Appointment');
  const intake=window.fetch.mock.calls.find(([url])=>url.endsWith(endpoint));
  expect(JSON.parse(intake[1].body)).toMatchObject({preferredDate:dateKey(),preferredTime:'10:00'});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Continue to Payment'})).toBeEnabled());
  expect(screen.queryByText('Choose test date')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Continue to Payment'}));
  await waitFor(()=>expect(axios.post).toHaveBeenCalled());
  expect(axios.post.mock.calls[0][1].appointmentData).toMatchObject({date:dateKey(),time:'10:00',end_time:'12:00',calendarFirst:true});
});
test('an occupied slot cannot proceed to payment',async()=>{
  axios.get.mockImplementation(async url=>({data:url.endsWith('/availability')?[]:url.endsWith('/blocked-times')?{blockedTimes:[]}:[]}));
  start('/rb/client-scheduling?appointmentType='+encodeURIComponent("Mix N' Sip (2 hours, @ $75.00)")+'&name=Test&email=test%40example.invalid&phone=3055550123&price=200&checkout=1&bookingDate='+dateKey()+'&bookingTime=10%3A00&bookingEndTime=12%3A00');
  expect(await screen.findByText(/This time is no longer available/)).toBeTruthy();
  expect(screen.getByRole('button',{name:'Continue to Payment'})).toBeDisabled();
  expect(axios.post).not.toHaveBeenCalled();
});
