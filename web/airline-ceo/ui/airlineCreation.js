import { airlineTypes, difficulties } from "../systems/gameState.js";

export function renderAirlineCreation(app, state, actions) {
  const typeCards = Object.entries(airlineTypes)
    .map(
      ([id, type]) => `
    <button class="choice ${state.airline.type === id ? "selected" : ""}" data-type="${id}">
      <b>${type.label}</b>
      <span>${type.description}</span>
    </button>
  `,
    )
    .join("");
  const difficultyCards = Object.entries(difficulties)
    .map(
      ([id, difficulty]) => `
    <button class="choice compact-choice ${state.airline.difficulty === id ? "selected" : ""}" data-difficulty="${id}">
      <b>${difficulty.label}</b>
      <span>${id === "easy" ? "More cash, softer competition." : id === "hard" ? "Less cash, tougher events." : "Balanced airline startup."}</span>
    </button>
  `,
    )
    .join("");

  app.innerHTML = `
    <section class="screen setup">
      <div class="setup-visual" aria-hidden="true">
        <div class="plane-mark"><span class="body"></span><span class="nose"></span><span class="wing"></span><span class="tail"></span></div>
      </div>
      <div class="panel setup-panel">
        <h2>Create Airline</h2>
        <p class="muted">Set the brand, callsign, accent color, and operating strategy.</p>
        <label for="airlineName">Airline name</label>
        <input id="airlineName" maxlength="28" value="${state.airline.name}">
        <div class="form-grid">
          <div>
            <label for="callsign">Callsign</label>
            <input id="callsign" maxlength="10" value="${state.airline.callsign}">
          </div>
          <div>
            <label for="accent">Accent color</label>
            <input id="accent" type="color" value="${state.airline.color}">
          </div>
        </div>
        <label>Airline Type</label>
        <div class="choice-grid">${typeCards}</div>
        <label>Starting Difficulty</label>
        <div class="choice-grid difficulty-grid">${difficultyCards}</div>
        <div class="button-row">
          <button data-action="next">Next: Pick Hub</button>
          <button class="ghost" data-action="back">Back</button>
        </div>
      </div>
    </section>
  `;

  app.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.setType(button.dataset.type);
      renderAirlineCreation(app, state, actions);
    });
  });
  app.querySelectorAll("[data-difficulty]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.setDifficulty(button.dataset.difficulty);
      renderAirlineCreation(app, state, actions);
    });
  });
  app.querySelector('[data-action="next"]').addEventListener("click", () => {
    state.airline.name =
      app.querySelector("#airlineName").value.trim() || "New Airline";
    state.airline.callsign =
      app.querySelector("#callsign").value.trim().toUpperCase() || "AIR";
    state.airline.color = app.querySelector("#accent").value;
    actions.next();
  });
  app
    .querySelector('[data-action="back"]')
    .addEventListener("click", actions.back);
}
