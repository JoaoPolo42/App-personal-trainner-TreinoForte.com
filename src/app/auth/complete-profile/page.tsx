'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell } from 'lucide-react';

export default function CompleteProfilePage() {
  const [fullName, setFullName] = useState('');
  const [cref, setCref] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const { error: insertError } = await supabase.from('trainers').insert({
      user_id: user.id,
      full_name: fullName,
      cref: cref || null,
    });

    if (insertError) {
      setError('Erro ao salvar perfil: ' + insertError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary rounded-xl p-3">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TreinoForte.com</h1>
          <p className="text-gray-500 text-sm">Quase lá! Complete seu perfil</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Complete seu cadastro</CardTitle>
            <CardDescription>
              Seu email foi confirmado. Agora informe seus dados profissionais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo *</Label>
                <Input
                  id="fullName"
                  placeholder="João Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cref">CREF (opcional)</Label>
                <Input
                  id="cref"
                  placeholder="123456-G/SP"
                  value={cref}
                  onChange={(e) => setCref(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !fullName}>
                {loading ? 'Salvando...' : 'Entrar no TreinoForte'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
