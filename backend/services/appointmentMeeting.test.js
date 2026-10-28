import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { appointmentMeetingHtml, APPOINTMENT_ZOOM_URL } from './appointmentMeeting.js';
const source = fs.readFileSync(new URL('../emailService.js', import.meta.url), 'utf8');
for (const name of ['sendAppointmentEmail', 'sendRescheduleEmail']) {
  for (const title of ['Bartender Interview Part 1 - Virtual (1 hour, @ $0)', 'Server Interview - Virtual (1 hour, @ $0)', 'Auditions for Bartender (1 hour 30 minutes)', 'Interview for Server Roles (45 minutes)', 'Collaboration Meeting (Zoom)']) {
    test(`${name} includes the current Zoom link for ${title}`, async () => {
      let mail;
      const begin = source.indexOf(`const ${name} = async`);
      const end = source.indexOf('\nconst ', begin + 1);
      const send = vm.runInNewContext(source.slice(begin, end) + `\n${name};`, {
        getTransporter: () => ({ sendMail: async options => { mail = options; } }),
        appointmentMeetingHtml, formatDate: value => value, formatTime: value => value,
        process: { env: { EMAIL_USER: 'test@example.com' } }, console: { log() {}, error() {} },
      });
      await send({ title, email: 'recipient@example.com', full_name: 'Test', date: '2026-11-01', new_date: '2026-11-02', time: '10:00', new_time: '11:00' });
      assert.ok(mail.html.includes(`href="${APPOINTMENT_ZOOM_URL}"`));
      assert.ok(mail.html.includes('415 978 8886'));
      assert.doesNotMatch(mail.html, /2338602938|3697746091|ReadyBar|Passcode: Lyn/);
    });
  }
}
test('in-person Part 2 has its location without a Zoom link', () => {
  const html = appointmentMeetingHtml('Bartender Interview Part 2 - In Person (1 hour, @ $0)');
  assert.match(html, /1030 NW 200th Terrace/);
  assert.doesNotMatch(html, /zoom.us/);
});
