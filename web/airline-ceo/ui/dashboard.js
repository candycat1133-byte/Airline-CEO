import { airports } from "../data/airports.js";
import { aircraftCatalog } from "../data/aircraft.js";
import {
  executiveById,
  executivePayroll,
  executiveRoles,
} from "../data/executives.js";
import { suppliers } from "../data/suppliers.js";
import {
  availableForRoute,
  clockLabel,
  getAircraftModel,
  money,
  projectRoute,
} from "../systems/economy.js";
import {
  demandForRoute,
  estimateBaseDemand,
  marketFareFor,
  routeDistance,
} from "../systems/demand.js";
import { airportAt, drawAirport, drawMapBase } from "./hubSelection.js";

const tabs = [
  "Dashboard",
  "Flights",
  "Routes",
  "Fleet",
  "Aircraft Market",
  "Executives",
  "Finance",
  "Services",
  "Staff",
  "Suppliers",
  "Contracts",
  "Marketing",
  "Operations",
  "Events",
  "Reports",
  "Settings",
];

export function renderGame(app, state, actions, activeTab = "Dashboard") {
  app.innerHTML = `
    <section class="screen game">
      <aside class="sidebar">
        <div class="brand-lockup"><b>${state.airline.name}</b><span>${state.airline.callsign} | ${state.hub || "No hub"}</span></div>
        <nav class="nav">${tabs.map((tab) => `<button class="${activeTab === tab ? "active" : ""}" data-tab="${tab}">${tab}</button>`).join("")}</nav>
      </aside>
      <main class="game-main">
        <header class="topbar">
          <div><h1>${activeTab}</h1><div class="muted">${clockLabel(state)}</div></div>
          <div class="status-strip">
            <span>Cash <b>${money(state.cash)}</b></span>
            <span>Rep <b>${state.reputation}%</b></span>
            <span>Profit <b>${money(state.dailyProfit)}</b></span>
            <span>Time scale <b>1 sec = 5 game min</b></span>
            <div class="speed-controls">
              ${[0, 1, 2, 4].map((speed) => `<button class="${(state.paused && speed === 0) || (state.speed === speed && !state.paused) ? "active" : ""}" data-speed="${speed}">${speed === 0 ? "Pause" : `${speed}x`}</button>`).join("")}
            </div>
          </div>
        </header>
        <div class="content">${renderTab(state, activeTab)}</div>
      </main>
    </section>
  `;

  app
    .querySelectorAll("[data-tab]")
    .forEach((button) =>
      button.addEventListener("click", () => actions.tab(button.dataset.tab)),
    );
  app
    .querySelectorAll("[data-speed]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        actions.speed(Number(button.dataset.speed)),
      ),
    );
  bindTab(app, state, actions, activeTab);
}

function renderTab(state, activeTab) {
  if (activeTab === "Dashboard") return dashboardView(state);
  if (activeTab === "Flights") return flightsView(state);
  if (activeTab === "Routes") return routesView(state);
  if (activeTab === "Fleet") return fleetView(state);
  if (activeTab === "Aircraft Market") return marketView(state);
  if (activeTab === "Executives") return executivesView(state);
  if (activeTab === "Finance") return financeView(state);
  if (activeTab === "Services") return servicesView(state);
  if (activeTab === "Staff") return staffView(state);
  if (activeTab === "Suppliers") return suppliersView(state);
  if (activeTab === "Contracts") return contractsView(state);
  if (activeTab === "Marketing") return marketingView(state);
  if (activeTab === "Operations") return operationsView(state);
  if (activeTab === "Events") return eventsView(state);
  if (activeTab === "Reports") return reportsView(state);
  return settingsView();
}

function statCards(state) {
  return `
    <div class="stats-grid">
      <div class="stat"><span>Cash</span><b>${money(state.cash)}</b></div>
      <div class="stat"><span>Reputation</span><b>${state.reputation}%</b></div>
      <div class="stat"><span>Safety</span><b>${state.safety}%</b></div>
      <div class="stat"><span>Awareness</span><b>${state.brandAwareness}%</b></div>
      <div class="stat"><span>Fleet</span><b>${state.fleet.length}</b></div>
      <div class="stat"><span>Routes</span><b>${state.routes.length}</b></div>
      <div class="stat"><span>Happiness</span><b>${state.happiness}%</b></div>
      <div class="stat"><span>On-Time</span><b>${state.onTime}%</b></div>
    </div>
  `;
}

function dashboardView(state) {
  return `
    ${statCards(state)}
    <div class="dashboard-grid">
      <section class="map-panel">
        <div class="map-wrap"><canvas id="networkCanvas" width="1000" height="560" aria-label="Network map"></canvas></div>
        <div class="map-caption"><b>${state.hub} Network</b><span>Flights follow the curved routes. Time scale: 1 real second equals 5 in-game minutes at 1x.</span></div>
      </section>
      <div class="list">
        <section class="card advisor-card"><h2>Executive Brief</h2>${advisorBrief(state)}<div class="button-row compact-actions"><button class="secondary" id="dashboardRoutes">Routes</button><button class="ghost" id="dashboardFlights">Flights</button><button class="ghost" id="dashboardMarket">Aircraft Market</button></div></section>
        <section class="card"><h2>Current Flights</h2><div class="list">${flightList(state)}</div></section>
        <section class="card"><h2>Alerts</h2><div class="list alert-list">${alertList(state, 5)}</div></section>
      </div>
    </div>
  `;
}

function routesView(state) {
  const origin = airports.find((airport) => airport.code === state.hub);
  return `
    <div class="two-col">
      <section class="card">
        <h2>Create Route</h2>
        <div class="control-row">
          <div><label>Destination</label><select id="destinationSelect">${airports
            .filter((airport) => airport.code !== state.hub)
            .map(
              (airport) =>
                `<option value="${airport.code}">${airport.code} - ${airport.city}</option>`,
            )
            .join("")}</select></div>
          <div><label>Aircraft</label><select id="routeAircraftSelect"><option value="">Pick destination first</option></select></div>
          <button id="previewRoute">Preview</button>
        </div>
        <div class="form-grid">
          <div><label>Ticket Price</label><input id="routePrice" type="number" min="60" max="900" step="5" value="220"></div>
          <div><label>Flights Per Day</label><input id="routeFrequency" type="number" min="1" max="12" step="1" value="4"></div>
        </div>
        <div id="routePreview" class="muted" style="margin-top:12px">From ${origin.city}, choose a destination and preview demand, competition, and expected profit.</div>
        <div class="button-row"><button id="openRoute">Open Route</button></div>
      </section>
      <section class="card"><h2>Active Routes</h2><div class="list">${routeList(state)}</div></section>
    </div>
  `;
}

function flightsView(state) {
  return `
    <div class="two-col">
      <section class="card"><h2>Active Flights</h2><div class="list">${flightList(state, true)}</div></section>
      <section class="card"><h2>Next Departures</h2><div class="list">${departureList(state)}</div></section>
    </div>
  `;
}

function fleetView(state) {
  return `<section class="card"><h2>Fleet</h2><div class="list">${fleetList(state)}</div></section>`;
}

function marketView(state) {
  const newListings = aircraftCatalog
    .filter((aircraft) => !aircraft.locked)
    .map((aircraft) => marketCard(aircraft, "new", 95, aircraft.newPrice))
    .join("");
  const usedListings = aircraftCatalog
    .filter((aircraft) => !aircraft.locked)
    .slice(0, 5)
    .map((aircraft, index) => {
      const conditions = [86, 72, 58, 41, 24];
      const condition = conditions[index];
      return marketCard(
        aircraft,
        "used",
        condition,
        Math.round(aircraft.newPrice * (condition / 150)),
      );
    })
    .join("");
  const leaseListings = aircraftCatalog
    .filter((aircraft) => !aircraft.locked)
    .slice(0, 8)
    .map((aircraft) =>
      marketCard(aircraft, "lease", 88, Math.round(aircraft.leasePrice * 1.5)),
    )
    .join("");
  return `<div class="three-col"><section class="card"><h2>Buy New</h2><div class="list">${newListings}</div></section><section class="card"><h2>Used Aircraft</h2><div class="list">${usedListings}</div></section><section class="card"><h2>Lease Aircraft</h2><div class="list">${leaseListings}</div></section></div>`;
}

function marketCard(aircraft, source, condition, price) {
  const risk =
    condition < 35 ? "danger" : condition < 60 ? "warning" : "success";
  const note =
    source === "new"
      ? "Low operational risk, delivery-ready for this slice."
      : source === "lease"
        ? "Low upfront cost with daily lease payments. Good for fast growth."
        : condition < 35
          ? "CFO warning: cheap for a reason. Expect delays and safety risk."
          : condition < 60
            ? "CFO warning: tempting price, but maintenance risk is elevated."
            : "CFO note: reasonable used-market value if cash is tight.";
  return `<div class="item"><div><b>${aircraft.model}</b><span>${source === "new" ? "Factory delivery" : `${condition}% condition, instant delivery`} | ${aircraft.capacity} seats | ${aircraft.range} mi range</span><span>${note}</span></div><button class="${risk}" data-buy="${aircraft.id}" data-source="${source}" data-condition="${condition}" data-price="${price}">${money(price)}</button></div>`;
}

function executivesView(state) {
  return `
    <div class="two-col">
      <section class="card">
        <h2>Executive Team</h2>
        <div class="list">${executiveRoles.map((role) => executiveRoleCard(state, role)).join("")}</div>
      </section>
      <section class="card advisor-card">
        <h2>Payroll Impact</h2>
        <div class="item"><div><b>Executive payroll</b><span>Charged every in-game day. Strong buffs, serious burn rate.</span></div><div class="pill warning">${money(executivePayroll(state.executives))}/day</div></div>
        <div class="advisor-list" style="margin-top:10px">${advisorBrief(state)}</div>
      </section>
    </div>
  `;
}

function executiveRoleCard(state, role) {
  const hired = executiveById(state.executives?.[role.id]);
  return `<div class="executive-role">
    <div class="route-summary">
      <div><b>${role.title}</b><span>${hired ? `${hired.name} hired | ${hired.buff}` : role.empty}</span></div>
      <div class="pill ${hired ? "success" : "warning"}">${hired ? `${money(hired.salary)}/day` : "Vacant"}</div>
    </div>
    <div class="executive-candidates">
      ${role.candidates
        .map(
          (candidate) =>
            `<button class="${hired?.id === candidate.id ? "secondary" : "ghost"}" data-hire-executive="${role.id}" data-candidate="${candidate.id}"><b>${candidate.name}</b><span>${money(candidate.salary)}/day | ${candidate.buff}</span></button>`,
        )
        .join("")}
      <button class="danger" data-hire-executive="${role.id}" data-candidate="">Leave Vacant</button>
    </div>
  </div>`;
}

function financeView(state) {
  return `${statCards(state)}<section class="card"><h2>Cash Flow</h2><div class="list">
    <div class="item"><div><b>Daily revenue</b><span>Tickets and passenger fees generated today.</span></div><div class="pill success">${money(state.dailyRevenue)}</div></div>
    <div class="item"><div><b>Daily expenses</b><span>Fuel, maintenance, suppliers, gates, staff, and marketing.</span></div><div class="pill warning">${money(state.dailyExpenses)}</div></div>
    <div class="item"><div><b>Daily profit</b><span>Current day net result.</span></div><div class="pill ${state.dailyProfit >= 0 ? "success" : "danger"}">${money(state.dailyProfit)}</div></div>
    <div class="item"><div><b>Executive payroll</b><span>Premium leadership charged daily.</span></div><div class="pill warning">${money(executivePayroll(state.executives))}/day</div></div>
  </div></section>
  <section class="card" style="margin-top:14px"><h2>Passenger Fees</h2><div class="three-col">
    <div><label>Baggage Fee</label><input id="financeBaggageFee" type="number" min="0" max="100" step="5" value="${state.services.baggageFee}"></div>
    <div><label>Service Level</label><input id="financeSupport" type="range" min="0" max="4" value="${state.services.support}"></div>
    <div><label>Marketing Level</label><input id="financeMarketing" type="range" min="0" max="5" value="${state.marketing}"></div>
  </div><div class="button-row"><button id="saveFinance">Apply Finance Controls</button></div></section>`;
}

function servicesView(state) {
  return `<section class="card"><h2>Service Quality</h2><div class="three-col">
    ${slider("legroom", "Legroom", state.services.legroom, 0, 4)}
    ${slider("snacks", "Snack Quality", state.services.snacks, 0, 4)}
    ${slider("support", "Customer Support", state.services.support, 0, 4)}
    <div><label>Baggage Fee</label><input id="baggageFee" type="number" min="0" max="90" step="5" value="${state.services.baggageFee}"></div>
  </div><div class="button-row"><button id="saveServices">Apply Services</button></div></section>`;
}

function staffView(state) {
  return `<section class="card"><h2>Staff</h2><div class="list">${Object.entries(
    state.staff,
  )
    .map(([key, staff]) => staffCard(key, staff))
    .join("")}</div></section>`;
}

function staffCard(key, staff) {
  const status =
    staff.count < staff.needed
      ? "danger"
      : staff.morale < 45
        ? "warning"
        : "success";
  return `<div class="route-item">
    <div class="route-summary">
      <div><b>${labelize(key)}</b><span>${staff.count} current | ${staff.needed} needed | ${staff.quality} quality | ${staff.morale}% morale</span></div>
      <div class="pill ${status}">${staff.count < staff.needed ? "Short" : "Healthy"}</div>
    </div>
    <div class="route-controls">
      <button class="ghost" data-hire-staff="${key}" data-quality="Basic">Hire Basic</button>
      <button class="secondary" data-hire-staff="${key}" data-quality="Experienced">Hire Experienced</button>
      <button data-train-staff="${key}">Train</button>
    </div>
  </div>`;
}

function suppliersView(state) {
  return `<section class="card"><h2>Suppliers</h2><p class="muted">Choose suppliers and contract length. Longer contracts are cheaper but harder to exit.</p><div class="three-col">${Object.entries(
    suppliers,
  )
    .map(
      ([key, list]) =>
        `<div><label>${labelize(key)}</label><select data-supplier="${key}">${list.map(([name, stars]) => `<option value="${stars}" ${stars === state.suppliers[key] ? "selected" : ""}>${stars}/5 ${name}</option>`).join("")}</select><select data-contract-length="${key}" style="margin-top:8px"><option value="30">Month-to-month</option><option value="90">90-day</option><option value="365">1-year</option><option value="1095">3-year</option></select></div>`,
    )
    .join(
      "",
    )}</div><div class="button-row"><button id="saveSuppliers">Apply Suppliers</button></div></section>`;
}

function contractsView(state) {
  const contracts = Object.entries(state.contracts || {});
  return `<section class="card"><h2>Contracts</h2><div class="list">${
    contracts
      .map(
        ([category, contract]) =>
          `<div class="item"><div><b>${labelize(category)}: ${contract.name}</b><span>${contract.stars}/5 supplier | ${contract.daysRemaining} days left | cancellation fee ${money(contract.cancellationFee)}</span></div><div class="pill warning">${money(contract.costPerDay)}/day</div></div>`,
      )
      .join("") ||
    `<div class="item"><div><b>No signed contracts</b><span>Use Suppliers to sign service contracts.</span></div></div>`
  }</div></section>`;
}

function marketingView(state) {
  return `<section class="card"><h2>Marketing</h2>${slider("marketing", "Campaign Level", state.marketing, 0, 5)}<div class="button-row"><button id="saveMarketing">Apply Marketing</button></div></section>`;
}

function operationsView(state) {
  return `<div class="two-col"><section class="card"><h2>Board Actions</h2><div class="button-row"><button id="saveGame">Save Game</button><button class="secondary" id="maintenanceBoost">Heavy Maintenance</button><button class="ghost" id="trainCrew">Crew Training</button><button class="danger" id="closeWorstRoute">Close Weakest Route</button></div></section><section class="card"><h2>Operations Snapshot</h2><div class="list">${flightList(state)}</div></section></div>`;
}

function eventsView(state) {
  return `<section class="card"><h2>Events</h2><div class="list">${alertList(state, 18)}</div></section>`;
}

function reportsView(state) {
  const routeReports = state.routes.map((route) => ({
    route,
    projected: projectRoute(state, route),
  }));
  const best = [...routeReports].sort(
    (a, b) => b.projected.profit - a.projected.profit,
  )[0];
  const worst = [...routeReports].sort(
    (a, b) => a.projected.profit - b.projected.profit,
  )[0];
  const worn = [...state.fleet].sort((a, b) => a.condition - b.condition)[0];
  return `<div class="two-col">
    <section class="card"><h2>Route Report</h2><div class="list">
      <div class="item"><div><b>Most profitable</b><span>${best ? `${best.route.origin}-${best.route.destination}` : "No route yet"}</span></div><div class="pill success">${best ? money(best.projected.profit) : "$0"}</div></div>
      <div class="item"><div><b>Weakest route</b><span>${worst ? `${worst.route.origin}-${worst.route.destination}` : "No route yet"}</span></div><div class="pill ${worst?.projected.profit < 0 ? "danger" : "warning"}">${worst ? money(worst.projected.profit) : "$0"}</div></div>
      <div class="item"><div><b>Active flights</b><span>Flights currently in progress.</span></div><div class="pill">${state.flights.length}</div></div>
    </div></section>
    <section class="card"><h2>Fleet and Brand Report</h2><div class="list">
      <div class="item"><div><b>Lowest condition aircraft</b><span>${worn ? `${worn.id} at ${worn.condition}%` : "No aircraft"}</span></div><div class="pill ${worn?.condition < 50 ? "warning" : "success"}">${worn ? worn.status : "None"}</div></div>
      <div class="item"><div><b>Safety rating</b><span>Driven by aircraft condition, maintenance, staff, and incidents.</span></div><div class="pill ${state.safety < 55 ? "danger" : "success"}">${state.safety}%</div></div>
      <div class="item"><div><b>Brand awareness</b><span>Marketing and completed flights grow your brand.</span></div><div class="pill">${state.brandAwareness}%</div></div>
    </div></section>
  </div>`;
}

function settingsView() {
  return `<section class="card"><h2>Settings</h2><div class="button-row"><button id="saveGame">Save Game</button><button class="ghost" id="mainMenu">Main Menu</button><button class="danger" id="resetSave">Reset Save</button></div></section>`;
}

function slider(id, label, value, min, max) {
  return `<div><label>${label}</label><div class="range-row"><input id="${id}" type="range" min="${min}" max="${max}" value="${value}"><div class="pill">${value}</div></div></div>`;
}

function routeList(state) {
  return (
    state.routes
      .map((route) => {
        const projected = projectRoute(state, route);
        const load = Math.round(projected.loadFactor * 100);
        const tone =
          projected.profit < 0 ? "danger" : load > 88 ? "warning" : "success";
        return `<div class="route-item">
          <div class="route-summary">
            <div><b>${route.origin} to ${route.destination}</b><span>${route.distance} mi | demand ${demandForRoute(state, route)} | aircraft ${route.aircraftId}</span></div>
            <div class="pill ${tone}">${money(projected.profit)}/day</div>
          </div>
          <div class="route-controls">
            <div><label>Fare</label><input data-route-price="${route.id}" type="number" min="60" max="900" step="5" value="${route.price}"></div>
            <div><label>Flights/day</label><input data-route-frequency="${route.id}" type="number" min="1" max="12" step="1" value="${route.frequency}"></div>
            <div><label>Load</label><div class="meter"><span style="width:${Math.min(100, load)}%"></span></div></div>
            <button class="secondary" data-update-route="${route.id}">Update</button>
          </div>
        </div>`;
      })
      .join("") ||
    `<div class="item"><div><b>No active routes</b><span>Open your first route and assign an aircraft.</span></div></div>`
  );
}

function fleetList(state) {
  return (
    state.fleet
      .map((aircraft) => {
        const model = getAircraftModel(aircraft.modelId);
        const tone =
          aircraft.condition < 35
            ? "danger"
            : aircraft.condition < 60
              ? "warning"
              : "success";
        return `<div class="item"><div><b>${aircraft.id} | ${model.model}</b><span>${aircraft.status} | ${aircraft.condition}% condition | ${aircraft.interior} interior | ${model.capacity} seats</span></div><div class="pill ${tone}">${aircraft.source}</div></div>`;
      })
      .join("") ||
    `<div class="item"><div><b>No aircraft</b><span>Buy new or gamble on the used market.</span></div></div>`
  );
}

function flightList(state, detailed = false) {
  return (
    state.flights
      .map((flight) => {
        const route = state.routes.find((item) => item.id === flight.routeId);
        const progress = Math.min(100, Math.round(flight.progress * 100));
        const remaining = Math.max(
          0,
          Math.ceil(flight.duration - flight.elapsed),
        );
        const detail = detailed
          ? ` | ${formatGameDuration(flight.elapsed)} elapsed | ${formatGameDuration(remaining)} left`
          : "";
        return `<div class="item"><div><b>${flight.number || "Flight"} | ${route ? `${route.origin} to ${route.destination}` : "Flight"}</b><span>${flight.status} | ${flight.aircraftId} | ${progress}%${detail}${flight.passengers ? ` | ${flight.passengers} pax | ${money(flight.profit || 0)} profit` : ""}</span><div class="flight-progress"><span style="width:${progress}%"></span></div></div><div class="pill ${flight.delayed ? "warning" : "success"}">${formatGameDuration(remaining)}</div></div>`;
      })
      .join("") ||
    `<div class="item"><div><b>No flights airborne</b><span>Open routes and unpause time.</span></div></div>`
  );
}

function departureList(state) {
  return (
    state.routes
      .map((route) => {
        const wait = Math.max(0, Math.ceil(route.nextDeparture - state.minute));
        return `<div class="item"><div><b>${route.origin} to ${route.destination}</b><span>${route.aircraftId} | ${route.frequency} flights/day | flight time about ${formatGameDuration(estimatedFlightDuration(route))}</span></div><div class="pill">${formatGameDuration(wait)}</div></div>`;
      })
      .join("") ||
    `<div class="item"><div><b>No scheduled departures</b><span>Open a route to build a flight board.</span></div></div>`
  );
}

function estimatedFlightDuration(route) {
  return Math.max(24, Math.round(route.distance / 8.2));
}

function formatGameDuration(minutes) {
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) return `${rounded}m`;
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function alertList(state, count) {
  return (
    state.alerts
      .slice(0, count)
      .map(
        (alert) =>
          `<div class="item"><div><b>${alert.title}</b><span>Day ${alert.day}: ${alert.body}</span></div><div class="pill ${alert.severity}">${alert.severity}</div></div>`,
      )
      .join("") ||
    `<div class="item"><div><b>Quiet operations</b><span>No alerts yet.</span></div></div>`
  );
}

function bindTab(app, state, actions, activeTab) {
  const networkCanvas = app.querySelector("#networkCanvas");
  if (networkCanvas) {
    requestAnimationFrame(() => drawNetwork(networkCanvas, state));
    networkCanvas.addEventListener("click", (event) => {
      const hit = airportAt(networkCanvas, event);
      if (hit)
        actions.notice(
          hit.code,
          `${hit.name}: demand ${hit.demand}, competition ${hit.competition}.`,
        );
    });
  }
  if (activeTab === "Routes") bindRoutes(app, state, actions);
  app.querySelectorAll("[data-update-route]").forEach((button) =>
    button.addEventListener("click", () => {
      const routeItem = button.closest(".route-item");
      actions.updateRoute({
        id: Number(button.dataset.updateRoute),
        price: Number(routeItem.querySelector("[data-route-price]").value),
        frequency: Number(
          routeItem.querySelector("[data-route-frequency]").value,
        ),
      });
    }),
  );
  app
    .querySelectorAll("#dashboardRoutes")
    .forEach((button) =>
      button.addEventListener("click", () => actions.tab("Routes")),
    );
  app
    .querySelectorAll("#dashboardMarket")
    .forEach((button) =>
      button.addEventListener("click", () => actions.tab("Aircraft Market")),
    );
  app
    .querySelectorAll("#dashboardFlights")
    .forEach((button) =>
      button.addEventListener("click", () => actions.tab("Flights")),
    );
  app
    .querySelectorAll("[data-hire-executive]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        actions.hireExecutive(
          button.dataset.hireExecutive,
          button.dataset.candidate,
        ),
      ),
    );
  if (activeTab === "Aircraft Market")
    app.querySelectorAll("[data-buy]").forEach((button) =>
      button.addEventListener("click", () =>
        actions.buyAircraft({
          modelId: button.dataset.buy,
          source: button.dataset.source,
          condition: Number(button.dataset.condition),
          price: Number(button.dataset.price),
        }),
      ),
    );
  if (activeTab === "Services")
    app.querySelector("#saveServices").addEventListener("click", () =>
      actions.updateServices({
        legroom: Number(app.querySelector("#legroom").value),
        snacks: Number(app.querySelector("#snacks").value),
        support: Number(app.querySelector("#support").value),
        baggageFee: Number(app.querySelector("#baggageFee").value),
      }),
    );
  app
    .querySelectorAll("[data-hire-staff]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        actions.hireStaff(button.dataset.hireStaff, button.dataset.quality),
      ),
    );
  app
    .querySelectorAll("[data-train-staff]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        actions.trainStaff(button.dataset.trainStaff),
      ),
    );
  if (activeTab === "Suppliers")
    app.querySelector("#saveSuppliers").addEventListener("click", () =>
      actions.updateSuppliers(
        Object.fromEntries(
          [...app.querySelectorAll("[data-supplier]")].map((input) => {
            const category = input.dataset.supplier;
            return [
              category,
              {
                stars: Number(input.value),
                length: Number(
                  app.querySelector(`[data-contract-length="${category}"]`)
                    .value,
                ),
              },
            ];
          }),
        ),
      ),
    );
  if (activeTab === "Finance")
    app.querySelector("#saveFinance").addEventListener("click", () =>
      actions.updateFinanceControls({
        baggageFee: Number(app.querySelector("#financeBaggageFee").value),
        support: Number(app.querySelector("#financeSupport").value),
        marketing: Number(app.querySelector("#financeMarketing").value),
      }),
    );
  if (activeTab === "Marketing")
    app
      .querySelector("#saveMarketing")
      .addEventListener("click", () =>
        actions.updateMarketing(Number(app.querySelector("#marketing").value)),
      );
  app
    .querySelectorAll("#saveGame")
    .forEach((button) => button.addEventListener("click", actions.save));
  app
    .querySelectorAll("#mainMenu")
    .forEach((button) => button.addEventListener("click", actions.menu));
  app
    .querySelectorAll("#resetSave")
    .forEach((button) => button.addEventListener("click", actions.resetSave));
  app
    .querySelectorAll("#maintenanceBoost")
    .forEach((button) => button.addEventListener("click", actions.maintenance));
  app
    .querySelectorAll("#trainCrew")
    .forEach((button) => button.addEventListener("click", actions.train));
  app
    .querySelectorAll("#closeWorstRoute")
    .forEach((button) =>
      button.addEventListener("click", actions.closeWorstRoute),
    );
}

function bindRoutes(app, state, actions) {
  const destination = app.querySelector("#destinationSelect");
  const aircraftSelect = app.querySelector("#routeAircraftSelect");
  const preview = app.querySelector("#routePreview");
  const priceInput = app.querySelector("#routePrice");
  const frequencyInput = app.querySelector("#routeFrequency");
  let draft = null;
  const update = () => {
    const origin = airports.find((airport) => airport.code === state.hub);
    const dest = airports.find((airport) => airport.code === destination.value);
    const distance = routeDistance(origin, dest);
    const available = availableForRoute(state, distance);
    aircraftSelect.innerHTML =
      available
        .map((aircraft) => {
          const model = getAircraftModel(aircraft.modelId);
          return `<option value="${aircraft.id}">${aircraft.id} - ${model.model} (${model.capacity} seats)</option>`;
        })
        .join("") || `<option value="">No available aircraft in range</option>`;
    const baseDemand = estimateBaseDemand(origin, dest);
    const marketFare = marketFareFor(distance);
    if (!priceInput.dataset.touched) priceInput.value = marketFare;
    const route = {
      origin: origin.code,
      destination: dest.code,
      distance,
      baseDemand,
      competition: dest.competition,
      marketFare,
      price: Number(priceInput.value),
      frequency: Number(frequencyInput.value),
      aircraftId: available[0]?.id,
    };
    draft = route;
    const projected = projectRoute(state, route);
    preview.innerHTML = `<b>${origin.code} to ${dest.code}</b><br>${distance} miles | base demand ${baseDemand} | market fare ${money(marketFare)} | projected ${money(projected.profit)}/day at ${route.frequency} flights.`;
  };
  destination.addEventListener("change", update);
  priceInput.addEventListener("input", () => {
    priceInput.dataset.touched = "true";
    update();
  });
  frequencyInput.addEventListener("input", update);
  app.querySelector("#previewRoute").addEventListener("click", update);
  app.querySelector("#openRoute").addEventListener("click", () => {
    update();
    if (!draft || !aircraftSelect.value)
      return actions.notice(
        "No aircraft",
        "Buy an aircraft with enough range before opening this route.",
      );
    draft.aircraftId = aircraftSelect.value;
    actions.openRoute(draft);
  });
  update();
}

function advisorBrief(state) {
  const tips = [];
  const cfo = executiveById(state.executives?.cfo);
  if (!cfo) {
    tips.push({
      title: "No CFO hired",
      body: "Financial warnings are basic. A CFO is expensive, but route forecasts and aircraft risk calls get sharper.",
      tone: "warning",
    });
  }
  if (!state.routes.length) {
    const suggestion = bestRouteSuggestion(state);
    tips.push({
      title: "Open the first route",
      body: suggestion
        ? `${suggestion.origin} to ${suggestion.destination} looks strongest: ${suggestion.distance} miles, market fare ${money(suggestion.marketFare)}, base demand ${suggestion.baseDemand}.`
        : "Buy an aircraft or pick a destination with enough range.",
      tone: "warning",
    });
  } else {
    const route = state.routes
      .map((item) => ({ route: item, projection: projectRoute(state, item) }))
      .sort((a, b) => a.projection.profit - b.projection.profit)[0];
    if (route.projection.profit < 0) {
      tips.push({
        title: "Route needs attention",
        body: `${route.route.origin} to ${route.route.destination} is projected at ${money(route.projection.profit)}/day. Try lowering frequency or changing fare.`,
        tone: "danger",
      });
    } else {
      tips.push({
        title: "Network profitable",
        body: `${route.route.origin} to ${route.route.destination} is the weakest route but still projected positive at ${money(route.projection.profit)}/day.`,
        tone: "success",
      });
    }
  }
  const worn = state.fleet.find((aircraft) => aircraft.condition < 55);
  if (worn) {
    tips.push({
      title: "Maintenance risk",
      body: `${worn.id} is at ${worn.condition}% condition. Heavy maintenance will protect on-time performance.`,
      tone: "warning",
    });
  }
  if (state.cash < 2000000) {
    tips.push({
      title: "Cash buffer low",
      body: "Keep enough cash for maintenance, supplier costs, and launch fees before buying another aircraft.",
      tone: "danger",
    });
  }
  if (tips.length < 3) {
    tips.push({
      title: "Growth path",
      body: "Use the Aircraft Market after your first profitable route so idle cash turns into capacity.",
      tone: "info",
    });
  }
  return `<div class="advisor-list">${tips
    .slice(0, 3)
    .map(
      (tip) =>
        `<div class="advisor-tip ${tip.tone}"><b>${tip.title}</b><span>${tip.body}</span></div>`,
    )
    .join("")}</div>`;
}

function bestRouteSuggestion(state) {
  const origin = airports.find((airport) => airport.code === state.hub);
  if (!origin) return null;
  return airports
    .filter((airport) => airport.code !== state.hub)
    .map((destination) => {
      const distance = routeDistance(origin, destination);
      const baseDemand = estimateBaseDemand(origin, destination);
      return {
        origin: origin.code,
        destination: destination.code,
        distance,
        baseDemand,
        marketFare: marketFareFor(distance),
        score: baseDemand * 12 - destination.competition * 3 - distance * 0.08,
      };
    })
    .sort((a, b) => b.score - a.score)[0];
}

function drawNetwork(canvas, state) {
  const ctx = canvas.getContext("2d");
  drawMapBase(canvas, ctx);
  state.routes.forEach((route) => {
    const origin = airports.find((airport) => airport.code === route.origin);
    const destination = airports.find(
      (airport) => airport.code === route.destination,
    );
    drawRoute(ctx, canvas, origin, destination, state.airline.color);
  });
  airports.forEach((airport) =>
    drawAirport(
      ctx,
      canvas,
      airport,
      airport.code === state.hub,
      state.airline.color,
    ),
  );
  state.flights.forEach((flight, index) =>
    drawFlight(ctx, canvas, state, flight, index),
  );
}

function drawRoute(ctx, canvas, origin, destination, color) {
  const { start, control, end } = routeCurve(canvas, origin, destination);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 7]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawFlight(ctx, canvas, state, flight, index) {
  const route = state.routes.find((item) => item.id === flight.routeId);
  if (!route) return;
  const origin = airports.find((airport) => airport.code === route.origin);
  const destination = airports.find(
    (airport) => airport.code === route.destination,
  );
  const { start, control, end } = routeCurve(canvas, origin, destination);
  const t = Math.max(0, Math.min(1, flight.progress));
  const x =
    (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x;
  const y =
    (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y;
  const dx = 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x);
  const dy = 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-9, -6);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-9, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function routeCurve(canvas, origin, destination) {
  const rect = canvas.getBoundingClientRect();
  const start = {
    x: (origin.x * rect.width) / 1000,
    y: (origin.y * rect.height) / 560,
  };
  const end = {
    x: (destination.x * rect.width) / 1000,
    y: (destination.y * rect.height) / 560,
  };
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  return {
    start,
    end,
    control: {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2 - Math.max(42, distance * 0.18),
    },
  };
}

function labelize(text) {
  return text
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
