# Koola Partners

The affiliate portal for `partner.koola.store`. Partners sign up with a password and verify their email, or use Google after it is configured. They can enter the dashboard immediately. NIN/BVN review unlocks their partner code and vendor attribution. Earnings and payouts wait for the order and payment ledger.

```sh
npm ci
VITE_API_BASE_URL=http://127.0.0.1:4000 npm run dev
npm run build
npm run test:browser
```

The browser test uses disposable local PostgreSQL and Redis, plus the sibling `api/` service. Build the API first. For deployment, build with `VITE_API_BASE_URL=https://api.koola.store` and `VITE_GOOGLE_CLIENT_ID` set to the Google web client ID. The API also needs `RESEND_API_KEY`, `RESEND_FROM_EMAIL` and `GOOGLE_CLIENT_ID` for live registration and Google sign-in. Add `https://partner.koola.store` to the Google web client's authorized JavaScript origins. `wrangler.jsonc` serves the static SPA, and `public/_headers` applies CSP and noindex.

Sign-in tokens stay in browser memory. Refreshing asks the partner to sign in again. The founder handles deployment. See the [API contract](../api/docs/contract.md).
