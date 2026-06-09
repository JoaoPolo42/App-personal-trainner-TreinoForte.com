'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Save, User, QrCode, CheckCircle } from 'lucide-react';
import type { Trainer } from '@/types/database';

export default function SettingsPage() {
  const supabase = createClient();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    full_name: '', cref: '', phone: '', bio: '',
    pix_key: '', pix_key_type: '',
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: t } = await supabase.from('trainers').select('*').eq('user_id', user.id).single();
      if (t) {
        setTrainer(t);
        setForm({
          full_name: t.full_name,
          cref: t.cref ?? '',
          phone: t.phone ?? '',
          bio: t.bio ?? '',
          pix_key: t.pix_key ?? '',
          pix_key_type: t.pix_key_type ?? '',
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!trainer) return;
    setSaving(true);
    await supabase.from('trainers').update({
      full_name: form.full_name,
      cref: form.cref || null,
      phone: form.phone || null,
      bio: form.bio || null,
      pix_key: form.pix_key || null,
      pix_key_type: (form.pix_key_type as any) || null,
    }).eq('id', trainer.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie seu perfil e preferências</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Perfil Profissional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cref">CREF</Label>
                <Input id="cref" value={form.cref} onChange={(e) => setForm(p => ({ ...p, cref: e.target.value }))} placeholder="123456-G/SP" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio / Apresentação</Label>
              <Textarea id="bio" value={form.bio} onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Conte um pouco sobre você e sua metodologia..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><QrCode className="h-4 w-4" />Chave PIX</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure sua chave PIX para receber pagamentos de agendamentos. O sistema gerará automaticamente o código PIX para cada agendamento.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo da chave</Label>
                <Select value={form.pix_key_type} onValueChange={(v) => setForm(p => ({ ...p, pix_key_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="random">Chave aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix_key">Chave PIX</Label>
                <Input
                  id="pix_key"
                  value={form.pix_key}
                  onChange={(e) => setForm(p => ({ ...p, pix_key: e.target.value }))}
                  placeholder={
                    form.pix_key_type === 'cpf' ? '000.000.000-00' :
                    form.pix_key_type === 'email' ? 'seu@email.com' :
                    form.pix_key_type === 'phone' ? '+5511999999999' :
                    'chave-aleatoria-uuid'
                  }
                />
              </div>
            </div>
            {form.pix_key && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  Chave PIX configurada. Os clientes receberão o código de pagamento ao agendar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 justify-end">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />Salvo com sucesso
            </span>
          )}
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
