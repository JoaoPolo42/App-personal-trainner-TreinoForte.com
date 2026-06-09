import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, TrendingUp, ChevronRight, User } from 'lucide-react';

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: trainer } = await supabase.from('trainers').select('id').eq('user_id', user.id).single();
  if (!trainer) redirect('/auth/register');

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, objective')
    .eq('trainer_id', trainer.id)
    .eq('active', true)
    .order('full_name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Selecione um cliente para ver os relatórios</p>
      </div>

      {clients && clients.length > 0 ? (
        <div className="grid gap-3">
          {clients.map((client) => (
            <div key={client.id} className="grid sm:grid-cols-2 gap-3">
              <Link href={`/clients/${client.id}/reports`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{client.full_name}</p>
                      <p className="text-xs text-muted-foreground">Dashboard de evolução</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/clients/${client.id}/reports/pdf`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-green-100 rounded-lg p-2 flex-shrink-0">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{client.full_name}</p>
                      <p className="text-xs text-muted-foreground">Exportar PDF</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900">Nenhum cliente ativo</h3>
          <p className="text-sm text-muted-foreground mt-1">Cadastre clientes para gerar relatórios</p>
        </div>
      )}
    </div>
  );
}
