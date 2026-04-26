const BEIJING_TIME_ZONE = 'Asia/Shanghai'

export function formatBeijingTime(
  value: number | string | Date = Date.now(),
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: BEIJING_TIME_ZONE,
    ...options
  }).format(date)
}

export function formatBeijingDateTime(value: number | string | Date = Date.now()): string {
  return formatBeijingTime(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}
