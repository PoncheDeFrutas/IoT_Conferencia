import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTelemetry } from './useTelemetry'
import { CameraStream } from './CameraStream'
import type { Reading } from './telemetry'
import './App.css'

const numberFormat = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 1 })
const timeFormat = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const dateTimeFormat = new Intl.DateTimeFormat('es-GT', { dateStyle: 'short', timeStyle: 'short' })

type Point = {
  timestamp: number
  piTemperature?: number
  espTemperature?: number
  humidity?: number
  rssi?: number
}
type Series = { key: keyof Omit<Point, 'timestamp'>; name: string; color: string }
type View = 'monitor' | 'control'

function viewFromHash(): View {
  return window.location.hash === '#control' ? 'control' : 'monitor'
}

function Chart({ title, unit, points, series, domain, start, now }: {
  title: string
  unit: string
  points: Point[]
  series: Series[]
  domain?: [number, number]
  start: number
  now: number
}) {
  const hasData = points.some((point) => series.some((line) => point[line.key] !== undefined))
  return (
    <section className="chart-panel" aria-label={title}>
      <div className="chart-heading"><h3>{title}</h3><span>{unit}</span></div>
      <div className="chart-area">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={points} margin={{ top: 12, right: 14, bottom: 2, left: -24 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="3 5" />
              <XAxis dataKey="timestamp" type="number" domain={[start, now]} allowDataOverflow
                tickFormatter={(value: number) => timeFormat.format(value)}
                tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={42} />
              <YAxis domain={domain ?? ['auto', 'auto']} tick={{ fill: 'var(--muted)', fontSize: 11 }}
                tickLine={false} axisLine={false} tickCount={4} />
              <Tooltip labelFormatter={(value) => timeFormat.format(Number(value))}
                formatter={(value, name) => [numberFormat.format(Number(value)) + ' ' + unit, name]}
                contentStyle={{ background: '#102b3d', border: '1px solid #3b596a', borderRadius: 8, color: '#ecf7f6' }}
                labelStyle={{ color: '#a9c5ce' }} />
              {series.map((line) => <Line key={line.key} type="monotone" dataKey={line.key}
                name={line.name} stroke={line.color} strokeWidth={2.5}
                dot={points.filter((point) => point[line.key] !== undefined).length === 1 ? { r: 3 } : false}
                activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />)}
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="chart-empty">Esperando lecturas para este intervalo</p>}
      </div>
      {series.length > 1 && <div className="legend">{series.map((line) =>
        <span key={line.key}><i style={{ background: line.color }} />{line.name}</span>)}</div>}
    </section>
  )
}

function Metric({ label, reading, value, unit, live }: {
  label: string
  reading?: Reading
  value?: number
  unit: string
  live: boolean
}) {
  return <div className="metric">
    <span className="metric-label">{label}</span>
    <strong>{value === undefined ? '—' : numberFormat.format(value)}<small>{unit}</small></strong>
    <span className="metric-foot">{reading ? (live ? 'En vivo' : reading.source === 'api' ? 'Histórico' : 'Última lectura') + ' · ' + (live ? timeFormat.format(reading.timestamp) : dateTimeFormat.format(reading.timestamp)) : 'Esperando datos'}</span>
  </div>
}

function App() {
  const { readings, mqttStatus, apiStatus, now, publishMessage } = useTelemetry()
  const [view, setView] = useState<View>(viewFromHash)
  const [minutes, setMinutes] = useState(5)
  const [sending, setSending] = useState(false)
  const [commandResult, setCommandResult] = useState('')
  const [message, setMessage] = useState('')
  const [messageResult, setMessageResult] = useState('')
  const start = now - minutes * 60_000
  const latestPi = [...readings].reverse().find((reading) => reading.device === 'pi')
  const latestEsp = [...readings].reverse().find((reading) => reading.device === 'esp32')
  const piLive = [...readings].reverse().find((reading) => reading.device === 'pi' && reading.source === 'mqtt')
  const espLive = [...readings].reverse().find((reading) => reading.device === 'esp32' && reading.source === 'mqtt')
  const piOnline = !!piLive && now - piLive.timestamp < 10_000
  const espOnline = !!espLive && now - espLive.timestamp < 10_000
  const displayPi = piOnline ? piLive : latestPi
  const points: Point[] = readings.filter((reading) => reading.timestamp >= start && reading.timestamp <= now).map((reading) => ({
    timestamp: reading.timestamp,
    ...(reading.device === 'pi'
      ? { piTemperature: reading.temperature, humidity: reading.humidity }
      : { espTemperature: reading.temperature, rssi: reading.rssi }),
  }))

  useEffect(() => {
    const updateView = () => setView(viewFromHash())
    window.addEventListener('hashchange', updateView)
    return () => window.removeEventListener('hashchange', updateView)
  }, [])

  async function command(value: 'ON' | 'OFF') {
    if (sending) return
    setSending(true)
    setCommandResult('')
    try {
      await publishMessage(value)
      setCommandResult('Comando ' + value + ' publicado.')
    } catch {
      setCommandResult('No se pudo publicar el comando. Revisa la conexión MQTT.')
    } finally {
      setSending(false)
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setMessageResult('')
    try {
      await publishMessage(message)
      setMessageResult('Texto publicado.')
      setMessage('')
    } catch (error) {
      setMessageResult(error instanceof Error ? error.message : 'No se pudo publicar el texto.')
    } finally {
      setSending(false)
    }
  }

  return <>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <header className="site-header">
      <div className="header-inner">
        <div className="brand"><span className="brand-icon" aria-hidden="true">∿</span><span>Estación <b>IoT</b></span></div>
        <nav className="view-nav" aria-label="Vistas">
          <a href="#monitor" aria-current={view === 'monitor' ? 'page' : undefined}>Monitoreo</a>
          <a href="#control" aria-current={view === 'control' ? 'page' : undefined}>Control ESP32</a>
        </nav>
        <div className={'connection ' + (mqttStatus === 'connected' ? 'is-connected' : '')} role="status">
          <span className="connection-dot" />MQTT {mqttStatus === 'connected' ? 'conectado' : mqttStatus === 'connecting' ? 'conectando' : 'sin conexión'}
        </div>
      </div>
    </header>

    <main id="main" className="page-shell">
      <div className="intro">
        <div>
          <p className="intro-kicker">{view === 'monitor' ? 'Conferencia · ESP32 + Raspberry Pi' : 'Demostración en vivo · ESP32'}</p>
          <h1>{view === 'monitor' ? 'El pulso de los dispositivos.' : 'Controla y observa el ESP32.'}</h1>
          <p className="intro-copy">{view === 'monitor'
            ? 'Lecturas del sensor DHT11 y del ESP32, transmitidas por MQTT. La temperatura de Raspberry Pi también se recupera desde MongoDB.'
            : 'Enciende el LED o escribe en la OLED mientras ves el dispositivo por la cámara de Raspberry Pi.'}</p>
        </div>
        <div className="live-stamp"><span className="stamp-wave">⌁</span><span>Datos en vivo<br /><b>Actualización continua</b></span></div>
      </div>

      {view === 'monitor' ? <div className="monitor-view">
        <div className="monitor">
          <section className="summary-panel" aria-label="Lecturas actuales">
            <div className="section-heading">
              <div><p className="section-kicker">Monitor ambiental</p><h2>Lecturas actuales</h2></div>
              <span className="section-note">{timeFormat.format(now)}</span>
            </div>
            <div className="device-row"><span className={'device-dot ' + (piOnline ? 'active' : '')} />Raspberry Pi · DHT11 <b>{piOnline ? 'Recibiendo' : 'Sin lectura reciente'}</b></div>
            <div className="metric-grid">
              <Metric label="Temperatura ambiente" reading={displayPi} value={displayPi?.temperature} unit="°C" live={piOnline} />
              <Metric label="Humedad relativa" reading={piLive} value={piLive?.humidity} unit="%" live={piOnline} />
            </div>
            <div className="device-row esp"><span className={'device-dot ' + (espOnline ? 'active' : '')} />ESP32 · sensor interno <b>{espOnline ? 'Recibiendo' : 'Sin lectura reciente'}</b></div>
            <div className="metric-grid">
              <Metric label="Temperatura interna" reading={latestEsp} value={latestEsp?.temperature} unit="°C" live={espOnline} />
              <Metric label="Señal Wi‑Fi" reading={latestEsp} value={latestEsp?.rssi} unit="dBm" live={espOnline} />
            </div>
          </section>

          <section className="charts-section" aria-labelledby="charts-title">
            <div className="section-heading chart-section-heading">
              <div><p className="section-kicker">Evolución</p><h2 id="charts-title">Gráficas en tiempo real</h2></div>
              <div className="period-control" role="group" aria-label="Intervalo de las gráficas">
                {[1, 5, 15].map((value) => <button key={value} type="button" aria-pressed={minutes === value}
                  onClick={() => setMinutes(value)}>{value} min</button>)}
              </div>
            </div>
            <Chart title="Temperatura" unit="°C" points={points} start={start} now={now} series={[
              { key: 'piTemperature', name: 'Raspberry Pi', color: '#63d5cd' },
              { key: 'espTemperature', name: 'ESP32', color: '#ffbf75' },
            ]} />
            <div className="small-charts">
              <Chart title="Humedad relativa" unit="%" points={points} start={start} now={now} domain={[0, 100]}
                series={[{ key: 'humidity', name: 'Raspberry Pi', color: '#63d5cd' }]} />
              <Chart title="Señal Wi‑Fi" unit="dBm" points={points} start={start} now={now} domain={[-100, 0]}
                series={[{ key: 'rssi', name: 'ESP32', color: '#ffbf75' }]} />
            </div>
            <p className="data-note" role="status">{apiStatus === 'loading' ? 'Cargando historial de Raspberry Pi…' :
              apiStatus === 'error' ? 'Historial REST no disponible. Revisa el túnel ngrok y recarga la página; MQTT puede continuar en vivo.' :
                'Historial de temperatura de Raspberry Pi cargado desde la API.'}</p>
          </section>
        </div>
      </div> : <div className="control-view">
        <CameraStream />
        <section className="command-panel">
          <p className="section-kicker">Canal de comandos</p>
          <h2>Controla el ESP32</h2>
          <p>Enciende o apaga el LED conectado al pin 19.</p>
          <div className="command-buttons">
            <button type="button" className="command-on" onClick={() => void command('ON')}
              disabled={mqttStatus !== 'connected' || sending}>Encender LED <span aria-hidden="true">↗</span></button>
            <button type="button" className="command-off" onClick={() => void command('OFF')}
              disabled={mqttStatus !== 'connected' || sending}>Apagar LED <span aria-hidden="true">↗</span></button>
          </div>
          <p className="command-feedback" role="status">{commandResult || (mqttStatus !== 'connected' ? 'MQTT sin conexión.' : '')}</p>
        </section>
        <section className="text-panel">
          <p className="section-kicker">Mensaje para pantalla</p>
          <h2>Escribe en la OLED</h2>
          <form onSubmit={(event) => void submitMessage(event)}>
            <label htmlFor="oled-message">Texto (máx. 40 caracteres, sin tildes ni ñ)</label>
            <input id="oled-message" type="text" maxLength={40} value={message}
              onChange={(event) => setMessage(event.target.value)} placeholder="Hola desde la conferencia" />
            <button type="submit" className="send-text"
              disabled={mqttStatus !== 'connected' || sending || !message.trim()}>Enviar texto <span aria-hidden="true">↗</span></button>
          </form>
          <p className="message-feedback" role="status">{messageResult || (mqttStatus !== 'connected' ? 'MQTT sin conexión.' : '')}</p>
        </section>
      </div>}
      <footer>Proyecto IoT · ESP32 / Raspberry Pi / MQTT / Flask</footer>
    </main>
  </>
}

export default App
