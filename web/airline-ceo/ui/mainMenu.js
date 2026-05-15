import { hasSave } from "../systems/saveLoad.js";

export function renderMainMenu(app, actions) {
  app.innerHTML = `
    <section class="screen main-menu">
      <div class="menu-shell">
        <div class="menu-copy">
          <h1>Airline CEO</h1>
          <p>Build your airline. Choose your hub. Dominate the skies.</p>
          <div class="menu-actions">
            <button data-action="play">Play</button>
            <button class="secondary" data-action="load" ${hasSave() ? "" : "disabled"}>Load Game</button>
            <button class="ghost" data-action="settings">Settings</button>
            <button class="ghost" data-action="credits">Credits</button>
          </div>
        </div>
        <div class="menu-card">
          <h2>Arcade Airline Management</h2>
          <p>Flights happen in minutes, aircraft choices matter, and cheap suppliers can turn into expensive headlines.</p>
          <p class="fine">Milestone 1: creation, hub selection, aircraft buying, route setup, accelerated flights, events, and browser saves.</p>
        </div>
      </div>
    </section>
  `;
  app
    .querySelector('[data-action="play"]')
    .addEventListener("click", actions.play);
  app
    .querySelector('[data-action="load"]')
    .addEventListener("click", actions.load);
  app
    .querySelector('[data-action="settings"]')
    .addEventListener("click", () =>
      actions.notice(
        "Settings",
        "More controls will land after the core tycoon loop is tuned.",
      ),
    );
  app
    .querySelector('[data-action="credits"]')
    .addEventListener("click", () =>
      actions.notice(
        "Credits",
        "Created as a vanilla browser game prototype for Airline CEO.",
      ),
    );
}
