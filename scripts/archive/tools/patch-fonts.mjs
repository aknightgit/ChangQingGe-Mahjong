#!/usr/bin/env node
/**
 * Patches @nuxt/fonts to remove Google font providers.
 * 
 * Background: @nuxt/ui loads @nuxt/fonts as a child module.
 * Setting `fonts: false` in nuxt.config.ts does NOT prevent it from loading,
 * because the config key only works for top-level modules.
 * 
 * This script removes the 'google' and 'googleicons' providers from the
 * default provider list, preventing 30s+ timeout errors on networks that
 * block Google Fonts API.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const modulePath = resolve(__dirname, '../node_modules/@nuxt/fonts/dist/module.mjs')

if (!existsSync(modulePath)) {
  console.log('⏭️  @nuxt/fonts not found, skipping patch')
  process.exit(0)
}

let content = readFileSync(modulePath, 'utf-8')
let patched = false

// Remove google provider from defaults
if (content.includes('google: providers.google,')) {
  content = content.replace(/\s*google: providers\.google,?\n/, '\n')
  patched = true
}

// Remove googleicons provider from defaults
if (content.includes('googleicons: providers.googleicons,')) {
  content = content.replace(/\s*googleicons: providers\.googleicons,?\n/, '\n')
  patched = true
}

if (patched) {
  writeFileSync(modulePath, content, 'utf-8')
  console.log('✅ @nuxt/fonts patched: removed google/googleicons providers')
} else {
  console.log('⏭️  @nuxt/fonts already patched or providers not found')
}
