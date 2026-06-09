'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Client, BodyMeasurement, TrainingSession } from '@/types/database';

// PDF component precisa ser carregado apenas no client sem SSR
const EvolutionPDFButton = dynamic(
  () => import('@/components/reports/EvolutionPDF').then((m) => m.EvolutionPDFButton),
  { ssr: false, loading: () => <span className="text-sm text-muted-foreground">Preparando PDF...</span> }
);

export default function PDFPage() {
  const params = useParams();
  const clientId = params.id as string;
  const supabase = createClient();

  const [client, setClient] = useState<Client | null>(null);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [trainerName, setTrainerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: t } = await supabase.from('trainers').select('full_name').eq('user_id', user.id).single();
      if (t) setTrainerName(t.full_name);

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

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Carregando dados...</p>
    </div>
  );

  if (!client) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${clientId}/reports`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Exportar Relatório PDF</h1>
          <p className="text-sm text-muted-foreground">{client.full_name}</p>
        </div>
      </div>

      <div className="bg-muted/40 rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Relatório de Evolução</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Dados pessoais e de saúde do cliente</li>
          <li>• Comparativo de medições antropométricas (inicial vs atual)</li>
          <li>• Histórico das últimas 10 sessões de treino</li>
          <li>• Dados de FC, PSE e bem-estar por sessão</li>
          <li>• Totais: sessões realizadas, peso atual, IMC, PSE médio</li>
        </ul>
        <div className="flex gap-3 items-center flex-wrap">
          <EvolutionPDFButton
            client={client}
            measurements={measurements}
            sessions={sessions}
            trainerName={trainerName}
          />
          <span className="text-xs text-muted-foreground">
            {measurements.length} medições · {sessions.length} sessões incluídas
          </span>
        </div>
      </div>
    </div>
  );
}
