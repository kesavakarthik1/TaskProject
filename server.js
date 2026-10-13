require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const ROOT = __dirname;
const INTERESTS = new Set(["Loans", "Insurance", "Investments", "Wealth solutions"]);

function validateRegistration(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Please provide your registration details." };
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const mobile = typeof input.mobile === "string" ? input.mobile.replace(/\D/g, "") : "";
  const interest = typeof input.interest === "string" ? input.interest.trim() : "";
  const city = typeof input.city === "string" ? input.city.trim() : "";

  if (name.length < 2 || name.length > 100) {
    return { error: "Please enter a name between 2 and 100 characters." };
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (mobile.length !== 10) {
    return { error: "Please enter a valid 10-digit mobile number." };
  }
  if (!INTERESTS.has(interest)) {
    return { error: "Please select a valid area of interest." };
  }
  if (city.length < 2 || city.length > 100) {
    return { error: "Please enter a city between 2 and 100 characters." };
  }

  return { registration: { name, email, mobile, interest, city } };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function createConfirmationEmail(registration) {
  const firstName = registration.name.split(/\s+/)[0];
  const safeFirstName = escapeHtml(firstName);
  const safeInterest = escapeHtml(registration.interest);

  return {
    subject: "Thanks for registering your interest with LifeTime",
    text: `Hi ${firstName},\n\nThanks for registering your interest in ${registration.interest} with LifeTime. Our team will be in touch soon.\n\nWarm regards,\nThe LifeTime team`,
    html: `<p>Hi ${safeFirstName},</p><p>Thanks for registering your interest in <strong>${safeInterest}</strong> with LifeTime. Our team will be in touch soon.</p><p>Warm regards,<br>The LifeTime team</p>`
  };
}

function createApp(mailer) {
  const app = express();
  app.use(express.json({ limit: "10kb" }));

  app.get("/", (request, response) => response.sendFile(path.join(ROOT, "index.html")));
  app.use("/css", express.static(path.join(ROOT, "css")));
  app.use("/js", express.static(path.join(ROOT, "js")));
  app.use("/assets", express.static(path.join(ROOT, "assets")));

  app.post("/api/waitlist", async (request, response) => {
    const result = validateRegistration(request.body);
    if (result.error) {
      return response.status(400).json({ error: result.error });
    }

    const registration = result.registration;
    const email = createConfirmationEmail(registration);
    try {
      await mailer.sendMail({
        from: `"LifeTime" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: registration.email,
        ...email
      });
    } catch (error) {
      console.error("Unable to send waitlist confirmation email:", error);
      return response.status(502).json({
        error: "We couldn't send your confirmation email right now. Please try again."
      });
    }

    return response.status(201).json({
      message: `Thanks for registering your interest in ${registration.interest}, ${registration.name.split(/\s+/)[0]}! Please check your inbox.`
    });
  });

  app.use("/api", (request, response) => {
    response.status(404).json({ error: "This API endpoint was not found." });
  });

  app.use((error, request, response, next) => {
    if (!request.path.startsWith("/api/")) {
      return next(error);
    }

    const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
    if (status === 500) {
      console.error("Waitlist API request failed:", error);
    }
    return response.status(status).json({
      error: status === 413
        ? "The request is too large."
        : status === 400
          ? "The request body must contain valid JSON."
          : "The registration request could not be processed."
    });
  });

  return app;
}

function createMailer() {
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing SMTP configuration: ${missing.join(", ")}. Set these values in your .env file.`);
  }

  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

if (require.main === module) {
  try {
    const mailer = createMailer();
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("PORT must be a valid port number.");
    }

    createApp(mailer).listen(port, () => {
      console.log(`LifeTime waitlist backend listening on port ${port}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { createApp, createConfirmationEmail, validateRegistration };
