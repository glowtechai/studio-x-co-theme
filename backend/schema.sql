-- Studio X Co. — Supabase Schema
-- Run in the Supabase SQL editor to initialize

create extension if not exists "uuid-ossp";

-- ── Leads ──────────────────────────────────────────────────────────────────
create type lead_status as enum ('pending_review', 'sms_sent', 'deposited', 'archived');

create table leads (
  id                    uuid primary key default uuid_generate_v4(),
  created_at            timestamptz not null default now(),

  -- Client identity
  client_name           text not null,
  first_name            text not null,
  last_name             text not null default '',
  email                 text not null default '',
  phone                 text not null,
  instagram             text not null default '',

  -- Attribution
  lead_source           text not null default '',
  gclid                 text,
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,

  -- Lifecycle
  lead_status           lead_status not null default 'pending_review',

  -- Raw submission data
  raw_images            text[] not null default '{}',
  hair_assessment       jsonb not null default '{}',

  -- AI-computed output
  computed_analysis_json jsonb
);

-- Fast lookups for dashboard
create index leads_status_idx      on leads (lead_status);
create index leads_created_at_idx  on leads (created_at desc);
create index leads_gclid_idx       on leads (gclid) where gclid is not null;

-- ── Transactions ───────────────────────────────────────────────────────────
create type payment_method as enum ('Zelle', 'Card', 'Klarna', 'Affirm');
create type payment_status as enum ('pending', 'completed', 'failed');

create table transactions (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),

  lead_id        uuid not null references leads(id) on delete cascade,
  amount_paid    numeric(10,2) not null,
  payment_method payment_method not null default 'Card',
  payment_status payment_status not null default 'pending'
);

create index transactions_lead_idx on transactions (lead_id);
create index transactions_status_idx on transactions (payment_status);

-- ── Row-Level Security ─────────────────────────────────────────────────────
-- Disable anonymous access; only service_role key can read/write
alter table leads       enable row level security;
alter table transactions enable row level security;

-- Service role bypasses RLS by default; no additional policies needed for
-- server-side API access. If you later want Giselle to log in via Supabase
-- Auth, add role-based policies here.
