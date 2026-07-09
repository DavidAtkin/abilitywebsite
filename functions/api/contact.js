const TO_ADDRESS = "enquiries@abilityit.co.uk";   // Change if you prefer support@ or another address
const FROM_ADDRESS = "website@abilityit.co.uk";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function handleContact(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: "Invalid request body." }, 400);
  }

  // Honeypot spam protection
  if (data.website) {
    return jsonResponse({ ok: true }, 200);
  }

  const firstName = (data.firstName || "").trim();
  const lastName  = (data.lastName || "").trim();
  const email     = (data.email || "").trim();
  const phone     = (data.phone || "").trim();
  const message   = (data.message || "").trim();

  const fullName = `${firstName} ${lastName}`.trim();

  if (!firstName || !lastName || !email) {
    return jsonResponse({ ok: false, error: "Name and email are required." }, 400);
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return jsonResponse({ ok: false, error: "Please provide a valid email address." }, 400);
  }

  if (!env.CF_ACCOUNT_ID || !env.CF_EMAIL_API_TOKEN) {
    return jsonResponse({ ok: false, error: "Email service not configured yet." }, 500);
  }

  const subject = `New Website Enquiry from ${fullName}`;

  const text = 
    `New enquiry from Ability IT website\n\n` +
    `Name: ${fullName}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone || "-"}\n\n` +
    `Message:\n${message || "-"}\n`;

  const html = 
    `<h2 style="font-family: Inter, sans-serif;">New Enquiry from Ability IT Website</h2>` +
    `<p style="font-family: Inter, sans-serif;">` +
    `<strong>Name:</strong> ${escapeHtml(fullName)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}<br>` +
    `<strong>Phone:</strong> ${escapeHtml(phone || "-")}` +
    `</p>` +
    `<p style="font-family: Inter, sans-serif;">` +
    `<strong>Message:</strong><br>${escapeHtml(message || "-").replace(/\n/g, "<br>")}` +
    `</p>`;

  try {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CF_EMAIL_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: TO_ADDRESS,
          from: FROM_ADDRESS,
          subject,
          text,
          html
        })
      }
    );

    const result = await resp.json().catch(() => ({}));

    if (!resp.ok || result.success === false) {
      console.error("Cloudflare Email error:", result);
      return jsonResponse({ ok: false, error: "Failed to send message. Please try again." }, 502);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error("Contact form error:", err);
    return jsonResponse({ ok: false, error: "Failed to send message. Please try again." }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === "/api/contact") {
      return handleContact(request, env);
    }
    
    // Serve static assets (important for Pages)
    return env.ASSETS.fetch(request);
  }
};
