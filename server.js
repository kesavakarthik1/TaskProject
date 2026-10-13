import "dotenv/config";
import express from "express";
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createConfirmationEmail, validateRegistration } from "./shared/waitlist.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

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

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
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

export { createApp };
