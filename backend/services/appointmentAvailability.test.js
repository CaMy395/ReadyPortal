import test from 'node:test';
import assert from 'node:assert/strict';
import moment from 'moment-timezone';
import {requestedSlot,selectedSlotAvailable} from './appointmentAvailability.js';
const date=moment.tz('America/New_York').add(21,'days').format('YYYY-MM-DD');
const booking={title:"Mix N' Sip (2 hours, @ $75.00)",date,time:'10:00',end_time:'12:00'};
function pool({booked=[],blocks=[],slots=[{start_time:'10:00',end_time:'12:00'}]}={}){return {query:async sql=>({rows:sql.includes('weekly_availability')?slots:sql.includes('schedule_blocks')?blocks:booked})};}
test('requested dates are valid, future and optional for legacy intakes',()=>{
  assert.equal(requestedSlot({}),null);assert.deepEqual(requestedSlot({preferredDate:date,preferredTime:'10:00'}),{date,time:'10:00'});
  assert.throws(()=>requestedSlot({preferredDate:'2026-02-30',preferredTime:'10:00'}));
  assert.throws(()=>requestedSlot({preferredDate:'2020-01-01',preferredTime:'10:00'}));
});
test('checkout validates weekly availability and overlapping bookings',async()=>{
  assert.equal(await selectedSlotAvailable(pool(),booking),true);
  assert.equal(await selectedSlotAvailable(pool({slots:[]}),booking),false);
  assert.equal(await selectedSlotAvailable(pool({booked:[{time:'11:00',end_time:'13:00'}]}),booking),false);
  assert.equal(await selectedSlotAvailable(pool({booked:[{time:'12:00',end_time:'14:00'}]}),booking),true);
});
test('blocked intervals reject payment even when the date contains hyphens',async()=>{
  assert.equal(await selectedSlotAvailable(pool({blocks:[{time_slot:date+'-11:00',label:'Unavailable (2 hours)'}]}),booking),false);
  assert.equal(await selectedSlotAvailable(pool({blocks:[{time_slot:date+'-13:00',label:'Unavailable (2 hours)'}]}),booking),true);
});
