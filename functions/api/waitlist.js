import { createConfirmationEmail, validateRegistration } from "../../shared/waitlist.js";

const MAX_BODY_SIZE = 10 * 1024;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function jsonResponse(body, status) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_SIZE) {
    return jsonResponse({ error: "The request is too large." }, 413);
  }

  let input;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_SIZE) {
      return jsonResponse({ error: "The request is too large." }, 413);
    }
    input = JSON.parse(body);
  } catch {
    return jsonResponse({ error: "The request body must contain valid JSON." }, 400);
  }

  const result = validateRegistration(input);
  if (result.error) {
    return jsonResponse({ error: result.error }, 400);
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    console.error("Resend is not configured. Set RESEND_API_KEY and RESEND_FROM in Cloudflare Pages.");
    return jsonResponse({ error: "Registration email is not configured yet. Please try again later." }, 503);
  }

  const registration = result.registration;
  const email = createConfirmationEmail(registration);
  try {
    const resendResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: [registration.email],
        ...email
      })
    });

    if (!resendResponse.ok) {
      console.error(`Resend rejected the confirmation email with status ${resendResponse.status}.`);
      return jsonResponse({
        error: "We couldn't send your confirmation email right now. Please try again."
      }, 502);
    }
  } catch (error) {
    console.error("Unable to reach Resend:", error);
    return jsonResponse({
      error: "We couldn't send your confirmation email right now. Please try again."
    }, 502);
  }

  return jsonResponse({
    message: `Thanks for registering your interest in ${registration.interest}, ${registration.name.split(/\s+/)[0]}! Please check your inbox.`
  }, 201);
}
