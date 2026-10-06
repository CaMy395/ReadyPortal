# Visitor phone notifications

After the frontend and backend changes are deployed, sign in as an administrator, open **Admin Dashboard**, and tap **Enable visitor notifications**. Allow notifications when the phone asks. Use **Send test notification** to check delivery.

On iPhone/iPad (iOS 16.4+), first open the site in Safari, use **Share → Add to Home Screen**, open Ready from that icon, and sign in. Android browsers that support Web Push can enable notifications from the website. Enable separately on each device and website origin you use.

Every new browser visit sends an alert to subscribed admins, including anonymous visitors. Signed-in visitors show their account name; anonymous visitors show “Anonymous visitor.” Page navigation, refreshes, and multiple tabs do not repeat alerts. A return after 30 minutes of inactivity begins a new visit. Hidden tabs do not keep a visit active. Visitors must load the updated site and run JavaScript for tracking to work.

## Live visitors and chat

Tap a visitor notification to open **Live visitors & chat** with that visitor selected, or open it from the portal navigation. If your admin session has expired, sign in and the selected conversation will reopen. All current, active accounts with role `admin` can use live chat, including admins with limited access to other portal sections.

The visitor's visible page checks in every 15 seconds. Presence older than 45 seconds is shown as **Away**, and chat screens poll every three seconds while visible. You can start a conversation before a visitor has typed anything. Your first message opens the chat widget on their screen. Visitors can also choose **Talk to the team** without an account. Visitor messages push to subscribed admins; message content stays in the protected conversation rather than in phone notification previews. These chat alerts do not send emails.

The visitor chat widget offers separate assistant and team channels. The assistant channel pauses during an active team conversation. **End live chat** re-enables it; the saved team conversation remains available. The existing AI transcript is separate from the team conversation. Team chat is available across public and portal pages. The admin portal's small **Team messages** widget sits on the left, apart from the internal assistant.

If the visitor leaves, a message remains waiting when they return in the same browser. Clearing browser storage or switching browsers starts a different visitor conversation. Each visitor has a private random browser key; the visitor ID in a push notification cannot be used to read their conversation. Message retries are deduplicated, and selecting another visitor during a pending send does not move the message into the wrong thread. Team messages are retained for 30 days, and inactive visitor records are removed after 30 days without presence or chat activity.

Notifications work with the app closed while the admin session is valid. Existing login sessions last 12 hours. Logging out disables notifications for that session; sign in again to resume, and enable again if the device subscription was removed. The server checks current admin role, active account status, session expiry, logout, and the current authentication secret before sending. Phone settings, Focus mode, network availability, and browser push support affect delivery. Pushes expire after 60 seconds to avoid stale arrivals later.

## Hosting

Install the backend dependency with `npm ci` and build the frontend as usual. Serve `/visitor-push-sw.js` over HTTPS on the frontend origin. No external notification account or new environment variables are needed: VAPID keys are generated once and stored in the PostgreSQL database, with subscriptions and short-lived visit timestamps. Database credentials must allow table/index creation, as with the portal's existing automatic schema setup. Keep `INTERNAL_AUTH_SECRET` stable across server restarts; when it changes, admins must sign in again to resume alerts. Never expose the private VAPID key through frontend configuration.

The service worker handles push and notification taps only, without caching pages. Visitor and chat notifications open `/admin/live-visitors?visitor=<visitor-id>`; the test notification opens `/admin/dashboard`. Both retain the portal's normal login checks. Only these app destinations are accepted. General page categories appear in alerts; query strings, dynamic URLs, payment tokens and precise location do not. Browser keys are sent only in a header to the portal API and never appear in notification links.

## Validation

Backend tests in `routes/visitorPush.test.js`, `routes/liveVisitorChat.test.js`, and `services/visitorPushWorker.test.js` check anonymous arrivals, duplicate suppression, identity spoofing, admin access, conversation privacy, invalid endpoints, session expiry filtering, expired provider subscriptions, greeting/reply delivery, and notification tap destinations. Frontend tests in `VisitorAlerts.test.js`, `LiveVisitors.test.js`, and `ChatBox.test.js` check phone setup, greeting auto-open, assistant handover, draft retention, idempotent retries, and switching conversations during a send.

PostgreSQL integration tests run against the development database using temporary schemas inside transactions and always roll them back: set `RUN_VISITOR_PUSH_DB_TEST=1` and run `node --test services/visitorPush.db.test.js services/liveVisitorChat.db.test.js` from `backend`. They verify presence expiry, key ownership, transcript persistence, handover, deduplication, retention cleanup, and push eligibility. These database tests and the client/API tests passed locally. Verify one real phone using the test button and a visit from a separate browser after deployment; local automated checks cannot prove OS notification delivery.
