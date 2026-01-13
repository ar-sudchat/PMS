import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  if (!name) return ''
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function getAvatarGradient(name: string) {
  const gradients = [
    'bg-gradient-to-r from-red-500 to-orange-500',
    'bg-gradient-to-r from-amber-500 to-yellow-500',
    'bg-gradient-to-r from-lime-500 to-green-500',
    'bg-gradient-to-r from-emerald-500 to-teal-500',
    'bg-gradient-to-r from-cyan-500 to-sky-500',
    'bg-gradient-to-r from-blue-500 to-indigo-500',
    'bg-gradient-to-r from-violet-500 to-purple-500',
    'bg-gradient-to-r from-fuchsia-500 to-pink-500',
    'bg-gradient-to-r from-rose-500 to-red-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}
