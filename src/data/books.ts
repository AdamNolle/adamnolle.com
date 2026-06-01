/**
 * The bookshelf's spines. This is a PLACEHOLDER set driving spine colours and
 * proportions until Adam pastes his real reading list; when he does, fill in
 * `title`/`author` and the shelf can render a few face-out with labels.
 *
 * `tall`/`thick` are relative multipliers (≈1 = average) for visual variety.
 */
export interface Book {
  color: string
  tall?: number
  thick?: number
  title?: string
  author?: string
}

export const BOOKS: Book[] = [
  { color: '#7c3a32', tall: 1.04, thick: 1.2 },
  { color: '#2f5a52', tall: 0.98, thick: 0.8 },
  { color: '#b5852f', tall: 1.06, thick: 1.0 },
  { color: '#39506e', tall: 0.94, thick: 1.3 },
  { color: '#9a3b46', tall: 1.0, thick: 0.7 },
  { color: '#3c6b3a', tall: 1.05, thick: 1.1 },
  { color: '#d6c4a0', tall: 0.9, thick: 0.9 },
  { color: '#444b54', tall: 1.02, thick: 1.0 },
  { color: '#7b5aa6', tall: 0.97, thick: 0.8 },
  { color: '#c06636', tall: 1.06, thick: 1.2 },
  { color: '#2d6f7a', tall: 0.95, thick: 0.9 },
  { color: '#8a8f3a', tall: 1.01, thick: 1.0 },
  { color: '#a23b5e', tall: 0.99, thick: 0.7 },
  { color: '#34577d', tall: 1.04, thick: 1.1 },
  { color: '#b59b54', tall: 0.92, thick: 0.9 },
  { color: '#55402f', tall: 1.05, thick: 1.3 },
  { color: '#3f7a63', tall: 0.96, thick: 0.8 },
  { color: '#86343a', tall: 1.0, thick: 1.0 },
  { color: '#5b6470', tall: 1.03, thick: 0.9 },
  { color: '#c98a3c', tall: 0.94, thick: 1.1 },
  { color: '#46506b', tall: 1.02, thick: 0.8 },
  { color: '#6b8f4e', tall: 0.98, thick: 1.0 },
]
