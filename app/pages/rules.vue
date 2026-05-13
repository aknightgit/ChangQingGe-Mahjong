<template>
  <div class="rules-page">
    <div class="rules-shell">
      <header class="rules-header">
        <button class="ghost-button" @click="goBack">返回</button>
        <div>
          <h1>长青阁麻将规则</h1>
          <p class="subtitle">当前展示内容直接来自 `docs/rules_intro.md`</p>
        </div>
      </header>

      <nav v-if="headings.length" class="toc">
        <a
          v-for="heading in headings"
          :key="heading.id"
          class="toc-item"
          :class="`level-${heading.level}`"
          :href="`#${heading.id}`"
        >
          {{ heading.text }}
        </a>
      </nav>

      <article class="rules-content markdown-body" v-html="renderedRulesHtml" />

      <footer class="rules-footer">
        <p>规则源文件：`docs/rules_intro.md`</p>
        <button class="ghost-button" @click="goBack">返回</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import rulesMarkdownSource from '../../docs/rules_intro.md?raw'

type Heading = {
  id: string
  text: string
  level: number
}

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  navigateTo('/mahjong/')
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function parseMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const headings: Heading[] = []
  const html: string[] = []

  let paragraphBuffer: string[] = []
  let listBuffer: string[] = []
  let listTag: 'ul' | 'ol' | null = null
  let codeFence = false
  let codeBuffer: string[] = []

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return
    html.push(`<p>${renderInline(paragraphBuffer.join(' '))}</p>`)
    paragraphBuffer = []
  }

  const flushList = () => {
    if (!listTag || !listBuffer.length) return
    html.push(`<${listTag}>${listBuffer.join('')}</${listTag}>`)
    listBuffer = []
    listTag = null
  }

  const flushCode = () => {
    if (!codeFence) return
    html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`)
    codeBuffer = []
    codeFence = false
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      flushParagraph()
      flushList()
      if (codeFence) {
        flushCode()
      } else {
        codeFence = true
        codeBuffer = []
      }
      continue
    }

    if (codeFence) {
      codeBuffer.push(rawLine)
      continue
    }

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    if (trimmed === '---') {
      flushParagraph()
      flushList()
      html.push('<hr>')
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      const id = slugify(text)
      headings.push({ id, text, level })
      html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`)
      continue
    }

    if (trimmed.startsWith('> ')) {
      flushParagraph()
      flushList()
      html.push(`<blockquote>${renderInline(trimmed.slice(2).trim())}</blockquote>`)
      continue
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (listTag && listTag !== 'ul') flushList()
      listTag = 'ul'
      listBuffer.push(`<li>${renderInline(unorderedMatch[1])}</li>`)
      continue
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listTag && listTag !== 'ol') flushList()
      listTag = 'ol'
      listBuffer.push(`<li>${renderInline(orderedMatch[1])}</li>`)
      continue
    }

    paragraphBuffer.push(trimmed)
  }

  flushParagraph()
  flushList()
  if (codeFence) flushCode()

  return {
    headings,
    html: html.join('\n')
  }
}

const parsedRules = parseMarkdown(rulesMarkdownSource)
const headings = parsedRules.headings.filter(heading => heading.level <= 2)
const renderedRulesHtml = parsedRules.html
</script>

<style scoped>
.rules-page {
  min-height: 100vh;
  padding: 16px;
  background:
    radial-gradient(circle at top, rgba(47, 109, 83, 0.32), transparent 42%),
    linear-gradient(180deg, #10241d 0%, #09120f 100%);
  color: #f3efe4;
}

.rules-shell {
  max-width: 980px;
  margin: 0 auto;
}

.rules-header,
.rules-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.rules-header {
  margin-bottom: 18px;
}

.rules-header h1 {
  margin: 0;
  font-size: 1.9rem;
  line-height: 1.1;
}

.subtitle,
.rules-footer p {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: rgba(243, 239, 228, 0.68);
}

.ghost-button {
  border: 1px solid rgba(243, 239, 228, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  padding: 8px 16px;
  cursor: pointer;
  transition: 160ms ease;
}

.ghost-button:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(243, 239, 228, 0.32);
}

.toc {
  position: sticky;
  top: 8px;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
  padding: 12px;
  border: 1px solid rgba(243, 239, 228, 0.08);
  border-radius: 16px;
  background: rgba(6, 14, 11, 0.86);
  backdrop-filter: blur(10px);
}

.toc-item {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 999px;
  text-decoration: none;
  color: rgba(243, 239, 228, 0.78);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(243, 239, 228, 0.08);
  transition: 160ms ease;
}

.toc-item:hover {
  color: #fff;
  border-color: rgba(126, 201, 154, 0.42);
  background: rgba(73, 140, 101, 0.18);
}

.rules-content {
  padding: 28px;
  border-radius: 22px;
  border: 1px solid rgba(243, 239, 228, 0.08);
  background: rgba(7, 16, 13, 0.9);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.24);
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3),
:deep(.markdown-body h4) {
  color: #f7f0d8;
  line-height: 1.2;
  scroll-margin-top: 72px;
}

:deep(.markdown-body h1) {
  margin: 0 0 18px;
  font-size: 2rem;
}

:deep(.markdown-body h2) {
  margin: 28px 0 12px;
  padding-bottom: 10px;
  font-size: 1.35rem;
  border-bottom: 1px solid rgba(243, 239, 228, 0.1);
}

:deep(.markdown-body h3) {
  margin: 20px 0 10px;
  font-size: 1.05rem;
}

:deep(.markdown-body p),
:deep(.markdown-body li),
:deep(.markdown-body blockquote) {
  font-size: 0.95rem;
  line-height: 1.8;
  color: rgba(243, 239, 228, 0.9);
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  margin: 8px 0 14px;
  padding-left: 24px;
}

:deep(.markdown-body li + li) {
  margin-top: 4px;
}

:deep(.markdown-body hr) {
  border: 0;
  border-top: 1px solid rgba(243, 239, 228, 0.1);
  margin: 22px 0;
}

:deep(.markdown-body blockquote) {
  margin: 14px 0;
  padding: 10px 14px;
  border-left: 3px solid rgba(126, 201, 154, 0.72);
  border-radius: 10px;
  background: rgba(126, 201, 154, 0.08);
}

:deep(.markdown-body code) {
  padding: 0.15em 0.42em;
  border-radius: 6px;
  background: rgba(255, 244, 196, 0.1);
  color: #ffe08a;
  font-size: 0.92em;
}

:deep(.markdown-body pre) {
  overflow-x: auto;
  padding: 14px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(243, 239, 228, 0.08);
}

:deep(.markdown-body pre code) {
  padding: 0;
  background: transparent;
  color: #f5f1df;
}

.rules-footer {
  margin-top: 18px;
}

@media (max-width: 720px) {
  .rules-page {
    padding: 10px;
  }

  .rules-header,
  .rules-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .rules-content {
    padding: 18px;
    border-radius: 16px;
  }

  :deep(.markdown-body h1) {
    font-size: 1.6rem;
  }
}
</style>
