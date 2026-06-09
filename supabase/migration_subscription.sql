-- Migração: adicionar controle de assinatura na tabela trainers
alter table public.trainers
  add column if not exists trial_started_at  timestamptz default now(),
  add column if not exists subscription_status text
    check (subscription_status in ('trial','active','expired'))
    default 'trial';
