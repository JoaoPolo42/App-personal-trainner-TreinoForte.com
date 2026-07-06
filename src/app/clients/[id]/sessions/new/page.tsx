'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Heart, Activity, Brain, Save, ChevronDown, ChevronUp, Sparkles, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { pseLabel, calculateAge } from '@/lib/utils';
import type { WorkoutGroup, PrescribedExercise, SetData } from '@/types/database';

type GroupWithExercises = WorkoutGroup & { prescribed_exercises: PrescribedExercise[] };

interface SessionExerciseRow {
  id: string;
  name: string;
  prescribed_id: string | null;
  sets: SetData[];
}

interface ClientProfile {
  full_name: string;
  age: number | null;
  objective: string | null;
  health_conditions: string | null;
  medications: string | null;
  medical_notes: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  resting_hr: number | null;
}

export default function NewSessionPage() {
  const params = useParams();
  const clientId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [trainerId, setTrainerId] = useState('');
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [groups, setGroups] = useState<GroupWithExercises[]>([]);
  const [loading, setLoading] = useState(false);

  const [showPhysio, setShowPhysio] = useState(false);
  const [form, setForm] = useState({
    session_date: new Date().toISOString().split('T')[0],
    start_time: '',
    duration_minutes: '',
    workout_group_id: '',
    resting_hr: '', avg_hr: '', max_hr: '', pre_bp: '',
    pse: '', energy_level: '', sleep_quality: '', mood: '',
    trainer_notes: '',
  });

  const [exercises, setExercises] = useState<SessionExerciseRow[]>([]);

  // IA
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: t } = await supabase.from('trainers').select('id, subscription_status').eq('user_id', user.id).single();
      if (!t) return;
      setTrainerId(t.id);
      setSubscriptionActive((t as any).subscription_status === 'active');

      const [{ data: c }, { data: plan }, { data: meas }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase.from('workout_plans').select('id, workout_groups(*, prescribed_exercises(*))').eq('client_id', clientId).eq('active', true).single(),
        supabase.from('body_measurements').select('weight_kg, height_cm').eq('client_id', clientId).order('measured_at', { ascending: false }).limit(1).single(),
      ]);

      if (c) {
        setClient({
          full_name: c.full_name,
          age: c.birth_date ? calculateAge(c.birth_date) : null,
          objective: c.objective,
          health_conditions: c.health_conditions,
          medications: c.medications,
          medical_notes: c.medical_notes,
          weight_kg: meas?.weight_kg ?? null,
          height_cm: meas?.height_cm ?? null,
          resting_hr: c.resting_hr,
        });
      }
      if (plan) setGroups((plan as any).workout_groups ?? []);
    }
    load();
  }, [clientId]);

  function setField(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function handleGroupChange(groupId: string) {
    setField('workout_group_id', groupId);
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setExercises(
        group.prescribed_exercises.sort((a, b) => a.sort_order - b.sort_order).map((ex) => ({
          id: crypto.randomUUID(),
          name: ex.name,
          prescribed_id: ex.id,
          sets: Array.from({ length: ex.sets ?? 3 }, (_, i) => ({
            set: i + 1,
            reps: null,
            load_kg: ex.load_kg ?? null,
            rir: null,
            note: '',
          })),
        }))
      );
    }
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetData, value: string | number | null) {
    setExercises((prev) => {
      const updated = [...prev];
      const sets = [...updated[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      updated[exIdx] = { ...updated[exIdx], sets };
      return updated;
    });
  }

  function addSet(exIdx: number) {
    setExercises((prev) => {
      const updated = [...prev];
      const sets = [...updated[exIdx].sets];
      sets.push({ set: sets.length + 1, reps: null, load_kg: null, rir: null, note: '' });
      updated[exIdx] = { ...updated[exIdx], sets };
      return updated;
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((prev) => {
      const updated = [...prev];
      const sets = updated[exIdx].sets.filter((_, i) => i !== setIdx).map((s, i) => ({ ...s, set: i + 1 }));
      updated[exIdx] = { ...updated[exIdx], sets };
      return updated;
    });
  }

  function addFreeExercise() {
    setExercises((prev) => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      prescribed_id: null,
      sets: [{ set: 1, reps: null, load_kg: null, rir: null, note: '' }],
    }]);
  }

  async function handleAISuggest() {
    if (!client) return;
    setAiLoading(true);
    setAiError('');
    setAiSuggestion('');
    setAiOpen(true);

    const currentExercises = exercises.filter(e => e.name.trim()).map(e => e.name);

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, currentExercises }),
      });
      const data = await res.json();
      if (data.error) { setAiError(data.error); }
      else { setAiSuggestion(data.suggestion); }
    } catch {
      setAiError('Não foi possível conectar à IA. Verifique sua conexão.');
    }
    setAiLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data: session, error } = await supabase.from('training_sessions').insert({
      client_id: clientId,
      trainer_id: trainerId,
      workout_group_id: form.workout_group_id || null,
      session_date: form.session_date,
      start_time: form.start_time || null,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      resting_hr: form.resting_hr ? parseInt(form.resting_hr) : null,
      avg_hr: form.avg_hr ? parseInt(form.avg_hr) : null,
      max_hr: form.max_hr ? parseInt(form.max_hr) : null,
      pre_bp: form.pre_bp || null,
      pse: form.pse ? parseInt(form.pse) : null,
      energy_level: form.energy_level ? parseInt(form.energy_level) : null,
      sleep_quality: form.sleep_quality ? parseInt(form.sleep_quality) : null,
      mood: form.mood ? parseInt(form.mood) : null,
      trainer_notes: form.trainer_notes || null,
    }).select().single();

    if (error || !session) { setLoading(false); return; }

    if (exercises.length > 0) {
      await supabase.from('session_exercises').insert(
        exercises.filter((ex) => ex.name.trim()).map((ex, i) => ({
          session_id: session.id,
          prescribed_exercise_id: ex.prescribed_id,
          name: ex.name,
          sets_data: ex.sets,
          sort_order: i,
        }))
      );
    }

    router.push(`/clients/${clientId}`);
  }

  const ratingLabels = ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${clientId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Nova Sessão de Treino</h1>
          <p className="text-sm text-muted-foreground">Registre os dados do treino{client ? ` · ${client.full_name}` : ''}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={form.session_date} onChange={(e) => setField('session_date', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setField('start_time', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" min="1" value={form.duration_minutes} onChange={(e) => setField('duration_minutes', e.target.value)} placeholder="60" />
            </div>
            {groups.length > 0 && (
              <div className="sm:col-span-3 space-y-2">
                <Label>Treino executado</Label>
                <Select value={form.workout_group_id} onValueChange={handleGroupChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione o treino do dia" /></SelectTrigger>
                  <SelectContent>
                    {groups.sort((a, b) => a.sort_order - b.sort_order).map((g) => (
                      <SelectItem key={g.id} value={g.id}>Treino {g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Percepção de Esforço (sempre visível) */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-purple-500" />Percepção e Bem-estar</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>PSE — Percepção Subjetiva de Esforço (Escala Borg 6-20)</Label>
                {form.pse && (
                  <Badge variant="secondary">{form.pse} — {pseLabel(parseInt(form.pse))}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-4">6</span>
                <input
                  type="range" min="6" max="20" step="1"
                  value={form.pse || '6'}
                  onChange={(e) => setField('pse', e.target.value)}
                  className="flex-1 h-2 accent-primary"
                />
                <span className="text-sm text-muted-foreground w-5">20</span>
              </div>
              <div className="grid grid-cols-5 text-xs text-muted-foreground text-center">
                <span>Muito leve</span><span>Leve</span><span>Moderado</span><span>Pesado</span><span>Máximo</span>
              </div>
            </div>
            <Separator />
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { field: 'energy_level', label: 'Nível de energia pré-treino' },
                { field: 'sleep_quality', label: 'Qualidade do sono' },
                { field: 'mood', label: 'Humor / Disposição' },
              ].map(({ field, label }) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} type="button" onClick={() => setField(field, String(n))}
                        className={`flex-1 py-2 rounded text-xs font-medium border transition-colors ${
                          form[field as keyof typeof form] === String(n)
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-200 hover:bg-muted'
                        }`}
                      >{n}</button>
                    ))}
                  </div>
                  {(form as any)[field] && (
                    <p className="text-xs text-muted-foreground text-center">{ratingLabels[parseInt((form as any)[field])]}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dados Fisiológicos — recolhível */}
        <Card>
          <CardHeader>
            <button
              type="button"
              className="flex items-center justify-between w-full text-left"
              onClick={() => setShowPhysio((v) => !v)}
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Dados Fisiológicos
                <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </CardTitle>
              {showPhysio ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {showPhysio && (
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>FC Repouso pré-treino (bpm)</Label>
                <Input type="number" min="30" max="200" value={form.resting_hr} onChange={(e) => setField('resting_hr', e.target.value)} placeholder="ex: 65" />
              </div>
              <div className="space-y-2">
                <Label>FC Média durante o treino (bpm)</Label>
                <Input type="number" min="30" max="250" value={form.avg_hr} onChange={(e) => setField('avg_hr', e.target.value)} placeholder="ex: 145" />
              </div>
              <div className="space-y-2">
                <Label>FC Máxima atingida (bpm)</Label>
                <Input type="number" min="30" max="250" value={form.max_hr} onChange={(e) => setField('max_hr', e.target.value)} placeholder="ex: 178" />
              </div>
              <div className="space-y-2">
                <Label>PA pré-treino (mmHg)</Label>
                <Input value={form.pre_bp} onChange={(e) => setField('pre_bp', e.target.value)} placeholder="ex: 120/80" />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Exercícios */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Exercícios Executados</CardTitle>
            <div className="flex gap-2">
              {client && (
                subscriptionActive ? (
                  <Button type="button" size="sm" variant="outline" onClick={handleAISuggest} className="text-purple-700 border-purple-300 hover:bg-purple-50">
                    <Sparkles className="h-4 w-4 mr-1" />IA
                  </Button>
                ) : (
                  <Link href="/pricing">
                    <Button type="button" size="sm" variant="outline" className="text-gray-400 border-gray-200" title="Disponível no plano pago">
                      <Lock className="h-4 w-4 mr-1" />IA
                    </Button>
                  </Link>
                )
              )}
              <Button type="button" size="sm" variant="outline" onClick={addFreeExercise}>
                <Plus className="h-4 w-4 mr-1" />Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {groups.length > 0 ? 'Selecione um treino acima para pré-carregar os exercícios' : 'Adicione exercícios manualmente ou use a IA para sugestões'}
              </p>
            ) : exercises.map((ex, exIdx) => (
              <div key={ex.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={ex.name}
                    onChange={(e) => setExercises((prev) => { const u = [...prev]; u[exIdx] = { ...u[exIdx], name: e.target.value }; return u; })}
                    placeholder="Nome do exercício"
                    className="flex-1"
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={() => setExercises((p) => p.filter((_, i) => i !== exIdx))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-xs">
                        <th className="text-left pb-1 w-8">Série</th>
                        <th className="text-left pb-1">Reps</th>
                        <th className="text-left pb-1">Carga (kg)</th>
                        <th className="text-left pb-1">RIR</th>
                        <th className="text-left pb-1">Nota</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((set, setIdx) => (
                        <tr key={setIdx}>
                          <td className="pr-2 py-1 text-muted-foreground font-medium">{set.set}</td>
                          <td className="pr-2 py-1">
                            <Input type="number" min="0" value={set.reps ?? ''} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value ? parseInt(e.target.value) : null)} className="h-8 w-16" placeholder="12" />
                          </td>
                          <td className="pr-2 py-1">
                            <Input type="number" min="0" step="0.5" value={set.load_kg ?? ''} onChange={(e) => updateSet(exIdx, setIdx, 'load_kg', e.target.value ? parseFloat(e.target.value) : null)} className="h-8 w-20" placeholder="20" />
                          </td>
                          <td className="pr-2 py-1">
                            <Select value={set.rir !== null ? String(set.rir) : ''} onValueChange={(v) => updateSet(exIdx, setIdx, 'rir', v ? parseInt(v) : null)}>
                              <SelectTrigger className="h-8 w-16"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>{[0,1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="pr-2 py-1">
                            <Input value={set.note} onChange={(e) => updateSet(exIdx, setIdx, 'note', e.target.value)} className="h-8" placeholder="obs..." />
                          </td>
                          <td className="py-1">
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeSet(exIdx, setIdx)}>
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => addSet(exIdx)}>
                  <Plus className="h-3 w-3 mr-1" />Adicionar série
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader><CardTitle className="text-base">Observações do Treino</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.trainer_notes} onChange={(e) => setField('trainer_notes', e.target.value)} placeholder="Anotações sobre o desempenho, dificuldades, progressões observadas..." rows={3} />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href={`/clients/${clientId}`}><Button variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Sessão'}
          </Button>
        </div>
      </form>

      {/* Dialog de sugestão de IA */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Sugestão de Exercícios — IA
            </DialogTitle>
          </DialogHeader>
          {aiLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="text-sm text-muted-foreground">Analisando o perfil do cliente...</p>
            </div>
          )}
          {aiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {aiError}
            </div>
          )}
          {aiSuggestion && (
            <div className="prose prose-sm max-w-none">
              <div className="bg-purple-50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {aiSuggestion}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Sugestão gerada por IA com base no perfil do cliente. Avalie conforme seu julgamento profissional.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
