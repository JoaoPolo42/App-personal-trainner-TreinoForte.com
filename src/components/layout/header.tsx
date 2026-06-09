'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Dumbbell } from 'lucide-react';
import type { Trainer } from '@/types/database';

interface HeaderProps {
  trainer: Trainer;
}

export function Header({ trainer }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3 lg:hidden">
        <div className="bg-primary rounded-lg p-1.5">
          <Dumbbell className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-gray-900">TreinoForte.com</span>
      </div>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900">{trainer.full_name}</p>
          {trainer.cref && <p className="text-xs text-gray-500">CREF {trainer.cref}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
