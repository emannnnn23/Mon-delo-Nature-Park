-- Contact messages and the only public write path into the database.
-- Anon and authenticated get no insert grant and no insert policy: visitors
-- submit through public.submit_contact_message(), which validates, rate
-- limits and inserts as its owner. Admins read, triage and delete messages.

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  email text not null check (
    char_length(trim(email)) <= 254
    and trim(email) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  phone text check (phone ~ '^[0-9 +()-]{0,30}$'),
  subject text not null check (char_length(trim(subject)) between 2 and 150),
  message text not null check (char_length(trim(message)) between 10 and 5000),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_messages_status_submitted_at_idx
  on public.contact_messages (status, submitted_at desc);

-- Serves the per-email rate-limit count.
create index contact_messages_lower_email_submitted_at_idx
  on public.contact_messages (lower(email), submitted_at);

-- Serves the global rate-limit count.
create index contact_messages_submitted_at_idx
  on public.contact_messages (submitted_at);

alter table public.contact_messages enable row level security;

revoke all on public.contact_messages from anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;

create policy contact_messages_select_admin
  on public.contact_messages
  for select
  to authenticated
  using ((select public.is_admin()));

create policy contact_messages_update_admin
  on public.contact_messages
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy contact_messages_delete_admin
  on public.contact_messages
  for delete
  to authenticated
  using ((select public.is_admin()));

create trigger contact_messages_set_updated_at
  before update on public.contact_messages
  for each row execute function public.set_updated_at();

-- submit_contact_message -----------------------------------------------------
-- Order of operations:
--   1. A filled honeypot or a missing/too-fast fill time returns 'ok' without
--      storing anything and without counting toward the limits.
--   2. Inputs are trimmed; a blank phone becomes null.
--   3. Rate limits: 3 per email (case-insensitive) and 50 in total per hour.
--   4. The insert; the table checks raise 23514 for invalid input.
create function public.submit_contact_message(
  p_full_name text,
  p_email text,
  p_phone text,
  p_subject text,
  p_message text,
  p_honeypot text,
  p_elapsed_ms integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text := trim(p_full_name);
  v_email text := trim(p_email);
  v_phone text := nullif(trim(p_phone), '');
  v_subject text := trim(p_subject);
  v_message text := trim(p_message);
  v_since timestamptz := now() - interval '1 hour';
begin
  if nullif(trim(p_honeypot), '') is not null
     or p_elapsed_ms is null
     or p_elapsed_ms < 3000 then
    return 'ok';
  end if;

  if (
    select count(*)
      from public.contact_messages
     where lower(email) = lower(v_email)
       and submitted_at > v_since
  ) >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if (
    select count(*)
      from public.contact_messages
     where submitted_at > v_since
  ) >= 50 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.contact_messages (full_name, email, phone, subject, message)
  values (v_full_name, v_email, v_phone, v_subject, v_message);

  return 'ok';
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, text, text, integer)
  to anon, authenticated;
