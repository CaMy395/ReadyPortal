import moment from 'moment-timezone';
const minutes=time=>{const [h,m]=String(time||'').split(':').map(Number);return h*60+m;};
export function requestedSlot(body) {
  if(!body.preferredDate && !body.preferredTime) return null;
  const start=moment.tz(`${body.preferredDate} ${body.preferredTime}`,['YYYY-MM-DD HH:mm','YYYY-MM-DD HH:mm:ss'],true,'America/New_York');
  if(!start.isValid() || start.isBefore(moment().add(12,'hours'))) throw new Error('Choose an appointment at least 12 hours from now.');
  return {date:start.format('YYYY-MM-DD'),time:start.format('HH:mm')};
}
export async function selectedSlotAvailable(pool,{title,date,time,end_time}) {
  const start=moment.tz(`${date} ${time}`,['YYYY-MM-DD HH:mm','YYYY-MM-DD HH:mm:ss'],true,'America/New_York');
  if(!start.isValid() || start.isBefore(moment().add(12,'hours'))) return false;
  const slots=await pool.query('SELECT start_time,end_time FROM weekly_availability WHERE LOWER(weekday)=LOWER($1) AND LOWER(appointment_type)=LOWER($2)',[start.format('dddd'),title]);
  if(!slots.rows.some(slot=>minutes(slot.start_time)===minutes(time) && minutes(slot.end_time)===minutes(end_time))) return false;
  const appointments=await pool.query('SELECT time,end_time FROM appointments WHERE date=$1',[date]);
  const a=minutes(time),b=minutes(end_time);
  if(!Number.isFinite(a) || !Number.isFinite(b) || b<=a) return false;
  if(appointments.rows.some(slot=>a<minutes(slot.end_time) && b>minutes(slot.time))) return false;
  const blocks=await pool.query('SELECT time_slot,label FROM schedule_blocks WHERE date=$1',[date]);
  return !blocks.rows.some(block=>{
    const parts=String(block.time_slot).split('-');
    const blockStart=minutes(parts.slice(3).join('-'));
    const hours=String(block.label||'').match(/\((\d+(?:\.\d+)?)\s*hours?\)/i);
    const blockEnd=blockStart+(hours?Number(hours[1])*60:60);
    return parts.slice(0,3).join('-')===date && a<blockEnd && b>blockStart;
  });
}
