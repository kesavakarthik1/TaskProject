const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createApp, createConfirmationEmail, validateRegistration } = require("../server");

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
