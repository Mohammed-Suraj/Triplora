import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import type { AiTripPlanResult } from '@/lib/api'

const TEAL: [number, number, number] = [13, 148, 136]
const DARK_TEAL: [number, number, number] = [10, 110, 100]
const INK: [number, number, number] = [30, 41, 59]
const MUTED: [number, number, number] = [100, 116, 139]
const LIGHT: [number, number, number] = [240, 253, 250]
const ACCENT: [number, number, number] = [251, 191, 36]

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 14
const CONTENT_W = PAGE_W - MARGIN * 2

const BRAND = 'TRIPLORA'
const TAGLINE = 'AI-Powered Kerala Tourism'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Draws a footer with branding + page number on every page. */
function drawFooter(doc: jsPDF): void {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(`${BRAND} · ${TAGLINE} · triplora.travel`, MARGIN, PAGE_H - 8)
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' })
  }
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...TEAL)
  doc.text(text.toUpperCase(), MARGIN, y)
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.8)
  doc.line(MARGIN, y + 1.5, MARGIN + 26, y + 1.5)
  return y + 6
}

function wrapParagraph(doc: jsPDF, text: string, y: number, x = MARGIN, maxWidth = CONTENT_W, size = 10): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...INK)
  const lines = doc.splitTextToSize(text, maxWidth) as string[]
  doc.text(lines, x, y)
  return y + lines.length * (size * 0.5)
}

function drawChips(doc: jsPDF, items: string[], y: number, maxWidth = CONTENT_W): number {
  if (items.length === 0) return y
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  let cursorX = MARGIN
  for (const item of items) {
    const text = ` ${item} `
    const width = doc.getTextWidth(text) + 5
    if (cursorX + width > MARGIN + maxWidth) {
      cursorX = MARGIN
      y += 7
    }
    doc.setFillColor(...LIGHT)
    doc.setDrawColor(153, 213, 207)
    doc.roundedRect(cursorX, y - 4.5, width, 7, 2, 2, 'FD')
    doc.setTextColor(...INK)
    doc.text(text, cursorX + 2.5, y, { align: 'left' })
    cursorX += width + 2
  }
  return y + 7
}

export async function generateTripPdf(plan: AiTripPlanResult, meta?: { title?: string | null; createdAt?: string }): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const title = plan.title || meta?.title || 'Kerala Itinerary'
  const destinationNames = plan.itinerary.map((day) => day.destination.name)
  const uniqueDestinations = [...new Set(destinationNames)]
  const days = plan.itinerary.length

  // -------------------------------------------------------------------------
  // PAGE 1 - COVER
  // -------------------------------------------------------------------------
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, PAGE_W, 150, 'F')
  doc.setFillColor(...DARK_TEAL)
  doc.rect(0, 150, PAGE_W, 6, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text(BRAND, MARGIN, 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(204, 251, 241)
  doc.text(TAGLINE.toUpperCase(), MARGIN, 35)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(255, 255, 255)
  const titleLines = doc.splitTextToSize(title, CONTENT_W) as string[]
  doc.text(titleLines, MARGIN, 62)
  const titleEnd = 62 + titleLines.length * 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(240, 253, 250)
  doc.text(`${days} days · ${uniqueDestinations.join(' · ')}`, MARGIN, titleEnd + 6)
  doc.text(
    `Best season: ${plan.bestSeason || 'October - March'}`,
    MARGIN,
    titleEnd + 12,
  )

  // QR code linking to Triplora
  try {
    const qrUrl = `https://triplora.travel/explore`
    const qrData = await QRCode.toDataURL(qrUrl, { width: 220, margin: 1, color: { dark: '#FFFFFF', light: '#0D9488' } })
    doc.addImage(qrData, 'PNG', PAGE_W - MARGIN - 30, 24, 30, 30)
    doc.setFontSize(6.5)
    doc.setTextColor(204, 251, 241)
    doc.text('Scan to explore', PAGE_W - MARGIN - 15, 58, { align: 'center' })
  } catch {
    // QR generation is optional
  }

  // Destination images strip (up to 3)
  const imageUrls = plan.itinerary
    .map((day) => day.destination.image)
    .filter(Boolean)
    .slice(0, 3)
  const imgW = 42
  const gap = 5
  const stripY = 165
  let imgX = MARGIN
  for (const url of imageUrls) {
    const dataUrl = await toDataUrl(url)
    if (dataUrl) {
      doc.addImage(dataUrl, 'PNG', imgX, stripY, imgW, 30)
    } else {
      doc.setFillColor(...LIGHT)
      doc.rect(imgX, stripY, imgW, 30, 'F')
    }
    imgX += imgW + gap
  }
  const stripEnd = stripY + 36

  // Trip summary
  let y = stripEnd + 8
  y = sectionTitle(doc, 'Trip summary', y)
  y += 2
  y = wrapParagraph(doc, plan.summary || `A ${days}-day journey through the best of Kerala.`, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.text('Packed with', MARGIN, y)
  y += 1
  const facts = [
    `${days} days of itinerary`,
    `${uniqueDestinations.length} destinations`,
    `Hotels & restaurants per day`,
    `Packing checklist`,
    `Emergency contacts`,
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...MUTED)
  facts.forEach((fact) => {
    doc.setFillColor(...ACCENT)
    doc.circle(MARGIN + 1.2, y + 1, 1.2, 'F')
    doc.text(fact, MARGIN + 5, y + 2)
    y += 6
  })

  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(
    `Prepared for you with Triplora's AI travel planner · ${formatDate(meta?.createdAt ? new Date(meta.createdAt) : new Date())}`,
    MARGIN,
    y,
  )

  doc.addPage()

  // -------------------------------------------------------------------------
  // PAGE 2 - TRIP ESSENTIALS
  // -------------------------------------------------------------------------
  let py = 20
  py = sectionTitle(doc, 'Trip essentials', py)
  py += 3

  const essentials: Array<[string, string]> = [
    ['Estimated total budget', plan.estimatedTotalBudget || 'See day-wise costs'],
    ['Best season', plan.bestSeason || 'October - March'],
    ['Weather advice', plan.weatherAdvice || 'Tropical climate - carry light cotton and rainwear.'],
  ]
  autoTable(doc, {
    startY: py,
    margin: { left: MARGIN, right: MARGIN },
    head: [['', '']],
    body: essentials.map(([label, value]) => [label, value]),
    theme: 'grid',
    headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 2.5, textColor: INK, lineColor: [203, 213, 225] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, fillColor: LIGHT }, 1: { cellWidth: 'auto' } },
  })
  py = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  py = sectionTitle(doc, 'Packing checklist', py)
  py += 2
  py = drawChips(doc, plan.packingChecklist.length > 0 ? plan.packingChecklist : ['Light cotton clothing', 'Rain jacket', 'Comfortable shoes', 'Sunscreen', 'Travel documents'], py)
  py += 5

  py = sectionTitle(doc, 'Travel tips', py)
  py += 2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...INK)
  const tips = plan.travelTips.length > 0 ? plan.travelTips : ['Book stays in advance during peak season.']
  for (const tip of tips) {
    doc.setFillColor(...TEAL)
    doc.circle(MARGIN + 1.2, py + 1, 1.2, 'F')
    const tipLines = doc.splitTextToSize(tip, CONTENT_W - 8) as string[]
    doc.text(tipLines, MARGIN + 5, py + 2)
    py += tipLines.length * 5 + 2
  }
  py += 4

  py = sectionTitle(doc, 'Emergency contacts', py)
  py += 3
  autoTable(doc, {
    startY: py,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Service', 'Number']],
    body: (plan.emergencyContacts.length > 0
      ? plan.emergencyContacts
      : [
          { label: 'Police', phone: '100' },
          { label: 'Ambulance', phone: '108' },
          { label: 'Fire', phone: '101' },
          { label: 'Kerala Tourist Helpline', phone: '1363' },
        ]
    ).map((contact) => [contact.label, contact.phone]),
    theme: 'grid',
    headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 2.5, textColor: INK, lineColor: [203, 213, 225] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90, fillColor: LIGHT }, 1: { cellWidth: 'auto' } },
  })

  // -------------------------------------------------------------------------
  // DAY-WISE ITINERARY (flowing pages)
  // -------------------------------------------------------------------------
  doc.addPage()
  let dayY = 20
  dayY = sectionTitle(doc, 'Day-wise itinerary', dayY)
  dayY += 2

  for (let i = 0; i < plan.itinerary.length; i += 1) {
    const day = plan.itinerary[i]
    if (dayY > PAGE_H - 60) {
      doc.addPage()
      dayY = 20
    }

    doc.setFillColor(...TEAL)
    doc.circle(MARGIN + 3, dayY - 1.5, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...DARK_TEAL)
    doc.text(`Day ${day.day} - ${day.destination.name}`, MARGIN + 9, dayY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...MUTED)
    if (day.destination.region) {
      doc.text(`${day.destination.region}, Kerala`, PAGE_W - MARGIN, dayY, { align: 'right' })
    }
    dayY += 5
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...TEAL)
    doc.text(day.focus || '', MARGIN, dayY)
    dayY += 6

    const scheduleRows: Array<[string, string]> = [
      ['Morning', day.morning || '-'],
      ['Afternoon', day.afternoon || '-'],
      ['Evening', day.evening || '-'],
    ]
    autoTable(doc, {
      startY: dayY,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Time', 'Plan']],
      body: scheduleRows,
      theme: 'grid',
      headStyles: { fillColor: DARK_TEAL, textColor: 255, fontStyle: 'bold' },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: INK, lineColor: [203, 213, 225] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28, fillColor: LIGHT } },
    })
    dayY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4

    const detailRows: Array<[string, string]> = []
    if (day.hotels.length > 0) detailRows.push(['Hotels', day.hotels.join('\n')])
    if (day.restaurants.length > 0) detailRows.push(['Restaurants', day.restaurants.join('\n')])
    if (day.foodRecommendations.length > 0) detailRows.push(['Must-try food', day.foodRecommendations.join(', ')])
    if (day.estimatedDailyCost) detailRows.push(['Estimated cost', day.estimatedDailyCost])
    if (day.localTransportation.length > 0) detailRows.push(['Getting around', day.localTransportation.join(', ')])
    if (day.nearbyAttractions.length > 0) detailRows.push(['Nearby attractions', day.nearbyAttractions.join(', ')])
    if (day.hiddenGems.length > 0) detailRows.push(['Hidden gems', day.hiddenGems.join(', ')])
    if (day.shopping.length > 0) detailRows.push(['Shopping', day.shopping.join(', ')])
    if (day.travelNotes) detailRows.push(['Travel notes', day.travelNotes])

    if (detailRows.length > 0) {
      autoTable(doc, {
        startY: dayY,
        margin: { left: MARGIN, right: MARGIN },
        body: detailRows,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: INK, lineColor: [203, 213, 225] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38, fillColor: LIGHT, textColor: DARK_TEAL } },
      })
      dayY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    } else {
      dayY += 6
    }
  }

  drawFooter(doc)

  const safeName = (title || 'triplora-itinerary')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
  doc.save(`triplora-${safeName || 'itinerary'}.pdf`)
}
