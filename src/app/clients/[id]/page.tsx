import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, User, Phone, Mail, Activity, Dumbbell,
  Calendar, FileText, Heart, Ruler, Plus
} from 'lucide-react';
import { calculateAge, calculateBMI, bmiLabel, formatDate } from '@/lib/utils';

export default async function ClientPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: trainer } = await supabase.from('trainers').select('id').eq('user_id', user.id).single();
  if (!trainer) redirect('/auth/register');

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .eq('trainer_id', trainer.id)
    .single();

  if (!client) notFound();

  const [
    { data: measurements },
    { data: sessions },
    { data: activePlan },
  ] = await Promise.all([
    supabase.from('body_measurements').select('*').eq('client_id', client.id).order('measured_at', { ascending: false }).limit(10),
    supabase.from('training_sessions').select('*').eq('client_id', client.id).order('session_date', { ascending: false }).limit(10),
    supabase.from('workout_plans').select('*, workout_groups(*, prescribed_exercises(*))').eq('client_id', client.id).eq('active', true).single(),
  ]);

  const latestMeasurement = measurements?.[0];
  const bmi = latestMeasurement?.weight_kg && latestMeasurement?.height_cm
    ? calculateBMI(latestMeasurement.weight_kg, latestMeasurement.height_cm) : null;

  const objectiveLabels: Record<string, string> = {
    emagrecimento: 'Emagrecimento', hipertrofia: 'Hipertrofia',
    condicionamento: 'Condicionamento', reabilitacao: 'Reabilitação', outro: 'Outro',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{client.full_name}</h1>
            <Badge variant={client.active ? 'success' : 'secondary'}>{client.active ? 'Ativo' : 'Inativo'}</Badge>
            {client.objective && <Badge variant="outline">{objectiveLabels[client.objective]}</Badge>}
          </div>
          {client.birth_date && <p className="text-sm text-muted-foreground">{calculateAge(client.birth_date)} anos</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/clients/${client.id}/sessions/new`}>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Sessão</Button>
          </Link>
          <Link href={`/clients/${client.id}/reports`}>
            <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" />Relatório</Button>
          </Link>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-2xl font-bold">{sessions?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Sessões</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-2xl font-bold">{latestMeasurement?.weight_kg ?? '—'}</p>
          <p className="text-xs text-muted-foreground">Peso (kg)</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-2xl font-bold">{bmi ?? '—'}</p>
          <p className="text-xs text-muted-foreground">IMC {bmi ? `(${bmiLabel(bmi)})` : ''}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-2xl font-bold">{client.resting_hr ?? '—'}</p>
          <p className="text-xs text-muted-foreground">FC Repouso</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="health">Saúde</TabsTrigger>
          <TabsTrigger value="measurements">Medidas</TabsTrigger>
          <TabsTrigger value="plan">Plano de Treino</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" />Contato</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {client.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{client.email}</div>}
                {client.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</div>}
                {client.birth_date && <p className="text-muted-foreground">Nascimento: {formatDate(client.birth_date)}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />Última Medição</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                {latestMeasurement ? <>
                  <div><span className="text-muted-foreground">Peso:</span> {latestMeasurement.weight_kg} kg</div>
                  <div><span className="text-muted-foreground">Altura:</span> {latestMeasurement.height_cm} cm</div>
                  <div><span className="text-muted-foreground">IMC:</span> {bmi}</div>
                  <div><span className="text-muted-foreground">% Gordura:</span> {latestMeasurement.body_fat_pct ?? '—'}</div>
                  <div className="col-span-2 text-xs text-muted-foreground">{formatDate(latestMeasurement.measured_at)}</div>
                </> : <p className="text-muted-foreground col-span-2">Nenhuma medição registrada</p>}
              </CardContent>
            </Card>
          </div>

          {sessions && sessions.length > 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Dumbbell className="h-4 w-4" />Últimas Sessões</CardTitle>
                <Link href={`/clients/${client.id}/sessions`}><Button variant="ghost" size="sm" className="text-xs">Ver todas</Button></Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sessions.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <span>{formatDate(s.session_date)}</span>
                      <div className="flex gap-2">
                        {s.pse && <Badge variant="secondary" className="text-xs">PSE {s.pse}</Badge>}
                        {s.duration_minutes && <span className="text-muted-foreground">{s.duration_minutes} min</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Saúde */}
        <TabsContent value="health" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-red-500" />Dados de Saúde</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Objetivo:</span> {client.objective ? objectiveLabels[client.objective] : '—'}</div>
              <div><span className="font-medium">Nível:</span> {client.fitness_level ?? '—'}</div>
              <div><span className="font-medium">FC Repouso:</span> {client.resting_hr ? `${client.resting_hr} bpm` : '—'}</div>
              <div><span className="font-medium">PA Repouso:</span> {client.resting_bp ?? '—'}</div>
              <div className="sm:col-span-2">
                <span className="font-medium">Lesões/Restrições:</span>
                <p className="text-muted-foreground mt-1">{client.restrictions || 'Nenhuma informada'}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="font-medium">Medicamentos:</span>
                <p className="text-muted-foreground mt-1">{client.medications || 'Nenhum informado'}</p>
              </div>
              {client.cardiac_history && (
                <div className="sm:col-span-2">
                  <Badge variant="destructive" className="mb-2">Histórico Cardíaco</Badge>
                  <p className="text-muted-foreground">{client.cardiac_notes || 'Sem detalhes'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medidas */}
        <TabsContent value="measurements" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Ruler className="h-4 w-4" />Histórico de Medidas</CardTitle>
            </CardHeader>
            <CardContent>
              {measurements && measurements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-muted-foreground">Data</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Peso</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">IMC</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">%Gord</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Cintura</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Quadril</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measurements.map((m) => {
                        const b = m.weight_kg && m.height_cm ? calculateBMI(m.weight_kg, m.height_cm) : null;
                        return (
                          <tr key={m.id} className="border-b last:border-0">
                            <td className="py-2">{formatDate(m.measured_at)}</td>
                            <td className="text-right">{m.weight_kg ?? '—'} kg</td>
                            <td className="text-right">{b ?? '—'}</td>
                            <td className="text-right">{m.body_fat_pct ? `${m.body_fat_pct}%` : '—'}</td>
                            <td className="text-right">{m.waist_cm ?? '—'} cm</td>
                            <td className="text-right">{m.hip_cm ?? '—'} cm</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhuma medida registrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plano de Treino */}
        <TabsContent value="plan" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Plano Ativo</h3>
            <Link href={`/clients/${client.id}/plan`}>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Gerenciar Plano</Button>
            </Link>
          </div>
          {activePlan ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{activePlan.name}</CardTitle>
                {activePlan.objective && <p className="text-sm text-muted-foreground">{activePlan.objective}</p>}
              </CardHeader>
              <CardContent className="space-y-4">
                {(activePlan as any).workout_groups?.map((group: any) => (
                  <div key={group.id}>
                    <h4 className="font-medium text-sm mb-2 text-primary">Treino {group.label}</h4>
                    <div className="space-y-1">
                      {group.prescribed_exercises?.map((ex: any) => (
                        <div key={ex.id} className="text-sm flex items-center gap-2 py-1 border-b last:border-0">
                          <span className="font-medium flex-1">{ex.name}</span>
                          <span className="text-muted-foreground">{ex.sets}x{ex.reps}</span>
                          {ex.load_kg && <Badge variant="outline">{ex.load_kg}kg</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <Dumbbell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum plano ativo</p>
              <Link href={`/clients/${client.id}/plan`} className="mt-3 inline-block">
                <Button size="sm">Criar plano de treino</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        {/* Sessões */}
        <TabsContent value="sessions" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Histórico de Sessões</h3>
            <Link href={`/clients/${client.id}/sessions/new`}>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Sessão</Button>
            </Link>
          </div>
          {sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{formatDate(s.session_date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.duration_minutes ? `${s.duration_minutes} min` : ''}
                          {s.start_time ? ` · ${s.start_time.slice(0,5)}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {s.pse && <Badge variant="secondary">PSE {s.pse}</Badge>}
                        {s.resting_hr && <Badge variant="outline">FC rep. {s.resting_hr}</Badge>}
                        {s.max_hr && <Badge variant="outline">FC máx. {s.max_hr}</Badge>}
                      </div>
                    </div>
                    {s.trainer_notes && <p className="text-sm text-muted-foreground mt-2">{s.trainer_notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma sessão registrada</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
