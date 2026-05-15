import { airlineTypes } from "./gameState.js";
import { executiveById } from "../data/executives.js";

export function marketFareFor(distance) {
  return Math.round((95 + distance * 0.13) / 5) * 5;
}

export function routeDistance(origin, destination) {
  return Math.round(
    Math.hypot(origin.x - destination.x, origin.y - destination.y) * 4.15,
  );
}

export function estimateBaseDemand(origin, destination) {
  const tourismBoost =
    ["MCO", "LAS", "MIA"].includes(destination.code) ||
    ["MCO", "LAS", "MIA"].includes(origin.code)
      ? 10
      : 0;
  const businessBoost = ["JFK", "ORD", "ATL", "DFW", "LAX"].includes(
    destination.code,
  )
    ? 6
    : 0;
  return Math.round(
    (origin.demand + destination.demand) / 2 +
      tourismBoost +
      businessBoost -
      destination.competition * 0.18,
  );
}

export function serviceScore(state) {
  const service = state.services;
  const supplierAverage =
    (state.suppliers.catering +
      state.suppliers.cleaning +
      state.suppliers.baggage +
      state.suppliers.ground) /
    4;
  const feePenalty = Math.max(0, service.baggageFee - 35) * 0.28;
  return Math.max(
    35,
    Math.min(
      120,
      55 +
        service.legroom * 8 +
        service.snacks * 6 +
        service.support * 6 +
        supplierAverage * 6 -
        feePenalty,
    ),
  );
}

export function demandForRoute(state, route) {
  const profile = airlineTypes[state.airline.type] || airlineTypes.regional;
  const cmo = executiveById(state.executives?.cmo);
  const fareRatio = route.price / route.marketFare;
  const fareTolerance =
    profile.fareTolerance + (cmo?.id === "cmo-premium" ? 0.05 : 0);
  const priceMultiplier =
    fareRatio <= fareTolerance
      ? 1.18 - Math.max(0, fareRatio - 0.75) * 0.28
      : Math.max(0.28, 1 - (fareRatio - fareTolerance) * 1.55);
  const reputationMultiplier = 0.55 + state.reputation / 95;
  const onTimeMultiplier = 0.75 + (state.onTime / 100) * 0.5;
  const brandAwarenessMultiplier = 0.92 + (state.brandAwareness / 100) * 0.28;
  const marketingMultiplier =
    1 + state.marketing * (cmo?.id === "cmo-brand" ? 0.11 : 0.08);
  const serviceMultiplier =
    (serviceScore(state) / 75) * profile.serviceMultiplier;
  const competitionMultiplier = Math.max(0.45, 1 - route.competition / 170);
  const seasonMultiplier =
    route.destination === "MCO" || route.destination === "LAS" ? 1.08 : 1;
  return Math.max(
    4,
    Math.round(
      route.baseDemand *
        profile.demandMultiplier *
        priceMultiplier *
        reputationMultiplier *
        marketingMultiplier *
        onTimeMultiplier *
        brandAwarenessMultiplier *
        serviceMultiplier *
        competitionMultiplier *
        seasonMultiplier,
    ),
  );
}
