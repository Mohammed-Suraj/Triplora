import { useState } from 'react'
import { Download } from 'lucide-react'
import type { AiTripPlanResult } from '@/lib/api'
import { generateTripPdf } from '@/lib/pdf'
import { Button } from '@/components/ui/Button'

interface DownloadPdfButtonProps {
  plan: AiTripPlanResult
  meta?: { title?: string | null; createdAt?: string }
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function DownloadPdfButton({ plan, meta, size = 'sm', label = 'Download PDF' }: DownloadPdfButtonProps) {
  const [generating, setGenerating] = useState(false)

  const handleDownload = async () => {
    if (generating) return
    setGenerating(true)
    try {
      await generateTripPdf(plan, meta)
    } catch {
      // jsPDF errors surface silently; the itinerary stays on screen
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button variant="outline" size={size} onClick={() => void handleDownload()} loading={generating}>
      <Download className="h-4 w-4" aria-hidden="true" />
      {generating ? 'Preparing PDF...' : label}
    </Button>
  )
}
