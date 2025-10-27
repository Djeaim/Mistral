import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createTransportFromCreds } from '@/lib/mailer';
import { decryptFromBase64 } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createServerClient(url, key, { cookies: { get(){}, set(){}, remove(){} } });
    const now = new Date().toISOString();

    // Find due linkedin actions
    const { data: due } = await supabase
      .from('linkedin_actions')
      .select('id,user_id,campaign_id,prospect_id,action_type,due_at')
      .eq('status', 'pending')
      .lte('due_at', now)
      .limit(200);

    const byUser: Record<string, any[]> = {};
    for (const a of due || []) {
      byUser[a.user_id] = byUser[a.user_id] || [];
      byUser[a.user_id].push(a);
    }

    for (const [userId, items] of Object.entries(byUser)) {
      // insert in-app notification summary
      await supabase.from('user_notifications').insert({ user_id: userId, type: 'linkedin_due', payload: { count: items.length } });
      // try email if smtp exists
      const { data: smtp } = await supabase.from('smtp_credentials').select('*').eq('user_id', userId).limit(1).maybeSingle();
      if (smtp) {
        try {
          const pass = decryptFromBase64(smtp.password_encrypted);
          const transporter = createTransportFromCreds({ host: smtp.host, port: smtp.port, user: smtp.user, pass });
          await transporter.sendMail({
            from: `${smtp.from_name || smtp.user} <${smtp.from_email}>`,
            to: smtp.user,
            subject: 'Mistral: LinkedIn actions due',
            html: `<p>You have ${items.length} LinkedIn actions due.</p>`
          });
        } catch {}
      }
    }

    const out = { notified_users: Object.keys(byUser).length };
    // eslint-disable-next-line no-console
    console.log('worker:notify-linkedin-due summary', out);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Worker error' }, { status: 500 });
  }
}


