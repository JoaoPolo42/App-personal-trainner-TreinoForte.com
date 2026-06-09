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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import type { WorkoutPlan, WorkoutGroup, PrescribedExercise } from '@/types/database';

type GroupWithExercises = WorkoutGroup & { prescribed_exercises: PrescribedExercise[] };
type PlanWithGroups = WorkoutPlan & { workout_groups: GroupWithExercises[] };

const muscleGroups = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Quadríceps', 'Isquiotibiais', 'Glúteos', 'Panturrilha', 'Abdômen', 'Cardio', 'Full Body'];

export default function PlanPage() {
  const params = useParams();
  const clientId = params.id as string;
  const supabase = createClient();

  const [plan, setPlan] = useState<PlanWithGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainerId, setTrainerId] = useState('');

  // New plan form
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', objective: '', weekly_frequency: '3', start_date: '' });

  // New group form
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupLabel, setGroupLabel] = useState('');

  // New exercise dialog
  const [exerciseDialog, setExerciseDialog] = useState<{ open: boolean; groupId: string }>({ open: false, groupId: '' });
  const [exForm, setExForm] = useState({
    name: '', muscle_group: '', equipment: '', sets: '3', reps: '12',
    load_kg: '', rest_seconds: '60', technique_notes: '', video_url: '',
  });

  useEffect(() => {
    loadPlan();
  }, [clientId]);

  async function loadPlan() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: t } = await supabase.from('trainers').select('id').eq('user_id', user.id).single();
    if (!t) return;
    setTrainerId(t.id);

    const { data } = await supabase
      .from('workout_plans')
      .select('*, workout_groups(*, prescribed_exercises(*))')
      .eq('client_id', clientId)
      .eq('active', true)
      .single();

    setPlan(data as PlanWithGroups | null);
    setLoading(false);
  }

  async function createPlan() {
    const { data } = await supabase.from('workout_plans').insert({
      client_id: clientId,
      trainer_id: trainerId,
      name: planForm.name,
      objective: planForm.objective || null,
      weekly_frequency: parseInt(planForm.weekly_frequency),
      start_date: planForm.start_date || null,
      active: true,
    }).select().single();
    setShowNewPlan(false);
    loadPlan();
  }

  async function addGroup() {
    if (!plan) return;
    await supabase.from('workout_groups').insert({
      plan_id: plan.id,
      label: groupLabel,
      sort_order: plan.workout_groups.length,
    });
    setGroupLabel('');
    setShowNewGroup(false);
    loadPlan();
  }

  async function addExercise() {
    await supabase.from('prescribed_exercises').insert({
      group_id: exerciseDialog.groupId,
      name: exForm.name,
      muscle_group: exForm.muscle_group || null,
      equipment: exForm.equipment || null,
      sets: parseInt(exForm.sets) || null,
      reps: exForm.reps || null,
      load_kg: exForm.load_kg ? parseFloat(exForm.load_kg) : null,
      rest_seconds: parseInt(exForm.rest_seconds) || 60,
      technique_notes: exForm.technique_notes || null,
      video_url: exForm.video_url || null,
      sort_order: 0,
    });
    setExForm({ name: '', muscle_group: '', equipment: '', sets: '3', reps: '12', load_kg: '', rest_seconds: '60', technique_notes: '', video_url: '' });
    setExerciseDialog({ open: false, groupId: '' });
    loadPlan();
  }

  async function deleteExercise(id: string) {
    await supabase.from('prescribed_exercises').delete().eq('id', id);
    loadPlan();
  }

  async function deleteGroup(id: string) {
    await supabase.from('workout_groups').delete().eq('id', id);
    loadPlan();
  }

  if (loading) return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${clientId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Plano de Treino</h1>
          {plan && <p className="text-sm text-muted-foreground">{plan.name}</p>}
        </div>
        {plan && (
          <Button size="sm" onClick={() => setShowNewGroup(true)}>
            <Plus className="h-4 w-4 mr-1" />Treino
          </Button>
        )}
      </div>

      {!plan ? (
        <div className="text-center py-12">
          <Dumbbell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum plano ativo</h3>
          <p className="text-muted-foreground text-sm mb-4">Crie um plano de treino para este cliente</p>
          <Button onClick={() => setShowNewPlan(true)}>Criar plano de treino</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Frequência:</span> {plan.weekly_frequency}x/semana</div>
              <div><span className="text-muted-foreground">Início:</span> {plan.start_date ?? '—'}</div>
              <div><span className="text-muted-foreground">Objetivo:</span> {plan.objective ?? '—'}</div>
            </CardContent>
          </Card>

          {plan.workout_groups.sort((a, b) => a.sort_order - b.sort_order).map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="bg-primary text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">{group.label}</span>
                    Treino {group.label}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setExerciseDialog({ open: true, groupId: group.id }); }}>
                      <Plus className="h-4 w-4 mr-1" />Exercício
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteGroup(group.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {group.prescribed_exercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">Nenhum exercício. Adicione o primeiro.</p>
                ) : (
                  <div className="space-y-2">
                    {group.prescribed_exercises.sort((a, b) => a.sort_order - b.sort_order).map((ex) => (
                      <div key={ex.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50">
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{ex.name}</span>
                            {ex.muscle_group && <Badge variant="secondary" className="text-xs">{ex.muscle_group}</Badge>}
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>{ex.sets}x{ex.reps}</span>
                            {ex.load_kg && <span>{ex.load_kg} kg</span>}
                            {ex.rest_seconds && <span>Descanso: {ex.rest_seconds}s</span>}
                            {ex.equipment && <span>• {ex.equipment}</span>}
                          </div>
                          {ex.technique_notes && <p className="text-xs text-muted-foreground mt-1 italic">{ex.technique_notes}</p>}
                        </div>
                        <Button size="icon" variant="ghost" className="flex-shrink-0" onClick={() => deleteExercise(ex.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: Novo Plano */}
      <Dialog open={showNewPlan} onOpenChange={setShowNewPlan}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Plano de Treino</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome do plano *</Label><Input value={planForm.name} onChange={(e) => setPlanForm(p => ({ ...p, name: e.target.value }))} placeholder="ex: Fase 1 - Adaptação" /></div>
            <div className="space-y-2"><Label>Objetivo da fase</Label><Input value={planForm.objective} onChange={(e) => setPlanForm(p => ({ ...p, objective: e.target.value }))} placeholder="ex: Ganho de base muscular" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Frequência semanal</Label>
                <Select value={planForm.weekly_frequency} onValueChange={(v) => setPlanForm(p => ({ ...p, weekly_frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n}x por semana</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Data de início</Label><Input type="date" value={planForm.start_date} onChange={(e) => setPlanForm(p => ({ ...p, start_date: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPlan(false)}>Cancelar</Button>
            <Button onClick={createPlan} disabled={!planForm.name}>Criar Plano</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Grupo */}
      <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Grupo de Treino</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Identificação do treino</Label>
            <Input value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)} placeholder="ex: A, B, C  ou  Peito e Tríceps" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroup(false)}>Cancelar</Button>
            <Button onClick={addGroup} disabled={!groupLabel}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Exercício */}
      <Dialog open={exerciseDialog.open} onOpenChange={(o) => setExerciseDialog({ open: o, groupId: '' })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Adicionar Exercício</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label>Nome do exercício *</Label>
              <Input value={exForm.name} onChange={(e) => setExForm(p => ({ ...p, name: e.target.value }))} placeholder="ex: Supino reto com barra" />
            </div>
            <div className="space-y-2">
              <Label>Grupo muscular</Label>
              <Select value={exForm.muscle_group} onValueChange={(v) => setExForm(p => ({ ...p, muscle_group: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{muscleGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipamento</Label>
              <Input value={exForm.equipment} onChange={(e) => setExForm(p => ({ ...p, equipment: e.target.value }))} placeholder="Barra, halteres, máquina..." />
            </div>
            <div className="space-y-2">
              <Label>Séries</Label>
              <Input type="number" min="1" value={exForm.sets} onChange={(e) => setExForm(p => ({ ...p, sets: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Repetições</Label>
              <Input value={exForm.reps} onChange={(e) => setExForm(p => ({ ...p, reps: e.target.value }))} placeholder="12 ou 8-12 ou 30s" />
            </div>
            <div className="space-y-2">
              <Label>Carga (kg)</Label>
              <Input type="number" step="0.5" value={exForm.load_kg} onChange={(e) => setExForm(p => ({ ...p, load_kg: e.target.value }))} placeholder="20" />
            </div>
            <div className="space-y-2">
              <Label>Descanso (segundos)</Label>
              <Input type="number" value={exForm.rest_seconds} onChange={(e) => setExForm(p => ({ ...p, rest_seconds: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Notas de técnica</Label>
              <Textarea value={exForm.technique_notes} onChange={(e) => setExForm(p => ({ ...p, technique_notes: e.target.value }))} rows={2} placeholder="Pegada pronada, cotovelos a 45°..." />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>URL do vídeo (opcional)</Label>
              <Input type="url" value={exForm.video_url} onChange={(e) => setExForm(p => ({ ...p, video_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExerciseDialog({ open: false, groupId: '' })}>Cancelar</Button>
            <Button onClick={addExercise} disabled={!exForm.name}>Adicionar Exercício</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
