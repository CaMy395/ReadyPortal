import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

export function plaidConfiguration(env = process.env) {
  const environment = String(env.PLAID_ENV || (env.NODE_ENV === 'production' ? '' : 'sandbox')).trim().toLowerCase();
  if (!Object.hasOwn(PlaidEnvironments, environment)) {
    throw Object.assign(new Error('Set PLAID_ENV to sandbox or production in the server environment settings.'), { code: 'PLAID_CONFIGURATION_ERROR' });
  }
  const clientId = String(env.PLAID_CLIENT_ID || '').trim();
  const secret = String(env.PLAID_SECRET || '').trim();
  if (!clientId || !secret) {
    throw Object.assign(new Error('Bank connection is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET in the server environment settings.'), { code: 'PLAID_CONFIGURATION_ERROR' });
  }
  return { environment, clientId, secret };
}

export function getPlaidClient() {
  const { environment, clientId, secret } = plaidConfiguration();
  return new PlaidApi(new Configuration({
    basePath: PlaidEnvironments[environment],
    baseOptions: { headers: { 'PLAID-CLIENT-ID': clientId, 'PLAID-SECRET': secret }, timeout: 30000 },
  }));
}

export function linkTokenFailure(error) {
  if (error.code === 'PLAID_CONFIGURATION_ERROR') {
    return { status: 503, body: { error: error.message, code: error.code } };
  }
  const data = error.response?.data || {};
  const code = /^[A-Z_]+$/.test(data.error_code || '') ? data.error_code : 'PLAID_UNAVAILABLE';
  const messages = {
    INVALID_API_KEYS: 'Plaid rejected the server credentials. Check that PLAID_SECRET matches PLAID_ENV in the server environment settings.',
    UNAUTHORIZED_ENVIRONMENT: 'This Plaid account is not authorized for the configured environment. Check production access in the Plaid dashboard.',
    INVALID_PRODUCT: 'Transactions is not enabled for this Plaid account. Check product access in the Plaid dashboard.',
    INVALID_FIELD: 'Plaid rejected the Link configuration. Check the server settings and use the reference below in the Plaid dashboard.',
    MISSING_FIELDS: 'Plaid requires additional Link configuration. Use the reference below to check the request in the Plaid dashboard.',
  };
  const requestId = /^[a-zA-Z0-9_-]{1,100}$/.test(data.request_id || '') ? data.request_id : undefined;
  const message = messages[code] || 'Unable to start the bank connection. Try again, or check the Plaid dashboard for this error.';
  return { status: 502, body: {
    error: `${message} (${code}${requestId ? `; reference: ${requestId}` : ''})`,
    code, ...(requestId ? { request_id: requestId } : {}),
  } };
}

export function createLinkTokenHandler({ client = getPlaidClient, env = process.env, logger = console } = {}) {
  return async (req, res) => {
    try {
      const response = await client().linkTokenCreate({
        user: { client_user_id: String(req.body?.userId || 'ready-admin') },
        client_name: 'Ready Bartending',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        ...(env.BASE_URL ? { webhook: `${env.BASE_URL.trim().replace(/\/$/, '')}/api/plaid/webhook` } : {}),
      });
      res.json({ link_token: response.data.link_token });
    } catch (error) {
      const failure = linkTokenFailure(error);
      // Never log Axios errors: their request headers contain the Plaid secret.
      logger.error('Plaid link-token error:', failure.body);
      res.status(failure.status).json(failure.body);
    }
  };
}
