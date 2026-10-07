# Connect Ready Bartending to Instagram

In the portal: Home → Content Studio → Connect Instagram.

This uses Instagram Login for a Business or Creator account. Each portal staff member can prepare drafts with the Content Studio role; only a full administrator can connect the account and approve publishing.

## One-time Meta setup

1. Open https://developers.facebook.com/apps/ and sign in to your Meta developer account.
2. Create an app for Ready Bartending with the Instagram API product/use case. Choose **API setup with Instagram login**.
3. In the Instagram product's business login settings, register this exact OAuth redirect URI:

   `https://www.readybartending.com/api/instagram/callback`

4. Use the **Instagram App ID** and **Instagram App Secret** from the Instagram product (not an Instagram password).
5. If using development mode, add the Ready Bartending Instagram account as a tester and accept its invitation from Instagram. Follow the app dashboard's permission/access requirements; connecting accounts outside the app's authorized test accounts may require Meta review.
6. Ensure the requested permissions include `instagram_business_basic` and `instagram_business_content_publish`.

## One-time Render setup

Open the Ready Portal backend service → Environment. Add:

| Variable | Value |
| --- | --- |
| `INSTAGRAM_APP_ID` | Instagram App ID |
| `INSTAGRAM_APP_SECRET` | Instagram App Secret |
| `INSTAGRAM_API_VERSION` | Supported Graph API version configured for the Meta app, e.g. `v25.0` if supported |
| `CONTENT_STUDIO_PUBLIC_URL` | `https://www.readybartending.com` |
| `INSTAGRAM_TOKEN_ENCRYPTION_KEY` | A generated 32-byte key encoded as 64 hexadecimal characters |

Generate the encryption key with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` on your own machine. Store it directly in Render; keep the key stable so saved credentials remain readable. Never paste app secrets, access tokens or the encryption key into chat or source control.

Save and redeploy, then return to Content Studio and click **Connect Instagram**. Instagram handles sign-in and approval; the portal receives only the resulting connection status. Tokens are exchanged and encrypted on the server, and renewed before expiry while valid. If access is revoked or expires, use **Reconnect Instagram**.

Connecting does not publish drafts. Publishing still requires a full administrator to choose Publish now or Schedule.

This implementation keeps the existing connected account when reconnecting. Switching to a different account requires addressing the existing posting queue first.

Meta documentation: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
