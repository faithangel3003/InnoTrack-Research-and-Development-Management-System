import type { ReportPreview, ReportType } from '../types/superAdmin'

type ExportSuperAdminReportPdfOptions = {
  fileName: string
  type: ReportType
}

type Html2PdfWorker = {
  set: (options: unknown) => Html2PdfWorker
  from: (element: HTMLElement) => Html2PdfWorker
  save: () => Promise<void>
}

type Html2PdfFactory = () => Html2PdfWorker

const statusColorMap: Record<string, string> = {
  Paid: '#0f766e',
  Pending: '#d97706',
  Failed: '#dc2626',
  Refunded: '#7c3aed',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatCurrency(value: number) {
  return `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getReportTitle(type: ReportType) {
  return type === 'revenue' ? 'Revenue Report' : 'Payment Report'
}

function getAccentColor(type: ReportType) {
  return type === 'revenue' ? '#0f766e' : '#1d4ed8'
}

function buildMonthlyRows(preview: ReportPreview) {
  if (preview.monthlyBreakdown.length === 0) {
    return `
      <tr>
        <td colspan="2" class="empty-cell">No monthly revenue data available for the selected period.</td>
      </tr>
    `
  }

  return preview.monthlyBreakdown
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.month)}</td>
        <td class="numeric-cell">${escapeHtml(formatCurrency(item.revenue))}</td>
      </tr>
    `)
    .join('')
}

function buildStatusRows(preview: ReportPreview) {
  const total = preview.statusDistribution.reduce((sum, item) => sum + item.count, 0)
  const rows = preview.statusDistribution.length > 0
    ? preview.statusDistribution
    : [
        { status: 'Paid', count: preview.paid },
        { status: 'Pending', count: preview.pending },
        { status: 'Failed', count: preview.failed },
      ]

  return rows
    .filter((item) => item.count > 0 || rows.length === 1)
    .map((item) => {
      const percent = total > 0 ? Math.max(8, Math.round((item.count / total) * 100)) : 0
      const color = statusColorMap[item.status] || '#334155'

      return `
        <div class="status-row">
          <div class="status-row-main">
            <span class="status-dot" style="background:${color}"></span>
            <div>
              <p class="status-label">${escapeHtml(item.status)}</p>
              <div class="status-track">
                <div class="status-fill" style="width:${percent}%;background:${color}"></div>
              </div>
            </div>
          </div>
          <span class="status-count">${item.count}</span>
        </div>
      `
    })
    .join('')
}

function buildTopCompanyRows(preview: ReportPreview) {
  if (preview.topCompanyPayments.length === 0) {
    return `
      <tr>
        <td colspan="3" class="empty-cell">No company payment records matched the selected period.</td>
      </tr>
    `
  }

  return preview.topCompanyPayments
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.companyName)}</td>
        <td class="numeric-cell">${escapeHtml(formatCurrency(item.amount))}</td>
        <td class="numeric-cell">${item.transactionCount}</td>
      </tr>
    `)
    .join('')
}

function buildMarkup(preview: ReportPreview, type: ReportType) {
  const accentColor = getAccentColor(type)
  const title = getReportTitle(type)
  const generatedAt = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return `
    <style>
      .pdf-shell {
        width: 1120px;
        box-sizing: border-box;
        background: #ffffff;
        color: #0f172a;
        font-family: Inter, 'Segoe UI', sans-serif;
        padding: 28px;
      }

      .pdf-shell * {
        box-sizing: border-box;
      }

      .pdf-hero {
        display: flex;
        justify-content: space-between;
        align-items: stretch;
        gap: 24px;
        padding: 24px 28px;
        border: 1px solid #dbeafe;
        border-radius: 26px;
        background: linear-gradient(135deg, #f8fbff 0%, #eff6ff 48%, #f8fafc 100%);
      }

      .pdf-eyebrow {
        margin: 0 0 12px;
        color: ${accentColor};
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .pdf-title {
        margin: 0;
        font-size: 34px;
        line-height: 1.05;
      }

      .pdf-description {
        margin: 12px 0 0;
        max-width: 560px;
        font-size: 14px;
        line-height: 1.6;
        color: #475569;
      }

      .pdf-period {
        min-width: 280px;
        border-radius: 22px;
        background: #ffffff;
        border: 1px solid #dbeafe;
        padding: 18px 20px;
      }

      .pdf-period-label,
      .section-label,
      .summary-card-label {
        margin: 0;
        color: #64748b;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .pdf-period-value {
        margin: 14px 0 8px;
        font-size: 18px;
        font-weight: 700;
        line-height: 1.35;
      }

      .pdf-generated {
        margin: 0;
        font-size: 13px;
        color: #64748b;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-top: 22px;
      }

      .summary-card,
      .section-card {
        border: 1px solid #e2e8f0;
        border-radius: 22px;
        background: #ffffff;
        padding: 20px;
        page-break-inside: avoid;
      }

      .summary-card-value {
        margin: 16px 0 6px;
        font-size: 28px;
        font-weight: 800;
        line-height: 1.1;
      }

      .summary-card-note {
        margin: 0;
        font-size: 13px;
        color: #64748b;
      }

      .details-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
        gap: 18px;
        margin-top: 18px;
      }

      .section-card-title {
        margin: 14px 0 6px;
        font-size: 24px;
        font-weight: 700;
      }

      .section-card-description {
        margin: 0 0 18px;
        font-size: 13px;
        line-height: 1.6;
        color: #64748b;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
      }

      .data-table th,
      .data-table td {
        padding: 12px 14px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 13px;
        text-align: left;
      }

      .data-table th {
        color: #64748b;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        background: #f8fafc;
      }

      .data-table tr:last-child td {
        border-bottom: none;
      }

      .numeric-cell {
        text-align: right !important;
        font-variant-numeric: tabular-nums;
      }

      .status-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .status-row-main {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        flex: 0 0 auto;
      }

      .status-label {
        margin: 0 0 8px;
        font-size: 13px;
        font-weight: 600;
      }

      .status-track {
        width: 100%;
        height: 8px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
      }

      .status-fill {
        height: 100%;
        border-radius: inherit;
      }

      .status-count {
        min-width: 2rem;
        font-size: 13px;
        font-weight: 700;
        text-align: right;
      }

      .pdf-footer {
        margin-top: 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 16px 18px;
        border-radius: 20px;
        background: #f8fafc;
        color: #475569;
        font-size: 13px;
      }

      .empty-cell {
        color: #64748b;
        text-align: center !important;
        font-style: italic;
      }
    </style>
    <div class="pdf-shell">
      <header class="pdf-hero">
        <div>
          <p class="pdf-eyebrow">InnoTrack Superadmin</p>
          <h1 class="pdf-title">${escapeHtml(title)}</h1>
          <p class="pdf-description">A styled financial and operational summary covering the selected reporting window, ready for leadership review and record keeping.</p>
        </div>
        <div class="pdf-period">
          <p class="pdf-period-label">Reporting Window</p>
          <p class="pdf-period-value">${escapeHtml(formatDate(preview.startDate))}<br />to ${escapeHtml(formatDate(preview.endDate))}</p>
          <p class="pdf-generated">Generated ${escapeHtml(generatedAt)}</p>
        </div>
      </header>

      <section class="summary-grid">
        <article class="summary-card">
          <p class="summary-card-label">Total Revenue</p>
          <p class="summary-card-value">${escapeHtml(formatCurrency(preview.totalRevenue))}</p>
          <p class="summary-card-note">Gross amount collected in the selected period.</p>
        </article>
        <article class="summary-card">
          <p class="summary-card-label">Total Companies</p>
          <p class="summary-card-value">${preview.totalCompanies}</p>
          <p class="summary-card-note">Organizations represented in this report.</p>
        </article>
        <article class="summary-card">
          <p class="summary-card-label">Total Invoices</p>
          <p class="summary-card-value">${preview.totalInvoices}</p>
          <p class="summary-card-note">Billable transactions recorded in scope.</p>
        </article>
        <article class="summary-card">
          <p class="summary-card-label">Payment Health</p>
          <p class="summary-card-value">${preview.paid}/${preview.totalInvoices || preview.paid}</p>
          <p class="summary-card-note">Paid invoices versus total invoice volume.</p>
        </article>
      </section>

      <section class="details-grid">
        <article class="section-card">
          <p class="section-label">Monthly Trend</p>
          <h2 class="section-card-title">Monthly Breakdown</h2>
          <p class="section-card-description">Revenue grouped by month across the selected reporting range.</p>
          <table class="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th class="numeric-cell">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${buildMonthlyRows(preview)}
            </tbody>
          </table>
        </article>

        <article class="section-card">
          <p class="section-label">Operational Snapshot</p>
          <h2 class="section-card-title">Status Distribution</h2>
          <p class="section-card-description">Invoice and payment-status mix for the report period.</p>
          <div class="status-stack">
            ${buildStatusRows(preview)}
          </div>
        </article>
      </section>

      <section class="section-card" style="margin-top:18px;">
        <p class="section-label">Top Accounts</p>
        <h2 class="section-card-title">Top Company Payments</h2>
        <p class="section-card-description">Highest-value company payment activity recorded during the selected period.</p>
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Company</th>
              <th class="numeric-cell">Amount</th>
              <th class="numeric-cell">Transactions</th>
            </tr>
          </thead>
          <tbody>
            ${buildTopCompanyRows(preview)}
          </tbody>
        </table>
      </section>

      <footer class="pdf-footer">
        <span>Prepared from the active InnoTrack superadmin reporting dataset.</span>
        <span>${escapeHtml(title)} • ${escapeHtml(formatDate(preview.startDate))} to ${escapeHtml(formatDate(preview.endDate))}</span>
      </footer>
    </div>
  `
}

async function loadHtml2Pdf() {
  const module = await import('html2pdf.js')
  return (module.default || module) as unknown as Html2PdfFactory
}

export async function exportSuperAdminReportPdf(preview: ReportPreview, options: ExportSuperAdminReportPdfOptions) {
  const html2pdf = await loadHtml2Pdf()
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-20000px'
  container.style.top = '0'
  container.style.width = '1120px'
  container.style.background = '#ffffff'
  container.innerHTML = buildMarkup(preview, options.type)

  document.body.append(container)

  try {
    const printableElement = container.querySelector<HTMLElement>('.pdf-shell')
    if (!printableElement) {
      throw new Error('Styled report content could not be prepared for export.')
    }

    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)))

    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: options.fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(printableElement)
      .save()
  } finally {
    container.remove()
  }
}