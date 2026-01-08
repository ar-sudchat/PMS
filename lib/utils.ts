import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Avatar color generation
const avatarColors = [
  'from-red-400 to-rose-500',
  'from-orange-400 to-amber-500',
  'from-amber-400 to-yellow-500',
  'from-lime-400 to-green-500',
  'from-emerald-400 to-teal-500',
  'from-cyan-400 to-blue-500',
  'from-blue-400 to-indigo-500',
  'from-indigo-400 to-purple-500',
  'from-purple-400 to-pink-500',
  'from-pink-400 to-rose-500',
];

export function getAvatarGradient(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getAvatarShadow(name: string): string {
  const gradients = getAvatarGradient(name);
  // Extract the main color for shadow (first color in gradient)
  const colorMatch = gradients.match(/from-([\w-]+)/);
  if (!colorMatch) return 'shadow-slate-500/25';
  const color = colorMatch[1].split('-')[0]; // e.g., "red" from "red-400"
  return `shadow-${color}-500/25`;
}
