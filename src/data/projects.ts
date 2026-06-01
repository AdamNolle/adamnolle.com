/**
 * The 9-disc project lineup. Shown two ways: as pinned cards on the PROJECTS
 * cork board (right wall) and as openable cases on the DISCS shelf (left wall).
 * Both read from this single table; the focus-trapped Dialog is the canonical
 * accessible reader.
 *
 * URLs were verified against github.com/AdamNolle before baking. Note: the
 * flagship "Web World Wide" links to the real public repo `terminal-eighty-blog`
 * (the planned `web-world-wide-online` name was never created). We link only the
 * public URL and never reproduce any secrets from its README.
 */
export interface ProjectLink {
  label: string
  url: string
}

/** Motif glyph drawn on the floating app tile (left "Apps" wall). */
export type IconMotif =
  | 'file'
  | 'house'
  | 'doc-lens'
  | 'cube'
  | 'shield'
  | 'grid'
  | 'crack'
  | 'globe'
  | 'metronome'

export interface Project {
  /** stable id used by the store's open dialog + raycast userData */
  id: string
  title: string
  /** short tech tag, e.g. "Rust" or "Swift · iOS" */
  stack: string
  /** one–two line canonical description */
  blurb: string
  /** accent colour for the disc spine / card pin */
  color: string
  /** app-tile motif drawn on the Apps wall */
  icon: IconMotif
  /**
   * Real logo bitmap served from /public (e.g. '/media/logos/fileid.png').
   * When absent the Apps tile falls back to the procedural `icon` glyph.
   */
  logo?: string
  flagship?: boolean
  links: ProjectLink[]
}

export const PROJECTS: Project[] = [
  {
    id: 'fileid',
    title: 'FileID',
    stack: 'Rust',
    blurb:
      'An AI tool that reads a file’s actual contents to identify and tag it — no more folders full of mystery filenames.',
    color: '#e0843c',
    icon: 'file',
    logo: '/media/logos/fileid.png',
    links: [{ label: 'Source', url: 'https://github.com/AdamNolle/FileID' }],
  },
  {
    id: 'family-room',
    title: 'Family Room',
    stack: 'JavaScript',
    blurb:
      'A self-hosted home-media archive that gathers the photos and videos scattered across your devices into one shared family library.',
    color: '#4aa6c4',
    icon: 'house',
    links: [{ label: 'Source', url: 'https://github.com/AdamNolle/Family-Room' }],
  },
  {
    id: 'document-finder',
    title: 'Document Finder',
    stack: 'Rust',
    blurb:
      'Pulls as many PDF resources on a topic as it can find and compresses them into a single bundle you can hand to an AI for specialized context.',
    color: '#b5643c',
    icon: 'doc-lens',
    logo: '/media/logos/document-finder.png',
    links: [{ label: 'Source', url: 'https://github.com/AdamNolle/Document-Finder' }],
  },
  {
    id: '3dseen',
    title: '3DSeen',
    stack: 'Swift · iOS',
    blurb: 'A native iOS app that turns the iPhone’s built-in LiDAR sensor into a pocket 3D scanner.',
    color: '#6c8cff',
    icon: 'cube',
    links: [{ label: 'Source', url: 'https://github.com/AdamNolle/3DSeen' }],
  },
  {
    id: 'liveblock',
    title: 'LiveBlock',
    stack: 'Swift · ML',
    blurb:
      'Uses machine vision to detect brand logos in sports and live broadcasts and block them out of the picture in real time.',
    color: '#c44a6e',
    icon: 'shield',
    logo: '/media/logos/liveblock.png',
    links: [{ label: 'Source', url: 'https://github.com/AdamNolle/LiveBlock' }],
  },
  {
    id: 'block-suite',
    title: 'The Block Suite',
    stack: 'JS · Chrome',
    blurb:
      'A family of attention-defense browser extensions: catch YouTube and internet rabbit holes before they start, and block news or shopping sites on demand.',
    color: '#57b97f',
    icon: 'grid',
    logo: '/media/logos/block-suite.png',
    links: [
      { label: 'YouTube Rabbit-Hole Stopper', url: 'https://github.com/AdamNolle/YouTube-Rabbit-Hole-Stopper' },
      { label: 'Internet Rabbit-Hole Stopper', url: 'https://github.com/AdamNolle/Internet-Rabbit-Hole-Stopper' },
      { label: 'News-Block', url: 'https://github.com/AdamNolle/News-Block' },
      { label: 'Shopping-Block', url: 'https://github.com/AdamNolle/Shopping-Block' },
    ],
  },
  {
    id: 'deepbreak',
    title: 'DeepBreak',
    stack: 'Python · ML',
    blurb:
      'Adversarially “poisons” your photos so they can’t be used to train deepfakes of you. Built for the PickHacks 2024 hackathon.',
    color: '#8a6bff',
    icon: 'crack',
    logo: '/media/logos/deepbreak.png',
    links: [{ label: 'Source', url: 'https://github.com/AdamNolle/DeepBreak' }],
  },
  {
    id: 'web-world-wide',
    title: 'Web World Wide',
    stack: 'Astro · Node · Raspberry Pi',
    blurb:
      'The flagship: a $0/month, fully self-hosted blog stack running on a Raspberry Pi — replacing Ghost/WordPress with WebAuthn passkeys, a TipTap editor, Fediverse + Bluesky federation, privacy-first analytics, and Caddy behind a Cloudflare Tunnel.',
    color: '#00e1ff',
    icon: 'globe',
    flagship: true,
    links: [
      { label: 'Source', url: 'https://github.com/AdamNolle/terminal-eighty-blog' },
      { label: 'Visit the blog', url: 'https://terminaleighty.com' },
    ],
  },
  {
    id: 'tempotyper',
    title: 'TempoTyper',
    stack: 'Python',
    blurb: 'A keyboard rhythm game — type in tempo to the beat. Built as a Capstone I project.',
    color: '#ffb347',
    icon: 'metronome',
    links: [{ label: 'Source', url: 'https://github.com/AdamNolle/TempoTyper' }],
  },
]

export function getProject(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id)
}
