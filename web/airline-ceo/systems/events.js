import { addAlert, clampStats } from "./gameState.js";

const eventPool = [
  {
    title: "Fuel Prices Spike",
    body: "Fuel costs jumped for the day. Your fuel supplier softened part of the hit.",
    cash: -140000,
    rep: 0,
    severity: "warning",
  },
  {
    title: "Viral Passenger Review",
    body: "A passenger posted a glowing cabin review. Service quality is paying off.",
    cash: 35000,
    rep: 2,
    happiness: 3,
    severity: "success",
  },
  {
    title: "Airport Congestion",
    body: "Congestion created rolling delays across one hub bank.",
    cash: -45000,
    rep: -1,
    onTime: -4,
    severity: "warning",
  },
  {
    title: "Route Demand Surge",
    body: "A convention boosted bookings on leisure and business routes.",
    cash: 90000,
    rep: 1,
    severity: "success",
  },
  {
    title: "Baggage Complaint Thread",
    body: "Passengers complained about baggage handling. Supplier quality matters.",
    cash: -30000,
    rep: -2,
    happiness: -3,
    severity: "danger",
  },
  {
    title: "CFO Memo",
    body: "Your CFO recommends keeping enough cash for maintenance and route launches.",
    cash: 0,
    rep: 0,
    severity: "info",
  },
];

export function maybeTriggerEvent(state) {
  const eventRisk =
    state.airline.difficulty === "hard"
      ? 1.35
      : state.airline.difficulty === "easy"
        ? 0.75
        : 1;
  const supplierRisk =
    Math.max(0, 3 - state.suppliers.maintenance) * 0.04 +
    Math.max(0, 3 - state.suppliers.baggage) * 0.025;
  if (Math.random() > (0.06 + supplierRisk) * eventRisk) return;
  const event = eventPool[Math.floor(Math.random() * eventPool.length)];
  state.cash += event.cash || 0;
  state.reputation += event.rep || 0;
  state.happiness += event.happiness || 0;
  state.onTime += event.onTime || 0;
  if (event.severity === "danger") state.safety -= 1;
  addAlert(state, event.title, event.body, event.severity);
  clampStats(state);
}

export function checkSafetyEvents(state) {
  const dangerous = state.fleet.find((aircraft) => aircraft.condition < 28);
  if (!dangerous || Math.random() > 0.012) return;
  state.cash -= 1900000;
  state.reputation = 0;
  state.safety = Math.max(0, state.safety - 35);
  state.happiness = Math.max(0, state.happiness - 30);
  dangerous.status = "Grounded";
  addAlert(
    state,
    "Catastrophic Failure",
    `${dangerous.id} suffered a severe incident after repeated safety warnings. Regulators and passengers are furious.`,
    "danger",
  );
}
