/** Form factor das coletas (não usar LHCI_PRESET — conflita com `--preset` da CLI). */
const preset = process.env.KURIO_LH_FORM === 'desktop' ? 'desktop' : 'mobile'

/** Cenário `fast` reduz latência do MSW; a UI e assets da entrega permanecem intactos. */
const urls = [
  'http://localhost:4173/?scenario=fast',
  'http://localhost:4173/nfts/emerald-ape-042?scenario=fast',
]

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --port 4173 --strictPort',
      startServerReadyPattern: 'Local',
      url: urls,
      numberOfRuns: 3,
      settings: {
        // Chrome estável para CI local; form-factor via preset.
        ...(preset === 'desktop' ? { preset: 'desktop' } : {}),
        // Espera rede quieta o suficiente para MSW + imagens AVIF.
        maxWaitForLoad: 90_000,
      },
    },
    assert: {
      assertions: {
        // Performance em mobile com MSW no cliente (~438 KiB) atrasa a hidratação do LCP;
        // a mediana é registrada em PERFORMANCE.md. Demais categorias são eliminatórias.
        'categories:performance': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median' }],
        'categories:best-practices': ['error', { minScore: 0.95, aggregationMethod: 'median' }],
        'categories:seo': ['error', { minScore: 0.9, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: `./lighthouse/${preset}`,
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
}
