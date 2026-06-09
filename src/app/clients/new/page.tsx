'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', birth_date: '', sex: '',
    objective: '', fitness_level: '',
    restrictions: '', medications: '',
    cardiac_history: false, cardiac_notes: '',
    resting_hr: '', resting_bp: '', vo2max_estimated: '',
    notes: '',
    // Medição inicial
    weight_kg: '', height_cm: '', body_fat_pct: '',
    waist_cm: '', hip_cm: '', arm_cm: '', thigh_cm: '', chest_cm: '',
  });

  function set(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }

    const { data: trainer } = await supabase.from('trainers').select('id').eq('user_id', user.id).single();
    if (!trainer) { setError('Trainer não encontrado'); setLoading(false); return; }

    const { data: client, error: clientError } = await supabase.from('clients').insert({
      trainer_id: trainer.id,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
      sex: (form.sex as any) || null,
      objective: (form.objective as any) || null,
      fitness_level: (form.fitness_level as any) || null,
      restrictions: form.restrictions || null,
      medications: form.medications || null,
      cardiac_history: form.cardiac_history,
      cardiac_notes: form.cardiac_notes || null,
      resting_hr: form.resting_hr ? parseInt(form.resting_hr) : null,
      resting_bp: form.resting_bp || null,
      vo2max_estimated: form.vo2max_estimated ? parseFloat(form.vo2max_estimated) : null,
      notes: form.notes || null,
    }).select().single();

    if (clientError || !client) {
      setError('Erro ao cadastrar cliente: ' + clientError?.message);
      setLoading(false);
      return;
    }

    // Salvar medição inicial se preenchida
    if (form.weight_kg || form.height_cm) {
      await supabase.from('body_measurements').insert({
        client_id: client.id,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
        waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : null,
        hip_cm: form.hip_cm ? parseFloat(form.hip_cm) : null,
        arm_cm: form.arm_cm ? parseFloat(form.arm_cm) : null,
        thigh_cm: form.thigh_cm ? parseFloat(form.thigh_cm) : null,
        chest_cm: form.chest_cm ? parseFloat(form.chest_cm) : null,
      });
    }

    router.push(`/clients/${client.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Cliente</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required placeholder="Maria Souza" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="maria@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de nascimento</Label>
              <Input id="birth_date" type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={form.sex} onValueChange={(v) => set('sex', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Dados de Saúde e Objetivo */}
        <Card>
          <CardHeader><CardTitle className="text-base">Saúde e Objetivo</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Objetivo principal</Label>
              <Select value={form.objective} onValueChange={(v) => set('objective', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                  <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                  <SelectItem value="condicionamento">Condicionamento</SelectItem>
                  <SelectItem value="reabilitacao">Reabilitação</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nível de condicionamento</Label>
              <Select value={form.fitness_level} onValueChange={(v) => set('fitness_level', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resting_hr">FC Repouso Basal (bpm)</Label>
              <Input id="resting_hr" type="number" min="30" max="120" value={form.resting_hr} onChange={(e) => set('resting_hr', e.target.value)} placeholder="ex: 65" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resting_bp">Pressão Arterial Repouso</Label>
              <Input id="resting_bp" value={form.resting_bp} onChange={(e) => set('resting_bp', e.target.value)} placeholder="ex: 120/80 mmHg" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="restrictions">Lesões / Restrições médicas</Label>
              <Textarea id="restrictions" value={form.restrictions} onChange={(e) => set('restrictions', e.target.value)} placeholder="Descreva lesões, cirurgias, restrições..." rows={2} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="medications">Medicamentos em uso</Label>
              <Input id="medications" value={form.medications} onChange={(e) => set('medications', e.target.value)} placeholder="Nenhum ou liste os medicamentos" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="cardiac_history"
                checked={form.cardiac_history}
                onChange={(e) => set('cardiac_history', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="cardiac_history">Histórico de problemas cardíacos</Label>
            </div>
            {form.cardiac_history && (
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="cardiac_notes">Descrição do histórico cardíaco</Label>
                <Textarea id="cardiac_notes" value={form.cardiac_notes} onChange={(e) => set('cardiac_notes', e.target.value)} rows={2} />
              </div>
            )}
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="notes">Observações gerais</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Medição Inicial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avaliação Física Inicial</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="weight_kg">Peso (kg)</Label>
              <Input id="weight_kg" type="number" step="0.1" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} placeholder="75.5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height_cm">Altura (cm)</Label>
              <Input id="height_cm" type="number" step="0.1" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} placeholder="170" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body_fat_pct">% Gordura</Label>
              <Input id="body_fat_pct" type="number" step="0.1" value={form.body_fat_pct} onChange={(e) => set('body_fat_pct', e.target.value)} placeholder="20" />
            </div>
            <Separator className="sm:col-span-3" />
            <div className="space-y-2">
              <Label htmlFor="waist_cm">Cintura (cm)</Label>
              <Input id="waist_cm" type="number" step="0.1" value={form.waist_cm} onChange={(e) => set('waist_cm', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hip_cm">Quadril (cm)</Label>
              <Input id="hip_cm" type="number" step="0.1" value={form.hip_cm} onChange={(e) => set('hip_cm', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arm_cm">Braço (cm)</Label>
              <Input id="arm_cm" type="number" step="0.1" value={form.arm_cm} onChange={(e) => set('arm_cm', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thigh_cm">Coxa (cm)</Label>
              <Input id="thigh_cm" type="number" step="0.1" value={form.thigh_cm} onChange={(e) => set('thigh_cm', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chest_cm">Peito (cm)</Label>
              <Input id="chest_cm" type="number" step="0.1" value={form.chest_cm} onChange={(e) => set('chest_cm', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 justify-end">
          <Link href="/clients"><Button variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Cliente'}
          </Button>
        </div>
      </form>
    </div>
  );
}
