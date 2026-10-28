export const APPOINTMENT_ZOOM_URL = 'https://us05web.zoom.us/j/4159788886?pwd=zKXKx0Vm7mbMVWcsdoF03aI6C285b8.1';
export function appointmentMeetingHtml(title = '') {
  if (/Bartender Interview Part 2/i.test(title)) return '<p>Your Part 2 interview is in person at 1030 NW 200th Terrace Miami, FL, 33169.</p>';
  const bartender = /Bartender Interview Part 1|Auditions for Bartender/i.test(title);
  const server = /Server Interview|Interview for Server Roles/i.test(title);
  const intro = bartender ? 'Part 1 is virtual on Zoom. If you pass, our team will contact you to schedule Part 2 in person.'
    : server ? 'Your server interview is virtual on Zoom. There is one interview.'
    : 'For virtual appointments, join using the Zoom details below. In-person appointments are at 1030 NW 200th Terrace Miami, FL, 33169.';
  return `<p>${intro}</p><p>Topic: Ready Bartending Meeting Room</p>
    <p><a href="${APPOINTMENT_ZOOM_URL}">Join Zoom Meeting</a></p>
    <p>${APPOINTMENT_ZOOM_URL}</p><p>Meeting ID: 415 978 8886</p>`;
}
