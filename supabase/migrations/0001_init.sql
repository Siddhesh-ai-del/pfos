-- PFOS Slice 1 — full schema (plan §4), RPCs (§4.4), RLS (§4.3), demo seed (§2.3)
-- Canonical: docs/plan.md is the source of truth; do not invent synonyms of table/column names.

-- ============================================================
-- 0. Constants
-- ============================================================
-- DEMO_USER = '00000000-0000-0000-0000-000000000001'

-- ============================================================
-- 1. Core ledger (§4.1)
-- ============================================================
create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,          -- 'food','transport','discretionary','tiffin','bills'
  kind text not null check (kind in ('expense','income')),
  is_discretionary boolean not null default false
);

create table if not exists category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001', -- DEMO_USER
  category_id uuid not null references expense_categories(id) on delete cascade,
  monthly_amount_in_minor_paise bigint not null check (monthly_amount_in_minor_paise > 0),
  unique (category_id) -- MVP: one active budget per category
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  occurred_on date not null,
  kind text not null check (kind in ('expense','income')),
  category_id uuid not null references expense_categories(id),
  amount_in_minor_paise bigint not null check (amount_in_minor_paise > 0),
  note text,
  source text not null check (source in ('chat','manual','seed')),
  status text not null default 'estimated' check (status in ('estimated','confirmed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists transactions_user_occurred_idx on transactions (user_id, occurred_on);
create index if not exists transactions_user_status_idx on transactions (user_id, status);
create index if not exists transactions_user_cat_day_idx on transactions (user_id, category_id, occurred_on);

-- ============================================================
-- 2. Memory + audit + demo bookkeeping (§4.2)
-- ============================================================
create table if not exists commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  subject text not null,               -- 'Swiggy'
  text text not null,                  -- 'Cap Swiggy at 8 orders a month'
  rule_type text not null default 'monthly_count' check (rule_type in ('monthly_count','monthly_cap','open_ended')),
  numeric_limit integer,
  start_on date not null default current_date,
  status text not null default 'open' check (status in ('open','done','dropped')),
  created_at timestamptz not null default now(),
  idempotency_key text unique
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  text text not null,                  -- 'Headphones ₹3,000 — planned purchase'
  linked_transaction_id uuid references transactions(id),
  confidence numeric(3,2) not null default 0.80,
  decided_on date not null default current_date,
  created_at timestamptz not null default now(),
  idempotency_key text unique
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  type text not null check (type in ('preference','note')),  -- decisions/commitments live elsewhere
  scope text not null,                                       -- 'spending','food','routing','lifestyle'
  text text not null,
  confidence numeric(3,2) not null default 0.80,
  expires_on date null,
  created_at timestamptz not null default now()
);

-- audit_log: every LLM tool invocation; unique idempotency_key kills replays.
-- `result` stores the full Postgres result for idempotent replays (plan amendment noted in HACKATHON.md).
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  ts timestamptz not null default now(),
  route text not null,                 -- '/api/agent'
  tool_name text not null,             -- from whitelist; 'unknown' for rejects
  model text,
  args jsonb,
  result_digest text,                  -- first 32 chars sha256 of result JSON
  result jsonb,                        -- full result for replay/idempotency
  approval_state text not null check (approval_state in ('auto','user_confirmed','rejected')),
  latency_ms int,
  error boolean not null default false,
  idempotency_key text not null unique,
  request_id uuid
);
create index if not exists audit_log_user_ts_idx on audit_log (user_id, ts desc);

create table if not exists demo_config (
  id smallint primary key default 1 check (id = 1),  -- single-row guard
  seed_version text not null,
  seeded_at timestamptz not null default now(),
  is_demo boolean not null default true
);

-- ============================================================
-- 3. Tiffin (§4.4)
-- ============================================================
create table if not exists meal_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  name text not null,                                        -- 'breakfast','lunch','dinner','late_night_snack'
  plan text not null check (plan in ('prepaid','custom')),
  default_price_in_minor_paise bigint not null check (default_price_in_minor_paise > 0),
  unique (user_id, name)
);

create table if not exists meal_consumption (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  occurred_on date not null,
  meal_type_id uuid not null references meal_types(id),
  status text not null check (status in ('consumed','skipped','cancelled')),
  record_status text not null default 'estimated' check (record_status in ('estimated','confirmed')),
  price_at_record_time_in_minor_paise bigint not null check (price_at_record_time_in_minor_paise > 0),
  note text,
  source text not null check (source in ('chat','manual','seed')),
  created_at timestamptz not null default now()
);
-- double-capture guard per status (plan §4.4)
create unique index if not exists meal_consumption_capture_guard
  on meal_consumption (user_id, occurred_on, meal_type_id, record_status, status);
create index if not exists meal_consumption_user_day_idx on meal_consumption (user_id, occurred_on);

create table if not exists tiffin_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  cycle_month date not null,             -- first of cycle, '2026-11-01'
  prepaid_meals integer not null check (prepaid_meals > 0),
  price_in_minor_paise bigint not null check (price_in_minor_paise > 0),
  prepaid_amount_in_minor_paise bigint not null,
  constraint tiffin_prepaid_integrity check (prepaid_meals * price_in_minor_paise = prepaid_amount_in_minor_paise),
  paid_on date,
  unique (user_id, cycle_month)
);

-- ============================================================
-- 4. RLS (§4.3) — enabled; permissive-by-default is deny-all.
-- Server routes ride the service key (bypasses RLS). Auth swap is
-- documented for the SaaS path in docs/saas-migration.md (Slice 7+).
-- ============================================================
alter table transactions          enable row level security;
alter table category_budgets      enable row level security;
alter table commitments           enable row level security;
alter table decisions             enable row level security;
alter table memories              enable row level security;
alter table meal_types            enable row level security;
alter table meal_consumption      enable row level security;
alter table tiffin_subscriptions  enable row level security;
alter table audit_log             enable row level security;
alter table demo_config           enable row level security;
alter table expense_categories    enable row level security;

-- ============================================================
-- 5. RPC money math (§4.4 signatures; security definer; jsonb returns)
-- ============================================================

-- 5.1 draft → confirm (transactions)
create or replace function create_transaction_draft(
  p_kind text, p_category_name text, p_amount_in_minor_paise bigint,
  p_occurred_on date, p_note text, p_source text, p_idempotency_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cat_id uuid;
  v_cat_kind text;
  v_row transactions;
begin
  select id, kind into v_cat_id, v_cat_kind from expense_categories where name = p_category_name;
  if v_cat_id is null or v_cat_kind is distinct from p_kind then
    return jsonb_build_object('error','invalid_category','re_ask', true);
  end if;

  insert into transactions (user_id, occurred_on, kind, category_id, amount_in_minor_paise, note, source, status)
  values ('00000000-0000-0000-0000-000000000001', p_occurred_on, p_kind, v_cat_id,
          p_amount_in_minor_paise, p_note, p_source, 'estimated')
  returning * into v_row;

  return to_jsonb(v_row);
end $$;

create or replace function confirm_transaction(p_transaction_id uuid, p_idempotency_key text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row transactions;
begin
  -- idempotent no-op if already confirmed
  select * into v_row from transactions
   where id = p_transaction_id
     and user_id = '00000000-0000-0000-0000-000000000001'
     and status = 'estimated'
   for update;

  if v_row.id is not null then
    update transactions
       set status = 'confirmed', confirmed_at = now()
     where id = v_row.id
    returning * into v_row;
  else
    select * into v_row from transactions
     where id = p_transaction_id
       and user_id = '00000000-0000-0000-0000-000000000001'
       and status = 'confirmed';
  end if;

  return to_jsonb(v_row);
end $$;

-- 5.2 draft → confirm (meals); price is copy-on-draft
create or replace function create_meal_consumption_draft(
  p_occurred_on date, p_meal_type_id uuid, p_status text,
  p_note text, p_source text, p_idempotency_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row meal_consumption;
  v_price bigint;
  v_user uuid := '00000000-0000-0000-0000-000000000001';
begin
  select default_price_in_minor_paise into v_price from meal_types
    where id = p_meal_type_id and user_id = v_user;
  if v_price is null then
    return jsonb_build_object('error','invalid_meal_type','re_ask', true);
  end if;
  if p_status not in ('consumed','skipped','cancelled') then
    return jsonb_build_object('error','invalid_status','re_ask', true);
  end if;

  -- unique-guard friendly insert (conflict present → return existing draft for this day/meal/record_status)
  insert into meal_consumption
    (user_id, occurred_on, meal_type_id, status, record_status, price_at_record_time_in_minor_paise, note, source)
  values
    (v_user, p_occurred_on, p_meal_type_id, p_status, 'estimated', v_price, p_note, p_source)
  on conflict (user_id, occurred_on, meal_type_id, record_status, status) do nothing
  returning * into v_row;

  if v_row is null then
    select * into v_row from meal_consumption
     where user_id = v_user and occurred_on = p_occurred_on
       and meal_type_id = p_meal_type_id and record_status = 'estimated' and status = p_status;
  end if;

  return to_jsonb(v_row);
end $$;

create or replace function confirm_meal_consumption(p_meal_id uuid, p_idempotency_key text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row meal_consumption;
  v_result jsonb;
begin
  -- confirm estimated row (if it exists and not already confirmed at same status)
  select * into v_row from meal_consumption
   where id = p_meal_id
     and user_id = '00000000-0000-0000-0000-000000000001'
     and record_status = 'estimated'
   for update;

  if v_row.id is not null then
    -- flipping to confirmed may violate the unique guard if another confirmed row
    -- exists for the same (day, meal, status); treat that overwrite as a status change
    begin
      update meal_consumption
         set record_status = 'confirmed'
       where id = v_row.id
      returning * into v_row;
    exception when unique_violation then
      -- a confirmed row already exists for this day/meal/status: the draft becomes redundant
      delete from meal_consumption where id = v_row.id;
      select * into v_row from meal_consumption
       where user_id = v_row.user_id and occurred_on = v_row.occurred_on
         and meal_type_id = v_row.meal_type_id and record_status = 'confirmed' and status = v_row.status;
    end;
    return to_jsonb(v_row);
  end if;

  -- already confirmed → idempotent replay
  select to_jsonb(m) into v_result from meal_consumption m
   where id = p_meal_id and user_id = '00000000-0000-0000-0000-000000000001' and record_status = 'confirmed';
  if v_result is null then
    v_result := jsonb_build_object('error','meal_not_found','re_ask', true);
  end if;
  return v_result;
end $$;

-- 5.3 memory writes
create or replace function create_commitment(
  p_subject text, p_text text, p_rule_type text,
  p_numeric_limit integer, p_idempotency_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row commitments;
begin
  insert into commitments
    (user_id, subject, text, rule_type, numeric_limit, idempotency_key)
  values
    ('00000000-0000-0000-0000-000000000001', p_subject, p_text, p_rule_type, p_numeric_limit, p_idempotency_key)
  on conflict (idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function create_decision(
  p_text text, p_linked_transaction_id uuid,
  p_confidence numeric, p_idempotency_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row decisions;
begin
  insert into decisions
    (user_id, text, linked_transaction_id, confidence, idempotency_key)
  values
    ('00000000-0000-0000-0000-000000000001', p_text, p_linked_transaction_id, coalesce(p_confidence, 0.80), p_idempotency_key)
  on conflict (idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

-- 5.4 aggregations
create or replace function get_budget_status(p_month date default date_trunc('month', current_date))
returns jsonb
language sql security definer set search_path = public as $$
  with month_txns as (
    select t.category_id, sum(t.amount_in_minor_paise) as spent
      from transactions t
     where t.user_id = '00000000-0000-0000-0000-000000000001'
       and t.kind = 'expense'
       and t.status = 'confirmed'
       and t.occurred_on >= date_trunc('month', p_month)::date
       and t.occurred_on <  (date_trunc('month', p_month) + interval '1 month')::date
      group by t.category_id
  ),
  budgets as (
    select b.category_id, b.monthly_amount_in_minor_paise as budget
      from category_budgets b
     where b.user_id = '00000000-0000-0000-0000-000000000001'
  )
  select coalesce(jsonb_agg(x order by x.name), '[]'::jsonb)
    from (
      select c.id as category_id, c.name, c.is_discretionary,
             coalesce(m.spent, 0) as spent,
             b.budget,
             case when b.budget is not null then b.budget - coalesce(m.spent, 0) end as remaining_or_over
        from expense_categories c
        left join month_txns m on m.category_id = c.id
        left join budgets b on b.category_id = c.id
       where c.kind = 'expense'
       order by c.name
    ) x;
$$;

create or replace function get_tiffin_summary(p_month date default date_trunc('month', current_date))
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';
  v_month date := date_trunc('month', p_month)::date;
  v_sub record;
  v_result jsonb;
begin
  select * into v_sub from tiffin_subscriptions
   where user_id = v_user
     and cycle_month = v_month;

  if v_sub is null then
    return jsonb_build_object('has_subscription', false);
  end if;

  with facts as (
    select
      count(*) filter (where mc.record_status='confirmed' and mc.status='consumed' and mt.plan='prepaid') as consumed,
      count(*) filter (where mc.record_status='confirmed' and mc.status='consumed' and mt.plan='custom')  as consumed_custom,
      count(*) filter (where mc.record_status='confirmed' and mc.status='skipped')   as skipped,
      count(*) filter (where mc.record_status='confirmed' and mc.status='cancelled') as cancelled,
      coalesce(sum(mc.price_at_record_time_in_minor_paise)
        filter (where mc.record_status='confirmed' and mc.status='consumed' and mt.plan='prepaid'), 0) as billed_plan,
      coalesce(sum(mc.price_at_record_time_in_minor_paise)
        filter (where mc.record_status='confirmed' and mc.status='consumed' and mt.plan='custom'), 0) as custom_billed,
      count(*) filter (where mc.record_status='estimated') as estimated_count
    from meal_consumption mc
    join meal_types mt on mt.id = mc.meal_type_id
    where mc.user_id = v_user
      and mc.occurred_on >= v_month
      and mc.occurred_on < (v_month + interval '1 month')::date
  )
  select to_jsonb(f.*) || jsonb_build_object(
    'has_subscription', true,
    'cycle_month', v_month,
    'prepaid_meals', v_sub.prepaid_meals,
    'price_in_minor_paise', v_sub.price_in_minor_paise,
    'prepaid_amount_in_minor_paise', v_sub.prepaid_amount_in_minor_paise,
    'paid_on', v_sub.paid_on,
    'prepaid_balance', v_sub.prepaid_amount_in_minor_paise - f.billed_plan,
    'payable_now', greatest(0, f.billed_plan - v_sub.prepaid_amount_in_minor_paise) + f.custom_billed,
    'remaining_prepaid', greatest(0, v_sub.prepaid_amount_in_minor_paise - f.billed_plan)
  ) into v_result
  from facts f;

  return v_result;
end $$;

create or replace function get_day_summary(p_day date)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';
  v_by_cat jsonb;
  v_tiffin jsonb;
  v_result jsonb;
begin
  with day_rows as (
    select *
      from transactions
     where user_id = v_user and occurred_on = p_day and status = 'confirmed'
  )
  select coalesce(jsonb_agg(jsonb_build_object('category', c.name, 'kind', s.kind, 'total', s.tot) order by s.kind, c.name), '[]'::jsonb)
    into v_by_cat
    from (
      select category_id, kind, sum(amount_in_minor_paise) as tot
        from day_rows group by category_id, kind
    ) s
    join expense_categories c on c.id = s.category_id;

  select jsonb_build_object(
    'breakfast', coalesce((select mc.status from meal_consumption mc join meal_types mt on mt.id=mc.meal_type_id
                             where mc.user_id=v_user and mc.occurred_on=p_day and mt.name='breakfast'), 'not_recorded'),
    'lunch',     coalesce((select mc.status from meal_consumption mc join meal_types mt on mt.id=mc.meal_type_id
                             where mc.user_id=v_user and mc.occurred_on=p_day and mt.name='lunch'), 'not_recorded'),
    'dinner',    coalesce((select mc.status from meal_consumption mc join meal_types mt on mt.id=mc.meal_type_id
                             where mc.user_id=v_user and mc.occurred_on=p_day and mt.name='dinner'), 'not_recorded'),
    'billed_to_date', coalesce((select sum(mc.price_at_record_time_in_minor_paise) from meal_consumption mc join meal_types mt on mt.id=mc.meal_type_id
                             where mc.user_id=v_user and mc.occurred_on=p_day and mc.status='consumed' and mc.record_status='confirmed'), 0)
  ) into v_tiffin;

  select jsonb_build_object(
    'day', p_day,
    'expenses_total', coalesce((select sum(t.amount_in_minor_paise) from transactions t
                                 where t.user_id = v_user and t.occurred_on = p_day
                                   and t.status = 'confirmed' and t.kind = 'expense'), 0),
    'income_total',   coalesce((select sum(t.amount_in_minor_paise) from transactions t
                                 where t.user_id = v_user and t.occurred_on = p_day
                                   and t.status = 'confirmed' and t.kind = 'income'), 0),
    'by_category', v_by_cat,
    'by_status', to_jsonb((select jsonb_build_object(
                   'confirmed', count(*) filter (where t.status = 'confirmed'),
                   'estimated', count(*) filter (where t.status = 'estimated'))
                 from transactions t
                 where t.user_id = v_user and t.occurred_on = p_day)),
    'budget_status', get_budget_status(date_trunc('month', p_day)::date),
    'tiffin', v_tiffin
  ) into v_result;

  return v_result;
end $$;

create or replace function get_month_summary(p_month date)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';
  v_month date := date_trunc('month', p_month)::date;
  v_prev date := (date_trunc('month', p_month) - interval '1 month')::date;
  v_result jsonb;
begin
  with cur as (
    select coalesce(sum(amount_in_minor_paise) filter (where kind='expense'), 0) expenses,
           coalesce(sum(amount_in_minor_paise) filter (where kind='income'), 0) income,
           count(*) txn_count
      from transactions
     where user_id = v_user and status='confirmed'
       and occurred_on >= v_month and occurred_on < (v_month + interval '1 month')::date
  ),
  prev as (
    select coalesce(sum(amount_in_minor_paise) filter (where kind='expense'), 0) expenses
      from transactions
     where user_id = v_user and status='confirmed'
       and occurred_on >= v_prev and occurred_on < (v_prev + interval '1 month')::date
  ),
  cat_cur as (
    select c.name as category, coalesce(sum(t.amount_in_minor_paise),0) total
      from transactions t join expense_categories c on c.id=t.category_id
     where t.user_id=v_user and t.status='confirmed' and t.occurred_on >= v_month and t.occurred_on < (v_month + interval '1 month')::date
       and t.kind='expense'
      group by c.name
  ),
  cat_prev as (
    select c.name as category, coalesce(sum(t.amount_in_minor_paise),0) total
      from transactions t join expense_categories c on c.id=t.category_id
     where t.user_id=v_user and t.status='confirmed' and t.occurred_on >= v_prev and t.occurred_on < (v_prev + interval '1 month')::date
       and t.kind='expense'
      group by c.name
  ),
  violations as (
    select coalesce(jsonb_agg(jsonb_build_object('category', z.name, 'over_by', -z.remaining_or_over) order by z.name), '[]'::jsonb) as violations_list
      from jsonb_to_recordset(get_budget_status(v_month))
        as z(category_id uuid, name text, is_discretionary boolean, spent bigint, budget bigint, remaining_or_over bigint)
     where z.remaining_or_over < 0
  ),
  recurring as (
    select coalesce(jsonb_agg(jsonb_build_object('label', a.category, 'months', 2)), '[]'::jsonb) rc
      from cat_cur a join cat_prev b on b.category = a.category
  )
  select to_jsonb(c.*) || jsonb_build_object(
    'month', v_month,
    'by_category', coalesce((select jsonb_agg(x order by x.total desc) from cat_cur x), '[]'::jsonb),
    'prev_month', to_jsonb(p.*),
    'budget_violations', (select violations_list from violations),
    'recurring_candidates', (select rc from recurring),
    'tiffin', get_tiffin_summary(v_month)
  ) into v_result
  from cur c, prev p;

  return v_result;
end $$;

create or replace function get_financial_context(p_day date default current_date)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';
  v_budgets jsonb;
  v_txns jsonb;
  v_estimated int;
  v_commitments jsonb;
  v_decisions jsonb;
  v_result jsonb;
begin
  -- top-3 budgeted categories: discretionary first (overflow narrative), then others tightest-remaining
  with statuses as (
    select z.category_id, z.name, z.is_discretionary, z.spent, z.budget, z.remaining_or_over
      from jsonb_to_recordset(
        get_budget_status(date_trunc('month', p_day)::date)
      ) as z(category_id uuid, name text, is_discretionary boolean, spent bigint, budget bigint, remaining_or_over bigint)
  ),
  ranked as (
    (
      select *, 0 as priority from statuses where budget is not null and is_discretionary
      order by remaining_or_over limit 3
    )
    union all
    (
      select *, 1 as priority from statuses where budget is not null and not is_discretionary
      order by remaining_or_over limit 3
    )
  )
  select coalesce(jsonb_agg(to_jsonb(x) - 'priority' order by x.priority, x.remaining_or_over), '[]'::jsonb)
    into v_budgets
    from ranked x;

  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'occurred_on', t.occurred_on, 'kind', t.kind,
                                 'category', c.name, 'amount_in_minor_paise', t.amount_in_minor_paise,
                                 'note', t.note, 'status', t.status)), '[]'::jsonb)
    into v_txns
    from (
      select t.id, t.occurred_on, t.kind, t.category_id, t.amount_in_minor_paise, t.note, t.status
        from transactions t
       where t.user_id = v_user and t.status = 'confirmed'
       order by t.occurred_on desc, t.created_at desc
       limit 10
    ) t join expense_categories c on c.id = t.category_id;

  select count(*) into v_estimated from transactions t
   where t.user_id=v_user and t.status='estimated';

  select coalesce((select jsonb_agg(jsonb_build_object('id', id,'subject',subject,'text',text,'rule_type',rule_type,
                                                        'numeric_limit',numeric_limit,'start_on',start_on,'status',status)
                                    order by created_at desc)
                    from commitments where user_id=v_user and status='open'), '[]'::jsonb) into v_commitments;

  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'text', d.text, 'decided_on', d.decided_on,
                                 'confidence', d.confidence,
                                 'linked_transaction_id', d.linked_transaction_id)), '[]'::jsonb)
    into v_decisions
    from (
      select id, text, decided_on, confidence, linked_transaction_id
        from decisions
       where user_id = v_user
       order by decided_on desc, created_at desc
       limit 5
    ) d;

  select jsonb_build_object(
    'day', p_day,
    'budgets', v_budgets,
    'recent_txns', v_txns,
    'open_estimated_count', v_estimated,
    'open_commitments', v_commitments,
    'recent_decisions', v_decisions,
    'tiffin_snapshot', get_tiffin_summary(date_trunc('month', p_day)::date)
  ) into v_result;

  return v_result;
end $$;

-- ============================================================
-- 6. Demo seed + reset (§2.3 exact fixtures)
-- ============================================================
create or replace function seed_demo_data()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';
  v_food uuid; v_transp uuid; v_disc uuid; v_tiffin uuid; v_bills uuid;
  v_tx_s5 uuid;
  v_meal_breakfast uuid; v_meal_lunch uuid; v_meal_dinner uuid; v_meal_snack uuid;
begin
  -- idempotent by seed_version
  if exists (select 1 from demo_config where seed_version = '1') then
    return jsonb_build_object('status','already_seeded','seed_version','1');
  end if;

  -- categories (kind = 'expense' for all five; income-carrying names emerge later)
  insert into expense_categories (name, kind, is_discretionary) values
    ('food', 'expense', false),
    ('transport', 'expense', false),
    ('discretionary', 'expense', true),
    ('tiffin', 'expense', false),
    ('bills', 'expense', false)
  on conflict (name) do nothing;

  select id into v_food from expense_categories where name='food';
  select id into v_transp from expense_categories where name='transport';
  select id into v_disc from expense_categories where name='discretionary';
  select id into v_tiffin from expense_categories where name='tiffin';
  select id into v_bills from expense_categories where name='bills';

  -- budgets (month-agnostic, one active set)
  insert into category_budgets (user_id, category_id, monthly_amount_in_minor_paise) values
    (v_user, v_food,     400000),  -- ₹4,000 Food
    (v_user, v_transp,   150000),  -- ₹1,500 Transport
    (v_user, v_disc,      50000)   -- ₹500 Discretionary
  on conflict (category_id) do nothing;

  -- seed transactions S1–S8
  with seed_txns(occurred_on, amount, cat, note) as (
    values (date '2026-10-05', 214000, 'food',           'Groceries — D-Mart'),
           (date '2026-10-12',  68000, 'transport',     'Auto + metro'),
           (date '2026-10-18', 126000, 'food',           'Dinner, two people'),
           (date '2026-10-22', 162000, 'discretionary',  'Flipkart impulse: desk lamp'),
           (date '2026-10-31', 450000, 'tiffin',         'Tiffin prepaid: 45 meals @ ₹100 (Utsav Mess)'),
           (date '2026-11-01', 124000, 'food',           'Groceries'),
           (date '2026-11-02',  11000, 'food',           'Coffee + samosa'),
           (date '2026-11-02',   9500, 'transport',      'Auto to campus')
  )
  insert into transactions (user_id, occurred_on, kind, category_id, amount_in_minor_paise, note, source, status, confirmed_at)
  select
    v_user, st.occurred_on, 'expense',
    (select id from expense_categories where name = st.cat),
    st.amount, st.note, 'seed', 'confirmed', st.occurred_on at time zone 'Asia/Kolkata'
  from seed_txns st
  where not exists (select 1 from transactions where user_id = v_user and source = 'seed');

  select id into v_tx_s5 from transactions
    where user_id=v_user and note='Tiffin prepaid: 45 meals @ ₹100 (Utsav Mess)';

  -- meal types
  insert into meal_types (user_id, name, plan, default_price_in_minor_paise) values
    (v_user, 'breakfast', 'prepaid', 10000),
    (v_user, 'lunch', 'prepaid', 10000),
    (v_user, 'dinner', 'prepaid', 10000),
    (v_user, 'late_night_snack', 'custom', 6000)  -- seeded but unused in demo (§2.3)
  on conflict (user_id, name) do nothing;

  select id into v_meal_breakfast from meal_types where user_id=v_user and name='breakfast';
  select id into v_meal_lunch from meal_types where user_id=v_user and name='lunch';
  select id into v_meal_dinner from meal_types where user_id=v_user and name='dinner';

  -- tiffin subscription for Nov 2026
  insert into tiffin_subscriptions (user_id, cycle_month, prepaid_meals, price_in_minor_paise, prepaid_amount_in_minor_paise, paid_on)
  values (v_user, date '2026-11-01', 45, 10000, 450000, date '2026-10-31')
  on conflict (user_id, cycle_month) do nothing;

  -- seed consumption (Nov 1: B consumed, L consumed, D skipped; Nov 2: B, L consumed)
  -- canonical pre-demo aggregate (§2.3 line + rail + §2.7): 4 consumed · 1 skipped · billed ₹400 · balance ₹4,100
  with meals(day, meal, meal_status) as (
    values (date '2026-11-01', 'breakfast', 'consumed'),
           (date '2026-11-01', 'lunch', 'consumed'),
           (date '2026-11-01', 'dinner', 'skipped'),
           (date '2026-11-02', 'breakfast', 'consumed'),
           (date '2026-11-02', 'lunch', 'consumed')
  )
  insert into meal_consumption
    (user_id, occurred_on, meal_type_id, status, record_status, price_at_record_time_in_minor_paise, source)
  select v_user, m.day, mt.id, m.meal_status, 'confirmed', mt.default_price_in_minor_paise, 'seed'
  from meals m join meal_types mt
    on mt.name = m.meal and mt.user_id = v_user
  where not exists (select 1 from meal_consumption where user_id = v_user and source = 'seed');

  -- seeded decision
  insert into decisions (user_id, text, linked_transaction_id, confidence, decided_on)
  values (v_user, 'Continuing tiffin subscription next month', v_tx_s5, 0.85, date '2026-10-31')
  on conflict do nothing;

  insert into demo_config (id, seed_version, is_demo) values (1, '1', true) on conflict (id) do nothing;

  return jsonb_build_object('status','seeded','seed_version','1');
end $$;

create or replace function reset_demo_data()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';
begin
  delete from meal_consumption where user_id = v_user;
  delete from decisions        where user_id = v_user;
  delete from commitments      where user_id = v_user;
  delete from memories         where user_id = v_user;
  delete from transactions     where user_id = v_user;
  delete from tiffin_subscriptions where user_id = v_user;
  delete from meal_types       where user_id = v_user;
  delete from category_budgets where user_id = v_user;
  delete from audit_log        where user_id = v_user or user_id is null;
  -- safeupdate (preloaded in the Supabase stack) requires an explicit WHERE even for a full wipe
  delete from demo_config      where true;
  return seed_demo_data();
end $$;
