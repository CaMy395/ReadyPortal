# Ready Bartending marketing operations

Marketing Intelligence is available at `/admin/marketing`. Full administrators can grant `marketing.view` to a limited role. Only full administrators can initiate Google sync. The report and CSV return aggregates. Date ranges are inclusive and compare with the immediately preceding range of equal length.

## Reporting definitions

- Inquiries come from the six public inquiry tables. Historical answers remain in their original fields. Customer-reported and detected sources have separate breakdowns. AI-assisted inquiries count a record once when either source identifies an AI or voice assistant. A generic historical “Voice search” answer has no identifiable assistant.
- Conversion uses the inquiry date and current booking state. Historical links require a unique matching email and event date, with a service match for experience and training appointments. Older inquiries without a usable date or ambiguous matches contribute to inquiry totals and can leave bookings unattributed. Current booking status is used because status-transition timestamps are unavailable. Record-level counts cannot identify old duplicate customer submissions without a shared ID.
- Revenue uses quote payments, appointment income with an appointment ID, and paid ticket orders. Ticket checkout attribution attaches to the order and is included in paid revenue without inflating inquiry counts. It represents recorded service receipts in USD. Historical payments outside these ledgers and payments without reliable attribution are distinguishable from attributed revenue. Where ticket settlement has no ledger timestamp, reporting uses the order’s last updated date.
- QR reporting counts tracked landing requests and link clicks. Existing truck links are included. Add a distinct `ref` to each new QR destination, such as `/rb/connect?ref=wedding-flyer`. QR counts describe engagements, and repeat visits can be legitimate.
- A zero is a measured zero. Unattributed is a record without a recognized or reliably linked source. Unavailable denotes a metric without the necessary data, including conversion with no inquiry denominator and Google metrics before sync.

## Google authorization

1. Enable Search Console API and grant the authorized Google user access to the verified domain property or canonical URL-prefix property. Request an offline OAuth grant for `https://www.googleapis.com/auth/webmasters.readonly`. Store the refresh token as `MARKETING_GSC_REFRESH_TOKEN` and the property as `MARKETING_GSC_PROPERTY` (for example `sc-domain:readybartending.com`). [Search Console API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
2. Use an account that manages the verified Business Profile. Enable and request access for Business Profile Performance and Business Profile reviews. Request an offline grant for `https://www.googleapis.com/auth/business.manage`. Set `MARKETING_GBP_REFRESH_TOKEN`, `MARKETING_GBP_LOCATION_ID`, and `MARKETING_GBP_ACCOUNT_ID` using the numeric IDs from the authorized account. [Performance API](https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries) · [Reviews API](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list)
3. Put `MARKETING_GOOGLE_CLIENT_ID` and `MARKETING_GOOGLE_CLIENT_SECRET` in the deployment secret store along with the refresh tokens. Sync each tile from the admin page. Check its last successful sync and any error shown. The reviews card stores the aggregate lifetime rating and count.
4. Verify `GOOGLE_REVIEW_URL` is the business’s official review link. New feedback offers every consenting customer the same link. Reopening a submitted feedback link recovers that invitation when consent was recorded. Older feedback did not retain consent, so its original preference cannot be reconstructed.

## Business listing checklist

Use the same verified business name, phone, website, service area, hours and service descriptions across listings. Use approved photos and current offers. Claim an existing profile before creating another. Record its owner, verification status, public URL and last review date. Apply platform-specific eligibility rules before registration.

| Channel | Owner action |
| --- | --- |
| Google Business Profile | Verify ownership, service area, primary category, services, photos, booking link and review URL. |
| Apple Maps | Claim or add the business in Apple Business Connect and verify the website and map details. |
| Bing | Claim or update Bing Places and check service area and website after import. |
| Yelp | Claim the business page and confirm contact details, services and booking link. |
| Airbnb Experiences | Verify host and experience eligibility before submitting a cocktail experience. |
| Viator | Register or claim the supplier account and submit only bookable, approved experiences. |
| Tripadvisor | Claim the eligible listing and check overlap with any Viator listing. |
| Batch | Verify current vendor eligibility and submit suitable bachelorette and group offerings. |
| The Bash and Eventective | Claim or create eligible event vendor profiles and publish current service areas. |
| Preferred venues and local directories | Confirm referral contact, current service descriptions and trackable inquiry links. |

Use campaign links with `utm_source`, `utm_medium` and `utm_campaign` for each channel. Use the canonical website hostname. Google Search Console can submit `https://www.readybartending.com/sitemap.xml` after verifying ownership. Search crawler access extends to Googlebot, Bingbot and OAI-SearchBot via the wildcard group. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)

## Deployment

Apply `backend/sql/marketing_intelligence.sql` before deploying the application. The migration adds nullable columns and new indexes with no historical rewrite. Use the established master-triggered deployment and verify the build, public HTML, sitemap, robots, access controls and Google connection statuses. A code rollback can leave the added schema in place.
