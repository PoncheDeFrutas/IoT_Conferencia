const separator = new Uint8Array([13, 10, 13, 10])
const maxFrameBytes = 8_000_000

function findSeparator(bytes: Uint8Array): number {
  for (let index = 0; index <= bytes.length - separator.length; index++) {
    if (separator.every((byte, offset) => bytes[index + offset] === byte)) return index
  }
  return -1
}

export class MjpegParser {
  private pending = new Uint8Array(0)

  push(chunk: Uint8Array): Uint8Array[] {
    const joined = new Uint8Array(this.pending.length + chunk.length)
    joined.set(this.pending)
    joined.set(chunk, this.pending.length)
    this.pending = joined

    const frames: Uint8Array[] = []
    while (this.pending.length) {
      const headerEnd = findSeparator(this.pending)
      if (headerEnd < 0) {
        if (this.pending.length > 1024) throw new Error('Cabecera MJPEG demasiado larga.')
        break
      }

      const header = new TextDecoder().decode(this.pending.subarray(0, headerEnd))
      const match = /^--frame\r\nContent-Type: image\/jpeg\r\nContent-Length: (\d+)$/i.exec(header)
      const length = Number(match?.[1])
      if (!match || !Number.isSafeInteger(length) || length < 4 || length > maxFrameBytes) {
        throw new Error('Fotograma MJPEG no válido.')
      }

      const start = headerEnd + separator.length
      const end = start + length
      if (this.pending.length < end + 2) break
      if (this.pending[start] !== 0xff || this.pending[start + 1] !== 0xd8 ||
          this.pending[end - 2] !== 0xff || this.pending[end - 1] !== 0xd9 ||
          this.pending[end] !== 13 || this.pending[end + 1] !== 10) {
        throw new Error('Fotograma JPEG incompleto.')
      }
      frames.push(this.pending.slice(start, end))
      this.pending = this.pending.slice(end + 2)
    }
    return frames
  }
}
