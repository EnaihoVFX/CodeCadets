const layoutStyle = `
  body {
    margin: 0;
    padding: 16px;
    font-family: Arial, sans-serif;
    background: #040716;
    color: #111111;
    box-sizing: border-box;
  }
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
    background: transparent;
  }
  .div2 {
    grid-area: 1 / 8 / 2 / 11;
    padding: 10px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
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
    max-width: none;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 34px;
    margin-top: -6px;
    border: 6px solid transparent;
    border-radius: 0;
    border-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%23b35a11' d='M0 0h8v8H0zm1 1v6h6V1H1z'/%3E%3C/svg%3E") 3 stretch;
    background:
      linear-gradient(155deg, #f8d763 0%, #eaa739 55%, #b7631d 100%);
    color: #2a1502;
    box-shadow:
      0 10px 0 rgba(84, 36, 4, 0.9),
      0 16px 26px rgba(41, 17, 2, 0.55);
    font-family: 'Press Start 2P', monospace;
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
    position: relative;
    margin: 0;
  }
  .achievement-btn img {
    width: 28px;
    height: 28px;
    margin-bottom: 4px;
    transform: rotate(-10deg);
    image-rendering: pixelated;
  }
  .achievement-btn:hover {
    transform: translateY(-2px);
    box-shadow:
      0 10px 0 rgba(109, 52, 6, 0.75),
      0 16px 26px rgba(59, 32, 5, 0.5);
    filter: brightness(1.05);
  }
  .achievement-btn:active {
    transform: translateY(0);
    box-shadow:
      0 5px 0 rgba(109, 52, 6, 0.85),
      0 10px 20px rgba(59, 32, 5, 0.4);
  }
  .quick-action-btn {
    width: 56px;
    height: 56px;
    border: 6px solid transparent;
    border-radius: 10px;
    border-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%2310365d' d='M0 0h8v8H0zm1 1v6h6V1H1z'/%3E%3C/svg%3E") 3 stretch;
    background:
      radial-gradient(circle at 30% 20%, rgba(154, 223, 255, 0.85), rgba(43, 149, 219, 0.8)),
      linear-gradient(160deg, #0f7bd6, #095a9d);
    box-shadow:
      0 6px 0 rgba(15, 65, 111, 0.65),
      0 12px 20px rgba(9, 36, 61, 0.45);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  }
  .quick-action-btn:hover {
    transform: translateY(-2px);
    box-shadow:
      0 8px 0 rgba(15, 65, 111, 0.75),
      0 16px 24px rgba(9, 36, 61, 0.5);
    filter: brightness(1.05);
  }
  .quick-action-btn:active {
    transform: translateY(0);
    box-shadow:
      0 4px 0 rgba(15, 65, 111, 0.85),
      0 10px 18px rgba(9, 36, 61, 0.45);
  }
  .quick-action-btn span {
    color: #071f3b;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.55rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
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
    font-family: 'Press Start 2P', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    line-height: 1.4;
    text-rendering: optimizeLegibility;
    border: 6px solid transparent;
    border-radius: 0;
    border-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%23121d46' d='M0 0h8v8H0zm1 1v6h6V1H1z'/%3E%3Cpath fill='%236c8aff' d='M1 1h6v6H1z'/%3E%3C/svg%3E") 3 stretch;
    background: #060c1cb3;
    color: #e2eaffeb;
    box-shadow: 0 14px #060c20c7, inset 0 0 0 2px #94b4ff4d;
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
        <span>Achievements</span>
      </button>
    </div>
    <div class="div4">
      <img class="gear gear-1" src="icons/gears/gear1.png" alt="Gear 1">
      <img class="robot" src="icons/robot.png" alt="Robot">
      <span class="title">GAME <span class="maker">MAKER</span></span>
    </div>
    <div class="div5 pixel-borders">Getting Started</div>
    <div class="div6 pixel-borders"></div>
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

