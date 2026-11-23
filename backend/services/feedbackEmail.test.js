import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../emailService.js', import.meta.url), 'utf8');
const transportStart = source.indexOf('const transporters = {};');
const transportEnd = source.indexOf('\n/* ===', transportStart);
const feedbackStart = source.indexOf('const sendFeedbackRequestEmail = async');
const feedbackEnd = source.indexOf('\n};', feedbackStart) + 3;

function mailer(sendMail) {
  const created = [];
  const context = vm.createContext({
    process: { env: { MARK_EMAIL: 'marketing@example.com', MARK_PASS: 'marketing-secret', ADMIN_EMAIL: 'business@example.com', ADMIN_PASS: 'business-secret', EMAIL_USER: 'test@example.com' } },
    console: { log() {}, warn() {}, error() {} },
    nodemailer: { createTransport(options) { created.push(options); return { sendMail }; } },
  });
  vm.runInContext(`${source.slice(transportStart, transportEnd)}\n${source.slice(feedbackStart, feedbackEnd)}\nglobalThis.sendFeedback = sendFeedbackRequestEmail;`, context);
  return { send: context.sendFeedback, created };
}

const request = { email: 'client@example.com', clientName: 'Matt', feedbackLink: 'https://readybartending.com/rb/feedback/existing-token', eventType: 'Event', eventDate: '2026-11-06' };

test('feedback authenticates as business sender and retains the recipient and existing link', async () => {
  let message;
  const receipt = { accepted: [request.email], messageId: 'receipt-id' };
  const { send, created } = mailer(async options => { message = options; return receipt; });
  assert.equal(await send(request), receipt);
  assert.equal(created[0].auth.user, 'business@example.com');
  assert.equal(created[0].auth.pass, 'business-secret');
  assert.equal(message.from, '"Ready Bartending" <business@example.com>');
  assert.equal(message.replyTo, 'business@example.com');
  assert.equal(message.to, request.email);
  assert.ok(message.text.includes(request.feedbackLink));
  assert.ok(message.html.includes(request.feedbackLink));
});

test('feedback propagates send failures so callers cannot mark a failed email sent', async () => {
  const failure = new Error('authentication failed');
  const { send } = mailer(async () => { throw failure; });
  await assert.rejects(send(request), error => error === failure);
});
