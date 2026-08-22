"use client";

import { useEffect, useRef } from "react";
import "./InteractiveFooter.css";

const CELL_SIZE = 8;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;

const ASCII_COLOR = "#dadada";
const ASCII_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

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

type Phase = "logo" | "scattered" | "fallen" | "returning";

type AsciiCell = {
  col: number;
  row: number;
  char: string;

  offsetX: number;
  offsetY: number;

  fallSpeed: number;
  wait: number;

  scatterX: number;
  scatterY: number;
};

export default function InteractiveFooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    /*
     * Get the actual DOM elements.
     *
     * The explicit type checks below make TypeScript
     * completely sure these elements cannot be null.
     */

    const canvasElement = canvasRef.current;
    const logoElement = logoRef.current;

    if (!(canvasElement instanceof HTMLCanvasElement)) {
      return;
    }

    if (!(logoElement instanceof HTMLImageElement)) {
      return;
    }

    const context = canvasElement.getContext("2d");

    if (!(context instanceof CanvasRenderingContext2D)) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;

    let phase: Phase = "logo";

    const cursor = {
      col: -999,
      row: -999,
    };

    let gridCols = 0;
    let gridRows = 0;

    let asciiCells: AsciiCell[] = [];

    let animationFrameId = 0;

    /*
     * -----------------------------------------
     * RANDOM ASCII CHARACTER
     * -----------------------------------------
     */

    function randomAsciiChar() {
      return ASCII_CHARS[
        Math.floor(Math.random() * ASCII_CHARS.length)
      ];
    }

    /*
     * -----------------------------------------
     * BUILD ASCII FROM LOGO
     * -----------------------------------------
     */

    function buildAsciiFromLogo() {
      /*
       * On smaller screens we don't use the canvas.
       */

      if (window.innerWidth < ASCII_MIN_WIDTH) {
        asciiCells = [];

        context.clearRect(
          0,
          0,
          window.innerWidth,
          window.innerHeight,
        );

        return;
      }

      gridCols = Math.floor(
        window.innerWidth / CELL_STEP,
      );

      gridRows = Math.floor(
        window.innerHeight / CELL_STEP,
      );

      /*
       * Set real canvas resolution for high-DPI screens.
       */

      canvasElement.width =
        window.innerWidth * pixelRatio;

      canvasElement.height =
        window.innerHeight * pixelRatio;

      canvasElement.style.width =
        `${window.innerWidth}px`;

      canvasElement.style.height =
        `${window.innerHeight}px`;

      context.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0,
      );

      /*
       * Get the position and size of the logo.
       */

      const logoRect =
        logoElement.getBoundingClientRect();

      /*
       * Create an invisible canvas that will
       * be used to sample the logo.
       */

      const sampler =
        document.createElement("canvas");

      sampler.width = gridCols;
      sampler.height = gridRows;

      const samplerContext =
        sampler.getContext("2d");

      if (
        !(samplerContext instanceof CanvasRenderingContext2D)
      ) {
        return;
      }

      /*
       * Draw the actual logo into the sampler.
       */

      samplerContext.clearRect(
        0,
        0,
        gridCols,
        gridRows,
      );

      samplerContext.drawImage(
        logoElement,
        logoRect.left / CELL_STEP,
        logoRect.top / CELL_STEP,
        logoRect.width / CELL_STEP,
        logoRect.height / CELL_STEP,
      );

      /*
       * Read all pixels from the sampler.
       */

      const imageData =
        samplerContext.getImageData(
          0,
          0,
          gridCols,
          gridRows,
        );

      const data = imageData.data;

      /*
       * Find all pixels belonging to the logo.
       *
       * IMPORTANT:
       * We use ALPHA instead of brightness.
       *
       * This means a BLACK logo on a transparent
       * background works correctly.
       */

      const litCells = new Set<string>();

      for (
        let row = 0;
        row < gridRows;
        row++
      ) {
        for (
          let col = 0;
          col < gridCols;
          col++
        ) {
          const pixel =
            (row * gridCols + col) * 4;

          const alpha =
            data[pixel + 3] / 255;

          /*
           * Any visible part of the image
           * becomes an ASCII cell.
           */

          if (alpha > 0.1) {
            litCells.add(`${col},${row}`);

            /*
             * Your original code also added
             * the cell to the right.
             */

            if (col + 1 < gridCols) {
              litCells.add(
                `${col + 1},${row}`,
              );
            }
          }
        }
      }

      /*
       * Create ASCII cells.
       */

      asciiCells = [];

      for (const key of litCells) {
        const [col, row] =
          key.split(",").map(Number);

        asciiCells.push({
          col,
          row,

          char: randomAsciiChar(),

          offsetX: 0,
          offsetY: 0,

          fallSpeed: 0,
          wait: 0,

          scatterX:
            (Math.random() - 0.5) *
            SCATTER_RANGE,

          scatterY:
            (Math.random() - 0.5) *
            SCATTER_RANGE,
        });
      }

      /*
       * Reset animation state whenever
       * the logo is rebuilt.
       */

      phase = "logo";
    }

    /*
     * -----------------------------------------
     * EASING
     * -----------------------------------------
     */

    function easeToward(
      cell: AsciiCell,
      targetX: number,
      targetY: number,
      ease: number,
    ) {
      cell.offsetX +=
        (targetX - cell.offsetX) * ease;

      cell.offsetY +=
        (targetY - cell.offsetY) * ease;
    }

    /*
     * -----------------------------------------
     * STAGGER
     * -----------------------------------------
     */

    function staggerCells() {
      for (const cell of asciiCells) {
        cell.wait =
          Math.floor(
            Math.random() *
              STAGGER_FRAMES,
          );
      }
    }

    /*
     * -----------------------------------------
     * UPDATE CELLS
     * -----------------------------------------
     */

    function updateAsciiCells() {
      let everyoneHome =
        phase === "returning";

      for (const cell of asciiCells) {
        /*
         * Waiting / staggered animation
         */

        if (cell.wait > 0) {
          cell.wait--;

          everyoneHome = false;

          continue;
        }

        /*
         * -----------------------------------
         * SCATTER
         * -----------------------------------
         */

        if (phase === "scattered") {
          easeToward(
            cell,
            cell.scatterX,
            cell.scatterY,
            SCATTER_EASE,
          );
        }

        /*
         * -----------------------------------
         * FALL
         * -----------------------------------
         */

        else if (phase === "fallen") {
          const floorOffset =
            gridRows - 1 - cell.row;

          cell.fallSpeed += GRAVITY;

          cell.offsetY +=
            cell.fallSpeed;

          if (
            cell.offsetY >
            floorOffset
          ) {
            cell.offsetY =
              floorOffset;

            cell.fallSpeed *=
              -BOUNCE;
          }
        }

        /*
         * -----------------------------------
         * RETURN
         * -----------------------------------
         */

        else if (phase === "returning") {
          easeToward(
            cell,
            0,
            0,
            RESET_EASE,
          );

          if (
            Math.abs(cell.offsetX) >
              0.05 ||
            Math.abs(cell.offsetY) >
              0.05
          ) {
            everyoneHome = false;
          }
        }

        /*
         * -----------------------------------
         * NORMAL / MOUSE HOVER
         * -----------------------------------
         */

        else {
          let targetX = 0;
          let targetY = 0;

          const distX =
            cell.col - cursor.col;

          const distY =
            cell.row - cursor.row;

          const distance =
            Math.sqrt(
              distX * distX +
                distY * distY,
            );

          if (
            distance <
              HOVER_RADIUS &&
            distance > 0
          ) {
            const push =
              (1 -
                distance /
                  HOVER_RADIUS) *
              HOVER_PUSH;

            targetX =
              (distX / distance) *
              push;

            targetY =
              (distY / distance) *
              push;
          }

          easeToward(
            cell,
            targetX,
            targetY,
            HOVER_EASE,
          );
        }
      }

      /*
       * Once all cells return home,
       * return to normal logo state.
       */

      if (everyoneHome) {
        phase = "logo";
      }
    }

    /*
     * -----------------------------------------
     * DRAW ASCII
     * -----------------------------------------
     */

    function drawAscii() {
      context.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight,
      );

      context.font =
        `${CELL_SIZE + 2}px monospace`;

      context.textBaseline = "top";
      context.textAlign = "center";

      context.fillStyle =
        ASCII_COLOR;

      for (const cell of asciiCells) {
        const x =
          (cell.col +
            cell.offsetX) *
            CELL_STEP +
          CELL_SIZE / 2;

        const y =
          (cell.row +
            cell.offsetY) *
          CELL_STEP;

        context.fillText(
          cell.char,
          x,
          y,
        );
      }
    }

    /*
     * -----------------------------------------
     * ANIMATION LOOP
     * -----------------------------------------
     */

    function renderLoop() {
      if (asciiCells.length > 0) {
        updateAsciiCells();
        drawAscii();
      }

      animationFrameId =
        requestAnimationFrame(
          renderLoop,
        );
    }

    /*
     * -----------------------------------------
     * MOUSE MOVE
     * -----------------------------------------
     */

    function handleMouseMove(
      event: MouseEvent,
    ) {
      cursor.col =
        event.clientX / CELL_STEP;

      cursor.row =
        event.clientY / CELL_STEP;
    }

    /*
     * -----------------------------------------
     * CLICK
     * -----------------------------------------
     */

    function handleClick() {
      if (asciiCells.length === 0) {
        return;
      }

      /*
       * First click:
       * Logo → scattered
       */

      if (phase === "logo") {
        phase = "scattered";

        staggerCells();

        return;
      }

      /*
       * Second click:
       * Scattered → falling
       */

      if (phase === "scattered") {
        phase = "fallen";

        for (const cell of asciiCells) {
          cell.fallSpeed = 0;
        }

        return;
      }

      /*
       * Third click:
       * Falling → returning
       */

      if (phase === "fallen") {
        phase = "returning";

        staggerCells();
      }
    }

    /*
     * -----------------------------------------
     * RESIZE
     * -----------------------------------------
     */

    function handleResize() {
      buildAsciiFromLogo();
    }

    /*
     * -----------------------------------------
     * EVENT LISTENERS
     * -----------------------------------------
     */

    window.addEventListener(
      "mousemove",
      handleMouseMove,
    );

    window.addEventListener(
      "click",
      handleClick,
    );

    window.addEventListener(
      "resize",
      handleResize,
    );

    logoElement.addEventListener(
      "load",
      buildAsciiFromLogo,
    );

    /*
     * If image is already loaded,
     * build immediately.
     */

    if (logoElement.complete) {
      buildAsciiFromLogo();
    }

    /*
     * Start animation.
     */

    renderLoop();

    /*
     * -----------------------------------------
     * CLEANUP
     * -----------------------------------------
     */

    return () => {
      cancelAnimationFrame(
        animationFrameId,
      );

      window.removeEventListener(
        "mousemove",
        handleMouseMove,
      );

      window.removeEventListener(
        "click",
        handleClick,
      );

      window.removeEventListener(
        "resize",
        handleResize,
      );

      logoElement.removeEventListener(
        "load",
        buildAsciiFromLogo,
      );
    };
  }, []);

  return (
    <footer className="interactive-footer">
      <canvas ref={canvasRef} />

      <img
        ref={logoRef}
        src="/logo.png"
        alt="Interactive ASCII Logo"
      />
    </footer>
  );
}