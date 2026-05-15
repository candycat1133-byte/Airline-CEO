import { airports } from "../data/airports.js";

export function renderHubSelection(app, state, selectedHub, actions) {
  const hub =
    airports.find((airport) => airport.code === selectedHub) || airports[0];
  app.innerHTML = `
    <section class="screen setup hub-layout">
      <div class="map-panel">
        <div class="map-wrap"><canvas id="hubCanvas" width="1000" height="560" aria-label="Stylized United States hub map"></canvas></div>
        <div class="map-caption"><b>Selected: ${hub.code}</b><span>${hub.notes}</span></div>
      </div>
      <div class="panel setup-panel">
        <h2>Choose Hub</h2>
        <p class="muted">Your hub controls early route options, costs, and how forgiving the opening minutes feel.</p>
        <div class="hub-list">
          ${airports
            .map(
              (airport) => `
            <button class="choice ${airport.code === selectedHub ? "selected" : ""}" data-hub="${airport.code}">
              <b>${airport.code} - ${airport.city}</b>
              <span>Demand ${airport.demand} | Competition ${airport.competition} | Gate cost $${Math.round(airport.gateCost / 1000)}K | ${airport.difficulty}</span>
            </button>
          `,
            )
            .join("")}
        </div>
        <div class="button-row">
          <button data-action="launch">Confirm Hub</button>
          <button class="ghost" data-action="back">Back</button>
        </div>
      </div>
    </section>
  `;

  const canvas = app.querySelector("#hubCanvas");
  requestAnimationFrame(() => drawHubMap(canvas, selectedHub));
  canvas.addEventListener("click", (event) => {
    const hit = airportAt(canvas, event);
    if (hit) actions.select(hit.code);
  });
  app.querySelectorAll("[data-hub]").forEach((button) => {
    button.addEventListener("click", () => actions.select(button.dataset.hub));
  });
  app
    .querySelector('[data-action="launch"]')
    .addEventListener("click", () => actions.launch(selectedHub));
  app
    .querySelector('[data-action="back"]')
    .addEventListener("click", actions.back);
}

export function drawMapBase(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = "#dcecf5";
  ctx.fillRect(0, 0, rect.width, rect.height);
  const sx = rect.width / 1000;
  const sy = rect.height / 560;
  ctx.fillStyle = "rgba(67, 141, 154, .18)";
  ctx.strokeStyle = "rgba(0, 44, 104, .28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70 * sx, 105 * sy);
  ctx.bezierCurveTo(170 * sx, 60 * sy, 245 * sx, 96 * sy, 320 * sx, 125 * sy);
  ctx.bezierCurveTo(430 * sx, 75 * sy, 560 * sx, 110 * sy, 655 * sx, 118 * sy);
  ctx.bezierCurveTo(790 * sx, 84 * sy, 920 * sx, 122 * sy, 935 * sx, 204 * sy);
  ctx.bezierCurveTo(900 * sx, 280 * sy, 890 * sx, 392 * sy, 820 * sx, 505 * sy);
  ctx.bezierCurveTo(710 * sx, 470 * sy, 620 * sx, 496 * sy, 530 * sx, 438 * sy);
  ctx.bezierCurveTo(380 * sx, 486 * sy, 260 * sx, 426 * sy, 148 * sx, 386 * sy);
  ctx.bezierCurveTo(88 * sx, 310 * sy, 60 * sx, 214 * sy, 70 * sx, 105 * sy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawAirport(
  ctx,
  canvas,
  airport,
  selected,
  accent = "#f28c28",
) {
  const rect = canvas.getBoundingClientRect();
  const x = (airport.x * rect.width) / 1000;
  const y = (airport.y * rect.height) / 560;
  ctx.fillStyle = selected ? accent : "#ffffff";
  ctx.strokeStyle = selected ? "#111827" : "#002c68";
  ctx.lineWidth = selected ? 4 : 2;
  ctx.beginPath();
  ctx.arc(x, y, selected ? 12 : 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.font = "800 13px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(airport.code, x, y - 18);
}

function drawHubMap(canvas, selectedHub) {
  const ctx = canvas.getContext("2d");
  drawMapBase(canvas, ctx);
  airports.forEach((airport) =>
    drawAirport(ctx, canvas, airport, airport.code === selectedHub),
  );
}

export function airportAt(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 1000;
  const y = ((event.clientY - rect.top) / rect.height) * 560;
  return airports.find(
    (airport) => Math.hypot(airport.x - x, airport.y - y) < 32,
  );
}
