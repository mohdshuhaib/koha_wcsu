'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, X, AlertCircle, Keyboard, ScanLine } from 'lucide-react'
import clsx from 'classnames'

type BarcodeScannerModalProps = {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (value: string) => void
  title?: string
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Barcode',
}: BarcodeScannerModalProps) {
  const scannerRef = useRef<any>(null)
  const regionId = useMemo(
    () => `barcode-scanner-region-${Math.random().toString(36).slice(2)}`,
    []
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [starting, setStarting] = useState(false)
  const [scanMode, setScanMode] = useState<'auto' | 'manual'>('auto')
  const [manualValue, setManualValue] = useState('')

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {}
      try {
        await scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
  }

  useEffect(() => {
    let cancelled = false

    const startScanner = async () => {
      if (!isOpen || scanMode !== 'auto') return

      try {
        setStarting(true)
        setErrorMessage('')

        const mod = await import('html5-qrcode')
        const Html5Qrcode = mod.Html5Qrcode

        if (cancelled) return

        const scanner = new Html5Qrcode(regionId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: { width: 280, height: 130 },
            aspectRatio: 1.7778,
            disableFlip: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
          } as any,
          async (decodedText: string) => {
            if (!decodedText) return
            await stopScanner()
            onScanSuccess(decodedText)
            onClose()
          },
          () => {
            // ignore scan misses
          }
        )
      } catch (error: any) {
        setErrorMessage(
          error?.message || 'Could not access camera. Please allow camera permission.'
        )
      } finally {
        setStarting(false)
      }
    }

    startScanner()

    return () => {
      cancelled = true
      stopScanner()
    }
  }, [isOpen, onClose, onScanSuccess, regionId, scanMode])

  useEffect(() => {
    if (!isOpen) {
      setScanMode('auto')
      setManualValue('')
      setErrorMessage('')
    }
  }, [isOpen])

  const handleModeChange = async (mode: 'auto' | 'manual') => {
    setErrorMessage('')
    setScanMode(mode)
    if (mode === 'manual') {
      await stopScanner()
    }
  }

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = manualValue.trim()
    if (!value) return

    await stopScanner()
    onScanSuccess(value)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-secondary-white border border-primary-dark-grey shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-primary-dark-grey">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-heading-text-black" />
            <h3 className="text-lg font-bold font-heading text-heading-text-black">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-grey hover:bg-primary-grey transition"
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-text-grey">
            Use automatic camera scanning on mobile. If the camera misses or reads wrongly, switch to manual entry.
          </p>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-primary-grey p-1">
            <button
              type="button"
              onClick={() => handleModeChange('auto')}
              className={clsx(
                'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition',
                scanMode === 'auto'
                  ? 'bg-dark-green text-white shadow-sm'
                  : 'text-text-grey hover:bg-white'
              )}
            >
              <ScanLine size={16} />
              Auto Scan
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('manual')}
              className={clsx(
                'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition',
                scanMode === 'manual'
                  ? 'bg-dark-green text-white shadow-sm'
                  : 'text-text-grey hover:bg-white'
              )}
            >
              <Keyboard size={16} />
              Manual
            </button>
          </div>

          {scanMode === 'auto' ? (
            <div className="rounded-lg border border-primary-dark-grey bg-black overflow-hidden">
              <div id={regionId} className="w-full min-h-[260px]" />
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3 rounded-xl border border-primary-dark-grey bg-primary-grey p-4">
              <label htmlFor={`${regionId}-manual`} className="block text-sm font-semibold text-heading-text-black">
                Enter barcode manually
              </label>
              <input
                id={`${regionId}-manual`}
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                autoFocus
                className="h-12 w-full rounded-xl border border-primary-dark-grey bg-white px-4 text-base font-semibold text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
                placeholder="Type or paste barcode"
              />
              <button
                type="submit"
                disabled={!manualValue.trim()}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-button-yellow px-4 text-sm font-bold text-button-text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Use This Barcode
              </button>
            </form>
          )}

          {starting && scanMode === 'auto' && (
            <div className="text-sm text-text-grey font-medium">
              Starting camera...
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-100 text-red-800 text-sm">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
