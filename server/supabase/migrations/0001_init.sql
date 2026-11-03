-- Listening Room · schema for the Square checkout, seat holds, the address gate and the door.
-- Apply with:  supabase db push     (or paste into the SQL editor).  STATUS: written, NOT yet run against a live project.
--
-- Security model: the browser NEVER talks to these tables. Row level security is on and there are no policies,
-- so the anon and authenticated roles get nothing. Only the edge functions (service role) read or write,
-- and only they can ever read venue_address.

create extension if not exists pgcrypto;

create table public.events (
  id                   text primary key,                    -- e.g. 'nova-vale-ed01'
  title                text not null,
  starts_at            timestamptz not null,
  ends_at              timestamptz not null,
  capacity             int  not null check (capacity > 0),
  price_cents          int  not null check (price_cents >= 0),
  max_per_order        int  not null default 4,
  unlock_lead_min      int  not null default 180,           -- address released this long before starts_at
  door_phrase_lead_min int  not null default 30,
  max_reveals          int  not null default 5,
  venue_name           text not null,
  venue_address        text not null,                       -- the secret
  venue_area           text not null,                       -- the neighborhood, shown from purchase
  qr_secret            text not null default encode(gen_random_bytes(32), 'hex')
);

create table public.tickets (
  id                uuid primary key default gen_random_uuid(),
  event_id          text not null references public.events(id),
  name              text not null,
  email             text not null,
  qty               int  not null check (qty between 1 and 10),
  state             text not null default 'held' check (state in ('held','pending','paid','cancelled','paid_review')),
  hold_until        timestamptz not null,
  token_version     int  not null default 0,                -- bump to revoke a card link
  ref               text not null unique,                   -- LR-ED01-XXXXXX
  square_order_id   text unique,
  square_payment_id text unique,
  paid_at           timestamptz,
  reveal_count      int  not null default 0,
  checked_in_at     timestamptz,
  checked_in_via    text,                       -- 'scan' (live code) or 'name' (staff picked the name from the list)
  created_at        timestamptz not null default now()
);
create index tickets_event_state on public.tickets (event_id, state);

create table public.reveals (                               -- who looked at the address, and when (disclose this in the terms)
  id        bigserial primary key,
  ticket_id uuid not null references public.tickets(id),
  at        timestamptz not null default now(),
  ip_hash   text,                                           -- salted hash, never the raw address
  ua        text
);

create table public.webhook_events (                        -- Square sends no timestamp or replay protection: dedupe on event_id
  event_id    text primary key,
  received_at timestamptz not null default now()
);

alter table public.events         enable row level security;
alter table public.tickets        enable row level security;
alter table public.reveals        enable row level security;
alter table public.webhook_events enable row level security;
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ───── hold seats: serialised per event so two buyers can never take the last seat ─────
create or replace function public.hold_seats(
  p_event text, p_name text, p_email text, p_qty int, p_ref text, p_hold_min int default 30
) returns uuid language plpgsql security definer set search_path = public as $$
declare ev public.events%rowtype; taken int; tid uuid;
begin
  select * into ev from public.events where id = p_event for update;       -- row lock = the queue
  if not found then raise exception 'no_event'; end if;
  if p_qty < 1 or p_qty > ev.max_per_order then raise exception 'bad_qty'; end if;
  select coalesce(sum(qty), 0) into taken from public.tickets
   where event_id = p_event and (state in ('paid','paid_review') or (state in ('held','pending') and hold_until > now()));
  if taken + p_qty > ev.capacity then raise exception 'sold_out'; end if;
  insert into public.tickets (event_id, name, email, qty, ref, hold_until)
  values (p_event, p_name, p_email, p_qty, p_ref, now() + make_interval(mins => p_hold_min)) returning id into tid;
  return tid;
end $$;

-- ───── mark paid: idempotent. If the hold had lapsed and the seats were resold, flag for a human (refund) instead of overselling ─────
create or replace function public.mark_paid(p_order text, p_payment text) returns text
language plpgsql security definer set search_path = public as $$
declare t public.tickets%rowtype; ev public.events%rowtype; taken int;
begin
  select * into t from public.tickets where square_order_id = p_order for update;
  if not found then return 'unknown_order'; end if;
  if t.state in ('paid','paid_review') then return 'already'; end if;
  select * into ev from public.events where id = t.event_id for update;
  select coalesce(sum(qty), 0) into taken from public.tickets
   where event_id = t.event_id and id <> t.id and (state in ('paid','paid_review') or (state in ('held','pending') and hold_until > now()));
  if t.hold_until < now() and taken + t.qty > ev.capacity then
    update public.tickets set state = 'paid_review', paid_at = now(), square_payment_id = p_payment where id = t.id;
    return 'oversold_needs_refund';
  end if;
  update public.tickets set state = 'paid', paid_at = now(), square_payment_id = p_payment where id = t.id;
  return 'paid';
end $$;

-- ───── reveal: the counter and the cap are one atomic statement, so two taps cannot sneak in a 4th reveal ─────
create or replace function public.record_reveal(p_ticket uuid, p_ip_hash text, p_ua text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.tickets t set reveal_count = reveal_count + 1
   where t.id = p_ticket and t.state = 'paid' and t.reveal_count < (select max_reveals from public.events where id = t.event_id)
   returning reveal_count into n;
  if n is null then return null; end if;
  insert into public.reveals (ticket_id, ip_hash, ua) values (p_ticket, p_ip_hash, left(p_ua, 200));
  return n;
end $$;

-- ───── door: one check-in per ticket ─────
create or replace function public.check_in(p_ref text, p_via text default 'scan') returns table (result text, name text, qty int, at timestamptz)
language plpgsql security definer set search_path = public as $$
declare t public.tickets%rowtype;
begin
  select * into t from public.tickets where ref = p_ref for update;
  if not found or t.state <> 'paid' then return query select 'notfound'::text, null::text, null::int, null::timestamptz; return; end if;
  if t.checked_in_at is not null then return query select 'already'::text, t.name, t.qty, t.checked_in_at; return; end if;
  update public.tickets set checked_in_at = now(), checked_in_via = case when p_via = 'name' then 'name' else 'scan' end where id = t.id;
  return query select 'ok'::text, t.name, t.qty, now();
end $$;

revoke execute on function public.hold_seats, public.mark_paid, public.record_reveal, public.check_in from public, anon, authenticated;
grant  execute on function public.hold_seats, public.mark_paid, public.record_reveal, public.check_in to service_role;

-- seed one event (edit the real values; venue_address stays in the database and nowhere else)
-- insert into public.events (id,title,starts_at,ends_at,capacity,price_cents,venue_name,venue_address,venue_area)
-- values ('nova-vale-ed01','Nova Vale · Listening Room','2026-11-19T20:00:00-06:00','2026-11-19T23:00:00-06:00',60,2500,
--         'Venue name','Street address, Montgomery, AL','Neighborhood, Montgomery');
