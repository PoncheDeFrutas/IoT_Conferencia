export type Device = 'pi' | 'esp32'

export type Reading = {
  device: Device
  timestamp: number
  temperature: number
  humidity?: number
  rssi?: number
  source: 'api' | 'mqtt'
}

const number = '([+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+))'
const piPattern = new RegExp(`^RaspberryPi -Temperature: ${number}, Humidity: ${number}$`)
const espPattern = new RegExp(`^ESP32 -Temperature: ${number}, WiFi RSSI: (-?\\d+)$`)

export function parseTelemetry(payload: string, timestamp: number): Reading | null {
  if (payload.length > 256 || !Number.isFinite(timestamp)) return null
  const pi = piPattern.exec(payload.trim())
  if (pi) {
    const temperature = Number(pi[1])
    const humidity = Number(pi[2])
    return Number.isFinite(temperature) && humidity >= 0 && humidity <= 100
      ? { device: 'pi', timestamp, temperature, humidity, source: 'mqtt' }
      : null
  }
  const esp = espPattern.exec(payload.trim())
  if (esp) {
    const temperature = Number(esp[1])
    const rssi = Number(esp[2])
    return Number.isFinite(temperature) && rssi >= -120 && rssi <= 0
      ? { device: 'esp32', timestamp, temperature, rssi, source: 'mqtt' }
      : null
  }
  return null
}

export function parseHistory(value: unknown): Reading[] {
  if (!value || typeof value !== 'object' || !('data' in value) || !Array.isArray(value.data)) {
    throw new Error('La API no devolvió el historial esperado.')
  }
  return value.data.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return []
    const row = entry as Record<string, unknown>
    if (typeof row.temperature !== 'number' || !Number.isFinite(row.temperature) ||
        typeof row.timestamp !== 'number' || !Number.isFinite(row.timestamp) || row.timestamp <= 0) return []
    return [{ device: 'pi' as const, timestamp: row.timestamp * 1000,
      temperature: row.temperature, source: 'api' as const }]
  }).sort((a: Reading, b: Reading) => a.timestamp - b.timestamp)
}

export function mergeReadings(current: Reading[], incoming: Reading[]): Reading[] {
  // ponytail: 1.000 puntos en memoria; agregar muestras si se necesita una sesión más larga.
  return [...current, ...incoming].sort((a, b) => a.timestamp - b.timestamp).slice(-1000)
}

export function prepareMessage(value: string): string {
  const message = value.trim()
  if (!/^[\x20-\x7E]{1,40}$/.test(message)) {
    throw new Error('Usa de 1 a 40 caracteres básicos, sin tildes, ñ ni saltos de línea.')
  }
  return message
}
