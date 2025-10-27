import { NextResponse, type NextRequest } from 'next/server';
import { VERSION } from '@/lib/version';

export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true, version: VERSION, time: new Date().toISOString() });
}


