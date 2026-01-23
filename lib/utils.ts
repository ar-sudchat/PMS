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

export function stringToColor(str: string) {
  if (!str) return '#e2e8f0' // slate-200
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Fixed set of 20 distinct, vibrant colors for clear differentiation
  const palette = [
    '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', // Pastels
    '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFFFFC', '#e2e8f0', // Cools & Bases
    '#F28B82', '#FBBC04', '#FFF475', '#CCFF90', '#A7FFEB', // Google-ish
    '#CBF0F8', '#AECBFA', '#D7AEFB', '#FDCFE8', '#E6C9A8'  // More accents
  ]
  const vibrantPalette = [
    '#f87171', // Red 400
    '#fb923c', // Orange 400
    '#facc15', // Yellow 400
    '#4ade80', // Green 400
    '#2dd4bf', // Teal 400
    '#38bdf8', // Sky 400
    '#818cf8', // Indigo 400
    '#c084fc', // Purple 400
    '#f472b6', // Pink 400
    '#fb7185', // Rose 400
    '#a3e635', // Lime 400
    '#22c55e', // Green 500
    '#06b6d4', // Cyan 500
    '#3b82f6', // Blue 500
    '#6366f1', // Indigo 500
    '#a855f7', // Purple 500
    '#d946ef', // Fuchsia 500
    '#ec4899', // Pink 500
    '#f43f5e', // Rose 500
    '#84cc16', // Lime 500
  ]

  // Use vibrant palette for SAs to be very distinct
  return vibrantPalette[Math.abs(hash) % vibrantPalette.length]
}
