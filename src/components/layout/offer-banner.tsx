'use client';
import Link from 'next/link';
import { Zap, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import type { Trainer } from '@/types/database';

export function OfferBanner({ trainer }: { trainer: Trainer }) {
  const [dismissed, setDismissed] = useState(false);
  const sub = useSubscription(trainer);

  if (sub.status === 'active' || dismissed) return null;

  // Após expirar: barra vermelha persistente (não fecha)
  if (!sub.isOfferActive) {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>Sua oferta de lançamento expirou. O app está em modo limitado.</span>
        </div>
        <Link
          href="/pricing"
          className="bg-white text-red-600 font-semibold px-3 py-1 rounded-md text-xs hover:bg-red-50 whitespace-nowrap flex-shrink-0"
        >
          Assinar R$ 499/ano
        </Link>
      </div>
    );
  }

  // Dentro das 48h: barra laranja com countdown
  // timeLeft começa null no primeiro render (useEffect ainda não rodou)
  if (!sub.timeLeft) return null;
  const { hours, minutes, seconds } = sub.timeLeft;

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <Zap className="h-4 w-4 fill-white flex-shrink-0" />
        <span className="font-semibold">Oferta de lançamento:</span>
        <span>apenas R$ 72/ano</span>
        <span className="bg-white/20 rounded px-2 py-0.5 font-mono font-bold tabular-nums text-xs">
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/pricing"
          className="bg-white text-orange-600 font-semibold px-3 py-1 rounded-md text-xs hover:bg-orange-50 whitespace-nowrap"
        >
          Assinar agora
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white transition-colors"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
