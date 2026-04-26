import { defineEventHandler } from 'h3'
import { formatBeijingDateTime } from '../utils/beijingTime'

export default defineEventHandler((event) => {
  const req = (event.node as any)?.req
  const url = req?.url ?? '/' 
  const method = req?.method ?? 'GET'
  console.log(`[request] ${formatBeijingDateTime()} ${method} ${url}`)
})
