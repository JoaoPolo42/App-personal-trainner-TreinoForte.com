'use client';
import { useEffect, useState } from 'react';
import type { Trainer } from '@/types/database';

const OFFER_HOURS = 48;
const OFFER_PRICE_CENTS = 7200;   // R$ 72,00
const FULL_PRICE_CENTS  = 49900;  // R$ 499,00

export interface SubscriptionState {
  status: 'trial' | 'active' | 'expired';
  isOfferActive: boolean;       // dentro das 48h
  offerEndsAt: Date | null;
  timeLeft: { hours: number; minutes: number; seconds: number } | null;
  currentPriceCents: number;
  trialEndsAt: Date | null;
}

export function useSubscription(trainer: Trainer | null): SubscriptionState {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  const offerEndsAt = trainer
    ? new Date(new Date(trainer.trial_started_at).getTime() + OFFER_HOURS * 60 * 60 * 1000)
    : null;

  const isOfferActive = offerEndsAt ? new Date() < offerEndsAt : false;
  const currentPriceCents = isOfferActive ? OFFER_PRICE_CENTS : FULL_PRICE_CENTS;

  useEffect(() => {
    if (!offerEndsAt || !isOfferActive) {
      setTimeLeft(null);
      return;
    }

    function update() {
      const diff = offerEndsAt!.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft({ hours: h, minutes: m, seconds: s });
    }

    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [offerEndsAt?.getTime(), isOfferActive]);

  return {
    status: trainer?.subscription_status ?? 'trial',
    isOfferActive,
    offerEndsAt,
    timeLeft,
    currentPriceCents,
    trialEndsAt: offerEndsAt,
  };
}

export { OFFER_PRICE_CENTS, FULL_PRICE_CENTS };
