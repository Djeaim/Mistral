import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getNextNumber } from '@/lib/documents/numbering';
import { renderPdf } from '@/lib/documents/pdf';
import { uploadDocument } from '@/lib/storage';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  const id = (await params).id;
  const [{ data: quote }, { data: lines }] = await Promise.all([
    supabase.from('quotes').select('*').eq('id', id).single(),
    supabase.from('quote_lines').select('*').eq('quote_id', id).order('position', { ascending: true })
  ]);
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [{ data: company }, { data: customer }] = await Promise.all([
    supabase.from('company_profiles').select('*').eq('user_id', quote.user_id).maybeSingle(),
    supabase.from('customers').select('*').eq('id', quote.customer_id).single()
  ]);
  const number = await getNextNumber(quote.user_id, 'invoice');
  const dueDate = new Date(quote.issue_date);
  dueDate.setDate(dueDate.getDate() + 30);

  const pdfBuffer = await renderPdf({
    kind: 'invoice',
    number,
    issue_date: quote.issue_date,
    due_or_valid: dueDate.toISOString().slice(0,10),
    currency: quote.currency,
    totals: { total_ht: Number(quote.total_ht), total_tva: Number(quote.total_tva), total_ttc: Number(quote.total_ttc) },
    lines: (lines || []).map((l: any) => ({ description: l.description, quantity: Number(l.quantity), unit_price: Number(l.unit_price), line_total_ht: Number(l.line_total_ht) })),
    company: company!,
    customer
  });
  const path = `documents/${quote.user_id}/invoices/${number}.pdf`;
  await uploadDocument(path, pdfBuffer);

  const { data: invoice, error } = await supabase.from('invoices').insert({
    user_id: quote.user_id,
    customer_id: quote.customer_id,
    invoice_number: number,
    issue_date: quote.issue_date,
    due_date: dueDate.toISOString().slice(0,10),
    currency: quote.currency,
    vat_rate: quote.vat_rate,
    notes: quote.notes,
    pdf_url: path,
    total_ht: quote.total_ht,
    total_tva: quote.total_tva,
    total_ttc: quote.total_ttc,
    related_quote_id: quote.id
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const lineRows = (lines || []).map((l: any, i: number) => ({ invoice_id: invoice.id, description: l.description, quantity: l.quantity, unit_price: l.unit_price, vat_rate: l.vat_rate, line_total_ht: l.line_total_ht, line_total_tva: l.line_total_tva, line_total_ttc: l.line_total_ttc, position: i }));
  await supabase.from('invoice_lines').insert(lineRows);
  return NextResponse.json({ id: invoice.id, number });
}


