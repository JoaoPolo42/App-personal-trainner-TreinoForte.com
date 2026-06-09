'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingDown, TrendingUp, Minus, FileDown } from 'lucide-react';
import Link from 'next/link';
import { formatDate, calculateBMI, pseLabel } from '@/lib/utils';
import type { Client, BodyMeasurement, TrainingSession } from '@/types/database';

export default function ClientReportsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const supabase = createClient();

  const [client, setClient] = useState<Client | null>(null);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: m }, { data: s }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase.from('body_measurements').select('*').eq('client_id', clientId).order('measured_at'),
        supabase.from('training_sessions').select('*').eq('client_id', clientId).order('session_date'),
      ]);
      setClient(c);
      setMeasurements(m ?? []);
      setSessions(s ?? []);
      setLoading(false);
    }
    load();
  }, [clientId]);

  if (loading) return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!client) return null;

  // Dados para gráficos
  const weightData = measurements.map((m) => ({
    date: formatDate(m.measured_at),
    peso: m.weight_kg,
    imc: m.weight_kg && m.height_cm ? calculateBMI(m.weight_kg, m.height_cm) : null,
    gordura: m.body_fat_pct,
  }));

  const circumferenceData = measurements.map((m) => ({
    date: formatDate(m.measured_at),
    cintura: m.waist_cm,
    quadril: m.hip_cm,
    braco: m.arm_cm,
    coxa: m.thigh_cm,
  }));

  const hrData = sessions.filter((s) => s.resting_hr || s.avg_hr || s.max_hr).map((s) => ({
    date: formatDate(s.session_date),
    'FC Repouso': s.resting_hr,
    'FC Média': s.avg_hr,
    'FC Máxima': s.max_hr,
  }));

  const pseData = sessions.filter((s) => s.pse).map((s) => ({
    date: formatDate(s.session_date),
    PSE: s.pse,
    Energia: s.energy_level,
    Sono: s.sleep_quality,
  }));

  // Comparativo primeira vs última medição
  const first = measurements[0];
  const last = measurements[measurements.length - 1];

  function delta(a: number | null | undefined, b: number | null | undefined) {
    if (!a || !b) return null;
    return parseFloat((b - a).toFixed(1));
  }

  function DeltaBadge({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
    if (value === null) return <span className="text-muted-foreground text-sm">—</span>;
    const positive = inverse ? value < 0 : value > 0;
    const neutral = value === 0;
    return (
      <span className={`flex items-center gap-1 text-sm font-medium ${neutral ? 'text-muted-foreground' : positive ? 'text-green-600' : 'text-red-500'}`}>
        {neutral ? <Minus className="h-3 w-3" /> : positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {value > 0 ? '+' : ''}{value}
      </span>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/clients/${clientId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Evolução</h1>
            <p className="text-sm text-muted-foreground">{client.full_name}</p>
          </div>
        </div>
        <Link href={`/clients/${clientId}/reports/pdf`}>
          <Button variant="outline"><FileDown className="h-4 w-4 mr-2" />Exportar PDF</Button>
        </Link>
      </div>

      {/* Resumo Comparativo */}
      {first && last && first.id !== last.id && (
        <Card>
          <CardHeader><CardTitle className="text-base">Comparativo: {formatDate(first.measured_at)} → {formatDate(last.measured_at)}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Peso (kg)', a: first.weight_kg, b: last.weight_kg, inv: true },
                { label: '% Gordura', a: first.body_fat_pct, b: last.body_fat_pct, inv: true },
                { label: 'Cintura (cm)', a: first.waist_cm, b: last.waist_cm, inv: true },
                { label: 'Quadril (cm)', a: first.hip_cm, b: last.hip_cm, inv: false },
              ].map(({ label, a, b, inv }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{b ?? '—'}</p>
                  <DeltaBadge value={delta(a, b)} inverse={inv} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="body">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="body">Composição Corporal</TabsTrigger>
          <TabsTrigger value="circumferences">Circunferências</TabsTrigger>
          <TabsTrigger value="cardiac">Frequência Cardíaca</TabsTrigger>
          <TabsTrigger value="effort">PSE e Bem-estar</TabsTrigger>
        </TabsList>

        {/* Composição Corporal */}
        <TabsContent value="body" className="mt-4 space-y-4">
          {weightData.length > 0 ? (
            <>
              <Card>
                <CardHeader><CardTitle className="text-sm">Evolução do Peso (kg)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                      <Tooltip />
                      <Area type="monotone" dataKey="peso" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} name="Peso (kg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">IMC</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={weightData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                        <Tooltip />
                        <Line type="monotone" dataKey="imc" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="IMC" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">% Gordura Corporal</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={weightData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                        <Tooltip />
                        <Area type="monotone" dataKey="gordura" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} name="% Gordura" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Nenhuma medição registrada para este cliente</div>
          )}
        </TabsContent>

        {/* Circunferências */}
        <TabsContent value="circumferences" className="mt-4">
          {circumferenceData.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">Evolução das Circunferências (cm)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={circumferenceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cintura" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Cintura" />
                    <Line type="monotone" dataKey="quadril" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Quadril" />
                    <Line type="monotone" dataKey="braco" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Braço" />
                    <Line type="monotone" dataKey="coxa" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Coxa" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Nenhuma medição registrada</div>
          )}
        </TabsContent>

        {/* Frequência Cardíaca */}
        <TabsContent value="cardiac" className="mt-4">
          {hrData.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">Frequência Cardíaca ao longo dos Treinos (bpm)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={hrData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="FC Repouso" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="FC Média" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="FC Máxima" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Nenhuma sessão com dados de FC registrados</div>
          )}
        </TabsContent>

        {/* PSE e Bem-estar */}
        <TabsContent value="effort" className="mt-4 space-y-4">
          {pseData.length > 0 ? (
            <>
              <Card>
                <CardHeader><CardTitle className="text-sm">PSE por Sessão (Escala Borg 6-20)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={pseData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[6, 20]} />
                      <Tooltip formatter={(val: number) => [`${val} — ${pseLabel(val)}`, 'PSE']} />
                      <Bar dataKey="PSE" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Bem-estar por Sessão (1-5)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={pseData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[1, 5]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Energia" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Sono" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Nenhuma sessão com PSE registrado</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
