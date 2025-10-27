import { NextResponse, type NextRequest } from 'next/server';

const GIF_DATA = Buffer.from(
  'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('m');
    // We do not enforce auth for tracking pixel; update counters best-effort via RPC to avoid RLS
    if (token) {
      // Fire-and-forget fetch to our own API to increment (optional); for MVP we skip server call to Supabase here.
      // A production setup would update email_messages.open_count and insert an 'open' event.
    }
  } catch {}

  return new NextResponse(GIF_DATA, {
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(GIF_DATA.length),
      'Cache-Control': 'no-store, must-revalidate'
    }
  });
}


