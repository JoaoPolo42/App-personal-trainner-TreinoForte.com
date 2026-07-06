import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  // Verificar autenticação
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  // Verificar se o trainer tem assinatura ativa
  const { data: trainer } = await supabase
    .from('trainers')
    .select('subscription_status')
    .eq('user_id', user.id)
    .single();

  if (!trainer || (trainer as any).subscription_status !== 'active') {
    return NextResponse.json(
      { error: 'Recurso disponível apenas para assinantes. Acesse /pricing para assinar.' },
      { status: 403 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Serviço de IA temporariamente indisponível.' }, { status: 500 });
  }

  const body = await req.json();
  const { client, currentExercises } = body;

  const prompt = `Você é um personal trainer especialista. Com base no perfil do cliente abaixo, sugira de 5 a 8 exercícios adequados para a sessão de hoje.

PERFIL DO CLIENTE:
- Nome: ${client.full_name}
- Idade: ${client.age ?? 'não informada'}
- Objetivo: ${client.objective ?? 'não informado'}
- Restrições de saúde: ${client.health_conditions ?? 'nenhuma informada'}
- Medicamentos: ${client.medications ?? 'nenhum'}
- Observações médicas: ${client.medical_notes ?? 'nenhuma'}
- Peso atual: ${client.weight_kg ? client.weight_kg + ' kg' : 'não informado'}
- Altura: ${client.height_cm ? client.height_cm + ' cm' : 'não informada'}

${currentExercises && currentExercises.length > 0 ? `EXERCÍCIOS JÁ NO PLANO (para evitar repetição ou complementar):
${currentExercises.map((e: string) => `- ${e}`).join('\n')}` : ''}

Responda em português brasileiro. Para cada exercício sugerido, informe:
1. Nome do exercício
2. Músculo principal trabalhado
3. Séries x repetições sugeridas
4. Carga inicial sugerida (se aplicável)
5. Observação importante (técnica, contraindicação para este cliente, etc.)

Seja objetivo e prático. Considere as restrições e objetivos do cliente ao fazer as sugestões.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ suggestion: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
