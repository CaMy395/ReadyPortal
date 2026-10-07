export function requestedAppointment(date, time) {
  const day = String(date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 'Not selected';
  const parsed = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return 'Not selected';
  const label = parsed.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  const match = /^(\d{2}):(\d{2})/.exec(String(time || ''));
  if (!match) return label;
  const hour = Number(match[1]);
  return `${label} · ${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'} Eastern`;
}
