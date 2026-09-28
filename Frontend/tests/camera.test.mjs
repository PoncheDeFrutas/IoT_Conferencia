import assert from 'node:assert/strict'
import test from 'node:test'
import { MjpegParser } from '../src/camera.ts'

test('recompone fotogramas MJPEG aunque lleguen en partes', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0, 0xff, 0xd9])
  const header = new TextEncoder().encode('--frame\r\nContent-Type: image/jpeg\r\nContent-Length: 5\r\n\r\n')
  const part = new Uint8Array([...header, ...jpeg, 13, 10])
  const stream = new Uint8Array([...part, ...part])
  const parser = new MjpegParser()
  const frames = []
  for (let i = 0; i < stream.length; i += 3) frames.push(...parser.push(stream.subarray(i, i + 3)))
  assert.equal(frames.length, 2)
  assert.deepEqual(frames[0], jpeg)
  assert.deepEqual(frames[1], jpeg)
})

test('rechaza tamaños de fotograma inválidos', () => {
  const parser = new MjpegParser()
  assert.throws(() => parser.push(new TextEncoder().encode('--frame\r\nContent-Type: image/jpeg\r\nContent-Length: 9000000\r\n\r\n')))
})
