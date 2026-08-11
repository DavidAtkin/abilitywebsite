export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    return new Response(
      JSON.stringify(
        {
          method: request.method,
          pathname: url.pathname,
          url: request.url
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
};
