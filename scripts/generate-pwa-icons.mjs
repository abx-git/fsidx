import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const src = path.join(root, 'public/favicon.svg')

const sizes = [192, 512]
for (const size of sizes) {
  const out = path.join(root, `public/pwa-${size}x${size}.png`)
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(out)
  console.log('wrote', out)
}