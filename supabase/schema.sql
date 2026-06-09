-- ============================================================
-- PERSONAL TRAINER APP — SCHEMA SUPABASE
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ============================================================
-- TRAINERS
-- ============================================================
create table public.trainers (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null unique,
  full_name     text not null,
  cref          text,
  phone         text,
  bio           text,
  avatar_url    text,
  pix_key              text,
  pix_key_type         text check (pix_key_type in ('cpf','email','phone','random')),
  trial_started_at     timestamptz default now(),
  subscription_status  text check (subscription_status in ('trial','active','expired')) default 'trial',
  created_at           timestamptz default now()
);

alter table public.trainers enable row level security;
create policy "trainer_own" on public.trainers
  using (user_id = auth.uid());

-- ============================================================
-- CLIENTS
-- ============================================================
create table public.clients (
  id                  uuid primary key default uuid_generate_v4(),
  trainer_id          uuid references public.trainers(id) on delete cascade not null,
  user_id             uuid references auth.users(id) on delete set null,
  full_name           text not null,
  email               text,
  phone               text,
  birth_date          date,
  sex                 text check (sex in ('M','F','outro')),
  avatar_url          text,
  -- Dados de saúde
  objective           text check (objective in ('emagrecimento','hipertrofia','condicionamento','reabilitacao','outro')),
  fitness_level       text check (fitness_level in ('iniciante','intermediario','avancado')),
  restrictions        text,
  medications         text,
  cardiac_history     boolean default false,
  cardiac_notes       text,
  resting_hr          int,
  resting_bp          text,
  vo2max_estimated    numeric(5,2),
  parq_answers        jsonb,
  active              boolean default true,
  notes               text,
  created_at          timestamptz default now()
);

alter table public.clients enable row level security;
create policy "trainer_manages_clients" on public.clients
  using (
    trainer_id in (select id from public.trainers where user_id = auth.uid())
    or user_id = auth.uid()
  );

-- ============================================================
-- MEDIÇÕES ANTROPOMÉTRICAS (histórico)
-- ============================================================
create table public.body_measurements (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid references public.clients(id) on delete cascade not null,
  measured_at     date not null default current_date,
  weight_kg       numeric(5,2),
  height_cm       numeric(5,1),
  body_fat_pct    numeric(4,1),
  waist_cm        numeric(5,1),
  hip_cm          numeric(5,1),
  arm_cm          numeric(5,1),
  thigh_cm        numeric(5,1),
  chest_cm        numeric(5,1),
  notes           text,
  created_at      timestamptz default now()
);

alter table public.body_measurements enable row level security;
create policy "trainer_measures" on public.body_measurements
  using (
    client_id in (
      select id from public.clients
      where trainer_id in (select id from public.trainers where user_id = auth.uid())
         or user_id = auth.uid()
    )
  );

-- ============================================================
-- PLANOS DE TREINO
-- ============================================================
create table public.workout_plans (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid references public.clients(id) on delete cascade not null,
  trainer_id      uuid references public.trainers(id) on delete cascade not null,
  name            text not null,
  objective       text,
  start_date      date,
  end_date        date,
  weekly_frequency int default 3,
  active          boolean default true,
  notes           text,
  created_at      timestamptz default now()
);

alter table public.workout_plans enable row level security;
create policy "trainer_plans" on public.workout_plans
  using (
    trainer_id in (select id from public.trainers where user_id = auth.uid())
    or client_id in (select id from public.clients where user_id = auth.uid())
  );

-- ============================================================
-- GRUPOS DE TREINO (A, B, C...)
-- ============================================================
create table public.workout_groups (
  id          uuid primary key default uuid_generate_v4(),
  plan_id     uuid references public.workout_plans(id) on delete cascade not null,
  label       text not null,  -- 'A', 'B', 'C' ou 'Peito e Tríceps', etc.
  sort_order  int default 0
);

alter table public.workout_groups enable row level security;
create policy "trainer_groups" on public.workout_groups
  using (
    plan_id in (
      select id from public.workout_plans
      where trainer_id in (select id from public.trainers where user_id = auth.uid())
         or client_id in (select id from public.clients where user_id = auth.uid())
    )
  );

-- ============================================================
-- EXERCÍCIOS PRESCRITOS
-- ============================================================
create table public.prescribed_exercises (
  id                  uuid primary key default uuid_generate_v4(),
  group_id            uuid references public.workout_groups(id) on delete cascade not null,
  name                text not null,
  muscle_group        text,
  equipment           text,
  sets                int,
  reps                text,      -- "12", "8-12", "até a falha"
  duration_seconds    int,
  load_kg             numeric(6,2),
  rest_seconds        int default 60,
  technique_notes     text,
  video_url           text,
  sort_order          int default 0,
  created_at          timestamptz default now()
);

alter table public.prescribed_exercises enable row level security;
create policy "trainer_exercises" on public.prescribed_exercises
  using (
    group_id in (
      select wg.id from public.workout_groups wg
      join public.workout_plans wp on wp.id = wg.plan_id
      where wp.trainer_id in (select id from public.trainers where user_id = auth.uid())
         or wp.client_id in (select id from public.clients where user_id = auth.uid())
    )
  );

-- ============================================================
-- SESSÕES DE TREINO
-- ============================================================
create table public.training_sessions (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid references public.clients(id) on delete cascade not null,
  trainer_id          uuid references public.trainers(id) on delete cascade not null,
  workout_group_id    uuid references public.workout_groups(id) on delete set null,
  session_date        date not null default current_date,
  start_time          time,
  duration_minutes    int,
  -- Fisiológicos
  resting_hr          int,       -- FC repouso pré-treino
  avg_hr              int,       -- FC média
  max_hr              int,       -- FC máxima
  pre_bp              text,      -- PA pré-treino
  -- Percepção
  pse                 int check (pse between 1 and 20),   -- Escala Borg 6-20
  energy_level        int check (energy_level between 1 and 5),
  sleep_quality       int check (sleep_quality between 1 and 5),
  mood                int check (mood between 1 and 5),
  trainer_notes       text,
  client_notes        text,
  created_at          timestamptz default now()
);

alter table public.training_sessions enable row level security;
create policy "trainer_sessions" on public.training_sessions
  using (
    trainer_id in (select id from public.trainers where user_id = auth.uid())
    or client_id in (select id from public.clients where user_id = auth.uid())
  );

-- ============================================================
-- EXERCÍCIOS EXECUTADOS (por sessão)
-- ============================================================
create table public.session_exercises (
  id                      uuid primary key default uuid_generate_v4(),
  session_id              uuid references public.training_sessions(id) on delete cascade not null,
  prescribed_exercise_id  uuid references public.prescribed_exercises(id) on delete set null,
  name                    text not null,
  sets_data               jsonb not null default '[]',
  -- sets_data: [{set: 1, reps: 12, load_kg: 20, rir: 2, note: ""}]
  notes                   text,
  sort_order              int default 0
);

alter table public.session_exercises enable row level security;
create policy "trainer_session_exercises" on public.session_exercises
  using (
    session_id in (
      select id from public.training_sessions
      where trainer_id in (select id from public.trainers where user_id = auth.uid())
         or client_id in (select id from public.clients where user_id = auth.uid())
    )
  );

-- ============================================================
-- SLOTS DE AGENDA (horários disponíveis)
-- ============================================================
create table public.schedule_slots (
  id              uuid primary key default uuid_generate_v4(),
  trainer_id      uuid references public.trainers(id) on delete cascade not null,
  slot_date       date not null,
  slot_time       time not null,
  duration_min    int default 60,
  price_cents     int not null default 0,
  status          text check (status in ('available','booked','blocked')) default 'available',
  created_at      timestamptz default now(),
  unique (trainer_id, slot_date, slot_time)
);

alter table public.schedule_slots enable row level security;
create policy "trainer_slots" on public.schedule_slots
  using (
    trainer_id in (select id from public.trainers where user_id = auth.uid())
    or status = 'available'
  );

-- ============================================================
-- AGENDAMENTOS
-- ============================================================
create table public.bookings (
  id              uuid primary key default uuid_generate_v4(),
  slot_id         uuid references public.schedule_slots(id) on delete cascade not null unique,
  client_id       uuid references public.clients(id) on delete cascade not null,
  trainer_id      uuid references public.trainers(id) on delete cascade not null,
  status          text check (status in ('pending_payment','confirmed','cancelled','completed')) default 'pending_payment',
  pix_payload     text,
  pix_amount_cents int,
  notes           text,
  created_at      timestamptz default now()
);

alter table public.bookings enable row level security;
create policy "trainer_bookings" on public.bookings
  using (
    trainer_id in (select id from public.trainers where user_id = auth.uid())
    or client_id in (select id from public.clients where user_id = auth.uid())
  );

-- ============================================================
-- ÍNDICES
-- ============================================================
create index on public.clients (trainer_id);
create index on public.body_measurements (client_id, measured_at desc);
create index on public.workout_plans (client_id);
create index on public.training_sessions (client_id, session_date desc);
create index on public.schedule_slots (trainer_id, slot_date);
create index on public.bookings (trainer_id, created_at desc);
