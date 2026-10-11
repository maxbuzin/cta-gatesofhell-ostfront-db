/** Accept CSP reports; never echo body. Always 204. */
export async function POST() {
  return new Response(null, { status: 204 });
}

export async function GET() {
  return new Response(null, { status: 404 });
}
