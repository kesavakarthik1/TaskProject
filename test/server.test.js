import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../server.js";
import { createConfirmationEmail, validateRegistration } from "../shared/waitlist.js";
import { onRequestPost } from "../functions/api/waitlist.js";

const validRegistration = {
  name: "Aditi Sharma",
  email: "aditi@example.com",
  mobile: "9876543210",
  interest: "Loans",
  city: "Mumbai"
};

test("validates required registration fields and allowed interests", () => {
  assert.deepEqual(validateRegistration(validRegistration), {
    registration: validRegistration
  });
  assert.equal(validateRegistration({ ...validRegistration, email: "not-an-email" }).error,
    "Please enter a valid email address.");
  assert.equal(validateRegistration({ ...validRegistration, interest: "Other" }).error,
    "Please select a valid area of interest.");
});

test("escapes registrant values in the confirmation email", () => {
  const email = createConfirmationEmail({
    ...validRegistration,
    name: "<Aditi>",
    interest: "<Loans>"
  });
  assert.match(email.html, /&lt;Aditi&gt;/);
  assert.match(email.html, /&lt;Loans&gt;/);
  assert.match(email.text, /<Loans>/);
});

test("waitlist endpoint sends confirmation to the submitted email", async () => {
  let sentMessage;
  const app = createApp({
    sendMail: async (message) => {
      sentMessage = message;
      return { accepted: [validRegistration.email] };
    }
  });
  const testServer = app.listen(0);
  await new Promise((resolve) => testServer.once("listening", resolve));

  try {
    const response = await fetch(`http://127.0.0.1:${testServer.address().port}/api/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validRegistration)
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.match(body.message, /Loans, Aditi/);
    assert.equal(sentMessage.to, validRegistration.email);
    assert.match(sentMessage.subject, /Thanks for registering/);
  } finally {
    await new Promise((resolve, reject) => {
      testServer.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("returns a delivery error when the mail provider rejects a message", async () => {
  const app = createApp({
    sendMail: async () => {
      throw new Error("SMTP unavailable");
    }
  });

  test("returns JSON errors for invalid JSON and unknown API routes", async () => {
    const app = createApp({
      sendMail: async () => ({ accepted: [validRegistration.email] })
    });
    const testServer = app.listen(0);
    await new Promise((resolve) => testServer.once("listening", resolve));

    try {
      const baseUrl = `http://127.0.0.1:${testServer.address().port}`;
      const invalidJsonResponse = await fetch(`${baseUrl}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{"
      });
      assert.equal(invalidJsonResponse.status, 400);
      assert.match((await invalidJsonResponse.json()).error, /valid JSON/);

      const unknownRouteResponse = await fetch(`${baseUrl}/api/missing`);
      assert.equal(unknownRouteResponse.status, 404);
      assert.match((await unknownRouteResponse.json()).error, /not found/);
    } finally {
      await new Promise((resolve, reject) => {
        testServer.close((error) => error ? reject(error) : resolve());
      });
    }
  });

  test("Cloudflare Pages function sends a confirmation through Resend", async () => {
    const originalFetch = globalThis.fetch;
    let resendRequest;
    globalThis.fetch = async (url, options) => {
      resendRequest = { url, options };
      return new Response(JSON.stringify({ id: "email-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    try {
      const response = await onRequestPost({
        request: new Request("https://example.com/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validRegistration)
        }),
        env: {
          RESEND_API_KEY: "test-api-key",
          RESEND_FROM: "LifeTime <hello@example.com>"
        }
      });
      const body = await response.json();
      const emailRequest = JSON.parse(resendRequest.options.body);

      assert.equal(response.status, 201);
      assert.match(body.message, /Loans, Aditi/);
      assert.equal(resendRequest.url, "https://api.resend.com/emails");
      assert.equal(resendRequest.options.headers.Authorization, "Bearer test-api-key");
      assert.deepEqual(emailRequest.to, [validRegistration.email]);
      assert.equal(emailRequest.from, "LifeTime <hello@example.com>");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Cloudflare Pages function returns JSON when Resend rejects the email", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("rejected", { status: 403 });

    try {
      const response = await onRequestPost({
        request: new Request("https://example.com/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validRegistration)
        }),
        env: {
          RESEND_API_KEY: "test-api-key",
          RESEND_FROM: "LifeTime <hello@example.com>"
        }
      });

      test("Cloudflare Pages function reports missing Resend configuration", async () => {
        const response = await onRequestPost({
          request: new Request("https://example.com/api/waitlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validRegistration)
          }),
          env: {}
        });

        assert.equal(response.status, 503);
        assert.match((await response.json()).error, /not configured/);
      });

      assert.equal(response.status, 502);
      assert.match((await response.json()).error, /confirmation email/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
  const testServer = app.listen(0);
  await new Promise((resolve) => testServer.once("listening", resolve));

  try {
    const response = await fetch(`http://127.0.0.1:${testServer.address().port}/api/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validRegistration)
    });
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.match(body.error, /confirmation email/);
  } finally {
    await new Promise((resolve, reject) => {
      testServer.close((error) => error ? reject(error) : resolve());
    });
  }
});
