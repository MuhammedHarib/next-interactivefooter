This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


html(<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Interactive ASCII Footer Hover | Codegrid</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <footer>
      <canvas></canvas>
      <img src="/logo.png" />
    </footer>

    <script type="module" src="/script.js"></script>
  </body>
</html>) css(* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

footer {
  position: relative;
  width: 100%;
  height: 100svh;
  background-color: #0f0f0f;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

footer img {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  object-fit: contain;
  visibility: hidden;
}

@media (max-width: 1000px) {
  canvas {
    display: none;
  }

  footer img {
    visibility: visible;
  }
}) js(const CELL_SIZE = 8;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const ASCII_COLOR = "#dadada";
const ASCII_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BRIGHTNESS_THRESHOLD = 0.5;
const ASCII_MIN_WIDTH = 1000;
const HOVER_RADIUS = 10;
const HOVER_PUSH = 7;
const HOVER_EASE = 0.1;
const SCATTER_RANGE = 20;
const SCATTER_EASE = 0.075;
const GRAVITY = 0.05;
const BOUNCE = 0.25;
const RESET_EASE = 0.05;
const STAGGER_FRAMES = 18;

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const logo = document.querySelector("footer img");
const pixelRatio = window.devicePixelRatio || 1;

let phase = "logo";
const cursor = { col: -999, row: -999 };
let gridCols, gridRows, asciiCells;

function randomAsciiChar() {
  return ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
}

function buildAsciiFromLogo() {
  if (window.innerWidth < ASCII_MIN_WIDTH) {
    asciiCells = [];
    return;
  }

  gridCols = Math.floor(window.innerWidth / CELL_STEP);
  gridRows = Math.floor(window.innerHeight / CELL_STEP);
  canvas.width = window.innerWidth * pixelRatio;
  canvas.height = window.innerHeight * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const logoRect = logo.getBoundingClientRect();
  const sampler = document.createElement("canvas");
  sampler.width = gridCols;
  sampler.height = gridRows;
  const samplerContext = sampler.getContext("2d");
  samplerContext.drawImage(
    logo,
    logoRect.left / CELL_STEP,
    logoRect.top / CELL_STEP,
    logoRect.width / CELL_STEP,
    logoRect.height / CELL_STEP,
  );
  const { data } = samplerContext.getImageData(0, 0, gridCols, gridRows);

  const litCells = new Set();
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const pixel = (row * gridCols + col) * 4;
      const alpha = data[pixel + 3] / 255;
      const brightness =
        ((data[pixel] * 0.299 +
          data[pixel + 1] * 0.587 +
          data[pixel + 2] * 0.114) /
          255) *
        alpha;

      if (brightness > BRIGHTNESS_THRESHOLD) {
        litCells.add(`${col},${row}`);
        litCells.add(`${col + 1},${row}`);
      }
    }
  }

  asciiCells = [];
  for (const key of litCells) {
    const [col, row] = key.split(",").map(Number);
    asciiCells.push({
      col,
      row,
      char: randomAsciiChar(),
      offsetX: 0,
      offsetY: 0,
      fallSpeed: 0,
      wait: 0,
      scatterX: (Math.random() - 0.5) * SCATTER_RANGE,
      scatterY: (Math.random() - 0.5) * SCATTER_RANGE,
    });
  }
}

function easeToward(cell, targetX, targetY, ease) {
  cell.offsetX += (targetX - cell.offsetX) * ease;
  cell.offsetY += (targetY - cell.offsetY) * ease;
}

function staggerCells() {
  for (const cell of asciiCells) {
    cell.wait = Math.floor(Math.random() * STAGGER_FRAMES);
  }
}

function updateAsciiCells() {
  let everyoneHome = phase === "returning";

  for (const cell of asciiCells) {
    if (cell.wait > 0) {
      cell.wait--;
      everyoneHome = false;
      continue;
    }

    if (phase === "scattered") {
      easeToward(cell, cell.scatterX, cell.scatterY, SCATTER_EASE);
    } else if (phase === "fallen") {
      const floorOffset = gridRows - 1 - cell.row;
      cell.fallSpeed += GRAVITY;
      cell.offsetY += cell.fallSpeed;

      if (cell.offsetY > floorOffset) {
        cell.offsetY = floorOffset;
        cell.fallSpeed *= -BOUNCE;
      }
    } else if (phase === "returning") {
      easeToward(cell, 0, 0, RESET_EASE);
      if (Math.abs(cell.offsetX) > 0.05 || Math.abs(cell.offsetY) > 0.05) {
        everyoneHome = false;
      }
    } else {
      let targetX = 0;
      let targetY = 0;
      const distX = cell.col - cursor.col;
      const distY = cell.row - cursor.row;
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (distance < HOVER_RADIUS && distance > 0) {
        const push = (1 - distance / HOVER_RADIUS) * HOVER_PUSH;
        targetX = (distX / distance) * push;
        targetY = (distY / distance) * push;
      }
      easeToward(cell, targetX, targetY, HOVER_EASE);
    }
  }

  if (everyoneHome) phase = "logo";
}

function drawAscii() {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  context.font = `${CELL_SIZE + 2}px monospace`;
  context.textBaseline = "top";
  context.textAlign = "center";
  context.fillStyle = ASCII_COLOR;

  for (const { col, row, char, offsetX, offsetY } of asciiCells) {
    const x = (col + offsetX) * CELL_STEP + CELL_SIZE / 2;
    const y = (row + offsetY) * CELL_STEP;
    context.fillText(char, x, y);
  }
}

function renderLoop() {
  if (asciiCells.length > 0) {
    updateAsciiCells();
    drawAscii();
  }
  requestAnimationFrame(renderLoop);
}

window.addEventListener("mousemove", (event) => {
  cursor.col = event.clientX / CELL_STEP;
  cursor.row = event.clientY / CELL_STEP;
});

window.addEventListener("click", () => {
  if (asciiCells.length === 0) return;

  if (phase === "logo") {
    phase = "scattered";
    staggerCells();
  } else if (phase === "scattered") {
    phase = "fallen";
    for (const cell of asciiCells) cell.fallSpeed = 0;
  } else if (phase === "fallen") {
    phase = "returning";
    staggerCells();
  }
});(logo.addEventListener("load", buildAsciiFromLogo);
window.addEventListener("resize", buildAsciiFromLogo);
if (logo.complete) buildAsciiFromLogo();

renderLoop();))
