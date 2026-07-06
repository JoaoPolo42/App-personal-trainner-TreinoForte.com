'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Calendar, Clock, CheckCircle, ChevronLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Slot {
  id: string;
  slot_date: string;
  slot_time: string;
  duration_min: number;
  price_cents: number;
  status: string;
}

interface Trainer {
  id: string;
  full_name: string;
  cref: string | null;
  bio: string | null;
  phone: string | null;
}

function groupByDate(slots: Slot[]) {
  const map: Record<string, Slot[]> = {};
  for (const s of slots) {
    if (!map[s.slot_date]) map[s.slot_date] = [];
    map[s.slot_date].push(s);
  }
  return map;
}

function formatSlotDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function formatSlotTime(timeStr: string) {
  return timeStr.substring(0, 5);
}

export default function PublicBookingPage() {
  const params = useParams();
  const trainerId = params.trainerId as string;
  const supabase = createClient();

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selected, setSelected] = useState<Slot | null>(null);
  const [step, setStep] = useState<'slots' | 'form' | 'done'>('slots');
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: t, error } = await supabase
        .from('trainers')
        .select('id, full_name, cref, bio, phone')
        .eq('id', trainerId)
        .single();

      if (error || !t) { setNotFound(true); setLoading(false); return; }
      setTrainer(t);

      const today = new Date().toISOString().split('T')[0];
      const { data: sl } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('status', 'available')
        .gte('slot_date', today)
        .order('slot_date')
        .order('slot_time');

      setSlots(sl ?? []);
      setLoading(false);
    }
    load();
  }, [trainerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !trainer) return;
    setSubmitting(true);
    setSubmitError('');

    const { error } = await supabase.from('booking_requests').insert({
      trainer_id: trainer.id,
      slot_id: selected.id,
      guest_name: form.name,
      guest_phone: form.phone,
      guest_email: form.email || null,
      message: form.message || null,
    });

    if (error) {
      setSubmitError('Erro ao enviar solicitação. Tente novamente.');
      setSubmitting(false);
      return;
    }

    setStep('done');
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (notFound || !trainer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <Dumbbell className="h-12 w-12 text-gray-300 mx-auto" />
          <h1 className="text-xl font-bold">Personal trainer não encontrado</h1>
          <p className="text-muted-foreground">O link pode estar incorreto ou expirado.</p>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(slots);
  const dates = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="bg-blue-600 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{trainer.full_name}</h1>
          {trainer.cref && <p className="text-sm text-muted-foreground">CREF: {trainer.cref}</p>}
          {trainer.bio && <p className="text-sm text-gray-600 max-w-md mx-auto">{trainer.bio}</p>}
          <p className="text-xs text-muted-foreground">TreinoForte.com</p>
        </div>

        {step === 'done' && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold">Solicitação enviada!</h2>
                <p className="text-muted-foreground mt-1">
                  {trainer.full_name} entrará em contato para confirmar o agendamento e enviar os dados de pagamento.
                </p>
              </div>
              {selected && (
                <div className="bg-blue-50 rounded-lg p-4 text-sm">
                  <p className="font-medium">{formatSlotDate(selected.slot_date)}</p>
                  <p className="text-muted-foreground">às {formatSlotTime(selected.slot_time)} · {selected.duration_min} min · {formatCurrency(selected.price_cents)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'form' && selected && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('slots')} className="text-muted-foreground hover:text-gray-900">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <CardTitle className="text-base">Confirmar solicitação</CardTitle>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-sm mt-2">
                <p className="font-medium">{formatSlotDate(selected.slot_date)}</p>
                <p className="text-muted-foreground">às {formatSlotTime(selected.slot_time)} · {selected.duration_min} min · {formatCurrency(selected.price_cents)}</p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Seu nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="João Silva" required />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp / Telefone *</Label>
                  <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(51) 99999-9999" required />
                </div>
                <div className="space-y-2">
                  <Label>Email (opcional)</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="joao@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem (opcional)</Label>
                  <Textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Alguma informação que queira passar ao personal..." rows={3} />
                </div>
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Enviando...' : 'Solicitar agendamento'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  O personal confirmará o horário e enviará as instruções de pagamento via PIX.
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'slots' && (
          <>
            {dates.length === 0 ? (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-medium">Nenhum horário disponível</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Entre em contato com {trainer.full_name} para verificar disponibilidade.
                  </p>
                  {trainer.phone && (
                    <a
                      href={`https://wa.me/55${trainer.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block"
                    >
                      <Button variant="outline" size="sm">Chamar no WhatsApp</Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-900">Horários disponíveis</h2>
                {dates.map((date) => (
                  <Card key={date}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-blue-700 capitalize">
                        {formatSlotDate(date)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {grouped[date].map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => { setSelected(slot); setStep('form'); }}
                          className="border rounded-lg p-3 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                        >
                          <div className="flex items-center gap-1 font-semibold text-sm group-hover:text-blue-700">
                            <Clock className="h-3 w-3" />
                            {formatSlotTime(slot.slot_time)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{slot.duration_min} min</div>
                          <div className="text-xs font-medium text-green-700 mt-1">{formatCurrency(slot.price_cents)}</div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
