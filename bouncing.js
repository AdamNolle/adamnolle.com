//js logo variables
let jsx;
let jsy;
let jsxspeed;
let jsyspeed;
let js;

//cpp logo variables
let cppx;
let cppy;
let cppxspeed;
let cppyspeed;
let cpp;

//html logo variables
let htmlx;
let htmly;
let htmlxspeed;
let htmlyspeed;
let html;

//css logo variables
let cssx;
let cssy;
let cssxspeed;
let cssyspeed;
let css;

//linux logo (tux)
let tuxx;
let tuxy;
let tuxxspeed;
let tuxyspeed;
let tux;

//3d printing logo 
let printingx;
let printingy;
let printingxspeed;
let printingyspeed;
let printing;

//profile picture
let pfpx;
let pfpy;
let pfp;

function preload(){
  js = loadImage('/media/js.png');
  cpp = loadImage('/media/cpp.png');
  html = loadImage('/media/html.png');
  css = loadImage('/media/css.png');
  tux = loadImage('/media/tux.png');
  printing = loadImage('/media/printing.png');
  pfp = loadImage('/media/adam.png')
}

function setup(){
  //js logo
  createCanvas(windowWidth, windowHeight);
  jsx = random(width);
  jsy = random(height);
  jsxspeed = 5;
  jsyspeed = 5;

  //cpp logo
  cppx = random(width);
  cppy = random(height);
  cppxspeed = 5;
  cppyspeed = 5;

  //html logo
  htmlx = random(width);
  htmly = random(height);
  htmlxspeed = 5;
  htmlyspeed = 5;

  //css logo
  cssx = random(width);
  cssy = random(height);
  cssxspeed = 5;
  cssyspeed = 5;
  
  //linux logo (tux)
  tuxx = random(width);
  tuxy = random(height);
  tuxxspeed = 5;
  tuxyspeed = 5;

  //3d printing logo
  printingx = random(width);
  printingy = random(height);
  printingxspeed = 5;
  printingyspeed = 5;

  //profile picture
  pfpx = (width*0.5) - pfp.width/2;
  pfpy = (height*0.5) - pfp.height/2;
}

function draw() {
  background(9, 5, 34);

  //js logo
  image(js, jsx, jsy)

  jsx = jsx + jsxspeed;
  jsy = jsy + jsyspeed;

  if (jsx + js.width >= width) 
  {
    jsxspeed = -jsxspeed;
    jsx = width - js.width;
  } 
  else if (jsx <= 0) {
    jsxspeed = -jsxspeed;
    jsx = 0;
  }

  if (jsy + js.height >= height) 
  {
    jsyspeed = -jsyspeed;
    jsy = height - js.height;
  } 
  else if (jsy <= 0)
  {
    jsyspeed = -jsyspeed;
    jsy = 0;
  }

  //cpp logo
  image(cpp, cppx, cppy)
  cppx = cppx + cppxspeed;
  cppy = cppy + cppyspeed;

  if (cppx + cpp.width >= width) 
  {
    cppxspeed = -cppxspeed;
    cppx = width - cpp.width;
  } 
  else if (cppx <= 0) {
    cppxspeed = -cppxspeed;
    cppx = 0;
  }

  if (cppy + cpp.height >= height) 
  {
    cppyspeed = -cppyspeed;
    cppy = height - cpp.height;
  } 
  else if (cppy <= 0)
  {
    cppyspeed = -cppyspeed;
    cppy = 0;
  }

  //html logo
  image(html, htmlx, htmly)
  htmlx = htmlx + htmlxspeed;
  htmly = htmly + htmlyspeed;

  if (htmlx + html.width >= width) 
  {
    htmlxspeed = -htmlxspeed;
    htmlx = width - html.width;
  } 
  else if (htmlx <= 0) {
    htmlxspeed = -htmlxspeed;
    htmlx = 0;
  }

  if (htmly + html.height >= height) 
  {
    htmlyspeed = -htmlyspeed;
    htmly = height - html.height;
  } 
  else if (htmly <= 0)
  {
    htmlyspeed = -htmlyspeed;
    htmly = 0;
  }

  //css logo
  image(css, cssx, cssy)
  cssx = cssx + cssxspeed;
  cssy = cssy + cssyspeed;

  if (cssx + css.width >= width) 
  {
    cssxspeed = -cssxspeed;
    cssx = width - css.width;
  } 
  else if (cssx <= 0) {
    cssxspeed = -cssxspeed;
    cssx = 0;
  }

  if (cssy + css.height >= height) 
  {
    cssyspeed = -cssyspeed;
    cssy = height - css.height;
  } 
  else if (cssy <= 0)
  {
    cssyspeed = -cssyspeed;
    cssy = 0;
  }

  //linux logo (tux)
  image(tux, tuxx, tuxy)
  tuxx = tuxx + tuxxspeed;
  tuxy = tuxy + tuxyspeed;

  if (tuxx + tux.width >= width) 
  {
    tuxxspeed = -tuxxspeed;
    tuxx = width - tux.width;
  } 
  else if (tuxx <= 0) {
    tuxxspeed = -tuxxspeed;
    tuxx = 0;
  }

  if (tuxy + tux.height >= height) 
  {
    tuxyspeed = -tuxyspeed;
    tuxy = height - tux.height;
  } 
  else if (tuxy <= 0)
  {
    tuxyspeed = -tuxyspeed;
    tuxy = 0;
  }

  //3d printing logo
  image(printing, printingx, printingy)
  printingx = printingx + printingxspeed;
  printingy = printingy + printingyspeed;

  if (printingx + printing.width >= width) 
  {
    printingxspeed = -printingxspeed;
    printingx = width - printing.width;
  } 
  else if (printingx <= 0) {
    printingxspeed = -printingxspeed;
    printingx = 0;
  }

  if (printingy + printing.height >= height) 
  {
    printingyspeed = -printingyspeed;
    printingy = height - printing.height;
  } 
  else if (printingy <= 0)
  {
    printingyspeed = -printingyspeed;
    printingy = 0;
  }

  //profile picture
  image(pfp, pfpx, pfpy)

}