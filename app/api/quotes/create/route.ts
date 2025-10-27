import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getNextNumber } from '@/lib/documents/numbering';
import { computeTotals } from '@/lib/documents/calc';
import { renderPdf } from '@/lib/documents/pdf';
import { uploadDocument } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set(name: string, value: string, options: CookieOptions) { res.cookies.set({ name, value, ...options }); },
      remove(name: string, options: CookieOptions) { res.cookies.set({ name, value: '', ...options }); }
    }
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { customer_id, issue_date, valid_until, currency = 'EUR', vat_rate, notes, lines = [] } = body || {};
  if (!customer_id || !issue_date || !Array.isArray(lines) || lines.length === 0) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const [{ data: company }, { data: customer }] = await Promise.all([
    supabase.from('company_profiles').select('*').eq('user_id', auth.user.id).maybeSingle(),
    supabase.from('customers').select('*').eq('id', customer_id).single()
  ]);
  if (!company) return NextResponse.json({ error: 'Company profile required' }, { status: 400 });

  const number = await getNextNumber(auth.user.id, 'quote');
  const totals = computeTotals(lines, vat_rate ?? null, Number(company.default_vat_rate ?? 20));
  const pdfBuffer = await renderPdf({
    kind: 'quote',
    number,
    issue_date,
    due_or_valid: valid_until || null,
    currency,
    totals: { total_ht: totals.total_ht, total_tva: totals.total_tva, total_ttc: totals.total_ttc },
    lines: lines.map((l: any, i: number) => ({ description: l.description, quantity: l.quantity, unit_price: l.unit_price, line_total_ht: totals.lines[i].line_total_ht })),
    company,
    customer
  });

  const path = `documents/${auth.user.id}/quotes/${number}.pdf`;
  await uploadDocument(path, pdfBuffer);

  const { data: quote, error } = await supabase.from('quotes').insert({
    user_id: auth.user.id,
    customer_id,
    quote_number: number,
    issue_date,
    valid_until,
    currency,
    vat_rate,
    notes,
    pdf_url: path,
    total_ht: totals.total_ht,
    total_tva: totals.total_tva,
    total_ttc: totals.total_ttc
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const lineRows = lines.map((l: any, i: number) => ({ quote_id: quote.id, description: l.description, quantity: l.quantity, unit_price: l.unit_price, vat_rate: l.vat_rate ?? vat_rate ?? null, line_total_ht: totals.lines[i].line_total_ht, line_total_tva: totals.lines[i].line_total_tva, line_total_ttc: totals.lines[i].line_total_ttc, position: i }));
  await supabase.from('quote_lines').insert(lineRows);

  return NextResponse.json({ id: quote.id, number });
}


