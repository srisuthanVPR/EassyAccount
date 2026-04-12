// Simple PNG icon generator using pure Node.js (no canvas needed)
// Creates minimal valid PNG files with the app icon
const fs = require('fs')
const path = require('path')

// Create a simple colored square PNG using raw PNG format
function createSimplePNG(size, filename) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function crc32(buf) {
    let crc = 0xFFFFFFFF
    const table = []
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      table[i] = c
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type)
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const crcBuf = Buffer.concat([typeBytes, data])
    const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcBuf))
    return Buffer.concat([len, typeBytes, data, crcVal])
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Image data: blue background with white "E"
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = [0] // filter byte
    for (let x = 0; x < size; x++) {
      // Simple blue background
      const cx = x / size, cy = y / size
      // Draw letter E region (simplified)
      const inE = (cx > 0.25 && cx < 0.75 && cy > 0.2 && cy < 0.8) && (
        (cx < 0.38) || // vertical bar
        (cy > 0.2 && cy < 0.32) || // top bar
        (cy > 0.44 && cy < 0.56) || // middle bar
        (cy > 0.68 && cy < 0.8)  // bottom bar
      )
      if (inE) { row.push(255, 255, 255) } // white
      else { row.push(30, 64, 175) } // blue-800
    }
    rows.push(Buffer.from(row))
  }

  const zlib = require('zlib')
  const raw = Buffer.concat(rows)
  const compressed = zlib.deflateSync(raw)
  const idat = chunk('IDAT', compressed)
  const iend = chunk('IEND', Buffer.alloc(0))

  const png = Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend])
  fs.writeFileSync(filename, png)
  console.log('Created:', filename)
}

const dir = path.join(__dirname, 'public', 'icons')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
createSimplePNG(192, path.join(dir, 'icon-192.png'))
createSimplePNG(512, path.join(dir, 'icon-512.png'))
console.log('Icons generated!')
