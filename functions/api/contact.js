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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/contact") {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405 });
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400 });
    }

    if (data.website) return new Response(JSON.stringify({ ok: true }), { status: 200 });

    const firstName = (data.firstName || "").trim();
    const lastName = (data.lastName || "").trim();
    const email = (data.email || "").trim();
    const phone = (data.phone || "").trim();
    const message = (data.message || "").trim();

    const fullName = `${firstName} ${lastName}`.trim();

    try {
      const subject = `New Website Enquiry from ${fullName}`;

      const text = `New enquiry from Ability IT website\n\n` +
        `Name: ${fullName}\n` +
        `Email: ${email}\n` +
        `Phone: ${phone || "Not provided"}\n\n` +
        `Message:\n${message || "No message provided"}\n`;

      const html = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            New Website Enquiry
          </h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-weight: 600; color: #1e3a8a;">Message:</p>
            <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message || "No message provided")}</p>
          </div>
          
          <p style="color: #64748b; font-size: 0.9em; margin-top: 30px;">
            This enquiry was sent from the Ability IT website.
          </p>
        </div>
      `;

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
        console.error("Email API failed:", await resp.text());
        return new Response(JSON.stringify({ ok: false, error: "Failed to send email" }), { status: 502 });
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });

    } catch (err) {
      console.error("Contact form error:", err);
      return new Response(JSON.stringify({ ok: false, error: "Internal error" }), { status: 500 });
    }
  }
};
