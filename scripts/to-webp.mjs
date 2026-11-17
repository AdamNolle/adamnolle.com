// Converts PNGs to WebP beside them and removes the PNG, for images the site
// shows at a fixed size (the project logos, the classic portrait). Lossy at
// q85 with lossless alpha: indistinguishable at display size, about 70%
// smaller. Needs `cwebp` (brew install webp); the originals stay in git.
//
//   npm run assets:webp -- public/media/logos/new-logo.png
import { execFileSync } from 'node:child_process'
import { statSync, unlinkSync } from 'node:fs'

const files = process.argv.slice(2).filter((f) => f.endsWith('.png'))
if (!files.length) {
  console.error('usage: npm run assets:webp -- path/to/image.png ...')
  process.exit(2)
}

for (const png of files) {
  const webp = png.replace(/\.png$/, '.webp')
  execFileSync('cwebp', ['-quiet', '-q', '85', '-alpha_q', '100', '-m', '6', '-metadata', 'none', png, '-o', webp])
  const before = statSync(png).size
  const after = statSync(webp).size
  unlinkSync(png)
  console.log(`${webp}  ${before} -> ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`)
}
