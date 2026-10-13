const INTERESTS = new Set(["Loans", "Insurance", "Investments", "Wealth solutions"]);

export function validateRegistration(input) {
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

export function createConfirmationEmail(registration) {
  const firstName = registration.name.split(/\s+/)[0];
  const safeFirstName = escapeHtml(firstName);
  const safeInterest = escapeHtml(registration.interest);

  return {
    subject: "Thanks for registering your interest with LifeTime",
    text: `Hi ${firstName},\n\nThanks for registering your interest in ${registration.interest} with LifeTime. Our team will be in touch soon.\n\nWarm regards,\nThe LifeTime team`,
    html: `<p>Hi ${safeFirstName},</p><p>Thanks for registering your interest in <strong>${safeInterest}</strong> with LifeTime. Our team will be in touch soon.</p><p>Warm regards,<br>The LifeTime team</p>`
  };
}
