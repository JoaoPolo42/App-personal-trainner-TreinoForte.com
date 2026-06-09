import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Phone, Mail, ChevronRight } from 'lucide-react';
import { calculateAge, formatDate } from '@/lib/utils';

const objectiveLabels: Record<string, string> = {
  emagrecimento: 'Emagrecimento',
  hipertrofia: 'Hipertrofia',
  condicionamento: 'Condicionamento',
  reabilitacao: 'Reabilitação',
  outro: 'Outro',
};

const fitnessLabels: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: trainer } = await supabase.from('trainers').select('id').eq('user_id', user.id).single();
  if (!trainer) redirect('/auth/register');

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('trainer_id', trainer.id)
    .order('full_name');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm">{clients?.length ?? 0} clientes cadastrados</p>
        </div>
        <Link href="/clients/new">
          <Button><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
        </Link>
      </div>

      {clients && clients.length > 0 ? (
        <div className="grid gap-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{client.full_name}</h3>
                        <Badge variant={client.active ? 'success' : 'secondary'}>
                          {client.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {client.objective && (
                          <Badge variant="outline">{objectiveLabels[client.objective] ?? client.objective}</Badge>
                        )}
                        {client.fitness_level && (
                          <Badge variant="secondary">{fitnessLabels[client.fitness_level] ?? client.fitness_level}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        {client.birth_date && <span>{calculateAge(client.birth_date)} anos</span>}
                        {client.phone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>
                        )}
                        {client.email && (
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum cliente ainda</h3>
          <p className="text-gray-500 text-sm mb-4">Comece cadastrando seu primeiro cliente</p>
          <Link href="/clients/new"><Button>Cadastrar primeiro cliente</Button></Link>
        </div>
      )}
    </div>
  );
}
