/*
 * The original adamnolle.com screensaver: tech logos bouncing around a photo.
 * Same behaviour as the 2022 sketch (5px/frame, reflect off the edges, photo
 * pinned to the middle) with three changes:
 *
 *   1. The six copy-pasted logo blocks are one loop over window.__CLASSIC__,
 *      so the images come from content/site.json like everything else.
 *   2. Resizing calls p5's windowResized() instead of location.reload(), which
 *      used to re-download p5 and Bulma on every resize tick.
 *   3. prefers-reduced-motion draws a single frame and stops.
 *
 * Kept in global mode as a plain script because p5 looks for preload/setup/draw
 * on window.
 *
 * Original credit, as in the 2022 source:
 *   bouncing icons — The Coding Train, https://www.youtube.com/watch?v=0j86zuqqTlQ
 */

var CONFIG = window.__CLASSIC__ || {
  background: [9, 5, 34],
  speed: 5,
  logos: [],
  portrait: '/media/adam.png',
}

var sprites = []
var pfp
var pfpx
var pfpy

function preload() {
  sprites = CONFIG.logos.map(function (src) {
    return { img: loadImage(src), x: 0, y: 0, dx: CONFIG.speed, dy: CONFIG.speed }
  })
  pfp = loadImage(CONFIG.portrait)
}

function setup() {
  var c = createCanvas(windowWidth, windowHeight)
  // Decorative: the page carries a real heading and description for AT.
  c.elt.setAttribute('aria-hidden', 'true')

  sprites.forEach(function (s) {
    s.x = random(max(1, width - s.img.width))
    s.y = random(max(1, height - s.img.height))
  })
  centerPortrait()

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawScene()
    noLoop()
  }
}

function centerPortrait() {
  pfpx = width * 0.5 - pfp.width / 2
  pfpy = height * 0.5 - pfp.height / 2 - 24
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
  centerPortrait()
  // Pull anything now outside the smaller canvas back into view.
  sprites.forEach(function (s) {
    s.x = constrain(s.x, 0, max(0, width - s.img.width))
    s.y = constrain(s.y, 0, max(0, height - s.img.height))
  })
}

function step(s) {
  image(s.img, s.x, s.y)
  s.x += s.dx
  s.y += s.dy

  if (s.x + s.img.width >= width) {
    s.dx = -s.dx
    s.x = width - s.img.width
  } else if (s.x <= 0) {
    s.dx = -s.dx
    s.x = 0
  }

  if (s.y + s.img.height >= height) {
    s.dy = -s.dy
    s.y = height - s.img.height
  } else if (s.y <= 0) {
    s.dy = -s.dy
    s.y = 0
  }
}

function drawScene() {
  background(CONFIG.background[0], CONFIG.background[1], CONFIG.background[2])
  sprites.forEach(step)
  image(pfp, pfpx, pfpy)
}

function draw() {
  drawScene()
}
