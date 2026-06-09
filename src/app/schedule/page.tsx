'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Clock, CheckCircle, XCircle, DollarSign, QrCode } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { generatePixPayload } from '@/lib/pix';
import type { Trainer, ScheduleSlot, Booking } from '@/types/database';

type BookingWithDetails = Booking & {
  schedule_slots: ScheduleSlot;
  clients: { full_name: string; phone: string | null };
};

const TIMES = ['05:00','05:30','06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30',
  '20:00','20:30','21:00','21:30','22:00'];

export default function SchedulePage() {
  const supabase = createClient();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddSlot, setShowAddSlot] = useState(false);
  const [slotForm, setSlotForm] = useState({ slot_date: '', slot_time: '', price_cents: '', duration_min: '60' });
  const [slotError, setSlotError] = useState('');
  const [slotSaving, setSlotSaving] = useState(false);

  const [pixDialog, setPixDialog] = useState<{ open: boolean; booking: BookingWithDetails | null }>({ open: false, booking: null });
  const [pixPayload, setPixPayload] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: t } = await supabase.from('trainers').select('*').eq('user_id', user.id).single();
    if (!t) return;
    setTrainer(t);

    const today = new Date().toISOString().split('T')[0];
    const [{ data: sl }, { data: bk }] = await Promise.all([
      supabase.from('schedule_slots').select('*').eq('trainer_id', t.id).order('slot_date').order('slot_time'),
      supabase.from('bookings').select('*, schedule_slots(*), clients(full_name, phone)').eq('trainer_id', t.id).order('created_at', { ascending: false }),
    ]);

    setSlots(sl ?? []);
    setBookings(bk as BookingWithDetails[] ?? []);
    setLoading(false);
  }

  async function addSlot() {
    if (!trainer) return;
    setSlotSaving(true);
    setSlotError('');

    const priceValue = parseFloat(slotForm.price_cents.replace(',', '.'));
    if (isNaN(priceValue) || priceValue <= 0) {
      setSlotError('Informe um valor válido (ex: 150 ou 150,00)');
      setSlotSaving(false);
      return;
    }

    const { error } = await supabase.from('schedule_slots').insert({
      trainer_id: trainer.id,
      slot_date: slotForm.slot_date,
      slot_time: slotForm.slot_time + ':00',
      price_cents: Math.round(priceValue * 100),
      duration_min: parseInt(slotForm.duration_min),
      status: 'available',
    });

    if (error) {
      setSlotError('Erro ao salvar: ' + error.message);
      setSlotSaving(false);
      return;
    }

    setShowAddSlot(false);
    setSlotForm({ slot_date: '', slot_time: '', price_cents: '', duration_min: '60' });
    setSlotError('');
    setSlotSaving(false);
    loadAll();
  }

  async function blockSlot(id: string) {
    await supabase.from('schedule_slots').update({ status: 'blocked' }).eq('id', id);
    loadAll();
  }

  async function deleteSlot(id: string) {
    await supabase.from('schedule_slots').delete().eq('id', id);
    loadAll();
  }

  async function confirmBooking(bookingId: string) {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
    loadAll();
  }

  async function cancelBooking(bookingId: string, slotId: string) {
    await Promise.all([
      supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId),
      supabase.from('schedule_slots').update({ status: 'available' }).eq('id', slotId),
    ]);
    loadAll();
  }

  function showPix(booking: BookingWithDetails) {
    if (!trainer?.pix_key) return;
    const payload = generatePixPayload({
      key: trainer.pix_key,
      keyType: trainer.pix_key_type ?? 'random',
      amount: (booking.schedule_slots.price_cents ?? 0) / 100,
      merchantName: trainer.full_name,
      merchantCity: 'Brasil',
      txId: booking.id.slice(0, 25),
      description: `Treino ${formatDate(booking.schedule_slots.slot_date)}`,
    });
    setPixPayload(payload);
    setPixDialog({ open: true, booking });
  }

  const statusMap: Record<string, { label: string; variant: any }> = {
    available: { label: 'Disponível', variant: 'success' },
    booked: { label: 'Reservado', variant: 'warning' },
    blocked: { label: 'Bloqueado', variant: 'secondary' },
  };

  const bookingStatusMap: Record<string, { label: string; variant: any }> = {
    pending_payment: { label: 'Aguardando pag.', variant: 'warning' },
    confirmed: { label: 'Confirmado', variant: 'success' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
    completed: { label: 'Concluído', variant: 'secondary' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus horários disponíveis</p>
        </div>
        <Button onClick={() => setShowAddSlot(true)}>
          <Plus className="h-4 w-4 mr-2" />Adicionar Horário
        </Button>
      </div>

      <Tabs defaultValue="slots">
        <TabsList>
          <TabsTrigger value="slots">Horários Disponíveis</TabsTrigger>
          <TabsTrigger value="bookings">
            Agendamentos
            {bookings.filter((b) => b.status === 'pending_payment').length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs h-4 px-1">
                {bookings.filter((b) => b.status === 'pending_payment').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slots" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : slots.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium">Nenhum horário cadastrado</h3>
              <p className="text-sm text-muted-foreground mb-4">Adicione seus horários disponíveis</p>
              <Button onClick={() => setShowAddSlot(true)}>Adicionar primeiro horário</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => {
                const status = statusMap[slot.status];
                return (
                  <Card key={slot.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="bg-primary/10 rounded-lg p-2 flex-shrink-0">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{formatDate(slot.slot_date)}</span>
                          <span className="text-muted-foreground">{formatTime(slot.slot_time)}</span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{slot.duration_min} min</span>
                          <span className="flex items-center gap-1 text-green-600 font-medium"><DollarSign className="h-3 w-3" />{formatCurrency(slot.price_cents)}</span>
                        </div>
                      </div>
                      {slot.status === 'available' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => blockSlot(slot.id)}>Bloquear</Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteSlot(slot.id)}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum agendamento ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const bStatus = bookingStatusMap[booking.status];
                return (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{booking.clients?.full_name}</span>
                            <Badge variant={bStatus.variant}>{bStatus.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {formatDate(booking.schedule_slots?.slot_date)} às {formatTime(booking.schedule_slots?.slot_time ?? '')}
                            {' · '}{formatCurrency(booking.schedule_slots?.price_cents ?? 0)}
                          </p>
                          {booking.clients?.phone && (
                            <p className="text-xs text-muted-foreground">{booking.clients.phone}</p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {booking.status === 'pending_payment' && (
                            <>
                              {trainer?.pix_key && (
                                <Button size="sm" variant="outline" onClick={() => showPix(booking)}>
                                  <QrCode className="h-4 w-4 mr-1" />PIX
                                </Button>
                              )}
                              <Button size="sm" onClick={() => confirmBooking(booking.id)}>
                                <CheckCircle className="h-4 w-4 mr-1" />Confirmar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => cancelBooking(booking.id, booking.slot_id)}>Cancelar</Button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <Button size="sm" variant="outline" onClick={() => cancelBooking(booking.id, booking.slot_id)}>Cancelar</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Adicionar Horário */}
      <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Horário Disponível</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={slotForm.slot_date} onChange={(e) => setSlotForm(p => ({ ...p, slot_date: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Select value={slotForm.slot_time} onValueChange={(v) => setSlotForm(p => ({ ...p, slot_time: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Select value={slotForm.duration_min} onValueChange={(v) => setSlotForm(p => ({ ...p, duration_min: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[30,45,60,75,90,120].map(n => <SelectItem key={n} value={String(n)}>{n} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor da sessão (R$) *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={slotForm.price_cents}
                  onChange={(e) => setSlotForm(p => ({ ...p, price_cents: e.target.value }))}
                  placeholder="150,00"
                />
              </div>
            </div>
          </div>
          {slotError && (
            <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {slotError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddSlot(false); setSlotError(''); }}>Cancelar</Button>
            <Button
              onClick={addSlot}
              disabled={slotSaving || !slotForm.slot_date || !slotForm.slot_time || !slotForm.price_cents}
            >
              {slotSaving ? 'Salvando...' : 'Adicionar Horário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: PIX */}
      <Dialog open={pixDialog.open} onOpenChange={(o) => setPixDialog({ open: o, booking: null })}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle>Pagamento via PIX</DialogTitle></DialogHeader>
          {pixDialog.booking && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-semibold">{pixDialog.booking.clients?.full_name}</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {formatCurrency(pixDialog.booking.schedule_slots?.price_cents ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(pixDialog.booking.schedule_slots?.slot_date)}
                  {' às '}
                  {formatTime(pixDialog.booking.schedule_slots?.slot_time ?? '')}
                </p>
              </div>

              {trainer?.pix_key && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Chave PIX:</p>
                  <div className="bg-muted rounded p-3 font-mono text-sm break-all">{trainer.pix_key}</div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Copia e Cola PIX:</p>
                <div
                  className="bg-muted rounded p-3 font-mono text-xs break-all cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => navigator.clipboard.writeText(pixPayload)}
                  title="Clique para copiar"
                >
                  {pixPayload.slice(0, 80)}...
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigator.clipboard.writeText(pixPayload)}
                >
                  Copiar código PIX
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Envie o código PIX ao cliente para finalizar a confirmação do agendamento.
                Após o pagamento, clique em "Confirmar" no agendamento.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
