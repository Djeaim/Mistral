-- Create a user-linked table to store encrypted OpenAI API keys
create table if not exists public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  openai_api_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: a user can manage only their own row
alter table public.users enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'Users can manage own row'
  ) then
    create policy "Users can manage own row"
      on public.users
      for all
      using ( auth.uid() = user_id )
      with check ( auth.uid() = user_id );
  end if;
end $$;

-- Trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();


-- =====================================
-- Email Prospection MVP schema
-- =====================================

-- campaigns
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  objective text,
  language text not null check (language in ('fr','en')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_campaigns_user on public.campaigns(user_id);

-- smtp_credentials
create table if not exists public.smtp_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  host text not null,
  port int not null,
  user text not null,
  password_encrypted text not null,
  from_name text,
  from_email text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_smtp_user on public.smtp_credentials(user_id);

-- prospects
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  company text,
  title text,
  email text not null,
  linkedin_url text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);
create index if not exists idx_prospects_user on public.prospects(user_id);
create index if not exists idx_prospects_email on public.prospects(email);

-- campaign_prospects
create table if not exists public.campaign_prospects (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  status text not null default 'new' check (status in ('new','queued','sent','opened','replied','bounced')),
  last_event_at timestamptz
);
create unique index if not exists idx_campaign_prospect_unique on public.campaign_prospects(campaign_id, prospect_id);
create index if not exists idx_campaign_prospects_campaign on public.campaign_prospects(campaign_id);

-- email_sequences
create table if not exists public.email_sequences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  step_number int not null,
  delay_hours int not null default 0,
  purpose text,
  ai_prompt_template text,
  created_at timestamptz not null default now(),
  unique (campaign_id, step_number)
);
create index if not exists idx_sequences_campaign on public.email_sequences(campaign_id);

-- email_messages
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  sequence_step int not null,
  subject text,
  body_html text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  open_count int not null default 0,
  tracking_token text,
  status text not null default 'scheduled' check (status in ('scheduled','sent','failed')),
  error text
);
create index if not exists idx_messages_campaign on public.email_messages(campaign_id);
create index if not exists idx_messages_due on public.email_messages(status, scheduled_at);

-- events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,
  type text not null check (type in ('scheduled','sent','open','manual_reply','bounce')),
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_user on public.events(user_id);
create index if not exists idx_events_campaign on public.events(campaign_id);

-- RLS enable
alter table public.campaigns enable row level security;
alter table public.smtp_credentials enable row level security;
alter table public.prospects enable row level security;
alter table public.campaign_prospects enable row level security;
alter table public.email_sequences enable row level security;
alter table public.email_messages enable row level security;
alter table public.events enable row level security;

-- Policies (user can only access own data)
-- campaigns
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='campaigns' and policyname='campaigns user access'
  ) then
    create policy "campaigns user access" on public.campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- smtp_credentials
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='smtp_credentials' and policyname='smtp user access'
  ) then
    create policy "smtp user access" on public.smtp_credentials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- prospects
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='prospects' and policyname='prospects user access'
  ) then
    create policy "prospects user access" on public.prospects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- campaign_prospects (via campaign/prospect ownership)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='campaign_prospects' and policyname='campaign_prospects user access'
  ) then
    create policy "campaign_prospects user access" on public.campaign_prospects for all using (
      exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
      and exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid())
    ) with check (
      exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
      and exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid())
    );
  end if;
end $$;

-- email_sequences (via campaign)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='email_sequences' and policyname='sequences user access'
  ) then
    create policy "sequences user access" on public.email_sequences for all using (
      exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
    ) with check (
      exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
    );
  end if;
end $$;

-- email_messages (via campaign and prospect)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='email_messages' and policyname='messages user access'
  ) then
    create policy "messages user access" on public.email_messages for all using (
      exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()) and
      exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid())
    ) with check (
      exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()) and
      exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid())
    );
  end if;
end $$;

-- events
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events user access'
  ) then
    create policy "events user access" on public.events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- =====================================
-- LinkedIn Assisted Queue schema
-- =====================================

-- add connection_status to campaign_prospects
do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'campaign_prospects' and column_name = 'connection_status'
  ) then
    alter table public.campaign_prospects add column connection_status text not null default 'none' check (connection_status in ('none','requested','accepted'));
  end if;
end $$;

-- =====================================
-- Reporting & Pipeline
-- =====================================

-- metrics_daily
create table if not exists public.metrics_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid null references public.campaigns(id) on delete cascade,
  day date not null,
  emails_scheduled int default 0,
  emails_sent int default 0,
  opens int default 0,
  replies int default 0,
  bounces int default 0,
  linkedin_pending int default 0,
  linkedin_done int default 0,
  created_at timestamptz default now(),
  unique (user_id, campaign_id, day)
);
create index if not exists idx_metrics_daily_user_day on public.metrics_daily(user_id, day);
create index if not exists idx_metrics_daily_user_campaign_day on public.metrics_daily(user_id, campaign_id, day);

alter table public.metrics_daily enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='metrics_daily' and policyname='metrics user access'
  ) then
    create policy "metrics user access" on public.metrics_daily for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- prospects.pipeline_status
do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prospects' and column_name = 'pipeline_status'
  ) then
    alter table public.prospects add column pipeline_status text check (pipeline_status in ('cold','warm','hot')) default 'cold';
  end if;
end $$;

-- =====================================
-- Billing: subscriptions and entitlements
-- =====================================

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text check (plan in ('starter','pro','business')) default 'starter',
  status text check (status in ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid')) default 'active',
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  emails_per_hour int not null default 20,
  campaigns_max int not null default 1,
  prospects_max int not null default 100,
  linkedin_actions_per_day int not null default 20,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subscriptions owner read') then
    create policy "subscriptions owner read" on public.subscriptions for select using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='entitlements' and policyname='entitlements owner read') then
    create policy "entitlements owner read" on public.entitlements for select using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists subscriptions_touch_updated on public.subscriptions;
create trigger subscriptions_touch_updated before update on public.subscriptions for each row execute function public.touch_updated_at();

drop trigger if exists entitlements_touch_updated on public.entitlements;
create trigger entitlements_touch_updated before update on public.entitlements for each row execute function public.touch_updated_at();

-- linkedin_actions
create table if not exists public.linkedin_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  action_type text not null check (action_type in ('visit_profile','send_connection','follow_up_msg','like_recent_post')),
  ai_message text,
  due_at timestamptz,
  done_at timestamptz,
  status text not null default 'pending' check (status in ('pending','done','skipped')),
  created_at timestamptz not null default now()
);
create index if not exists idx_li_actions_user on public.linkedin_actions(user_id);
create index if not exists idx_li_actions_campaign on public.linkedin_actions(campaign_id);
create index if not exists idx_li_actions_due on public.linkedin_actions(status, due_at);

-- user_notifications
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('linkedin_due')),
  payload jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_notifications_user on public.user_notifications(user_id);

-- RLS enable
alter table public.linkedin_actions enable row level security;
alter table public.user_notifications enable row level security;

-- Policies
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='linkedin_actions' and policyname='li actions user access'
  ) then
    create policy "li actions user access" on public.linkedin_actions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_notifications' and policyname='user notifications access'
  ) then
    create policy "user notifications access" on public.user_notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;


-- =====================================
-- Quotes & Invoices
-- =====================================

create table if not exists public.company_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  company_address text not null,
  company_zip text,
  company_city text,
  company_country text,
  company_vat_number text,
  company_registration text,
  default_currency text default 'EUR',
  default_vat_rate numeric(5,2) default 20.00,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  zip text,
  country text,
  vat_number text,
  created_at timestamptz default now()
);
create index if not exists idx_customers_user on public.customers(user_id);

create table if not exists public.numbering_sequences (
  user_id uuid not null references auth.users(id) on delete cascade,
  year int not null,
  type text check (type in ('quote','invoice')) not null,
  current int not null default 0,
  primary key (user_id, year, type)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  quote_number text not null,
  issue_date date not null,
  valid_until date,
  currency text not null default 'EUR',
  vat_rate numeric(5,2),
  notes text,
  status text check (status in ('draft','sent','accepted','rejected','expired')) default 'draft',
  pdf_url text,
  total_ht numeric(12,2) default 0,
  total_tva numeric(12,2) default 0,
  total_ttc numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2),
  line_total_ht numeric(12,2) default 0,
  line_total_tva numeric(12,2) default 0,
  line_total_ttc numeric(12,2) default 0,
  position int default 0
);
create index if not exists idx_quote_lines_quote on public.quote_lines(quote_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  invoice_number text not null,
  issue_date date not null,
  due_date date not null,
  currency text not null default 'EUR',
  vat_rate numeric(5,2),
  notes text,
  status text check (status in ('draft','sent','paid','overdue','canceled')) default 'draft',
  pdf_url text,
  total_ht numeric(12,2) default 0,
  total_tva numeric(12,2) default 0,
  total_ttc numeric(12,2) default 0,
  related_quote_id uuid references public.quotes(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2),
  line_total_ht numeric(12,2) default 0,
  line_total_tva numeric(12,2) default 0,
  line_total_ttc numeric(12,2) default 0,
  position int default 0
);
create index if not exists idx_invoice_lines_invoice on public.invoice_lines(invoice_id);

-- RLS
alter table public.company_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.numbering_sequences enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='company_profiles' and policyname='company owner') then
    create policy "company owner" on public.company_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customers' and policyname='customers owner') then
    create policy "customers owner" on public.customers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='numbering_sequences' and policyname='seq owner') then
    create policy "seq owner" on public.numbering_sequences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='quotes' and policyname='quotes owner') then
    create policy "quotes owner" on public.quotes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='quote_lines' and policyname='quote_lines access') then
    create policy "quote_lines access" on public.quote_lines for all using (
      exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid())
    ) with check (
      exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid())
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='invoices owner') then
    create policy "invoices owner" on public.invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoice_lines' and policyname='invoice_lines access') then
    create policy "invoice_lines access" on public.invoice_lines for all using (
      exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid())
    ) with check (
      exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid())
    );
  end if;
end $$;

-- atomic sequence increment
create or replace function public.get_next_number(p_user_id uuid, p_year int, p_type text)
returns int as $$
declare
  new_val int;
begin
  insert into public.numbering_sequences(user_id, year, type, current)
  values (p_user_id, p_year, p_type, 1)
  on conflict (user_id, year, type)
  do update set current = public.numbering_sequences.current + 1
  returning current into new_val;
  return new_val;
end;
$$ language plpgsql;

-- =====================================
-- AI Templates
-- =====================================

create table if not exists public.ai_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('email','linkedin')),
  name text not null,
  language text not null check (language in ('fr','en')),
  body text not null,
  created_at timestamptz default now()
);

alter table public.ai_templates enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_templates' and policyname='ai templates read') then
    create policy "ai templates read" on public.ai_templates for select using (user_id is null or user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_templates' and policyname='ai templates write') then
    create policy "ai templates write" on public.ai_templates for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- Seed global templates if none
insert into public.ai_templates (user_id, scope, name, language, body)
select null, 'email', 'Cold outreach FR (90–120 mots)', 'fr', 'Écris un email d\'accroche concis (90–120 mots) à {{first_name}} chez {{company}} (titre: {{title}}). Objectif: obtenir un RDV court (propose 2 créneaux). Ton: pro, personnalisé. '
where not exists (select 1 from public.ai_templates where user_id is null);

insert into public.ai_templates (user_id, scope, name, language, body)
values
(null, 'email', 'Concise outreach EN (90–120 words)', 'en', 'Write a concise outreach email (90–120 words) to {{first_name}} at {{company}} (title: {{title}}). Goal: book a short intro call (offer 2 time slots). Tone: professional, personalized.'),
(null, 'email', 'Follow-up FR J+3', 'fr', 'Relance J+3: bref message avec proposition de valeur et courte preuve sociale. Cible: {{title}} chez {{company}}.'),
(null, 'linkedin', 'LinkedIn note FR (180–250 chars)', 'fr', 'Note de connexion courte (180–250 caractères) personnalisée pour {{first_name}} ({{title}} chez {{company}}).'),
(null, 'linkedin', 'LinkedIn follow-up EN', 'en', 'Short DM after acceptance to {{first_name}} at {{company}} ({{title}}). Offer 2 time slots.');

