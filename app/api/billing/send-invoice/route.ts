import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createTransportFromCreds } from '@/lib/mailer';
import { decryptFromBase64 } from '@/lib/crypto';
import { getSignedUrl } from '@/lib/storage';

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
  const { invoice_id, to_email } = await req.json();
  const [{ data: invoice }, { data: smtp }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', invoice_id).single(),
    supabase.from('smtp_credentials').select('*').eq('user_id', auth.user.id).limit(1).maybeSingle()
  ]);
  if (!invoice || !smtp) return NextResponse.json({ error: 'Missing invoice/SMTP' }, { status: 400 });
  const url = await getSignedUrl(invoice.pdf_url);
  const pass = decryptFromBase64(smtp.password_encrypted);
  const transporter = createTransportFromCreds({ host: smtp.host, port: smtp.port, user: smtp.user, pass });
  await transporter.sendMail({
    from: `${smtp.from_name || smtp.user} <${smtp.from_email}>`,
    to: to_email,
    subject: `Votre facture ${invoice.invoice_number}`,
    html: `<p>Bonjour,</p><p>Veuillez trouver votre facture <b>${invoice.invoice_number}</b> ci-dessous.</p><p><a href="${url}">Télécharger le PDF</a></p>`
  });
  await supabase.from('events').insert({ user_id: auth.user.id, type: 'invoice_sent', meta: { invoice_id } });
  return res;
}


