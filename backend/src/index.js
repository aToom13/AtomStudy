export default {
  async fetch(request, env, ctx) {
    return new Response("Hello from AtomStudy Backend!", {
      headers: { "content-type": "text/plain" },
    });
  },
};
