import { expect, test } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000'

async function openSettlementOverlay(
  page: Parameters<typeof test>[1] extends never ? never : any,
  request: Parameters<typeof test>[1] extends never ? never : any,
  scenario: 'self-draw-bailout' | 'discard-flow'
) {
  page.on('console', (msg: any) => {
    console.log(`[browser:${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', (error: Error) => {
    console.log(`[pageerror] ${error.stack || error.message}`)
  })

  let seedRes: any = null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    seedRes = await request.post(`${BASE_URL}/api/game/debug-seed-settlement`, {
      data: { scenario }
    })
    if (seedRes.ok()) {
      break
    }
    await page.waitForTimeout(1000)
  }
  expect(seedRes?.ok()).toBeTruthy()
  const seedJson = await seedRes.json()
  const gameId = seedJson?.data?.gameId
  const playerId = seedJson?.data?.playerId
  const debugAccessToken = seedJson?.data?.debugAccessToken
  expect(gameId).toBeTruthy()
  expect(playerId).toBeTruthy()
  expect(debugAccessToken).toBeTruthy()

  await page.goto(`${BASE_URL}/gameroom/${gameId}?playerId=${playerId}&debugAccessToken=${debugAccessToken}`, {
    waitUntil: 'domcontentloaded'
  })
  await page.waitForTimeout(1000)
  await page.locator('.settle-btn-header').click()
  await expect(page.locator('.settle-panel')).toBeVisible()
}

test('settlement overlay renders self-draw bailout details', async ({ page, request }) => {
  await openSettlementOverlay(page, request, 'self-draw-bailout')

  await expect(page.getByText('每局结算明细')).toBeVisible()
  await expect(page.getByText('骰子×2 / 继承×4 / 有效×8 / 结算膨胀×8')).toBeVisible()
  await expect(page.getByText('下局继承倍数：×2')).toBeVisible()
  await expect(page.getByText('三四口关系：')).toBeVisible()
  await expect(page.getByText('基础番/固定点 10，额外翻倍 ×2，骰子 ×2，继承 ×4，有效 ×8，结算膨胀 ×8')).toBeVisible()
  await expect(page.getByText('赔付流向')).toBeVisible()
  await expect(page.getByText('自摸互包赔付×3')).toBeVisible()
})

test('settlement overlay renders discard payout flow details', async ({ page, request }) => {
  await openSettlementOverlay(page, request, 'discard-flow')

  await expect(page.getByText('每局结算明细')).toBeVisible()
  await expect(page.getByText('骰子×2 / 继承×2 / 有效×4 / 结算膨胀×8')).toBeVisible()
  await expect(page.getByText('基础番/固定点 12，额外翻倍 ×1，骰子 ×2，继承 ×2，有效 ×4，结算膨胀 ×8')).toBeVisible()
  await expect(page.getByText('捉冲 AI-小胖')).toBeVisible()
  await expect(page.getByText('放冲赔付')).toBeVisible()
  await expect(page.getByText('第三方互包补赔×1')).toBeVisible()
})
