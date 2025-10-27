import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function dayBounds(dayStr?: string) {
  const d = dayStr ? new Date(dayStr + 'T00:00:00.000Z') : new Date();
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0));
  const day = start.toISOString().slice(0, 10);
  return { start: start.toISOString(), end: end.toISOString(), day };
}

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!url || !serviceKey) return NextResponse.json({ error: 'Missing service role envs' }, { status: 500 });
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    const targetDay = req.nextUrl.searchParams.get('day') || undefined;
    const { start, end, day } = dayBounds(targetDay);

    // Aggregate events by user/campaign/type
    const { data: events } = await supabase
      .from('events')
      .select('user_id,campaign_id,type,count:id', { count: 'exact', head: false })
      .gte('created_at', start)
      .lt('created_at', end);

    // Aggregate linkedin actions due and done
    const { data: liDue } = await supabase
      .from('linkedin_actions')
      .select('user_id,campaign_id,count:id', { count: 'exact', head: false })
      .eq('status', 'pending')
      .gte('due_at', start)
      .lt('due_at', end);

    const { data: liDone } = await supabase
      .from('linkedin_actions')
      .select('user_id,campaign_id,count:id', { count: 'exact', head: false })
      .eq('status', 'done')
      .gte('done_at', start)
      .lt('done_at', end);

    type Key = string; // `${userId}|${campaignId|null}`
    const key = (u: string, c: string | null) => `${u}|${c || ''}`;
    const parseKey = (k: string) => {
      const [u, c] = k.split('|');
      return { user_id: u, campaign_id: c || null };
    };

    const map = new Map<Key, any>();// per campaign
    const mapGlobal = new Map<string, any>();// per user

    function ensure(mapRef: Map<Key, any>, u: string, c: string | null) {
      const k = key(u, c);
      if (!mapRef.has(k)) mapRef.set(k, { user_id: u, campaign_id: c, emails_scheduled: 0, emails_sent: 0, opens: 0, replies: 0, bounces: 0, linkedin_pending: 0, linkedin_done: 0 });
      return mapRef.get(k);
    }

    for (const e of events || []) {
      const dest = ensure(map, e.user_id, e.campaign_id || null);
      if (e.type === 'scheduled') dest.emails_scheduled += 1;
      if (e.type === 'sent') dest.emails_sent += 1;
      if (e.type === 'open') dest.opens += 1;
      if (e.type === 'manual_reply') dest.replies += 1;
      if (e.type === 'bounce') dest.bounces += 1;
    }

    for (const a of liDue || []) {
      const dest = ensure(map, a.user_id, a.campaign_id || null);
      dest.linkedin_pending += 1;
    }
    for (const a of liDone || []) {
      const dest = ensure(map, a.user_id, a.campaign_id || null);
      dest.linkedin_done += 1;
    }

    // Build global per user
    for (const v of map.values()) {
      const k = v.user_id;
      if (!mapGlobal.has(k)) mapGlobal.set(k, { user_id: k, campaign_id: null, emails_scheduled: 0, emails_sent: 0, opens: 0, replies: 0, bounces: 0, linkedin_pending: 0, linkedin_done: 0 });
      const g = mapGlobal.get(k);
      for (const f of ['emails_scheduled','emails_sent','opens','replies','bounces','linkedin_pending','linkedin_done'] as const) {
        g[f] += v[f];
      }
    }

    const rows = [...map.values(), ...mapGlobal.values()];

    for (const row of rows) {
      // upsert by (user_id, campaign_id, day)
      const { data: existing } = await supabase
        .from('metrics_daily')
        .select('id')
        .eq('user_id', row.user_id)
        .is('campaign_id', row.campaign_id)
        .eq('day', day)
        .maybeSingle();
      if (existing) {
        await supabase.from('metrics_daily').update({ ...row }).eq('id', existing.id);
      } else {
        await supabase.from('metrics_daily').insert({ ...row, day });
      }
    }

    const out = { upserted: rows.length, day };
    // eslint-disable-next-line no-console
    console.log('worker:aggregate-daily summary', out);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Aggregation error' }, { status: 500 });
  }
}


