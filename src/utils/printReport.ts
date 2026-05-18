import html2pdf from 'html2pdf.js'

type PrintReportOptions = {
  title: string
  subtitle?: string
  orientation?: 'landscape' | 'portrait'
}

type DownloadPdfOptions = PrintReportOptions & {
  filename?: string
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

function buildDownloadStyles() {
  return `
    .report-print-frame {
      color: #0f172a;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8fafc;
      padding: 6px 0 16px;
    }

    .report-print-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 18px;
      padding: 14px 18px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 60%, #ffffff 100%);
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

    .report-print-content [data-print-card="true"] {
      border: 1px solid #e2e8f0 !important;
      background: #ffffff !important;
      border-radius: 18px !important;
      box-shadow: none !important;
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
  `
}

export function printReportElement(element: HTMLElement | null, options: PrintReportOptions) {
  if (!element) {
    throw new Error('Printable report content is not available yet.')
  }

  const printFrame = document.createElement('iframe')
  printFrame.setAttribute('title', 'Report print frame')
  printFrame.style.position = 'fixed'
  printFrame.style.right = '0'
  printFrame.style.bottom = '0'
  printFrame.style.width = '0'
  printFrame.style.height = '0'
  printFrame.style.border = '0'
  printFrame.style.visibility = 'hidden'
  document.body.append(printFrame)

  const frameWindow = printFrame.contentWindow
  if (!frameWindow) {
    printFrame.remove()
    throw new Error('Unable to open the print preview.')
  }

  const orientation = options.orientation || 'landscape'
  const printableMarkup = element.outerHTML
  const subtitleMarkup = options.subtitle
    ? `<p class="report-print-subtitle">${escapeHtml(options.subtitle)}</p>`
    : ''

  frameWindow.document.open()
  frameWindow.document.write(`<!doctype html>
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
        background: #f8fafc;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .report-print-frame {
        padding: 6px 0 16px;
      }

      .report-print-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 18px;
        padding: 14px 18px;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 60%, #ffffff 100%);
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

      .report-print-content [data-print-card="true"] {
        border: 1px solid #e2e8f0 !important;
        background: #ffffff !important;
        border-radius: 18px !important;
        box-shadow: none !important;
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
  </body>
</html>`)
  frameWindow.document.close()

  const cleanup = () => {
    printFrame.remove()
  }

  frameWindow.addEventListener('afterprint', cleanup)
  printFrame.addEventListener('load', () => {
    setTimeout(() => {
      frameWindow.focus()
      frameWindow.print()
    }, 300)
  })
}

export async function downloadPdfElement(element: HTMLElement | null, options: DownloadPdfOptions) {
  if (!element) {
    throw new Error('Printable report content is not available yet.')
  }

  const orientation = options.orientation || 'landscape'
  const container = document.createElement('div')
  const { width } = element.getBoundingClientRect()
  const safeWidth = Math.max(width, 960)

  container.style.position = 'fixed'
  container.style.left = '0'
  container.style.top = '0'
  container.style.width = `${safeWidth}px`
  container.style.transform = 'translateX(-200vw)'
  container.style.pointerEvents = 'none'
  container.style.background = '#ffffff'

  const style = document.createElement('style')
  style.textContent = buildDownloadStyles()
  container.append(style)

  const frame = document.createElement('div')
  frame.className = 'report-print-frame'

  const header = document.createElement('header')
  header.className = 'report-print-header'

  const headerText = document.createElement('div')
  const title = document.createElement('h1')
  title.className = 'report-print-title'
  title.textContent = options.title
  headerText.append(title)

  if (options.subtitle) {
    const subtitle = document.createElement('p')
    subtitle.className = 'report-print-subtitle'
    subtitle.textContent = options.subtitle
    headerText.append(subtitle)
  }

  header.append(headerText)
  frame.append(header)

  const content = document.createElement('div')
  content.className = 'report-print-content'
  content.append(element.cloneNode(true))
  frame.append(content)

  container.append(frame)
  document.body.append(container)

  const filename = options.filename || 'report.pdf'

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })

    await html2pdf()
      .set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0, scrollX: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation },
      })
      .from(frame)
      .save()
  } finally {
    container.remove()
  }
}