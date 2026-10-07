# Content Studio

Open **Home → Content Studio** (`/admin/content-studio`). Upload a JPEG/PNG image or MP4 video up to 50 MB, write a caption, optionally add a reel cover and posting time, then save a draft. PNG images selected for Instagram and PNG covers are converted to JPEG in the browser. Use **Reuse for TikTok/IG** to share the uploaded assets while keeping separate captions and posting states. Drafts can be edited or deleted.

## Access

Full administrators can access the page and publish to Instagram. Assign `social.manage` through the existing Admin Access screen to let staff prepare content and manage TikTok posting plans. This permission does not allow Instagram publishing. No roles or account assignments are changed automatically.

## Instagram setup

The implementation uses Meta's **Instagram API with Instagram Login**, for a professional Business/Creator account. Configure these values in the backend hosting environment, never in frontend variables or source control:

| Variable | Value |
| --- | --- |
| `CONTENT_STUDIO_PUBLIC_URL` | Public HTTPS origin serving this backend, e.g. `https://readybartending.com` |
| `INSTAGRAM_USER_ID` | Instagram professional account ID for the authorized token |
| `INSTAGRAM_ACCESS_TOKEN` | Valid server-held token with `instagram_business_basic` and `instagram_business_content_publish` access |
| `INSTAGRAM_API_VERSION` | Supported Meta Graph API version, e.g. `v25.0`; verify against your Meta app before deployment |
| `INSTAGRAM_ACCOUNT_LABEL` | Display name such as `@readybartending` |

Obtain and maintain the token through your Meta developer app; this version does not provide OAuth account connection or automatic token refresh. Configure these variables only after confirming the account ID belongs to Ready. Without all required values, the page supports drafts but disables Instagram queueing. The label is configuration, not a verified account identity.

The backend creates the PostgreSQL tables on first use and needs CREATE TABLE permissions for the initial deployment. Media is stored in PostgreSQL so host restarts do not lose uploads. Account for upload size in database storage/backups; this first version has no asset garbage collection. Uploads have random 192-bit capability URLs for Meta to retrieve the asset without receiving portal credentials. Treat these URLs as private share links. Covers apply to Reels; photo posts use their uploaded JPEG.

The existing minute cron checks scheduled posts. A PostgreSQL advisory lock prevents multiple backend instances from publishing the same queue simultaneously. Media container IDs are saved before publishing, and processing containers are polled in later passes. An interrupted create/publish is marked **review** rather than automatically retried. Check Instagram before creating another draft for a review/failed post. There is no automatic retry, remote deletion, or remote edit. Scheduling requires an active full administrator; publishing is stopped if that administrator loses access.

## TikTok

TikTok is a manual posting workflow: download video/cover, copy caption, open TikTok and finish publishing there. **Plan posting time** changes the post to `ready` when due; it does not publish or send a notification. **I posted this** records the user's confirmation only. TikTok music and cover selection remain in TikTok.

TikTok's Direct Post guidelines explicitly exclude internal utilities for accounts you or your team manage. An approved third-party scheduling provider could be integrated later, after choosing the provider and configuring its account access. No TikTok API credentials are needed for the manual workflow.

Sources: [Meta Instagram Platform](https://developers.facebook.com/documentation/instagram-platform), [Meta's official Instagram API collection](https://www.postman.com/meta/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00), [TikTok Content Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines).

## Validation

Run `node --test services/contentStudio.test.js services/adminAccess.test.js` from `backend`, and `npm run build` from `frontend`. Instagram provider calls in automated tests are simulated; publishing to the live Ready account requires configured credentials and an explicitly approved test post.
