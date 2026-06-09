'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { generatePixPayload } from '@/lib/pix';
import { formatCurrency } from '@/lib/utils';
import {
  Dumbbell, CheckCircle, Clock, Zap, Users, Calendar,
  FileText, Activity, QrCode, Copy, ArrowRight, Crown
} from 'lucide-react';
import type { Trainer } from '@/types/database';

// Chave PIX do TreinoForte (configurada via env)
const APP_PIX_KEY = process.env.NEXT_PUBLIC_APP_PIX_KEY ?? '';
const APP_PIX_KEY_TYPE = (process.env.NEXT_PUBLIC_APP_PIX_KEY_TYPE ?? 'email') as 'email' | 'cpf' | 'phone' | 'random';

const features = [
  { icon: Users, text: 'Clientes ilimitados' },
  { icon: Activity, text: 'Lançamento de treinos com FC e PSE' },
  { icon: Dumbbell, text: 'Planos de treino com exercícios' },
  { icon: Calendar, text: 'Agenda com pagamento via PIX' },
  { icon: FileText, text: 'Relatórios de evolução em PDF' },
  { icon: CheckCircle, text: 'Dashboard de acompanhamento' },
];

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white text-red-600 font-bold text-3xl sm:text-4xl w-16 sm:w-20 h-16 sm:h-20 rounded-xl flex items-center justify-center shadow-lg tabular-nums">
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-red-200 text-xs mt-1 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [pixPayload, setPixPayload] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPix, setShowPix] = useState(false);

  const sub = useSubscription(trainer);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }
      const { data: t } = await supabase.from('trainers').select('*').eq('user_id', user.id).single();
      setTrainer(t);
      if (t?.subscription_status === 'active') router.push('/dashboard');
    }
    load();
  }, []);

  useEffect(() => {
    if (!trainer || !APP_PIX_KEY) return;
    const payload = generatePixPayload({
      key: APP_PIX_KEY,
      keyType: APP_PIX_KEY_TYPE,
      amount: sub.currentPriceCents / 100,
      merchantName: 'TreinoForte',
      merchantCity: 'Brasil',
      txId: trainer.id.slice(0, 25),
      description: 'TreinoForte Anual',
    });
    setPixPayload(payload);
  }, [trainer, sub.currentPriceCents]);

  function copyPix() {
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const price = formatCurrency(sub.currentPriceCents);
  const pricePerMonth = formatCurrency(Math.round(sub.currentPriceCents / 12));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 py-6">
        <div className="bg-blue-600 rounded-xl p-2">
          <Dumbbell className="h-6 w-6 text-white" />
        </div>
        <span className="text-white font-bold text-xl">TreinoForte.com</span>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-16 space-y-8">

        {/* Oferta ativa — countdown */}
        {sub.isOfferActive && sub.timeLeft ? (
          <div className="bg-red-600 rounded-2xl p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-white">
              <Zap className="h-5 w-5 fill-white" />
              <span className="font-bold text-lg uppercase tracking-wide">Oferta de lançamento!</span>
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <p className="text-red-100 text-sm">Esta oferta expira em:</p>
            <div className="flex items-center justify-center gap-3">
              <CountdownBlock value={sub.timeLeft.hours} label="horas" />
              <span className="text-white text-3xl font-bold mb-4">:</span>
              <CountdownBlock value={sub.timeLeft.minutes} label="min" />
              <span className="text-white text-3xl font-bold mb-4">:</span>
              <CountdownBlock value={sub.timeLeft.seconds} label="seg" />
            </div>
            <p className="text-red-100 text-xs">
              Após o prazo, o valor sobe para R$ 499/ano
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-yellow-400 mb-2">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">Oferta de lançamento encerrada</span>
            </div>
            <p className="text-gray-400 text-sm">O preço especial de R$ 72/ano não está mais disponível.</p>
          </div>
        )}

        {/* Card de preço */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="space-y-1">
            <Badge variant="default" className="bg-blue-600 text-white mb-2">
              <Crown className="h-3 w-3 mr-1" />
              Acesso Completo — 1 Ano
            </Badge>

            {sub.isOfferActive ? (
              <div>
                <div className="flex items-end justify-center gap-2">
                  <span className="text-gray-400 line-through text-xl">R$ 499</span>
                  <span className="text-5xl font-extrabold text-gray-900">R$ 72</span>
                  <span className="text-gray-500 text-lg mb-1">/ano</span>
                </div>
                <p className="text-green-600 font-semibold text-sm">
                  Economia de R$ 427 · apenas {pricePerMonth}/mês
                </p>
                <p className="text-xs text-gray-400 mt-1">equivale a R$ 6,00 por mês</p>
              </div>
            ) : (
              <div>
                <div className="flex items-end justify-center gap-2">
                  <span className="text-5xl font-extrabold text-gray-900">R$ 499</span>
                  <span className="text-gray-500 text-lg mb-1">/ano</span>
                </div>
                <p className="text-gray-500 text-sm">{pricePerMonth}/mês</p>
              </div>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-3 text-left">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-1 flex-shrink-0">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-gray-700 text-sm">{text}</span>
              </li>
            ))}
          </ul>

          {/* Botão / PIX */}
          {!showPix ? (
            <Button
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowPix(true)}
            >
              Assinar agora por {price}/ano
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
                  <QrCode className="h-5 w-5" />
                  Pague via PIX — {price}
                </div>

                {APP_PIX_KEY ? (
                  <>
                    <div className="text-left space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Chave PIX</p>
                      <div className="bg-white rounded-lg px-3 py-2 font-mono text-sm text-gray-800 border">
                        {APP_PIX_KEY}
                      </div>
                    </div>

                    <div className="text-left space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Código Copia e Cola</p>
                      <div
                        className="bg-white rounded-lg px-3 py-2 font-mono text-xs text-gray-600 border break-all cursor-pointer hover:bg-gray-50"
                        onClick={copyPix}
                      >
                        {pixPayload.slice(0, 60)}...
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={copyPix}
                    >
                      {copied ? (
                        <><CheckCircle className="h-4 w-4 mr-2 text-green-600" />Copiado!</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-2" />Copiar código PIX</>
                      )}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    Entre em contato pelo email <strong>suporte@treinoforte.com</strong> para receber os dados de pagamento.
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                <strong>Após pagar:</strong> envie o comprovante para <strong>suporte@treinoforte.com</strong> com seu email de cadastro. Sua conta será ativada em até 1 hora útil.
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Pagamento único · Acesso por 12 meses · Sem renovação automática
          </p>
        </div>

        {/* Link para voltar se ainda estiver no trial */}
        {sub.status === 'trial' && (
          <div className="text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 text-sm hover:text-gray-300 underline underline-offset-2"
            >
              Continuar explorando o app →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
