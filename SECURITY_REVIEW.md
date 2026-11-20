# Security review and seller marketplace

Review date: 18 Nov 2026. Scope: API server (`artifacts/api-server`), storefront and admin (`artifacts/poster-studio`), Prisma schema, scripts, deployment config.

## Safe deploy order (the site is live)

Follow this order so no existing feature breaks:

1. **Update the database first.** The change only adds tables and columns, and every new column has a default. Nothing is dropped, and the current live code ignores the new columns. Review the exact SQL in `lib/db/prisma/marketplace-migration.sql`, then run:
   ```bash
   pnpm --filter @workspace/db run push
   ```
2. **Set the Razorpay variables in Vercel.** Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Checkout now creates the payment on the server, so it returns an error if these are missing. Use a `rzp_live_` pair to take real payments, or a `rzp_test_` pair to stay in test mode.
3. **Commit everything together and deploy.** Your committed `admin.ts` already uses the new seller tables, so it must ship with `schema.prisma` and the other new files.
4. **Check `https://<your-api>/api/healthz` after the deploy.** Under `readiness`, you should see `marketplaceSchema: "ready"` and `payments: "configured (LIVE mode)"` (or TEST mode).

## Recommended security follow-ups

1. **Rotate the admin password and API key.** The old values were hardcoded in source and bundled into the public JavaScript. The server now refuses them, so admin login stays off until you set new ones.
   - `ADMIN_PASSWORD`: a new password, at least 10 characters.
   - `ADMIN_API_KEY`: a new random value of at least 24 characters, or leave it empty to turn off master-key login.
   - `ADMIN_SECRET_KEY`: rotate it as well. A test session was signed with it during this review.
2. **Rotate the Cloudinary API secret** in the Cloudinary console. The old one is in git history. Then set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in Vercel, and delete the fallback values in `artifacts/api-server/src/lib/cloudinary.ts`. Until then the old values are used as a fallback, so uploads keep working.
3. **Revoke the GitHub personal access token** embedded in this checkout's git remote URLs (`git remote -v`). Use a credential manager instead.
4. **Remove `VITE_ADMIN_*` variables** from Vercel and Cloudflare if they exist. Anything prefixed `VITE_` is published to every visitor.
5. Optional: set `SELLER_TOKEN_SECRET` (falls back to `JWT_SECRET`), and set `CORS_ORIGIN` to your real domains instead of `*`.

## High-risk findings (all fixed)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | Critical | Admin password and master API key were hardcoded in `admin-page.tsx` and sent to browsers via `VITE_ADMIN_*`. A browser-side login fallback compared against them. Anyone could read them and call every admin API. | Removed the fallback and the `VITE_ADMIN_*` vars. The server rejects the leaked values by fingerprint. Login is decided only by the server. |
| 2 | Critical | Checkout trusted prices from the browser. Anyone could buy any item for ₹1. | The server prices every line from the database, including size prices, custom prints, shipping, platform fee and coupons. |
| 3 | Critical | The browser could create orders already marked `PAID`. `PATCH /api/orders/:id/payment` let anyone mark any order paid. If Razorpay failed to load, the client faked a successful payment. | The server creates the Razorpay order for its own total. The order becomes `PAID` only after `/verify-payment` checks the Razorpay HMAC signature. Fake success and the open PATCH route are removed. |
| 4 | Critical | Cloudinary API secret hardcoded in the server and 4 scripts. | Scripts read env only. The server prefers env and keeps the old values as a fallback, so live uploads do not break. Failed uploads now show an error instead of saving raw base64 into the database. |
| 5 | High | `GET /api/addresses?phone=` returned anyone's home address. `DELETE /api/addresses/:id` had no auth. | Admin-only. The storefront keeps addresses locally and never called these. |
| 6 | High | Order numbers were 4 random digits, which are guessable and collide. `GET /api/orders/:id` returned name, phone, email and address. | 8-character random order numbers. Lookup also requires the phone number used at checkout. |
| 7 | High | All rate limiters shared one counter per IP. After about 20 API calls a shopper was blocked from checkout. | Each limiter has its own counter. |
| 8 | High | Rate limits and login lockout keyed on the first `X-Forwarded-For` entry, which attackers control. | Uses the proxy-resolved `req.ip`. |
| 9 | High | Secrets were read before `.env` loaded locally, so the admin signing key was empty in dev. This is likely why the browser fallback existed. | `src/env.ts` loads first. |
| 10 | Medium | 500 errors echoed internal error messages. Wildcard CORS was combined with credentials. Admin revenue counted unpaid orders. Coupon expiry was ignored at checkout. Stock decrement matched by title and could hit the wrong products. Password and key comparisons were not constant-time. | All fixed. |
| 11 | Medium | Vite dev server faked every `/api/admin/*` response, so real admin login could never work in dev. | API mocks are now opt-in with `MOCK_API=1`. |
| 12 | Medium | Product page hooks ran after an early return, which crashed when a product loaded late. The page also showed "not found" for items newer than the 30-minute catalog cache. | Split into two components. Missing products are fetched directly. |

## Remaining risks (not changed)

- **Fake ratings.** Every product shows "4.9 (148 verified ratings)" by default. With third-party sellers this looks like fabricated reviews. Show real reviews or hide the rating.
- **Rate limits are in memory.** On Vercel each instance has its own counters. Use Upstash or Redis for a hard limit.
- **No Razorpay webhook.** If a shopper closes the tab after paying but before `/verify-payment` runs, the order stays `PENDING` and you must reconcile it in the Razorpay dashboard. Add a `payment.captured` webhook to close this gap.
- **Admin auth fallbacks.** `security.ts` falls back to a hardcoded `ADMIN_SECRET_KEY` and to the previously leaked master API key when the env values are missing or short. Set both in Vercel with new random values, then remove the fallbacks.
- **Admin password changes only last until restart.** "Change password" applies to the running server only. Update `ADMIN_PASSWORD` in Vercel instead.
- **No real customer accounts.** Customer login is a local demo, so order history lives in the browser.
- **Global CSS reset.** `* { margin: 0; padding: 0 }` in `index.css` silently disables Tailwind spacing classes site-wide. The seller pages work around it in `seller-portal.css`. Moving the reset into `@layer base` would fix it everywhere, but could shift existing layouts.

## Seller marketplace

Sellers list products in any store category and fulfil their own orders. Sellers cannot sign themselves up: the admin creates every seller account.

**Flow:** a seller clicks **Partner With Us**, which opens the email draft to your Gmail as before → you review the email → in **Admin › Marketplace Sellers** you click **Create seller account** and enter their details, commission and a login password → you copy the login details shown and send them to the seller → the seller signs in at `/seller` and adds listings → admin reviews each listing → approved listings appear in the store with "Sold by" and a store page at `/store/<slug>` → after payment the seller sees the order with the delivery address and marks it shipped with a tracking number → the dashboard shows gross sales, commission and net payout.

**Rules enforced on the server:**
- Public sign-up is closed. `POST /api/seller/register` returns 403, and only `POST /api/admin/sellers` creates accounts. If a seller forgets their password, set a new one from their **Review** dialog in the admin panel.
- Pending, rejected or suspended sellers cannot list products. Suspending a seller hides all of their listings at once.
- Every new listing needs admin approval. Edits to the title, photos, description or category go back to review. Price, stock and pause changes do not.
- Sellers can only see and change their own listings and order items. They see the delivery name, address and phone, but not the customer's email.
- Seller images must be uploads to your Cloudinary account, not external links. Sellers cannot inject the internal `sizeprice:` or `rating:` tags.
- Passwords are hashed with scrypt. Bank account numbers are masked in every API response.
- Payouts are calculated but not sent automatically. Pay sellers from the "due" figure in the admin table.

**New API routes:**
- Seller: `/api/seller/login`, `/api/seller/me`, `/api/seller/dashboard`, `/api/seller/products`, `/api/seller/upload-image`, `/api/seller/orders`.
- Admin: `/api/admin/sellers` (list and create), `/api/admin/sellers/:id/password`, `/api/admin/sellers/:id/status`, `/api/admin/listings`, `/api/admin/products/:id/approval`.
- Public: `/api/stores/:slug`.

## Verification

- API and storefront type-check cleanly. The production builds succeed. The built JavaScript contains none of the leaked credentials.
- 18 unit checks pass for pricing, signatures, password hashing and tokens.
- 26 end-to-end checks pass for the marketplace, run against a throwaway local Postgres.
- 25 end-to-end checks pass for checkout, using a local stub in place of Razorpay. These cover tampered prices, forged signatures, idempotent payment, stock, seller isolation and earnings.
- Seller registration, the dashboard, admin approval, listing review, the store page and "Sold by" were all clicked through in a browser.
- **Not tested:** a real Razorpay payment, and real Cloudinary uploads. Test both once on staging after rotating the keys.
