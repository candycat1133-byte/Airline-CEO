import { airports } from "./data/airports.js";
import { executiveById } from "./data/executives.js";
import { renderMainMenu } from "./ui/mainMenu.js";
import { renderAirlineCreation } from "./ui/airlineCreation.js";
import { renderHubSelection } from "./ui/hubSelection.js";
import { renderGame } from "./ui/dashboard.js";
import {
  addAlert,
  applyAirlineType,
  applyDifficulty,
  clampStats,
  createNewState,
} from "./systems/gameState.js";
import {
  buyAircraft,
  dailyOverhead,
  getAircraftModel,
  money,
  projectRoute,
  settleFlight,
} from "./systems/economy.js";
import { checkSafetyEvents, maybeTriggerEvent } from "./systems/events.js";
import { loadGame, resetSave, saveGame } from "./systems/saveLoad.js";

const app = document.getElementById("app");

let state = createNewState();
let screen = "menu";
let selectedHub = "DFW";
let activeTab = "Dashboard";
let lastFrame = performance.now();
let renderQueued = false;

const actions = {
  play() {
    state = createNewState();
    screen = "creation";
    render();
  },
  load() {
    const saved = loadGame();
    if (!saved) {
      notice("No Save Found", "There is no saved airline in this browser yet.");
      return;
    }
    state = { ...createNewState(), ...saved };
    state.executives = { ...createNewState().executives, ...saved.executives };
    state.staff = { ...createNewState().staff, ...saved.staff };
    state.contracts = { ...createNewState().contracts, ...saved.contracts };
    screen = "game";
    activeTab = "Dashboard";
    render();
  },
  setType(type) {
    applyAirlineType(state, type);
  },
  setDifficulty(difficulty) {
    applyDifficulty(state, difficulty);
  },
  creationBack() {
    screen = "menu";
    render();
  },
  hubSelect(code) {
    selectedHub = code;
    render();
  },
  launch(code) {
    const hub = airports.find((airport) => airport.code === code);
    if (!hub) return;
    state.hub = hub.code;
    state.cash -= hub.gateCost;
    buyAircraft(state, {
      modelId: "e145",
      source: "new",
      condition: 94,
      price: 0,
    });
    buyAircraft(state, {
      modelId: state.airline.type === "premium" ? "a320" : "e190",
      source: "new",
      condition: 93,
      price: 0,
    });
    addAlert(
      state,
      "Airline launched",
      `${state.airline.name} opened at ${hub.code}. Two starter aircraft are ready.`,
      "success",
    );
    screen = "game";
    activeTab = "Dashboard";
    render();
  },
  tab(tab) {
    activeTab = tab;
    render();
  },
  speed(speed) {
    state.paused = speed === 0;
    if (speed > 0) state.speed = speed;
    render();
  },
  buyAircraft(listing) {
    if (!buyAircraft(state, listing)) {
      notice("Purchase blocked", "There is not enough cash for that aircraft.");
      return;
    }
    render();
  },
  openRoute(route) {
    const exists = state.routes.some(
      (item) =>
        item.origin === route.origin && item.destination === route.destination,
    );
    if (exists) {
      notice(
        "Route already active",
        "That city pair is already in your schedule.",
      );
      return;
    }
    const setupCost = 140000 + route.distance * 90;
    if (state.cash < setupCost) {
      notice("Cash shortfall", `Opening this route needs ${money(setupCost)}.`);
      return;
    }
    const aircraft = state.fleet.find((item) => item.id === route.aircraftId);
    if (!aircraft) {
      notice("Aircraft unavailable", "That aircraft is no longer available.");
      return;
    }
    state.cash -= setupCost;
    aircraft.status = "Assigned";
    aircraft.routeId = state.routeId;
    const finalRoute = {
      ...route,
      id: state.routeId++,
      nextDeparture: state.minute + 8,
    };
    state.routes.push(finalRoute);
    addAlert(
      state,
      "Route opened",
      `${route.origin} to ${route.destination} launched with ${route.aircraftId}.`,
      "success",
    );
    activeTab = "Dashboard";
    render();
  },
  updateRoute(update) {
    const route = state.routes.find((item) => item.id === update.id);
    if (!route) return;
    route.price = Math.max(60, Math.min(900, update.price || route.price));
    route.frequency = Math.max(
      1,
      Math.min(12, update.frequency || route.frequency),
    );
    const projected = projectRoute(state, route);
    addAlert(
      state,
      "Route retuned",
      `${route.origin} to ${route.destination} now projects ${money(projected.profit)}/day at ${route.frequency} flights.`,
      projected.profit >= 0 ? "success" : "warning",
    );
    render();
  },
  hireExecutive(role, candidateId) {
    state.executives[role] = candidateId || null;
    const executive = executiveById(candidateId);
    addAlert(
      state,
      executive ? "Executive hired" : "Executive seat vacant",
      executive
        ? `${executive.name} joined as ${executive.title} for ${money(executive.salary)}/day. ${executive.buff}`
        : `The ${role.toUpperCase()} seat is now vacant. Payroll dropped, but the buff is gone.`,
      executive ? "success" : "warning",
    );
    render();
  },
  updateServices(services) {
    state.services = { ...state.services, ...services };
    addAlert(
      state,
      "Service plan updated",
      "Passenger experience and fee settings were changed.",
      "info",
    );
    render();
  },
  hireStaff(category, quality) {
    const staff = state.staff[category];
    if (!staff) return;
    const cost = quality === "Experienced" ? 85000 : 38000;
    if (state.cash < cost) {
      notice(
        "Hiring blocked",
        `${quality} ${category} hiring needs ${money(cost)}.`,
      );
      return;
    }
    state.cash -= cost;
    staff.count += 1;
    staff.quality = quality === "Experienced" ? "Experienced" : staff.quality;
    staff.morale = Math.min(100, staff.morale + 3);
    addAlert(
      state,
      "Staff hired",
      `${quality} ${category} joined the airline.`,
      "success",
    );
    render();
  },
  trainStaff(category) {
    const staff = state.staff[category];
    if (!staff) return;
    const cost = 45000 + staff.count * 7000;
    if (state.cash < cost) {
      notice("Training blocked", `${category} training needs ${money(cost)}.`);
      return;
    }
    state.cash -= cost;
    staff.morale = Math.min(100, staff.morale + 8);
    const ladder = ["Trainee", "Basic", "Standard", "Experienced", "Elite"];
    const next = Math.min(ladder.length - 1, ladder.indexOf(staff.quality) + 1);
    staff.quality = ladder[next] || "Standard";
    addAlert(
      state,
      "Staff trained",
      `${category} improved to ${staff.quality}.`,
      "success",
    );
    render();
  },
  updateSuppliers(nextSuppliers) {
    Object.entries(nextSuppliers).forEach(([category, contract]) => {
      state.suppliers[category] = contract.stars;
      const supplierName =
        {
          5: "5-star supplier",
          4: "4-star supplier",
          3: "3-star supplier",
          2: "2-star supplier",
          1: "1-star supplier",
          0: "0-star supplier",
        }[contract.stars] || "Supplier";
      const lengthDiscount =
        contract.length >= 365 ? 0.82 : contract.length >= 90 ? 0.92 : 1;
      state.contracts[category] = {
        name: supplierName,
        stars: contract.stars,
        daysRemaining: contract.length,
        costPerDay: Math.round((2500 + contract.stars * 2200) * lengthDiscount),
        cancellationFee: Math.round(
          (2500 + contract.stars * 2200) * contract.length * 0.18,
        ),
      };
    });
    addAlert(
      state,
      "Supplier contracts updated",
      "Supplier quality now affects costs, delays, and satisfaction.",
      "info",
    );
    render();
  },
  updateFinanceControls(next) {
    state.services.baggageFee = next.baggageFee;
    state.services.support = next.support;
    state.marketing = next.marketing;
    addAlert(
      state,
      "Finance controls updated",
      "Fees, support, and marketing spend were adjusted.",
      "info",
    );
    render();
  },
  updateMarketing(level) {
    state.marketing = level;
    addAlert(
      state,
      "Marketing campaign changed",
      `Campaign level set to ${level}.`,
      "info",
    );
    render();
  },
  maintenance() {
    const cost = Math.max(180000, state.fleet.length * 95000);
    if (state.cash < cost)
      return notice(
        "Maintenance delayed",
        `Heavy maintenance requires ${money(cost)}.`,
      );
    state.cash -= cost;
    state.fleet.forEach((aircraft) => {
      aircraft.condition = Math.min(100, aircraft.condition + 14);
      if (aircraft.status === "Grounded" && aircraft.condition > 45)
        aircraft.status = aircraft.routeId ? "Assigned" : "Available";
    });
    state.onTime += 3;
    addAlert(
      state,
      "Heavy maintenance complete",
      "Aircraft condition and reliability improved.",
      "success",
    );
    clampStats(state);
    render();
  },
  train() {
    const cost = 160000;
    if (state.cash < cost)
      return notice(
        "Training delayed",
        `Crew training requires ${money(cost)}.`,
      );
    state.cash -= cost;
    state.happiness += 5;
    state.reputation += 2;
    addAlert(
      state,
      "Crew training complete",
      "Cabin service and passenger satisfaction improved.",
      "success",
    );
    clampStats(state);
    render();
  },
  closeWorstRoute() {
    if (!state.routes.length)
      return notice("No routes", "There are no routes to close.");
    let worst = state.routes[0];
    let worstProfit = projectRoute(state, worst).profit;
    state.routes.forEach((route) => {
      const profit = projectRoute(state, route).profit;
      if (profit < worstProfit) {
        worst = route;
        worstProfit = profit;
      }
    });
    state.routes = state.routes.filter((route) => route.id !== worst.id);
    state.flights = state.flights.filter(
      (flight) => flight.routeId !== worst.id,
    );
    const aircraft = state.fleet.find((item) => item.id === worst.aircraftId);
    if (aircraft) {
      aircraft.status = "Available";
      aircraft.routeId = null;
    }
    state.reputation -= 1;
    addAlert(
      state,
      "Route closed",
      `${worst.origin} to ${worst.destination} left the schedule.`,
      "warning",
    );
    clampStats(state);
    render();
  },
  save() {
    saveGame(state);
    addAlert(
      state,
      "Saved",
      "Your airline was saved in this browser.",
      "success",
    );
    render();
  },
  menu() {
    saveGame(state);
    screen = "menu";
    render();
  },
  resetSave() {
    resetSave();
    addAlert(state, "Save reset", "Browser save data was cleared.", "warning");
    render();
  },
  notice,
};

function notice(title, body) {
  addAlert(state, title, body, "info");
  if (screen === "game") render();
  else window.alert(`${title}\n\n${body}`);
}

function render() {
  renderQueued = false;
  if (screen === "menu") {
    renderMainMenu(app, { play: actions.play, load: actions.load, notice });
    return;
  }
  if (screen === "creation") {
    renderAirlineCreation(app, state, {
      setType: actions.setType,
      setDifficulty: actions.setDifficulty,
      next: () => {
        screen = "hub";
        render();
      },
      back: actions.creationBack,
    });
    return;
  }
  if (screen === "hub") {
    renderHubSelection(app, state, selectedHub, {
      select: actions.hubSelect,
      launch: actions.launch,
      back: () => {
        screen = "creation";
        render();
      },
    });
    return;
  }
  renderGame(app, state, actions, activeTab);
}

function queueRender() {
  if (renderQueued || screen !== "game") return;
  if (
    !["Dashboard", "Fleet", "Finance", "Operations", "Events"].includes(
      activeTab,
    )
  )
    return;
  renderQueued = true;
  setTimeout(render, 900);
}

function tick(now) {
  const elapsedSeconds = Math.min(1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (screen === "game" && !state.paused) {
    advanceTime(elapsedSeconds * state.speed * 5);
  }
  requestAnimationFrame(tick);
}

function advanceTime(realSeconds) {
  const minutes = realSeconds;
  const previousDay = state.day;
  state.minute += minutes;
  while (state.minute >= 1440) {
    state.minute -= 1440;
    state.day += 1;
    state.routes.forEach((route) => {
      route.nextDeparture = Math.max(4, route.nextDeparture - 1440);
    });
    state.dailyRevenue = 0;
    state.dailyExpenses = 0;
    state.dailyProfit = 0;
    dailyOverhead(state);
    tickContracts();
    applyExecutiveDailyManagement();
    addAlert(
      state,
      "Daily report",
      `A new operating day began. Yesterday's network is now reset for fresh cash-flow tracking.`,
      "info",
    );
  }
  if (state.day !== previousDay) clampStats(state);
  spawnFlights();
  updateFlights(minutes);
  if (Math.random() < 0.015 * state.speed) maybeTriggerEvent(state);
  checkSafetyEvents(state);
  ageFleet(minutes);
  queueRender();
}

function spawnFlights() {
  state.routes.forEach((route) => {
    const interval = Math.max(18, 1440 / Math.max(1, route.frequency));
    while (state.minute >= route.nextDeparture && state.minute < 1440) {
      const aircraft = state.fleet.find((item) => item.id === route.aircraftId);
      if (!aircraft || aircraft.status === "Grounded") {
        route.nextDeparture += interval;
        continue;
      }
      if (aircraft.status === "Flying") {
        route.nextDeparture += 6;
        break;
      }
      const coo = executiveById(state.executives?.coo);
      const supplierDelay =
        Math.max(0, 3 - state.suppliers.ground) * 0.08 +
        Math.max(0, 3 - state.suppliers.maintenance) * 0.05;
      const conditionDelay =
        (Math.max(0, 65 - aircraft.condition) / 350) *
        (coo?.id === "coo-safety" ? 0.72 : 1);
      const delayed = Math.random() < supplierDelay + conditionDelay;
      const duration = Math.max(
        24,
        Math.round((route.distance / 8.2) * (delayed ? 1.18 : 1)),
      );
      const flightId = state.flightId++;
      state.flights.push({
        id: flightId,
        number: `${state.airline.callsign.slice(0, 2).padEnd(2, "A")}${100 + flightId}`,
        routeId: route.id,
        aircraftId: aircraft.id,
        status: delayed ? "Delayed" : "Boarding",
        progress: 0,
        duration,
        elapsed: 0,
        delayed,
      });
      route.nextDeparture += interval;
      if (delayed)
        addAlert(
          state,
          "Departure delay",
          `${route.origin} to ${route.destination} is delayed by ground or maintenance constraints.`,
          "warning",
        );
      aircraft.status = "Flying";
    }
  });
}

function updateFlights(minutes) {
  const completed = [];
  state.flights.forEach((flight) => {
    flight.elapsed += minutes;
    flight.progress = Math.min(1, flight.elapsed / flight.duration);
    if (flight.progress < 0.1)
      flight.status = flight.delayed ? "Delayed" : "Boarding";
    else if (flight.progress < 0.88) flight.status = "En route";
    else if (flight.progress < 1) flight.status = "Arriving";
    else completed.push(flight);
  });
  completed.forEach((flight) => completeFlight(flight));
  state.flights = state.flights.filter((flight) => flight.progress < 1);
}

function tickContracts() {
  Object.entries(state.contracts || {}).forEach(([category, contract]) => {
    contract.daysRemaining = Math.max(0, contract.daysRemaining - 1);
    if (contract.daysRemaining === 0) {
      delete state.contracts[category];
      addAlert(
        state,
        "Contract expired",
        `${category} contract expired. Supplier quality remains, but contract terms are gone.`,
        "warning",
      );
    }
  });
}

function completeFlight(flight) {
  const route = state.routes.find((item) => item.id === flight.routeId);
  if (!route) return;
  settleFlight(state, flight, route);
  const aircraft = state.fleet.find((item) => item.id === flight.aircraftId);
  if (aircraft) {
    const coo = executiveById(state.executives?.coo);
    const wear =
      (0.06 + Math.max(0, 3 - state.suppliers.maintenance) * 0.04) *
      (coo?.id === "coo-safety" ? 0.72 : 1);
    aircraft.condition = Math.max(
      0,
      Math.round((aircraft.condition - wear) * 10) / 10,
    );
    aircraft.status = aircraft.routeId ? "Assigned" : "Available";
    if (aircraft.condition < 35) {
      addAlert(
        state,
        "Mechanical warning",
        `${aircraft.id} is in poor condition. Ground it for maintenance before a worse incident.`,
        "danger",
      );
    }
  }
}

function ageFleet(minutes) {
  if (minutes <= 0) return;
  state.fleet.forEach((aircraft) => {
    if (aircraft.status !== "Flying") return;
    const model = getAircraftModel(aircraft.modelId);
    const reliabilityWear = (100 - model.reliability) / 12000;
    aircraft.condition = Math.max(
      0,
      aircraft.condition - reliabilityWear * minutes,
    );
  });
}

function applyExecutiveDailyManagement() {
  if (state.lastExecutiveAutoDay === state.day) return;
  state.lastExecutiveAutoDay = state.day;
  const ceo = executiveById(state.executives?.ceo);
  const coo = executiveById(state.executives?.coo);
  const cmo = executiveById(state.executives?.cmo);

  if (ceo?.id === "ceo-ops" && state.routes.length) {
    let weakest = state.routes[0];
    let weakestProfit = projectRoute(state, weakest).profit;
    state.routes.forEach((route) => {
      const profit = projectRoute(state, route).profit;
      if (profit < weakestProfit) {
        weakest = route;
        weakestProfit = profit;
      }
    });
    if (weakestProfit < 0) {
      weakest.frequency = Math.max(1, weakest.frequency - 1);
      weakest.price = Math.max(60, Math.round((weakest.price * 0.96) / 5) * 5);
      addAlert(
        state,
        "CEO auto-managed route",
        `${ceo.name} adjusted ${weakest.origin} to ${weakest.destination} to slow the losses.`,
        "info",
      );
    }
  }
  if (ceo?.id === "ceo-growth") state.reputation += 1;
  if (coo?.id === "coo-turnaround") state.onTime += 2;
  if (cmo?.id === "cmo-premium") state.happiness += 1;
  clampStats(state);
}

render();
requestAnimationFrame(tick);

window.addEventListener("resize", () => {
  if (screen === "hub") render();
  if (screen === "game") queueRender();
});
