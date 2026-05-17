type PrintReportOptions = {
  title: string
  subtitle?: string
  orientation?: 'landscape' | 'portrait'
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function collectStyles() {
  return Array.from(document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n')
}

export function printReportElement(element: HTMLElement | null, options: PrintReportOptions) {
  if (!element) {
    throw new Error('Printable report content is not available yet.')
  }

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1400,height=900')
  if (!printWindow) {
    throw new Error('Allow pop-ups for this site to print the report.')
  }

  const orientation = options.orientation || 'landscape'
  const printableMarkup = element.outerHTML
  const subtitleMarkup = options.subtitle
    ? `<p class="report-print-subtitle">${escapeHtml(options.subtitle)}</p>`
    : ''

  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>
    ${collectStyles()}
    <style>
      @page {
        size: ${orientation};
        margin: 12mm;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }

      body {
        color: #0f172a;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .report-print-frame {
        padding: 4px 0 12px;
      }

      .report-print-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 20px;
        padding-bottom: 14px;
        border-bottom: 1px solid #cbd5e1;
      }

      .report-print-title {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        line-height: 1.1;
        color: #0f172a;
      }

      .report-print-subtitle {
        margin: 8px 0 0;
        font-size: 14px;
        color: #475569;
      }

      .report-print-content {
        width: 100%;
      }

      .report-print-content [data-print-hide="true"] {
        display: none !important;
      }

      .report-print-content [data-print-grid] {
        display: grid !important;
      }

      .report-print-content [data-print-grid="2"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      .report-print-content [data-print-grid="3"] {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }

      .report-print-content [data-print-grid="4"] {
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      }

      .report-print-content section,
      .report-print-content article,
      .report-print-content table,
      .report-print-content svg,
      .report-print-content canvas {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .report-print-content table {
        width: 100% !important;
      }

      .report-print-content .overflow-hidden,
      .report-print-content .overflow-x-auto,
      .report-print-content .overflow-y-auto {
        overflow: visible !important;
      }

      .report-print-content [class*="shadow-"] {
        box-shadow: none !important;
      }
    </style>
  </head>
  <body>
    <div class="report-print-frame">
      <header class="report-print-header">
        <div>
          <h1 class="report-print-title">${escapeHtml(options.title)}</h1>
          ${subtitleMarkup}
        </div>
      </header>
      <div class="report-print-content">${printableMarkup}</div>
    </div>
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () {
          window.focus();
          window.print();
        }, 300);
      });

      window.addEventListener('afterprint', function () {
        window.close();
      });
    </script>
  </body>
</html>`)
  printWindow.document.close()
}