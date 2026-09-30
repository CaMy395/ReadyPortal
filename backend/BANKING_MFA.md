# Banking MFA

The Banking & Transactions page requires an authenticator in addition to the
existing Ready password session. All interactive `/api/plaid/*` endpoints enforce
the second factor on the server. Webhooks and scheduled imports are server-to-server
flows and retain their existing behavior. This is banking step-up verification,
not MFA for every Ready administrative screen or hosting-provider login.

## Deployment

Set `MFA_ENCRYPTION_KEY` on the backend service to a cryptographically random
32-byte key encoded as 64 hexadecimal characters. Generate it locally with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and
enter the result directly into Render's Environment settings. Keep a secure
backup in the owner's password manager. Never commit it or paste it into chat.
Do not rotate or remove it without migrating existing encrypted authenticator
seeds. Missing configuration leaves banking locked; it does not bypass MFA.

After deployment, sign in as an admin and open Banking & Transactions. Confirm
the Ready password, scan the QR code with an authenticator app, verify a code,
and save the ten recovery codes. Then verify a new login using the authenticator.
Only after the owner completes enrollment and the deployed flow is tested should
this control be described as operational in a questionnaire.

## Behavior and recovery

Seeds are encrypted with AES-256-GCM and bound to the user ID. Codes use RFC 6238
with 30-second steps and a one-step clock tolerance. Accepted steps cannot be
reused. Recovery codes are random, stored as hashes and consumed under a database
row lock. Five failed attempts lock verification for 15 minutes. Proofs expire
after 30 minutes, are stored as hashes, and are bound to the current login and
account. Existing proofs are revoked on another verification or recovery reset.

An unused recovery code can unlock banking once. To replace a lost authenticator,
use "Replace lost authenticator" with the Ready password and an unused recovery
code; enroll the replacement and save new recovery codes. If all factors are lost,
there is no automatic password-only reset. The owner must use a separately
verified administrative recovery procedure; never delete enrollment merely in
response to an unverified request.

## Verification

- `node --test services/bankingMfa.test.js`
- Set `RUN_MFA_DB_TEST=1` and run `node --test routes/bankingMfa.test.js` from
  backend with a development database configured. It uses and removes a unique
  isolated schema; it refuses NODE_ENV=production.
- Frontend tests: BankingMfa.test.js and Transactions.test.js.

The integration test covers enrollment, password checking, unauthorized roles,
direct API denial, login binding, TOTP replay, simultaneous recovery-code use,
session expiration, persisted lockout, authenticator replacement and setup expiry.
