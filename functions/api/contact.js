const TO_ADDRESS = "enquiries@abilityit.co.uk";
const FROM_ADDRESS = "website@abilityit.co.uk";

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
      const text = `Name: ${fullName}\nEmail: ${email}\nPhone: ${phone || "-"}\n\nMessage:\n${message || "-"}`;

      const html = `
        <h2>New Enquiry from Ability IT Website</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}<br>
           <strong>Email:</strong> ${escapeHtml(email)}<br>
           <strong>Phone:</strong> ${escapeHtml(phone || "-")}</p>
        <p><strong>Message:</strong><br>${escapeHtml(message || "-").replace(/\n/g, "<br>")}</p>
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

      const result = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        console.error("Email API Error:", result);
        return new Response(JSON.stringify({ ok: false, error: "Email sending failed" }), { status: 502 });
      }

      console.log("Email sent successfully to", TO_ADDRESS);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });

    } catch (err) {
      console.error("Contact form error:", err);
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
    }
  }
};
