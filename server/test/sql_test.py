#!/usr/bin/env python3
"""Runs server/supabase/migrations/0001_init.sql against a REAL PostgreSQL and tests the rules that cost money if wrong.
Usage:  PGHOST=/tmp/lrpg PGPORT=5544 PGUSER=postgres python3 server/test/sql_test.py     (needs psql; uses a scratch database it drops afterwards)"""
import os, subprocess, sys, uuid, concurrent.futures as cf

HOST, PORT, USER = os.environ.get('PGHOST', 'localhost'), os.environ.get('PGPORT', '5432'), os.environ.get('PGUSER', 'postgres')
DB = 'lr_test_' + uuid.uuid4().hex[:8]
MIG = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'migrations', '0001_init.sql')
fails = 0

def psql(sql, db=DB, role=None, check=True):
    pre = f"set role {role};" if role else ''
    p = subprocess.run(['psql', '-h', HOST, '-p', PORT, '-U', USER, '-d', db, '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1', '-c', pre + sql], capture_output=True, text=True)
    if check and p.returncode: raise RuntimeError(p.stderr.strip())
    return p.returncode, (p.stdout + p.stderr).strip()

def ok(cond, msg):
    global fails; print(('PASS ' if cond else 'FAIL ') + msg); fails += (not cond)

def hold(ev, qty, ref=None, name='Jordan'):
    ref = ref or 'LR-ED01-' + uuid.uuid4().hex[:6].upper()
    return psql(f"select public.hold_seats('{ev}','{name}','j@example.com',{qty},'{ref}',30)", role='service_role', check=False)

subprocess.run(['psql', '-h', HOST, '-p', PORT, '-U', USER, '-d', 'postgres', '-q', '-c', f'create database {DB}'], check=True)
try:
    psql("do $$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end $$; grant usage on schema public to anon, authenticated, service_role;")
    p = subprocess.run(['psql', '-h', HOST, '-p', PORT, '-U', USER, '-d', DB, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', MIG], capture_output=True, text=True)
    ok(p.returncode == 0, 'migration applies cleanly' + ('' if p.returncode == 0 else ': ' + p.stderr.strip()[:200]))
    psql("grant select, insert, update on all tables in schema public to service_role; grant usage on all sequences in schema public to service_role;")
    psql("insert into public.events (id,title,starts_at,ends_at,capacity,price_cents,venue_name,venue_address,venue_area) values ('e3','Three seats',now()+interval '10 day',now()+interval '10 day 3 hour',3,2500,'Secret Venue','1 Secret Street','The Area'),('e1','One seat',now()+interval '10 day',now()+interval '10 day 3 hour',1,2500,'Secret Venue','1 Secret Street','The Area'),('e8','Eight',now()+interval '10 day',now()+interval '10 day 3 hour',8,2500,'Secret Venue','1 Secret Street','The Area')")

    # 1 capacity
    a = hold('e3', 2); ok(a[0] == 0, 'hold 2 of 3 seats'); b = hold('e3', 2); ok(b[0] != 0 and 'sold_out' in b[1], 'a second hold of 2 is refused (sold_out), only 1 seat left'); c = hold('e3', 1); ok(c[0] == 0, 'the last single seat can still be held')
    ok(hold('e3', 5)[0] != 0 and 'bad_qty' in hold('e3', 5)[1], 'more than max_per_order is refused (bad_qty)')
    ok('no_event' in hold('nope', 1)[1], 'unknown event is refused')

    # 2 concurrency: 8 buyers race for 1 seat; exactly one wins
    with cf.ThreadPoolExecutor(8) as ex: res = list(ex.map(lambda i: hold('e1', 1), range(8)))
    wins = sum(1 for r in res if r[0] == 0); ok(wins == 1, f'8 parallel buyers, 1 seat: exactly {wins} succeeded (must be 1)')
    ok(psql("select coalesce(sum(qty),0) from public.tickets where event_id='e1'")[1] == '1', 'database holds exactly 1 seat for that event')

    # 3 holds expire and free their seats
    psql("update public.tickets set hold_until = now() - interval '1 minute' where event_id='e1'")
    ok(hold('e1', 1)[0] == 0, 'an expired hold frees its seat for the next buyer')

    # 4 mark_paid is idempotent
    t = psql("select id from public.tickets where event_id='e1' and hold_until > now()")[1]
    psql(f"update public.tickets set square_order_id='ORDER-1', state='pending' where id='{t}'")
    r1 = psql("select public.mark_paid('ORDER-1','PAY-1')", role='service_role')[1]; r2 = psql("select public.mark_paid('ORDER-1','PAY-1')", role='service_role')[1]
    ok(r1 == 'paid' and r2 == 'already', f"mark_paid is idempotent (first '{r1}', replay '{r2}')")
    ok(psql("select public.mark_paid('NOPE','X')", role='service_role')[1] == 'unknown_order', 'a payment for an unknown order is ignored')

    # 5 oversold: hold lapses, seat is resold, THEN the first buyer's payment arrives
    psql("delete from public.reveals; delete from public.tickets where event_id='e1'")
    hold('e1', 1, 'LR-ED01-AAAAAA'); psql("update public.tickets set square_order_id='ORDER-A', state='pending', hold_until=now()-interval '5 minute' where ref='LR-ED01-AAAAAA'")
    ok(hold('e1', 1, 'LR-ED01-BBBBBB')[0] == 0, 'the lapsed hold\'s seat is resold to buyer B')
    r = psql("select public.mark_paid('ORDER-A','PAY-A')", role='service_role')[1]
    ok(r == 'oversold_needs_refund', f"late payment for a resold seat is flagged for refund, not honoured ('{r}')")
    ok(psql("select state from public.tickets where ref='LR-ED01-AAAAAA'")[1] == 'paid_review', 'that ticket sits in paid_review (a human refunds it)')

    # 6 reveal cap is atomic
    hold('e8', 1, 'LR-ED01-CCCCCC'); psql("update public.tickets set state='paid', paid_at=now() where ref='LR-ED01-CCCCCC'")
    tid = psql("select id from public.tickets where ref='LR-ED01-CCCCCC'")[1]
    with cf.ThreadPoolExecutor(6) as ex: rr = list(ex.map(lambda i: psql(f"select public.record_reveal('{tid}','h','ua')", role='service_role')[1], range(6)))
    granted = [x for x in rr if x not in ('', None)]; ok(len(granted) == 5, f'6 parallel reveals, cap 5: exactly {len(granted)} granted (must be 5)')
    ok(psql(f"select count(*) from public.reveals where ticket_id='{tid}'")[1] == '5', 'exactly 5 reveals are logged')
    psql("update public.tickets set state='held' where ref='LR-ED01-CCCCCC'"); ok(psql(f"select public.record_reveal('{tid}','h','ua')", role='service_role')[1] == '', 'an unpaid ticket can never reveal')

    # 7 door: one check-in per ticket
    psql("update public.tickets set state='paid' where ref='LR-ED01-CCCCCC'")
    c1 = psql("select result from public.check_in('LR-ED01-CCCCCC')", role='service_role')[1]; c2 = psql("select result from public.check_in('LR-ED01-CCCCCC')", role='service_role')[1]
    ok((c1, c2) == ('ok', 'already'), f"check-in works once, then 'already' ({c1}, {c2})")
    ok(psql("select result from public.check_in('LR-ED01-ZZZZZZ')", role='service_role')[1] == 'notfound', 'an unknown code is not found')
    ok(psql("select checked_in_via from public.tickets where ref='LR-ED01-CCCCCC'")[1] == 'scan', 'a scanned check-in is logged as scan')
    hold('e8', 1, 'LR-ED01-DDDDDD'); psql("update public.tickets set state='paid', paid_at=now() where ref='LR-ED01-DDDDDD'")
    m1 = psql("select result from public.check_in('LR-ED01-DDDDDD','name')", role='service_role')[1]; m2 = psql("select result from public.check_in('LR-ED01-DDDDDD','name')", role='service_role')[1]
    ok((m1, m2) == ('ok', 'already'), f"picking a name checks in once, then 'already' ({m1}, {m2})")
    ok(psql("select checked_in_via from public.tickets where ref='LR-ED01-DDDDDD'")[1] == 'name', 'a name check-in is logged as name (so you can see who was let in by hand)')

    # 8 the browser's database roles can read and call nothing
    for role in ('anon', 'authenticated'):
        ok(psql('select venue_address from public.events', role=role, check=False)[0] != 0, f'{role} cannot read venue_address (permission denied)')
        ok(psql('select * from public.tickets', role=role, check=False)[0] != 0, f'{role} cannot read tickets')
        ok(psql("select public.hold_seats('e3','x','x@x.xx',1,'LR-ED01-DDDDDD',30)", role=role, check=False)[0] != 0, f'{role} cannot call hold_seats')
        ok(psql("select public.record_reveal('00000000-0000-0000-0000-000000000000','h','u')", role=role, check=False)[0] != 0, f'{role} cannot call record_reveal')
finally:
    subprocess.run(['psql', '-h', HOST, '-p', PORT, '-U', USER, '-d', 'postgres', '-q', '-c', f'drop database if exists {DB}'])
print('\n' + (f'{fails} FAILED' if fails else 'ALL PASSED')); sys.exit(1 if fails else 0)
