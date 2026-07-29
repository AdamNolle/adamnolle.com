/**
 * Conservative CSS minifier.
 *
 * Vite 8 no longer ships esbuild, and the stylesheet is inlined into <head>
 * rather than emitted as an asset, so it never goes through Vite's CSS
 * pipeline. Rather than add a dependency for a ~16 kB file, this strips the
 * parts that are unambiguously safe to strip:
 *
 *   - comments
 *   - runs of whitespace, collapsed to one space
 *   - whitespace around `{`, `}`, `;` and `,`
 *   - the final `;` before a `}`
 *
 * It deliberately leaves spaces around operators alone, because `calc()` needs
 * them: `calc(-1 * clamp(20px,3vw,32px) - 10px)` breaks if the space before
 * `- 10px` is dropped. Quoted strings and url() are passed through untouched.
 */
export function minifyCss(css) {
  let out = ''
  let i = 0

  while (i < css.length) {
    const c = css[i]

    // Pass strings through verbatim.
    if (c === '"' || c === "'") {
      const quote = c
      let j = i + 1
      while (j < css.length && (css[j] !== quote || css[j - 1] === '\\')) j++
      out += css.slice(i, Math.min(j + 1, css.length))
      i = j + 1
      continue
    }

    // url(...) may contain unquoted characters that must survive intact.
    if (c === 'u' && css.startsWith('url(', i)) {
      const end = css.indexOf(')', i)
      if (end !== -1) {
        out += css.slice(i, end + 1)
        i = end + 1
        continue
      }
    }

    // Comments.
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      i = end === -1 ? css.length : end + 2
      continue
    }

    // Collapse whitespace.
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') {
      let j = i
      while (j < css.length && /\s/.test(css[j])) j++
      const prev = out[out.length - 1]
      const next = css[j]
      // Drop entirely when it sits against structural punctuation.
      if (
        prev === undefined ||
        '{};,:'.includes(prev) ||
        (next !== undefined && '{};,'.includes(next))
      ) {
        i = j
        continue
      }
      out += ' '
      i = j
      continue
    }

    if (c === '}') {
      // Trailing semicolon before a closing brace is redundant.
      while (out.endsWith(';') || out.endsWith(' ')) out = out.slice(0, -1)
    }

    out += c
    i++
  }

  return out.trim()
}

if (import.meta.filename === process.argv[1]) {
  // Self-check: the calc() rule below is the one an over-eager minifier breaks.
  const sample = `
    /* comment */
    .tl__marker {
      left: calc(-1 * clamp(20px, 3vw, 32px) - 10px);
      font-family: 'Courier New', Courier, monospace;
      transition: opacity 0.55s ease, transform 0.55s cubic-bezier(0.2, 0.7, 0.3, 1);
    }
  `
  const min = minifyCss(sample)
  console.log(min)
  const ok =
    min.includes('calc(-1 * clamp(20px,3vw,32px) - 10px)') &&
    min.includes("'Courier New'") &&
    !min.includes('/*')
  console.log(ok ? 'self-check OK' : 'SELF-CHECK FAILED')
  process.exit(ok ? 0 : 1)
}
