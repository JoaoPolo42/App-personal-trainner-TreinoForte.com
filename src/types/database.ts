export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      trainers: { Row: Trainer; Insert: TrainerInsert; Update: Partial<TrainerInsert> };
      clients: { Row: Client; Insert: ClientInsert; Update: Partial<ClientInsert> };
      body_measurements: { Row: BodyMeasurement; Insert: BodyMeasurementInsert; Update: Partial<BodyMeasurementInsert> };
      workout_plans: { Row: WorkoutPlan; Insert: WorkoutPlanInsert; Update: Partial<WorkoutPlanInsert> };
      workout_groups: { Row: WorkoutGroup; Insert: WorkoutGroupInsert; Update: Partial<WorkoutGroupInsert> };
      prescribed_exercises: { Row: PrescribedExercise; Insert: PrescribedExerciseInsert; Update: Partial<PrescribedExerciseInsert> };
      training_sessions: { Row: TrainingSession; Insert: TrainingSessionInsert; Update: Partial<TrainingSessionInsert> };
      session_exercises: { Row: SessionExercise; Insert: SessionExerciseInsert; Update: Partial<SessionExerciseInsert> };
      schedule_slots: { Row: ScheduleSlot; Insert: ScheduleSlotInsert; Update: Partial<ScheduleSlotInsert> };
      bookings: { Row: Booking; Insert: BookingInsert; Update: Partial<BookingInsert> };
    };
  };
}

export interface Trainer {
  id: string;
  user_id: string;
  full_name: string;
  cref: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  pix_key: string | null;
  pix_key_type: 'cpf' | 'email' | 'phone' | 'random' | null;
  trial_started_at: string;
  subscription_status: 'trial' | 'active' | 'expired';
  created_at: string;
}
export type TrainerInsert = Omit<Trainer, 'id' | 'created_at'>;

export interface Client {
  id: string;
  trainer_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  sex: 'M' | 'F' | 'outro' | null;
  avatar_url: string | null;
  objective: 'emagrecimento' | 'hipertrofia' | 'condicionamento' | 'reabilitacao' | 'outro' | null;
  fitness_level: 'iniciante' | 'intermediario' | 'avancado' | null;
  restrictions: string | null;
  medications: string | null;
  cardiac_history: boolean;
  cardiac_notes: string | null;
  resting_hr: number | null;
  resting_bp: string | null;
  vo2max_estimated: number | null;
  parq_answers: Json | null;
  active: boolean;
  notes: string | null;
  created_at: string;
}
export type ClientInsert = Omit<Client, 'id' | 'created_at'>;

export interface BodyMeasurement {
  id: string;
  client_id: string;
  measured_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  chest_cm: number | null;
  notes: string | null;
  created_at: string;
}
export type BodyMeasurementInsert = Omit<BodyMeasurement, 'id' | 'created_at'>;

export interface WorkoutPlan {
  id: string;
  client_id: string;
  trainer_id: string;
  name: string;
  objective: string | null;
  start_date: string | null;
  end_date: string | null;
  weekly_frequency: number;
  active: boolean;
  notes: string | null;
  created_at: string;
}
export type WorkoutPlanInsert = Omit<WorkoutPlan, 'id' | 'created_at'>;

export interface WorkoutGroup {
  id: string;
  plan_id: string;
  label: string;
  sort_order: number;
}
export type WorkoutGroupInsert = Omit<WorkoutGroup, 'id'>;

export interface PrescribedExercise {
  id: string;
  group_id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  sets: number | null;
  reps: string | null;
  duration_seconds: number | null;
  load_kg: number | null;
  rest_seconds: number;
  technique_notes: string | null;
  video_url: string | null;
  sort_order: number;
  created_at: string;
}
export type PrescribedExerciseInsert = Omit<PrescribedExercise, 'id' | 'created_at'>;

export interface SetData {
  set: number;
  reps: number | null;
  load_kg: number | null;
  rir: number | null;
  note: string;
}

export interface TrainingSession {
  id: string;
  client_id: string;
  trainer_id: string;
  workout_group_id: string | null;
  session_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  resting_hr: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  pre_bp: string | null;
  pse: number | null;
  energy_level: number | null;
  sleep_quality: number | null;
  mood: number | null;
  trainer_notes: string | null;
  client_notes: string | null;
  created_at: string;
}
export type TrainingSessionInsert = Omit<TrainingSession, 'id' | 'created_at'>;

export interface SessionExercise {
  id: string;
  session_id: string;
  prescribed_exercise_id: string | null;
  name: string;
  sets_data: SetData[];
  notes: string | null;
  sort_order: number;
}
export type SessionExerciseInsert = Omit<SessionExercise, 'id'>;

export interface ScheduleSlot {
  id: string;
  trainer_id: string;
  slot_date: string;
  slot_time: string;
  duration_min: number;
  price_cents: number;
  status: 'available' | 'booked' | 'blocked';
  created_at: string;
}
export type ScheduleSlotInsert = Omit<ScheduleSlot, 'id' | 'created_at'>;

export interface Booking {
  id: string;
  slot_id: string;
  client_id: string;
  trainer_id: string;
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'completed';
  pix_payload: string | null;
  pix_amount_cents: number | null;
  notes: string | null;
  created_at: string;
}
export type BookingInsert = Omit<Booking, 'id' | 'created_at'>;
