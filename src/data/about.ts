/**
 * Canonical "about" content for the BACK wall and its dialog. The 3D cards are
 * decorative renders of this same data; the dialog is the accessible reader.
 */
export interface Stat {
  label: string
  value: string
}

export interface About {
  heading: string
  /** Short lead shown on the cork-board bio note. */
  lead: string
  /** Full bio paragraphs for the dialog reader. */
  bio: string[]
  stats: Stat[]
}

export const ABOUT: About = {
  heading: 'About Adam',
  lead: 'Software engineer, homelabber, and near-daily writer as Terminal Eighty.',
  bio: [
    'I studied Computer Science and Computer Engineering at Missouri S&T with a math minor. As S&T ACM president I revived MegaMiner and helped renovate the CS lounge.',
    'These days I’m a software engineer at Accenture Federal Services. Off the clock I’m a homelabber and serial PC builder (six and counting), a 3D-printer tinkerer, and an unrepentant vinyl and CD hoarder.',
    'I’ve been making beats in FL Studio since ’23 and writing near-daily as Terminal Eighty.',
  ],
  stats: [
    { label: 'Homelabs', value: '1' },
    { label: 'PCs built', value: '6' },
    { label: 'Hackathons', value: '3' },
    { label: 'Vinyl', value: '∞' },
    { label: 'Posts', value: 'daily' },
  ],
}
