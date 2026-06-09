import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Activity, TrendingUp, Plus, Clock } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: trainer } = await supabase.from('trainers').select('*').eq('user_id', user.id).single();
  if (!trainer) redirect('/auth/register');

  const [
    { count: totalClients },
    { data: recentSessions },
    { data: upcomingBookings },
    { data: pendingBookings },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('trainer_id', trainer.id).eq('active', true),
    supabase.from('training_sessions').select('*, clients(full_name)').eq('trainer_id', trainer.id).order('session_date', { ascending: false }).limit(5),
    supabase.from('bookings').select('*, schedule_slots(*), clients(full_name)').eq('trainer_id', trainer.id).eq('status', 'confirmed').order('created_at', { ascending: true }).limit(5),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('trainer_id', trainer.id).eq('status', 'pending_payment'),
  ]);

  const sessionThisMonth = recentSessions?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Olá, {trainer.full_name.split(' ')[0]}!</h1>
          <p className="text-gray-500 text-sm">Visão geral da sua academia</p>
        </div>
        <Link href="/clients/new">
          <Button><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 rounded-lg p-2"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{totalClients ?? 0}</p>
                <p className="text-xs text-muted-foreground">Clientes ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-lg p-2"><Activity className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{sessionThisMonth}</p>
                <p className="text-xs text-muted-foreground">Sessões recentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 rounded-lg p-2"><Calendar className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{upcomingBookings?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Agendamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 rounded-lg p-2"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-2xl font-bold">{pendingBookings?.count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pag. pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Últimas sessões */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Últimas Sessões</CardTitle>
            <Link href="/clients"><Button variant="ghost" size="sm">Ver clientes</Button></Link>
          </CardHeader>
          <CardContent>
            {recentSessions && recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{s.clients?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.session_date)}</p>
                    </div>
                    <div className="text-right">
                      {s.pse && <Badge variant="secondary">PSE {s.pse}</Badge>}
                      {s.duration_minutes && <p className="text-xs text-muted-foreground">{s.duration_minutes} min</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sessão registrada</p>
            )}
          </CardContent>
        </Card>

        {/* Próximos agendamentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Próximos Agendamentos</CardTitle>
            <Link href="/schedule"><Button variant="ghost" size="sm">Ver agenda</Button></Link>
          </CardHeader>
          <CardContent>
            {upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="space-y-3">
                {upcomingBookings.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{b.clients?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(b.schedule_slots?.slot_date)} às {formatTime(b.schedule_slots?.slot_time ?? '')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        {formatCurrency(b.schedule_slots?.price_cents ?? 0)}
                      </p>
                      <Badge variant="success" className="text-xs">Confirmado</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum agendamento confirmado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
