const TO_ADDRESS = "enquiries@abilityit.co.uk";
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

  if (!env.CF_ACCOUNT_ID || !env.CF_EMAIL_API_TOKEN) {
    return jsonResponse({ ok: false, error: "Email service not configured." }, 500);
  }

  const subject = `New Website Enquiry from ${fullName}`;

  const text = `New enquiry from Ability IT website\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone || "-"}\n\nMessage:\n${message || "-"}`;

  const html = `
    <h2>New Enquiry from Ability IT Website</h2>
    <p><strong>Name:</strong> ${escapeHtml(fullName)}<br>
       <strong>Email:</strong> ${escapeHtml(email)}<br>
       <strong>Phone:</strong> ${escapeHtml(phone || "-")}</p>
    <p><strong>Message:</strong><br>${escapeHtml(message || "-").replace(/\n/g, "<br>")}</p>
  `;

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

    if (!resp.ok) {
      return jsonResponse({ ok: false, error: "Failed to send email." }, 502);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error(err);
    return jsonResponse({ ok: false, error: "Internal server error." }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
