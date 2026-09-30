import test from 'node:test';
import assert from 'node:assert/strict';
import { plaidConfiguration, createLinkTokenHandler } from './plaidClient.js';

const keys = { PLAID_CLIENT_ID: 'client', PLAID_SECRET: 'secret' };
test('production cannot silently use sandbox or accept an invalid environment', () => {
  for (const PLAID_ENV of [undefined, 'typo']) {
    assert.throws(() => plaidConfiguration({ ...keys, NODE_ENV: 'production', PLAID_ENV }), /PLAID_ENV/);
  }
  assert.equal(plaidConfiguration({ ...keys, PLAID_ENV: ' Production ' }).environment, 'production');
  assert.throws(() => plaidConfiguration({ PLAID_ENV: 'sandbox' }), /PLAID_CLIENT_ID/);
});

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
}
test('Link starts with transactions and no database dependency', async () => {
  let request;
  const handler = createLinkTokenHandler({
    env: { BASE_URL: 'https://ready.example/' },
    client: () => ({ async linkTokenCreate(body) { request = body; return { data: { link_token: 'link-test' } }; } }),
  });
  const res = response();
  await handler({ body: { userId: 'admin-1' } }, res);
  assert.deepEqual(res.body, { link_token: 'link-test' });
  assert.deepEqual(request.products, ['transactions']);
  assert.equal(request.user.client_user_id, 'admin-1');
  assert.equal(request.webhook, 'https://ready.example/api/plaid/webhook');
});

test('credentials errors reach the UI with a reference but never leak request secrets', async () => {
  const logs = [];
  const handler = createLinkTokenHandler({
    client: () => ({ async linkTokenCreate() {
      throw { config: { headers: { secret: 'DO_NOT_EXPOSE' } }, response: { data: {
        error_code: 'INVALID_API_KEYS', request_id: 'reference123', error_message: 'DO_NOT_EXPOSE',
      } } };
    } }),
    logger: { error: (...args) => logs.push(args) },
  });
  const res = response();
  await handler({ body: {} }, res);
  assert.equal(res.statusCode, 502);
  assert.match(res.body.error, /PLAID_SECRET matches PLAID_ENV/);
  assert.equal(res.body.request_id, 'reference123');
  assert.ok(!JSON.stringify([res.body, logs]).includes('DO_NOT_EXPOSE'));
});

test('missing server keys return an actionable configuration error', async () => {
  const handler = createLinkTokenHandler({
    client: () => plaidConfiguration({ PLAID_ENV: 'sandbox' }),
    logger: { error() {} },
  });
  const res = response();
  await handler({}, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'PLAID_CONFIGURATION_ERROR');
  assert.match(res.body.error, /PLAID_CLIENT_ID/);
});
