import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function calculateBMI(weight: number, height: number): number {
  const h = height / 100;
  return parseFloat((weight / (h * h)).toFixed(1));
}

export function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return 'Abaixo do peso';
  if (bmi < 25) return 'Peso normal';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidade grau I';
  if (bmi < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

export function pseLabel(pse: number): string {
  if (pse <= 7) return 'Muito leve';
  if (pse <= 9) return 'Muito leve';
  if (pse <= 11) return 'Leve';
  if (pse <= 13) return 'Moderado';
  if (pse <= 15) return 'Pesado';
  if (pse <= 17) return 'Muito pesado';
  return 'Máximo';
}

export function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
}

export function formatTime(time: string) {
  return time.slice(0, 5);
}
