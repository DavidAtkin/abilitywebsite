export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === "/api/contact") {
      try {
        const data = await request.json();
        
        // Check if variables are available
        if (!env.CF_ACCOUNT_ID || !env.CF_EMAIL_API_TOKEN) {
          return new Response(JSON.stringify({
            ok: false,
            error: "Environment variables missing. CF_ACCOUNT_ID = " + !!env.CF_ACCOUNT_ID + ", CF_EMAIL_API_TOKEN = " + !!env.CF_EMAIL_API_TOKEN
          }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ 
          ok: true, 
          message: "Variables detected successfully" 
        }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    return env.ASSETS.fetch(request);
  }
};
