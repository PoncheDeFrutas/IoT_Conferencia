import { useEffect, useState } from 'react'
import { MjpegParser } from './camera'
import { API_BASE_URL } from './useTelemetry'

export function CameraStream() {
  const [attempt, setAttempt] = useState(0)
  const [frameUrl, setFrameUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading')

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let currentUrl: string | null = null
    let timeout = 0
    const armTimeout = () => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => {
        controller.abort()
        if (active) setStatus('error')
      }, 10_000)
    }

    async function connect() {
      setFrameUrl(null)
      setStatus('loading')
      armTimeout()
      try {
        const response = await fetch(API_BASE_URL + '/camera', {
          headers: { 'ngrok-skip-browser-warning': 'true' },
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok || !response.body ||
            !response.headers.get('content-type')?.toLowerCase().startsWith('multipart/x-mixed-replace')) {
          throw new Error('La cámara no devolvió una transmisión MJPEG.')
        }

        const parser = new MjpegParser()
        const reader = response.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) throw new Error('La transmisión terminó.')
          for (const frame of parser.push(value)) {
            if (!active) return
            const nextUrl = URL.createObjectURL(new Blob([new Uint8Array(frame)], { type: 'image/jpeg' }))
            setFrameUrl(nextUrl)
            if (currentUrl) URL.revokeObjectURL(currentUrl)
            currentUrl = nextUrl
            setStatus('live')
            armTimeout()
          }
        }
      } catch {
        if (active && !controller.signal.aborted) setStatus('error')
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void connect()
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [attempt])

  return (
    <section className="camera-panel" aria-labelledby="camera-title">
      <div className="camera-heading">
        <div><p className="section-kicker">Raspberry Pi · cámara</p><h2 id="camera-title">ESP32 en directo</h2></div>
        <span className={'camera-status ' + (status === 'live' ? 'is-live' : '')} role="status">
          <span className="connection-dot" />{status === 'live' ? 'En vivo' : status === 'loading' ? 'Conectando' : 'Sin señal'}
        </span>
      </div>
      <div className="camera-viewport">
        {frameUrl && <img src={frameUrl} alt="Vista en directo del ESP32 desde la cámara de Raspberry Pi" />}
        {status !== 'live' && <div className="camera-overlay">
          <p>{status === 'loading' ? 'Conectando con la cámara…' : 'No se pudo mostrar la cámara. Revisa Flask y el túnel ngrok.'}</p>
          {status === 'error' && <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>}
        </div>}
      </div>
    </section>
  )
}
