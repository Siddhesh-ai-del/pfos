-- 0002 — security hardening pass (post security-review):
-- 1) Revoke EXECUTE on all security-definer functions from public/anon/authenticated
--    (defense in depth across every RPC exposed by this migration tree).
-- 2) Transactional idempotency for drafts: transactions.idempotency_key (unique,
--    NULLs allowed) + create_transaction_draft becomes replay-safe (INSERT ... ON
--    CONFLICT DO NOTHING, then SELECT the existing row).
-- 3) confirm_transaction stamps idempotency_key on the row when provided.
-- Idempotent migration: safe to re-run.

do $$
declare r record;
begin
  for r in
    select p.proname, p.oid, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.prosecdef  -- security definer only
  loop
    execute format(
      'revoke all on function public.%I(%s) from public, anon, authenticated',
      r.proname, r.args
    );
    execute format(
      'grant execute on function public.%I(%s) to service_role',
      r.proname, r.args
    );
  end loop;
end $$;

-- transactional idempotency for expense drafts
alter table transactions add column if not exists idempotency_key text;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_idempotency_key_key'
  ) then
    alter table transactions add constraint transactions_idempotency_key_key
      unique (idempotency_key);
  end if;
end $$;

-- meal transactions get the same column for symmetric confirm semantics
alter table meal_consumption add column if not exists idempotency_key text;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'meal_consumption_idempotency_key_key'
  ) then
    alter table meal_consumption add constraint meal_consumption_idempotency_key_key
      unique (idempotency_key);
  end if;
end $$;

-- replay-safe draft creation
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

  insert into transactions
    (user_id, occurred_on, kind, category_id, amount_in_minor_paise, note, source, status, idempotency_key)
  values
    ('00000000-0000-0000-0000-000000000001', p_occurred_on, p_kind, v_cat_id,
     p_amount_in_minor_paise, p_note, p_source, 'estimated', p_idempotency_key)
  on conflict (idempotency_key) do nothing
  returning * into v_row;

  if v_row.id is null and p_idempotency_key is not null then
    -- replay: return the originally persisted row verbatim
    select * into v_row from transactions where idempotency_key = p_idempotency_key;
  end if;

  return to_jsonb(v_row);
end $$;

-- confirm_transaction stamps the key when one is provided (idempotent by status guard)
create or replace function confirm_transaction(p_transaction_id uuid, p_idempotency_key text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row transactions;
begin
  select * into v_row from transactions
   where id = p_transaction_id
     and user_id = '00000000-0000-0000-0000-000000000001'
     and status = 'estimated'
   for update;

  if v_row.id is not null then
    update transactions
       set status = 'confirmed',
           confirmed_at = now(),
           idempotency_key = coalesce(p_idempotency_key, idempotency_key)
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

-- meal confirm stamps the key too
create or replace function confirm_meal_consumption(p_meal_id uuid, p_idempotency_key text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row meal_consumption;
  v_result jsonb;
begin
  select * into v_row from meal_consumption
   where id = p_meal_id
     and user_id = '00000000-0000-0000-0000-000000000001'
     and record_status = 'estimated'
   for update;

  if v_row.id is not null then
    begin
      update meal_consumption
         set record_status = 'confirmed',
             idempotency_key = coalesce(p_idempotency_key, idempotency_key)
       where id = v_row.id
      returning * into v_row;
    exception when unique_violation then
      delete from meal_consumption where id = v_row.id;
      select * into v_row from meal_consumption
       where user_id = v_row.user_id and occurred_on = v_row.occurred_on
         and meal_type_id = v_row.meal_type_id and record_status = 'confirmed' and status = v_row.status;
    end;
    return to_jsonb(v_row);
  end if;

  select to_jsonb(m) into v_result from meal_consumption m
   where id = p_meal_id and user_id = '00000000-0000-0000-0000-000000000001' and record_status = 'confirmed';
  if v_result is null then
    v_result := jsonb_build_object('error','meal_not_found','re_ask', true);
  end if;
  return v_result;
end $$;

-- prove the revoke took effect for the unsafe roles (deploy checklist)
-- run: select has_function_privilege('anon', 'reset_demo_data()', 'EXECUTE');
-- expect false
