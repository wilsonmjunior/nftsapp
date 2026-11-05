#!/usr/bin/env node
/**
 * Lê os JSON gerados pelo LHCI em `lighthouse/{mobile,desktop}` e imprime
 * a mediana de categorias + LCP/CLS/TBT por URL.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const presets = ['mobile', 'desktop']

function median(values) {
  const sorted = [...values].filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function score(report, category) {
  return report.categories?.[category]?.score ?? null
}

function auditMs(report, id) {
  const value = report.audits?.[id]?.numericValue
  return Number.isFinite(value) ? value : null
}

function pathnameOf(report) {
  try {
    return new URL(report.finalDisplayedUrl || report.requestedUrl).pathname || '/'
  } catch {
    return report.requestedUrl || 'unknown'
  }
}

async function loadReports(preset) {
  const dir = path.join(root, 'lighthouse', preset)
  let files = []
  try {
    files = (await readdir(dir)).filter((name) => name.endsWith('.json') && name.includes('-report'))
  } catch {
    return []
  }
  const reports = []
  for (const file of files) {
    const raw = await readFile(path.join(dir, file), 'utf8')
    reports.push(JSON.parse(raw))
  }
  return reports
}

function summarize(reports) {
  const byPath = new Map()
  for (const report of reports) {
    const key = pathnameOf(report)
    if (!byPath.has(key)) byPath.set(key, [])
    byPath.get(key).push(report)
  }

  const rows = []
  for (const [pathname, group] of [...byPath.entries()].sort()) {
    // Mantém só as 3 coletas mais recentes (LHCI acumula dumps entre execuções).
    const latest = [...group]
      .sort((a, b) => String(b.fetchTime || '').localeCompare(String(a.fetchTime || '')))
      .slice(0, 3)
    rows.push({
      pathname,
      runs: latest.length,
      performance: median(latest.map((r) => score(r, 'performance'))),
      accessibility: median(latest.map((r) => score(r, 'accessibility'))),
      bestPractices: median(latest.map((r) => score(r, 'best-practices'))),
      seo: median(latest.map((r) => score(r, 'seo'))),
      lcpMs: median(latest.map((r) => auditMs(r, 'largest-contentful-paint'))),
      cls: median(latest.map((r) => auditMs(r, 'cumulative-layout-shift'))),
      tbtMs: median(latest.map((r) => auditMs(r, 'total-blocking-time'))),
    })
  }
  return rows
}

function fmtScore(value) {
  if (value == null) return '—'
  return `${Math.round(value * 100)}`
}

function fmtMs(value) {
  if (value == null) return '—'
  return `${Math.round(value)}`
}

const summary = {}
for (const preset of presets) {
  summary[preset] = summarize(await loadReports(preset))
}

const outPath = path.join(root, 'lighthouse', 'summary.json')
await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`)

console.log('Lighthouse — mediana por página (3 runs)\n')
for (const preset of presets) {
  console.log(`## ${preset}`)
  if (summary[preset].length === 0) {
    console.log('  (sem relatórios — rode `npm run lighthouse`)\n')
    continue
  }
  for (const row of summary[preset]) {
    console.log(
      `  ${row.pathname.padEnd(28)} P ${fmtScore(row.performance)}  A ${fmtScore(row.accessibility)}  BP ${fmtScore(row.bestPractices)}  SEO ${fmtScore(row.seo)}  | LCP ${fmtMs(row.lcpMs)}ms  CLS ${row.cls?.toFixed?.(3) ?? '—'}  TBT ${fmtMs(row.tbtMs)}ms`,
    )
  }
  console.log('')
}
console.log(`Resumo JSON: ${path.relative(root, outPath)}`)
