export const appointmentFlows = {
  crafts: { path:'/craft-cocktails',title:'Crafts & Cocktails (2 hours, @ $85.00)' },
  mix: { path:'/mix-n-sip',title:"Mix N' Sip (2 hours, @ $75.00)" },
  class: { path:'/bartending-classes',title:'Bartending Class (2 hours, @ $60.00)' },
};
export function appointmentFlow(type='') {
  if (/^Crafts & Cocktails/i.test(type)) return 'crafts';
  if (/^Mix N'? Sip/i.test(type)) return 'mix';
  if (/^Bartending Class\b/i.test(type)) return 'class';
  return null;
}
export function readBookingSlot(params) {
  const date=params.get('bookingDate'),start_time=params.get('bookingTime'),end_time=params.get('bookingEndTime');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date||'') || !/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(start_time||'') || !/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(end_time||'')) return null;
  const parsed=new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==date || end_time.slice(0,5)<=start_time.slice(0,5)) return null;
  return {date,start_time:start_time.slice(0,5),end_time:end_time.slice(0,5)};
}
export function calendarPath(flow) {
  return `/rb/client-scheduling?appointmentType=${encodeURIComponent(appointmentFlows[flow].title)}`;
}
export function bookingQuery(slot) {
  return new URLSearchParams({bookingDate:slot.date,bookingTime:slot.start_time,bookingEndTime:slot.end_time}).toString();
}
