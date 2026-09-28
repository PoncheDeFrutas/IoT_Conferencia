import { useEffect, useRef, useState } from 'react'
import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import { mergeReadings, parseHistory, parseTelemetry, prepareMessage } from './telemetry'
import type { Reading } from './telemetry'

const MQTT_URL = import.meta.env.VITE_MQTT_URL || 'wss://broker.emqx.io:8084/mqtt'
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://diligence-riptide-snowsuit.ngrok-free.dev').replace(/\/$/, '')
const TELEMETRY_TOPIC = 'ARQUI1B_2026/telemetry'
const COMMAND_TOPIC = 'ARQUI1B_2026/commands'

export function useTelemetry() {
  const client = useRef<MqttClient | null>(null)
  const [readings, setReadings] = useState<Reading[]>([])
  const [mqttStatus, setMqttStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    const connection = mqtt.connect(MQTT_URL, { reconnectPeriod: 2000, connectTimeout: 10_000, clean: true, resubscribe: false })
    client.current = connection
    connection.on('connect', () => {
      connection.subscribe(TELEMETRY_TOPIC, { qos: 0 }, (error) => {
        if (active) setMqttStatus(error ? 'disconnected' : 'connected')
      })
    })
    connection.on('reconnect', () => { if (active) setMqttStatus('connecting') })
    connection.on('close', () => { if (active) setMqttStatus('disconnected') })
    connection.on('error', () => { if (active) setMqttStatus('disconnected') })
    connection.on('message', (topic, payload, packet) => {
      if (!active || topic !== TELEMETRY_TOPIC || packet.retain) return
      const reading = parseTelemetry(payload.toString(), Date.now())
      if (reading) setReadings((previous) => mergeReadings(previous, [reading]))
    })
    return () => {
      active = false
      client.current = null
      connection.end(true)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      controller.abort()
      setApiStatus('error')
    }, 10_000)
    async function loadHistory() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/temperature/latest?limit=100`, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const history = parseHistory(await response.json())
        setReadings((previous) => mergeReadings(previous, history))
        setApiStatus('ready')
      } catch {
        if (!controller.signal.aborted) setApiStatus('error')
      } finally {
        window.clearTimeout(timeout)
      }
    }
    void loadHistory()
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  async function publishMessage(message: string) {
    const payload = prepareMessage(message)
    const connection = client.current
    if (!connection?.connected || mqttStatus !== 'connected') throw new Error('MQTT sin conexión.')
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('El broker no respondió.')), 8000)
      connection.publish(COMMAND_TOPIC, payload, { qos: 1, retain: false }, (error) => {
        window.clearTimeout(timeout)
        if (error) reject(error)
        else resolve()
      })
    })
  }

  return { readings, mqttStatus, apiStatus, now, publishMessage }
}
