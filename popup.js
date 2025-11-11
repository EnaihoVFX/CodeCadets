const layoutStyle = `
  body {
    margin: 0;
    padding: 16px;
    font-family: Arial, sans-serif;
    background: #ffffff;
    color: #111111;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  *, *::before, *::after {
    box-sizing: inherit;
  }
  .shell {
    width: 620px;
    min-height: 400px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    grid-template-rows: repeat(6, 1fr);
    grid-column-gap: 0px;
    grid-row-gap: 0px;
  }
  .div1 {
    grid-area: 1 / 1 / 5 / 8;
    padding: 12px;
    font-size: 14px;
    line-height: 1.2;
    letter-spacing: 0.2px;
    text-rendering: optimizeLegibility;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    border-image-slice: 8 8 8 8;
    border-image-width: 24px 24px 24px 24px;
    border-image-outset: 0px 0px 0px 0px;
    border-image-repeat: repeat repeat;
    border-image-source: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYBAMAAAASWSDLAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAeUExURQAAAKen41AwAPjoiKBwEOCwOPjQULi4wPj4+P////pO7MUAAAACdFJOUwAAdpPNOAAAAAFiS0dECfHZpewAAAAHdElNRQfoBwoEASm3/g7KAAAAVElEQVQY02NgYGBSAgMFAUYGBiVlE2cQNFJiZGAKDUuFwFBFPBzltPRyMChLCwJxOsAAxFEJDYdwSkOdUDkoyuioB+FQIj3HoKQa4gqCQcAAQQ4qAA3mZMcXkMg9AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI0LTA3LTEwVDA0OjAxOjIyKzAwOjAwZ2SiBgAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNC0wNy0xMFQwNDowMToyMiswMDowMBY5GroAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjQtMDctMTBUMDQ6MDE6NDErMDA6MDC2qyh/AAAAAElFTkSuQmCC");
    border-style: solid;
  }
  .div2 {
    grid-area: 1 / 8 / 2 / 10;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .div3 {
    grid-area: 1 / 10 / 2 / 11;
    padding: 5px 10px 10px 10px;
  }
  .div4 {
    grid-area: 2 / 8 / 4 / 11;
    padding: 10px 90px 10px 10px;
    background: transparent;
    border-image-slice: 9 9 9 9;
    border-image-width: 30px 30px 30px 30px;
    border-image-outset: 10px 10px 10px 10px;
    border-image-repeat: stretch stretch;
    border-image-source: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYBAMAAAASWSDLAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAhUExURQAAAKen40hAUGh4eDhISMjY2JioqLC4sNjQ2Pj4+P///6FWOm0AAAACdFJOUwAAdpPNOAAAAAFiS0dECmjQ9FYAAAAHdElNRQfoBwoEASm3/g7KAAAAg0lEQVQY02NgUFJSEmBgYARSggxMxiZGQIaSsrOxIoNyaFhIKBC4poYaMSiHJaekAYGbWSqI4+JiDAQuLkCOSrJ7BxiUmDkBZTxmgkELUEbJBcZxUWJgCrOAcJrDFGnJQbEUxTloDkXyAshzIJ9CPAf0NsinYG8jBYgCgyAojIAARAEACixi6htDmhMAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjQtMDctMTBUMDQ6MDE6MjIrMDA6MDBnZKIGAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI0LTA3LTEwVDA0OjAxOjIyKzAwOjAwFjkaugAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNC0wNy0xMFQwNDowMTo0MSswMDowMLarKH8AAAAASUVORK5CYII=");
    border-style: solid;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    text-align: right;
    z-index: 10;
    position: relative;
    overflow: hidden;
  }
  .div4 .title {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    display: block;
    font-family: 'Press Start 2P', monospace;
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 3px;
    line-height: 1.2;
    text-rendering: geometricPrecision;
    text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.5);
    color: #ffffff;
    word-spacing: 6px;
    transition: filter 0.3s ease;
  }
  .div4 .title .maker {
    display: inline-block;
    font-size: 18px;
    letter-spacing: 3px;
    word-spacing: 6px;
    color: #d8d8d8;
    transition: color 0.3s ease;
  }
  .achievement-btn {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 12px;
    border: none;
    background: #e5e7eb;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #1f2937;
    image-rendering: pixelated;
    cursor: pointer;
    position: relative;
  }
  .achievement-btn img {
    width: 20px;
    height: 20px;
    image-rendering: pixelated;
  }
  .achievement-btn::after {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: -6px;
    height: 6px;
    background: #9ca3af;
    image-rendering: pixelated;
  }
  .div4:hover .title {
    transform: translateY(-50%);
    filter: brightness(1.1);
  }
  .div4:hover .title .maker {
    color: #cfcfcf;
  }
  .robot {
    position: absolute;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    width: 100px;
    height: 100px;
    bottom: 5px;
    left: 8px;
    z-index: 3;
    animation: robot-walk 4s steps(8) infinite;
  }
  @keyframes robot-walk {
    0% {
      transform: translateX(0) scaleX(1);
    }
    45% {
      transform: translateX(calc(100% - 176px)) scaleX(1);
    }
    45.01% {
      transform: translateX(calc(100% - 176px)) scaleX(-1);
    }
    90% {
      transform: translateX(0) scaleX(-1);
    }
    90.01% {
      transform: translateX(0) scaleX(1);
    }
    100% {
      transform: translateX(0) scaleX(1);
    }
  }
  .gear {
    position: absolute;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    pointer-events: none;
    z-index: 0;
  }
  .gear-1 {
    width: 80px;
    height: 80px;
    top: -47px;
    left: -40px;
    opacity: 0.85;
  }
  @keyframes rotate-clockwise-pixel {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .div4::before {
    content: '';
    position: absolute;
    inset: 5px 5px 5px 5px;
    background: rgba(0, 0, 0, 0.95);
    z-index: -1;
  }
  .div5 {
    grid-area: 4 / 8 / 5 / 11;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    line-height: 1.5;
    text-rendering: optimizeLegibility;
  }
  .div6 {
    grid-area: 5 / 1 / 7 / 11;
    padding: 16px 12px;
    font-size: 12px;
    line-height: 1.6;
    letter-spacing: 0.3px;
    text-rendering: optimizeLegibility;
  }
  .pixel-borders {
    position: relative;
    background: #e5e7eb;
  }
  .pixel-borders::before,
  .pixel-borders::after {
    content: '';
    position: absolute;
    pointer-events: none;
    image-rendering: pixelated;
  }
  .pixel-borders::before {
    inset: 0;
    border-style: solid;
    border-width: 4px;
    border-color: #1f2937;
    clip-path: polygon(
      0 8px, 0 100%, 8px 100%, 8px 8px,
      calc(100% - 8px) 8px, calc(100% - 8px) calc(100% - 8px),
      8px calc(100% - 8px), 8px 100%, 100% 100%, 100% 0,
      0 0
    );
  }
  .pixel-borders::after {
    inset: 4px;
    border-style: solid;
    border-width: 4px;
    border-color: #9ca3af;
    clip-path: polygon(
      0 6px, 0 100%, 6px 100%, 6px 6px,
      calc(100% - 6px) 6px, calc(100% - 6px) calc(100% - 6px),
      6px calc(100% - 6px), 6px 100%, 100% 100%, 100% 0,
      0 0
    );
  }
  .pixel-borders > * {
    position: relative;
    z-index: 1;
  }
`;

const layoutMarkup = `
  <div class="shell">
    <div class="div1">Large highlight</div>
    <div class="div2">
      <button class="achievement-btn">
        <img src="iconpack/Png/golden_cup.png" alt="Trophy icon">
        <span>Stats</span>
      </button>
      </div>
    <div class="div3">
      <img class="icon" src="icons/logo/icon.png" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;">
      </div>
    <div class="div4">
      <img class="gear gear-1" src="icons/gears/gear1.png" alt="Gear 1">
      <img class="robot" src="icons/robot.png" alt="Robot">
      <span class="title">GAME <span class="maker">MAKER</span></span>
    </div>
    <div class="div5">Getting Started</div>
    <div class="div6 pixel-borders">Footer</div>
      </div>
    `;

document.head.replaceChildren();
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
document.head.appendChild(fontLink);
const styleEl = document.createElement('style');
styleEl.textContent = layoutStyle;
document.head.appendChild(styleEl);

document.body.innerHTML = layoutMarkup;

