import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeReadings, parseHistory, parseTelemetry, prepareMessage } from '../src/telemetry.ts'

test('interpreta ambos dispositivos y el historial en segundos', () => {
  const pi = parseTelemetry('RaspberryPi -Temperature: 24, Humidity: 61', 2_000)
  const esp = parseTelemetry('ESP32 -Temperature: 31.2, WiFi RSSI: -54', 3_000)
  assert.deepEqual(pi, { device: 'pi', timestamp: 2_000, temperature: 24, humidity: 61, source: 'mqtt' })
  assert.deepEqual(esp, { device: 'esp32', timestamp: 3_000, temperature: 31.2, rssi: -54, source: 'mqtt' })
  assert.equal(parseTelemetry('ON', 4_000), null)
  const history = parseHistory({ data: [{ temperature: 23, timestamp: 1 }] })
  assert.equal(history[0].timestamp, 1_000)
  assert.deepEqual(mergeReadings([esp], [...history, pi]).map((reading) => reading.timestamp), [1_000, 2_000, 3_000])
})

test('limita los mensajes a lo que puede mostrar la OLED', () => {
  assert.equal(prepareMessage('  Hola ESP32  '), 'Hola ESP32')
  assert.equal(prepareMessage('X'.repeat(40)).length, 40)
  assert.throws(() => prepareMessage(' '))
  assert.throws(() => prepareMessage('X'.repeat(41)))
  assert.throws(() => prepareMessage('Hola\nESP32'))
  assert.throws(() => prepareMessage('Señal'))
})
