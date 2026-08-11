return new Response(
  JSON.stringify({
    method: request.method,
    pathname: url.pathname
  })
);
