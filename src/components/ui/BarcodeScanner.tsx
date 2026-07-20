// =============================================================================
// src/components/ui/BarcodeScanner.tsx — Kamera ile barkod tarama modalı
//
// html5-qrcode kütüphanesini sarmalar. Modal açıldığında telefon/webcam
// kamerasını başlatır, ilk başarılı okumada `onScan(code)` çağırır ve kapanır.
// =============================================================================

import { useEffect, useId, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { CameraOff } from 'lucide-react'
import Modal from './Modal'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (code: string) => void
  title?: string
}

export default function BarcodeScanner({ open, onClose, onScan, title = 'Barkod Tara' }: BarcodeScannerProps) {
  const rawId = useId()
  const elementId = `barcode-scanner-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    setError('')
    let cancelled = false
    let handled = false
    const scanner = new Html5Qrcode(elementId, { verbose: false })

    function stopAndClear() {
      if (scanner.isScanning) {
        scanner.stop().catch(() => {}).finally(() => {
          try { scanner.clear() } catch { /* zaten temiz */ }
        })
      } else {
        try { scanner.clear() } catch { /* zaten temiz */ }
      }
    }

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          if (handled || cancelled) return
          handled = true
          scanner.stop().catch(() => {}).finally(() => {
            try { scanner.clear() } catch { /* zaten temiz */ }
            onScan(decodedText)
            onClose()
          })
        },
        () => { /* karede barkod bulunamadı — sessizce devam */ }
      )
      .then(() => {
        if (cancelled) stopAndClear()
      })
      .catch(() => {
        if (!cancelled) setError('Kamera izni gerekli, tarayıcı ayarlarından izin verin.')
      })

    return () => {
      cancelled = true
      stopAndClear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, elementId])

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 1rem', textAlign: 'center' }}>
            <CameraOff style={{ width: '2rem', height: '2rem', color: '#dc2626' }} />
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#dc2626', fontWeight: 500 }}>{error}</p>
          </div>
        ) : (
          <>
            <div id={elementId} style={{ width: '100%', minHeight: '220px', borderRadius: '0.75rem', overflow: 'hidden', background: '#0f172a' }} />
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
              Barkodu kamera görüş alanına getirin.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
