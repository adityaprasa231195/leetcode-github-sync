/**
 * Generates PNG icon files for the extension using only Node.js built-ins.
 *
 * PNG encoding: we build each PNG from scratch using zlib deflate and the
 * PNG chunk structure. No external dependencies required.
 *
 * Sizes produced: 16, 32, 48, 64, 128 px (all square)
 * Output: assets/icon{size}.png
 *
 * Run: node scripts/generate-icons.js
 */

"use strict"

const fs = require("fs")
const path = require("path")
const zlib = require("zlib")

const SIZES = [16, 32, 48, 64, 128]
const ASSETS_DIR = path.join(__dirname, "..", "assets")

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true })

// ---------------------------------------------------------------------------
// Minimal PNG encoder (no dependencies)
// ---------------------------------------------------------------------------

/** CRC32 lookup table */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function u32be(n) {
  return Buffer.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff])
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii")
  const len = u32be(data.length)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcVal = u32be(crc32(crcInput))
  return Buffer.concat([len, typeBytes, data, crcVal])
}

/**
 * Encodes a flat RGBA pixel array (Uint8Array, width*height*4 bytes) into a
 * valid PNG file buffer.
 */
function encodePNG(width, height, rgba) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdrData = Buffer.concat([
    u32be(width),
    u32be(height),
    Buffer.from([8, 2, 0, 0, 0]) // bit depth=8, color type=2 (RGB), compress=0, filter=0, interlace=0
  ])

  // Build raw scanlines (filter byte 0 + RGB pixels per row)
  const rowBytes = width * 3
  const rawData = Buffer.alloc((rowBytes + 1) * height)
  for (let y = 0; y < height; y++) {
    rawData[y * (rowBytes + 1)] = 0 // filter type: None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = y * (rowBytes + 1) + 1 + x * 3
      rawData[dst] = rgba[src]     // R
      rawData[dst + 1] = rgba[src + 1] // G
      rawData[dst + 2] = rgba[src + 2] // B
      // alpha ignored (we pre-mix onto white background)
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 6 })

  const ihdr = pngChunk("IHDR", ihdrData)
  const idat = pngChunk("IDAT", compressed)
  const iend = pngChunk("IEND", Buffer.alloc(0))

  return Buffer.concat([sig, ihdr, idat, iend])
}

// ---------------------------------------------------------------------------
// Icon renderer — black background, white "LC" text
// ---------------------------------------------------------------------------

/**
 * Draws a simple black-square icon with white "LC" text into a flat RGBA
 * Uint8Array, without any canvas API.
 */
function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4)

  // Fill entire icon with black (0,0,0,255)
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = 0      // R
    pixels[i * 4 + 1] = 0  // G
    pixels[i * 4 + 2] = 0  // B
    pixels[i * 4 + 3] = 255 // A
  }

  // Draw a white rounded-ish region: just draw a centred white rounded rect
  // For simplicity at small sizes: filled white circle/rounded square
  const margin = Math.floor(size * 0.1)
  const r = Math.floor(size * 0.15) // corner radius (approximated)

  for (let y = margin; y < size - margin; y++) {
    for (let x = margin; x < size - margin; x++) {
      // Crude rounded corner check
      const dx = Math.min(x - margin, size - margin - 1 - x)
      const dy = Math.min(y - margin, size - margin - 1 - y)
      if (dx < r && dy < r) {
        const dist = Math.sqrt((r - dx) ** 2 + (r - dy) ** 2)
        if (dist > r) continue
      }
      pixels[(y * size + x) * 4] = 255
      pixels[(y * size + x) * 4 + 1] = 255
      pixels[(y * size + x) * 4 + 2] = 255
    }
  }

  // Draw black "LC" text on top of the white region using a simple bitmap font
  drawText(pixels, size, "LC", 0, 0, 0)

  return pixels
}

/**
 * Draws ASCII text centered on the icon using a minimal 5×7 bitmap font.
 * Only needs L and C — enough for our icon.
 */
const GLYPHS = {
  L: [
    0b10000,
    0b10000,
    0b10000,
    0b10000,
    0b10000,
    0b10000,
    0b11111
  ],
  C: [
    0b01110,
    0b10001,
    0b10000,
    0b10000,
    0b10000,
    0b10001,
    0b01110
  ]
}

const GLYPH_W = 5
const GLYPH_H = 7
const GAP = 1

function drawText(pixels, size, text, r, g, b) {
  const chars = text.split("")
  const totalW = chars.length * GLYPH_W + (chars.length - 1) * GAP
  const startX = Math.floor((size - totalW) / 2)
  const startY = Math.floor((size - GLYPH_H) / 2)
  const scale = Math.max(1, Math.floor(size / 32))

  let cx = startX
  for (const ch of chars) {
    const glyph = GLYPHS[ch]
    if (!glyph) { cx += (GLYPH_W + GAP) * scale; continue }
    for (let row = 0; row < GLYPH_H; row++) {
      for (let col = 0; col < GLYPH_W; col++) {
        const bit = (glyph[row] >> (GLYPH_W - 1 - col)) & 1
        if (!bit) continue
        // Draw scaled pixel block
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = cx + col * scale + sx
            const py = startY + row * scale + sy
            if (px < 0 || px >= size || py < 0 || py >= size) continue
            const idx = (py * size + px) * 4
            pixels[idx] = r
            pixels[idx + 1] = g
            pixels[idx + 2] = b
            pixels[idx + 3] = 255
          }
        }
      }
    }
    cx += (GLYPH_W + GAP) * scale
  }
}

// ---------------------------------------------------------------------------
// Generate all sizes
// ---------------------------------------------------------------------------

for (const size of SIZES) {
  const rgba = renderIcon(size)
  const png = encodePNG(size, size, rgba)
  const outPath = path.join(ASSETS_DIR, `icon${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`  ✓ assets/icon${size}.png  (${png.length} bytes)`)
}

// Plasmo uses assets/icon.png as its source for auto-resizing
const icon128 = path.join(ASSETS_DIR, "icon128.png")
const iconSrc = path.join(ASSETS_DIR, "icon.png")
fs.copyFileSync(icon128, iconSrc)
console.log("  ✓ assets/icon.png  (Plasmo source icon)")

console.log("Icons generated successfully.")
