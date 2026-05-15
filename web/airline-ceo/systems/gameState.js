export const airlineTypes = {
  budget: {
    label: "Budget Carrier",
    cash: 30000000,
    reputation: 50,
    costMultiplier: 0.88,
    serviceMultiplier: 0.92,
    demandMultiplier: 1.12,
    fareTolerance: 0.9,
    description:
      "Lower costs and price-sensitive customers. Service can be lean if fares stay low.",
  },
  regional: {
    label: "Regional Carrier",
    cash: 25000000,
    reputation: 55,
    costMultiplier: 1,
    serviceMultiplier: 1,
    demandMultiplier: 1.03,
    fareTolerance: 1,
    description: "Balanced starter type with good short-route economics.",
  },
  full: {
    label: "Full-Service Carrier",
    cash: 25000000,
    reputation: 60,
    costMultiplier: 1.12,
    serviceMultiplier: 1.1,
    demandMultiplier: 1,
    fareTolerance: 1.08,
    description: "Higher costs, better satisfaction, and stronger brand trust.",
  },
  premium: {
    label: "Premium Carrier",
    cash: 25000000,
    reputation: 65,
    costMultiplier: 1.28,
    serviceMultiplier: 1.22,
    demandMultiplier: 0.9,
    fareTolerance: 1.18,
    description:
      "Expensive to operate with high revenue potential when service is excellent.",
  },
};

export const difficulties = {
  easy: {
    label: "Easy",
    cashMultiplier: 1.25,
    reputationBonus: 8,
    competitionMultiplier: 0.85,
    eventRisk: 0.75,
  },
  normal: {
    label: "Normal",
    cashMultiplier: 1,
    reputationBonus: 0,
    competitionMultiplier: 1,
    eventRisk: 1,
  },
  hard: {
    label: "Hard",
    cashMultiplier: 0.72,
    reputationBonus: -7,
    competitionMultiplier: 1.18,
    eventRisk: 1.35,
  },
};

export function createNewState() {
  return {
    version: 1,
    screen: "menu",
    airline: {
      name: "Cloudline Air",
      callsign: "CLOUD",
      color: "#f28c28",
      type: "regional",
      difficulty: "normal",
    },
    hub: null,
    cash: 13500000,
    reputation: 52,
    happiness: 64,
    safety: 75,
    brandAwareness: 20,
    onTime: 89,
    day: 1,
    minute: 6 * 60,
    speed: 1,
    paused: false,
    dailyRevenue: 0,
    dailyExpenses: 0,
    dailyProfit: 0,
    totalPassengers: 0,
    routeId: 1,
    aircraftId: 1,
    flightId: 1,
    routes: [],
    fleet: [],
    flights: [],
    alerts: [],
    lastTickAt: 0,
    services: { legroom: 2, snacks: 2, baggageFee: 30, support: 2 },
    staff: {
      pilots: { count: 4, needed: 2, quality: "Standard", morale: 72 },
      attendants: { count: 8, needed: 4, quality: "Standard", morale: 72 },
      mechanics: { count: 3, needed: 2, quality: "Standard", morale: 70 },
      gateAgents: { count: 4, needed: 2, quality: "Standard", morale: 70 },
      dispatchers: { count: 2, needed: 1, quality: "Standard", morale: 74 },
      support: { count: 3, needed: 2, quality: "Standard", morale: 68 },
    },
    executives: {
      ceo: null,
      cfo: null,
      coo: null,
      cmo: null,
    },
    lastExecutiveAutoDay: 0,
    suppliers: {
      catering: 3,
      baggage: 3,
      fuel: 3,
      maintenance: 3,
      cleaning: 3,
      ground: 3,
      security: 3,
      dealer: 3,
    },
    contracts: {},
    marketing: 1,
  };
}

export function applyAirlineType(state, type) {
  const profile = airlineTypes[type] || airlineTypes.regional;
  const difficulty =
    difficulties[state.airline.difficulty] || difficulties.normal;
  state.airline.type = type;
  state.cash = Math.round(profile.cash * difficulty.cashMultiplier);
  state.reputation = profile.reputation + difficulty.reputationBonus;
  state.happiness = Math.round(58 + profile.serviceMultiplier * 8);
  clampStats(state);
}

export function applyDifficulty(state, difficultyId) {
  state.airline.difficulty = difficultyId;
  applyAirlineType(state, state.airline.type);
}

export function addAlert(state, title, body, severity = "info") {
  state.alerts.unshift({
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now() + Math.random()),
    title,
    body,
    severity,
    day: state.day,
    minute: state.minute,
  });
  state.alerts = state.alerts.slice(0, 18);
}

export function clampStats(state) {
  state.reputation = Math.max(0, Math.min(100, Math.round(state.reputation)));
  state.happiness = Math.max(0, Math.min(100, Math.round(state.happiness)));
  state.safety = Math.max(0, Math.min(100, Math.round(state.safety)));
  state.brandAwareness = Math.max(
    0,
    Math.min(100, Math.round(state.brandAwareness)),
  );
  state.onTime = Math.max(0, Math.min(100, Math.round(state.onTime)));
}
