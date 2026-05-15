import { aircraftCatalog } from "../data/aircraft.js";
import { executiveById, executivePayroll } from "../data/executives.js";
import { airlineTypes, addAlert, clampStats } from "./gameState.js";
import { demandForRoute } from "./demand.js";

export function money(value) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000000000) return `${sign}$${(abs / 1000000000).toFixed(1)}B`;
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}$${Math.round(abs / 1000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function clockLabel(state) {
  const hour = Math.floor(state.minute / 60) % 24;
  const minute = Math.floor(state.minute % 60);
  return `Day ${state.day}, ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getAircraftModel(modelId) {
  return aircraftCatalog.find((aircraft) => aircraft.id === modelId);
}

export function fleetAvailable(state) {
  const assigned = new Set(state.routes.map((route) => route.aircraftId));
  return state.fleet.filter((aircraft) => !assigned.has(aircraft.id));
}

export function availableForRoute(state, distance) {
  return fleetAvailable(state).filter((aircraft) => {
    const model = getAircraftModel(aircraft.modelId);
    return model.range >= distance;
  });
}

export function addAircraft(
  state,
  modelId,
  source = "new",
  condition = 94,
  priceOverride = null,
) {
  const model = getAircraftModel(modelId);
  const aircraft = {
    id: `N${String(state.aircraftId++).padStart(3, "0")}AC`,
    modelId,
    source,
    age: source === "new" ? 0 : Math.max(2, Math.round((100 - condition) / 3)),
    condition,
    interior:
      source === "new" ? "Modern" : condition > 70 ? "Standard" : "Outdated",
    status: "Available",
    routeId: null,
    paid: priceOverride || model.newPrice,
    leaseDaily: source === "lease" ? model.leasePrice : 0,
  };
  state.fleet.push(aircraft);
  return aircraft;
}

export function buyAircraft(state, listing) {
  const model = getAircraftModel(listing.modelId);
  if (!model || state.cash < listing.price) return false;
  state.cash -= listing.price;
  addAircraft(
    state,
    listing.modelId,
    listing.source,
    listing.condition,
    listing.price,
  );
  addAlert(
    state,
    "Aircraft acquired",
    `${listing.source === "used" ? "Used" : "New"} ${model.model} joined the fleet.`,
    "success",
  );
  return true;
}

export function projectRoute(state, route) {
  const aircraft = state.fleet.find((item) => item.id === route.aircraftId);
  const model = aircraft ? getAircraftModel(aircraft.modelId) : null;
  if (!model)
    return { passengers: 0, revenue: 0, expense: 0, profit: 0, loadFactor: 0 };
  const demand = demandForRoute(state, route);
  const seats = model.capacity * route.frequency;
  const conditionDrag = Math.max(0.55, aircraft.condition / 100);
  const passengers = Math.min(
    seats,
    Math.round(demand * route.frequency * conditionDrag),
  );
  const loadFactor = seats ? passengers / seats : 0;
  const feeRevenue = passengers * Math.max(0, state.services.baggageFee * 0.34);
  const cmo = executiveById(state.executives?.cmo);
  const revenue =
    (passengers * route.price + feeRevenue) *
    (cmo?.id === "cmo-premium" ? 1.04 : 1);
  const profile = airlineTypes[state.airline.type] || airlineTypes.regional;
  const supplierFuel = 1.16 - state.suppliers.fuel * 0.045;
  const supplierMaint = 1.18 - state.suppliers.maintenance * 0.05;
  const serviceCost =
    passengers * (7 + state.services.snacks * 4 + state.services.legroom * 2);
  const flightCost =
    route.frequency *
    (route.distance * model.fuelBurn * 22 * supplierFuel +
      model.maintenance * supplierMaint);
  const gateCost = route.frequency * 900;
  const expense =
    (flightCost + serviceCost + gateCost) * profile.costMultiplier;
  return {
    passengers,
    revenue,
    expense,
    profit: revenue - expense,
    loadFactor,
    demand,
  };
}

export function settleFlight(state, flight, route) {
  const projected = projectRoute(state, route);
  const perFlightRevenue = projected.revenue / Math.max(1, route.frequency);
  const perFlightExpense = projected.expense / Math.max(1, route.frequency);
  const profit = perFlightRevenue - perFlightExpense;
  state.cash += profit;
  state.dailyRevenue += perFlightRevenue;
  state.dailyExpenses += perFlightExpense;
  state.dailyProfit += profit;
  const passengers = Math.round(
    projected.passengers / Math.max(1, route.frequency),
  );
  state.totalPassengers += passengers;
  flight.passengers = passengers;
  flight.loadFactor = projected.loadFactor;
  flight.profit = profit;
  flight.ticketRevenue = perFlightRevenue;
  flight.expense = perFlightExpense;
  const routeQuality = projected.loadFactor > 0.72 ? 0.25 : -0.15;
  state.happiness += routeQuality;
  state.brandAwareness += 0.08 + passengers / 1800;
  if (flight.delayed) state.onTime -= 0.35;
  else state.onTime += 0.08;
  if (state.suppliers.maintenance < 2 || state.suppliers.security < 2)
    state.safety -= 0.08;
  else state.safety += 0.025;
  if (projected.profit < 0) state.reputation -= 0.03;
  else state.reputation += 0.02;
  clampStats(state);
}

export function dailyOverhead(state) {
  const profile = airlineTypes[state.airline.type] || airlineTypes.regional;
  const fleetCost = state.fleet.reduce((sum, aircraft) => {
    const model = getAircraftModel(aircraft.modelId);
    return (
      sum +
      model.maintenance * (aircraft.condition < 55 ? 1.8 : 1.1) +
      (aircraft.leaseDaily || 0)
    );
  }, 0);
  const supplierCost = Object.values(state.suppliers).reduce(
    (sum, stars) => sum + 1200 + stars * 1700,
    0,
  );
  const contractCost = Object.values(state.contracts || {}).reduce(
    (sum, contract) => sum + contract.costPerDay,
    0,
  );
  const staffCost = Object.values(state.staff || {}).reduce((sum, staff) => {
    const qualityCost =
      staff.quality === "Elite"
        ? 13500
        : staff.quality === "Experienced"
          ? 9800
          : staff.quality === "Basic"
            ? 5200
            : 7200;
    return sum + staff.count * qualityCost;
  }, 0);
  const marketing = state.marketing * 18500;
  const staff = (47000 + staffCost) * profile.costMultiplier;
  const total =
    fleetCost +
    supplierCost +
    contractCost +
    marketing +
    staff +
    executivePayroll(state.executives);
  state.cash -= total;
  state.dailyExpenses += total;
  state.dailyProfit -= total;
}
