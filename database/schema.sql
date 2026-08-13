-- Offline UPI database schema
-- Run this in the Supabase SQL editor (or via psql) on a fresh project.

create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  balance numeric(12, 2) not null default 10000.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  client_transaction_id text not null unique,
  sender_id uuid not null references users(id),
  receiver_id uuid not null references users(id),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'INR',
  note text,
  status text not null default 'PENDING_SYNC'
    check (status in ('PENDING_SYNC', 'PROCESSING', 'COMPLETED', 'FAILED')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_transactions_sender on transactions(sender_id);
create index if not exists idx_transactions_receiver on transactions(receiver_id);
create index if not exists idx_transactions_client_id on transactions(client_transaction_id);
create index if not exists idx_users_email on users(email);

-- keep updated_at current on users
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row
  execute function set_updated_at();

-- Processes a payment atomically. Safe to call twice with the same
-- client_transaction_id: the second call just returns the first result
-- instead of moving money again. This is what makes offline retries safe.
create or replace function process_transaction(
  p_client_transaction_id text,
  p_sender_id uuid,
  p_receiver_id uuid,
  p_amount numeric,
  p_note text
)
returns transactions
language plpgsql
as $$
declare
  v_existing transactions;
  v_sender_balance numeric;
  v_result transactions;
begin
  -- already processed? hand back what we already did, don't redo it
  select * into v_existing from transactions
    where client_transaction_id = p_client_transaction_id;
  if found then
    return v_existing;
  end if;

  if p_sender_id = p_receiver_id then
    raise exception 'SELF_PAYMENT';
  end if;

  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if not exists (select 1 from users where id = p_receiver_id) then
    raise exception 'RECEIVER_NOT_FOUND';
  end if;

  -- lock the sender row so two simultaneous payments can't both read
  -- the same starting balance
  select balance into v_sender_balance from users
    where id = p_sender_id for update;

  if v_sender_balance is null then
    raise exception 'SENDER_NOT_FOUND';
  end if;

  if v_sender_balance < p_amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  update users set balance = balance - p_amount where id = p_sender_id;
  update users set balance = balance + p_amount where id = p_receiver_id;

  insert into transactions (
    client_transaction_id, sender_id, receiver_id, amount, note, status, processed_at
  ) values (
    p_client_transaction_id, p_sender_id, p_receiver_id, p_amount, p_note, 'COMPLETED', now()
  )
  returning * into v_result;

  return v_result;
exception
  when unique_violation then
    -- lost a race against another request with the same id, return theirs
    select * into v_existing from transactions
      where client_transaction_id = p_client_transaction_id;
    return v_existing;
end;
$$;
