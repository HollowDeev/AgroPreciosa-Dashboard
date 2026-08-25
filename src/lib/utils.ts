import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

export function calculateMargin(costPrice: number, salePrice: number): number {
  if (costPrice === 0) return 0
  return ((salePrice - costPrice) / costPrice) * 100
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export function generateWhatsAppLink(phone: string, message: string): string {
  let cleanedPhone = (phone || '').replace(/\D/g, '')
  if (cleanedPhone.length === 10 || cleanedPhone.length === 11) {
    cleanedPhone = `55${cleanedPhone}`
  }
  const encodedMessage = encodeURIComponent(message)
  return `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodedMessage}`
}

export function openWhatsApp(url: string) {
  if (!url || typeof window === 'undefined') return

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ''
  )

  if (isMobile) {
    window.location.href = url
  } else {
    const newWin = window.open(url, '_blank')
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      window.location.href = url
    }
  }
}
