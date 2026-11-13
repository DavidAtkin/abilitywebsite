export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
  const reply = (ok, status = ok ? 200 : 400) => wantsJson
    ? Response.json({ ok }, { status })
    : Response.redirect(new URL(ok ? "/?sent=1#contact" : "/?sent=0#contact", request.url), 303);

  const d = await request.formData();
  if (d.get("hp_field")) return reply(true);

  const firstName = String(d.get("firstName") || "").trim().slice(0, 200);
  const lastName = String(d.get("lastName") || "").trim().slice(0, 200);
  const email = String(d.get("email") || "").trim().slice(0, 200);
  const phone = String(d.get("phone") || "").trim().slice(0, 50);
  const message = String(d.get("message") || "").trim().slice(0, 5000);

  if (!firstName || !lastName || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply(false);
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const esc = (s) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const subject = `New Website Enquiry from ${fullName}`;
  const text =
    `New enquiry from Ability IT website\n\n` +
    `Name: ${fullName}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone || "Not provided"}\n\n` +
    `Message:\n${message}\n`;
  const html = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            New Website Enquiry
          </h2>
         
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${esc(fullName)}</p>
            <p><strong>Email:</strong> ${esc(email)}</p>
            <p><strong>Phone:</strong> ${esc(phone || "Not provided")}</p>
          </div>
         
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-weight: 600; color: #1e3a8a;">Message:</p>
            <p style="white-space: pre-wrap; line-height: 1.6;">${esc(message).replace(/\n/g, "<br>")}</p>
          </div>
         
          <p style="color: #64748b; font-size: 0.9em; margin-top: 30px;">
            This enquiry was sent from the Ability IT website.
          </p>
        </div>
      `;

  try {
    await env.CONTACT_EMAIL.send({
      to: "enquiries@abilityit.co.uk",
      from: { email: "website@abilityit.co.uk", name: "Ability IT website" },
      replyTo: { email, name: fullName },
      subject,
      text,
      html,
    });
    return reply(true);
  } catch (e) {
    console.error("Contact send failed", e.code, e.message);
    return reply(false, 500);
  }
}
