# LifeTime waitlist

The site supports two deployments:

- Cloudflare Pages uses the Pages Function in `functions/api/waitlist.js` and sends confirmations through Resend's HTTPS API.
- Local Node.js development uses the Express backend and SMTP.

## Deploy to Cloudflare Pages

1. In Resend, add and verify a domain you control, then create an API key.
2. In Cloudflare, connect this repository as a Pages project. Use no build command and set the build output directory to `.`.
3. In the Pages project settings, add `RESEND_API_KEY` as a secret and `RESEND_FROM` as a variable, for example `LifeTime <hello@your-verified-domain.com>`. The sender domain must be verified in Resend.
4. Set these values for both Production and Preview deployments, then redeploy.

Cloudflare Pages maps `functions/api/waitlist.js` to `POST /api/waitlist`. Do not put the Resend API key in frontend JavaScript or commit it to the repository. A personal Gmail address/App Password is not a valid Resend sender; use an address on your verified domain.

## Run locally with SMTP

1. Install Node.js 18 or newer and run `npm install`.
2. Copy `.env.example` to `.env` and configure SMTP. For Gmail, use an App Password with 2-Step Verification enabled, not your regular account password.
3. Run `npm start` and open `http://localhost:3000`.

`SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are required. `SMTP_PORT` defaults to `587`, `SMTP_SECURE` defaults to `false`, and `SMTP_FROM` defaults to `SMTP_USER`. The example uses Gmail's secure SMTP port `465`.

For local testing of the Cloudflare Pages Function itself, use Cloudflare Pages local development (`wrangler pages dev`) and provide `RESEND_API_KEY` and `RESEND_FROM` through local Cloudflare secrets/environment configuration. Do not commit API keys or SMTP credentials.
