-- ============================================================
-- MIGRATION: Solicitações de agendamento público
-- ============================================================

-- Permite que qualquer pessoa leia os dados básicos do trainer (nome, CREF)
-- para exibir na página pública de agendamento
create policy "public_read_trainers" on public.trainers
  for select using (true);

-- Tabela de solicitações de agendamento (sem necessidade de login)
create table if not exists public.booking_requests (
  id          uuid primary key default uuid_generate_v4(),
  trainer_id  uuid references public.trainers(id) on delete cascade not null,
  slot_id     uuid references public.schedule_slots(id) on delete cascade not null,
  guest_name  text not null,
  guest_phone text not null,
  guest_email text,
  message     text,
  status      text check (status in ('pending','confirmed','cancelled')) default 'pending',
  created_at  timestamptz default now()
);

alter table public.booking_requests enable row level security;

-- Qualquer pessoa pode criar uma solicitação (sem login)
create policy "public_insert_booking_request" on public.booking_requests
  for insert with check (true);

-- Apenas o trainer vê e gerencia suas solicitações
create policy "trainer_manage_booking_requests" on public.booking_requests
  for all using (
    trainer_id in (select id from public.trainers where user_id = auth.uid())
  );
