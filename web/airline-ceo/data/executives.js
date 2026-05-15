export const executiveRoles = [
  {
    id: "ceo",
    title: "Chief Executive Officer",
    empty: "Founder managed",
    candidates: [
      {
        id: "ceo-ops",
        name: "Maya Chen",
        salary: 185000,
        buff: "Auto-balances the weakest route once per day.",
      },
      {
        id: "ceo-growth",
        name: "Grant Holloway",
        salary: 240000,
        buff: "Boosts reputation gains and expansion momentum.",
      },
    ],
  },
  {
    id: "cfo",
    title: "Chief Financial Officer",
    empty: "No CFO",
    candidates: [
      {
        id: "cfo-basic",
        name: "Rina Patel",
        salary: 95000,
        buff: "Adds sharper cash and route warnings.",
      },
      {
        id: "cfo-elite",
        name: "Julian Mercer",
        salary: 210000,
        buff: "Improves forecasts and flags risky aircraft deals.",
      },
    ],
  },
  {
    id: "coo",
    title: "Chief Operations Officer",
    empty: "No COO",
    candidates: [
      {
        id: "coo-turnaround",
        name: "Elena Brooks",
        salary: 155000,
        buff: "Improves on-time performance and turnaround discipline.",
      },
      {
        id: "coo-safety",
        name: "Owen Voss",
        salary: 190000,
        buff: "Slows aircraft wear and reduces delay risk.",
      },
    ],
  },
  {
    id: "cmo",
    title: "Chief Marketing Officer",
    empty: "No CMO",
    candidates: [
      {
        id: "cmo-brand",
        name: "Sofia Nadir",
        salary: 130000,
        buff: "Improves demand from marketing spend.",
      },
      {
        id: "cmo-premium",
        name: "Theo Banks",
        salary: 165000,
        buff: "Improves passenger happiness and premium pricing.",
      },
    ],
  },
];

export function executiveById(id) {
  for (const role of executiveRoles) {
    const candidate = role.candidates.find((item) => item.id === id);
    if (candidate) return { ...candidate, role: role.id, title: role.title };
  }
  return null;
}

export function executivePayroll(executives = {}) {
  return Object.values(executives).reduce((sum, id) => {
    const executive = executiveById(id);
    return sum + (executive ? executive.salary : 0);
  }, 0);
}
