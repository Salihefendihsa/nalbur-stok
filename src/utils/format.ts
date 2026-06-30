const TL_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const DATE_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const DATETIME_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const NUMBER_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number): string {
  return TL_FORMATTER.format(value)
}

export function formatDate(dateStr: string): string {
  return DATE_FORMATTER.format(new Date(dateStr))
}

export function formatDateTime(dateStr: string): string {
  return DATETIME_FORMATTER.format(new Date(dateStr))
}

export function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value)
}

export function formatStock(value: number, unit: string): string {
  return `${NUMBER_FORMATTER.format(value)} ${unit}`
}
