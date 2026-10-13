# LifeTime waitlist

The website and waitlist API run together in the Node.js backend. A valid waitlist submission sends a confirmation email to the email address entered in the form.

## Run locally

1. Install Node.js 18 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and configure the SMTP account. For Gmail, use an App Password (with 2-Step Verification enabled); do not use your regular account password.
4. Start the app with `npm start` and open `http://localhost:3000`.

`SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are required. `SMTP_PORT` defaults to `587`, `SMTP_SECURE` defaults to `false`, and `SMTP_FROM` defaults to `SMTP_USER`. The example uses Gmail's secure SMTP port `465`.

Deploy the Node.js app on a host that supports outbound SMTP and serve it over HTTPS. Keep `.env` and all SMTP credentials out of source control. The registration API is available at `POST /api/waitlist`.
