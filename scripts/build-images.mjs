import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const sourceDir = path.join(root, 'assets-src/nfts')
const outputDir = path.join(root, 'public/nfts')

export const WIDTHS = [320, 640, 960]

await mkdir(outputDir, { recursive: true })

const files = (await readdir(sourceDir)).filter((file) => file.endsWith('.png'))

for (const file of files) {
  const name = path.basename(file, '.png')
  const image = sharp(path.join(sourceDir, file))

  await Promise.all(
    WIDTHS.flatMap((width) => {
      const resized = image.clone().resize(width, width, { fit: 'cover' })
      return [
        resized.clone().avif({ quality: 55, effort: 6 }).toFile(path.join(outputDir, `${name}-${width}.avif`)),
        resized.clone().webp({ quality: 75 }).toFile(path.join(outputDir, `${name}-${width}.webp`)),
      ]
    }),
  )

  console.log(`${name}: ${WIDTHS.join(', ')}`)
}
