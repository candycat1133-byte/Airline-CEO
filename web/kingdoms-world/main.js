import { kingdoms, mapRegions, messengerItems, newsItems, timelineEvents } from "./data.js";

const state = {
  query: "",
  filter: "All",
  selectedKingdomId: kingdoms[0].id,
  selectedRegionId: mapRegions[0].id,
};

const statusOptions = ["All", "Active", "Dead", "Hidden", "WIP", "Discovered"];
const statusAliases = {
  Discovered: ["Discovered"],
  WIP: ["WIP"],
};

const $ = (selector) => document.querySelector(selector);

const atmosphereThemes = {
  aquiloth: {
    label: "Aquiloth winter wind",
    pieces: [
      ["wind-stream wind-a", 1],
      ["wind-stream wind-b", 1],
      ["snow-dust", 7],
      ["ice-spike spike-a", 1],
      ["ice-spike spike-b", 1],
      ["ice-spike spike-c", 1],
    ],
  },
  draconis: {
    label: "Draconis ash and embers",
    pieces: [
      ["ember ember-a", 1],
      ["ember ember-b", 1],
      ["ash-fall", 6],
      ["fire-glow", 1],
    ],
  },
  jurassic: {
    label: "Jurassic jungle canopy",
    pieces: [
      ["jungle-vine vine-a", 1],
      ["jungle-vine vine-b", 1],
      ["jungle-leaf", 7],
      ["amber-orb orb-a", 1],
      ["amber-orb orb-b", 1],
      ["stone-rune rune-a", 1],
    ],
  },
  golem: {
    label: "G.O.L.E.M copperworks",
    pieces: [
      ["gear-ring gear-a", 1],
      ["gear-ring gear-b", 1],
      ["steam-puff", 5],
      ["copper-spark spark-a", 1],
    ],
  },
  aquifer: {
    label: "Aquifer waterbending",
    pieces: [
      ["water-ribbon water-a", 1],
      ["water-ribbon water-b", 1],
      ["bubble", 8],
      ["wave-line wave-a", 1],
    ],
  },
  furtivo: {
    label: "Furtivo sculk pulse",
    pieces: [
      ["sculk-pulse pulse-a", 1],
      ["sculk-pulse pulse-b", 1],
      ["sculk-sensor sensor-a", 1],
      ["sculk-speck", 8],
    ],
  },
};

function kingdomById(id) {
  return kingdoms.find((kingdom) => kingdom.id === id) || kingdoms[0];
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function flattenSearchText(kingdom) {
  return [
    kingdom.name,
    kingdom.status,
    kingdom.theme,
    kingdom.leader,
    kingdom.population,
    kingdom.militaryPopulation,
    kingdom.region,
    kingdom.tagline,
    kingdom.overview,
    ...(kingdom.notes || []),
    ...(kingdom.lore || []),
    ...(kingdom.stats || []).flat(),
    ...(kingdom.government || []),
    ...(kingdom.culture || []),
    ...(kingdom.diplomacy || []),
    ...(kingdom.weaknesses || []),
    ...(kingdom.places || []).flatMap((place) => [place.name, place.type, place.detail]),
    ...(kingdom.military || []).flatMap((rank) => [rank.name, rank.detail, rank.count]),
    ...(kingdom.shops || []),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesFilter(kingdom) {
  if (state.filter === "All") return true;
  const aliases = statusAliases[state.filter] || [state.filter];
  return aliases.includes(kingdom.status);
}

function getFilteredKingdoms() {
  const query = state.query.trim().toLowerCase();
  return kingdoms.filter((kingdom) => {
    const textMatch = !query || flattenSearchText(kingdom).includes(query);
    return textMatch && matchesFilter(kingdom);
  });
}

function renderFilters() {
  $("#statusFilters").innerHTML = statusOptions
    .map(
      (status) => `
        <button class="filter-pill ${state.filter === status ? "is-active" : ""}" type="button" data-filter="${status}">
          ${status}
        </button>
      `,
    )
    .join("");
}

function renderKingdomGrid() {
  const filtered = getFilteredKingdoms();
  $("#kingdomGrid").innerHTML =
    filtered
      .map(
        (kingdom) => `
          <article class="kingdom-card" style="--faction:${kingdom.colors.primary};--faction-dark:${kingdom.colors.dark};--faction-glow:${kingdom.colors.glow}">
            <div class="sigil" aria-hidden="true">${kingdom.name
              .split(" ")
              .filter((word) => !["The", "of"].includes(word))
              .slice(0, 2)
              .map((word) => word[0])
              .join("")}</div>
            <div class="card-head">
              <span class="status status-${kingdom.status.toLowerCase()}">${kingdom.status}</span>
              <span>${kingdom.theme}</span>
            </div>
            <h3>${kingdom.name}</h3>
            <p>${kingdom.tagline}</p>
            <dl class="mini-stats">
              <div><dt>Leader</dt><dd>${kingdom.leader}</dd></div>
              <div><dt>Population</dt><dd>${kingdom.population}</dd></div>
              <div><dt>Military</dt><dd>${kingdom.militaryPopulation}</dd></div>
            </dl>
            <button class="button compact" type="button" data-view-kingdom="${kingdom.id}">View Kingdom</button>
          </article>
        `,
      )
      .join("") || `<p class="empty-state">No kingdom records match this search.</p>`;
}

function renderList(title, items, emptyText = "No archive records yet.") {
  return `
    <section class="detail-block">
      <h4>${title}</h4>
      <div class="chip-list">
        ${
          items?.length
            ? items.map((item) => `<span>${escapeText(item)}</span>`).join("")
            : `<span class="empty-chip">${emptyText}</span>`
        }
      </div>
    </section>
  `;
}

function renderAtmosphere(kingdom) {
  const theme = atmosphereThemes[kingdom.id] || atmosphereThemes.aquiloth;
  document.body.dataset.faction = kingdom.id;
  return `
    <div class="faction-atmosphere" aria-hidden="true" aria-label="${theme.label}">
      ${theme.pieces
    .flatMap(([className, count]) =>
      Array.from(
        { length: count },
        (_, index) => {
          const position = ((index + 1) * 17 + className.length * 3) % 88;
          const size = 6 + (((index + 1) * 5 + className.length) % 14);
          return `<span class="${className}" style="--i:${index + 1};--x:${position + 4}%;--s:${size}px"></span>`;
        },
      ),
    )
    .join("")}
    </div>
  `;
}

function renderKingdomDetail() {
  const kingdom = kingdomById(state.selectedKingdomId);
  $("#kingdomDetail").style.setProperty("--faction", kingdom.colors.primary);
  $("#kingdomDetail").style.setProperty("--faction-dark", kingdom.colors.dark);
  $("#kingdomDetail").style.setProperty("--faction-glow", kingdom.colors.glow);
  $("#kingdomDetail").innerHTML = `
    <article class="detail-card">
      ${renderAtmosphere(kingdom)}
      <div class="detail-hero">
        <div>
          <span class="status status-${kingdom.status.toLowerCase()}">${kingdom.status}</span>
          <h3>${kingdom.name}</h3>
          <p>${kingdom.overview}</p>
        </div>
        <div class="detail-sigil" aria-hidden="true">${kingdom.region}</div>
      </div>

      <div class="stat-panel">
        ${[
          ["Leader", kingdom.leader],
          ["Population", kingdom.population],
          ["Military", kingdom.militaryPopulation],
          ["Region", kingdom.region],
        ]
          .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
          .join("")}
      </div>

      <div class="detail-columns">
        <section class="detail-block">
          <h4>Lore Archive</h4>
          <details open>
            <summary>Read preserved lore notes</summary>
            <ol class="lore-list">
              ${kingdom.lore.map((item) => `<li>${escapeText(item)}</li>`).join("")}
            </ol>
          </details>
        </section>

        <section class="detail-block">
          <h4>Military</h4>
          <div class="rank-list">
            ${kingdom.military
              .map(
                (rank) => `
                  <div>
                    <strong>${rank.name}</strong>
                    <span>${rank.detail}</span>
                    <b>${rank.count}</b>
                  </div>
                `,
              )
              .join("")}
          </div>
        </section>
      </div>

      <div class="detail-columns">
        <section class="detail-block">
          <h4>Stats</h4>
          <dl class="record-list">
            ${kingdom.stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
          </dl>
        </section>
        <section class="detail-block">
          <h4>Cities, Towns, and Sites</h4>
          <div class="place-list">
            ${kingdom.places
              .map(
                (place) => `
                  <article>
                    <span>${place.type}</span>
                    <h5>${place.name}</h5>
                    <p>${place.detail}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
        </section>
      </div>

      <div class="detail-columns">
        ${renderList("Government", kingdom.government)}
        ${renderList("Culture", kingdom.culture)}
      </div>
      <div class="detail-columns">
        ${renderList("Diplomacy and Politics", kingdom.diplomacy)}
        ${renderList("Weaknesses", kingdom.weaknesses)}
      </div>
      ${renderList("Commerce, Shops, Food, or Factories", kingdom.shops)}
      <section class="detail-block note-block">
        <h4>Archive Notes</h4>
        ${
          kingdom.notes?.length
            ? kingdom.notes.map((note) => `<p>${escapeText(note)}</p>`).join("")
            : `<p class="empty-note">No special archive notes recorded yet.</p>`
        }
      </section>
      <section class="detail-block">
        <h4>${kingdom.timelineTitle || `${kingdom.name} Mini Timeline`}</h4>
        <div class="mini-timeline">
          ${
            kingdom.timeline?.length
              ? kingdom.timeline
                  .map(([year, event]) => `<div><strong>${year}</strong><span>${event}</span></div>`)
                  .join("")
              : `<div><strong>Pending</strong><span>No kingdom-specific timeline recorded yet.</span></div>`
          }
        </div>
      </section>
    </article>
  `;
}

function renderTimeline() {
  $("#timelineList").innerHTML = timelineEvents
    .map(
      (event, index) => `
        <details class="timeline-item" ${index === timelineEvents.length - 1 ? "open" : ""}>
          <summary>
            <span class="timeline-index">${String(index + 1).padStart(2, "0")}</span>
            <strong>${event}</strong>
          </summary>
          <p>
            Archive description slot: add dates, witnesses, battlefield notes, or future corrections here.
          </p>
        </details>
      `,
    )
    .join("");
}

function renderNews() {
  $("#newsBoard").innerHTML = newsItems
    .map(
      (item) => `
        <article class="notice-card">
          <span>${item.tag}</span>
          <h3>${item.title}</h3>
          <p>${item.body}</p>
        </article>
      `,
    )
    .join("");
}

function renderMessenger() {
  $("#messageBoard").innerHTML = messengerItems
    .map(
      (item) => `
        <article class="message-card">
          <span>From ${item.from}</span>
          <p>${item.message}</p>
        </article>
      `,
    )
    .join("");
}

function renderMap() {
  const selected = mapRegions.find((region) => region.id === state.selectedRegionId) || mapRegions[0];
  const selectedKingdom = kingdomById(selected.kingdomId);
  $("#fantasyMap").innerHTML = `
    <div class="map-card" style="--faction:${selectedKingdom.colors.primary};--faction-glow:${selectedKingdom.colors.glow}">
      <span>Selected Region</span>
      <h3>${selected.name}</h3>
      <p>Controlled by ${selectedKingdom.name}</p>
      <button class="button compact" type="button" data-view-kingdom="${selectedKingdom.id}">Open faction record</button>
    </div>
    ${mapRegions
      .map((region) => {
        const kingdom = kingdomById(region.kingdomId);
        return `
          <button
            class="map-marker ${region.id === state.selectedRegionId ? "is-active" : ""}"
            type="button"
            data-region="${region.id}"
            style="left:${region.x}%;top:${region.y}%;--faction:${kingdom.colors.primary};"
            aria-label="${region.name}, controlled by ${kingdom.name}"
          >
            <span>${region.name}</span>
          </button>
        `;
      })
      .join("")}
  `;
}

function selectKingdom(id) {
  state.selectedKingdomId = id;
  renderKingdomDetail();
  $("#kingdomDetail").scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindEvents() {
  $("#kingdomSearch").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderKingdomGrid();
  });

  $("#statusFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    renderFilters();
    renderKingdomGrid();
  });

  document.addEventListener("click", (event) => {
    const kingdomButton = event.target.closest("[data-view-kingdom]");
    if (kingdomButton) {
      selectKingdom(kingdomButton.dataset.viewKingdom);
      return;
    }

    const regionButton = event.target.closest("[data-region]");
    if (regionButton) {
      state.selectedRegionId = regionButton.dataset.region;
      renderMap();
    }
  });

  $("#navToggle").addEventListener("click", () => {
    const nav = $("#siteNav");
    const isOpen = nav.classList.toggle("is-open");
    $("#navToggle").setAttribute("aria-expanded", String(isOpen));
  });

  $("#siteNav").addEventListener("click", () => {
    $("#siteNav").classList.remove("is-open");
    $("#navToggle").setAttribute("aria-expanded", "false");
  });

  $("#archiveMode").addEventListener("change", (event) => {
    document.body.classList.toggle("archive-mode", event.target.checked);
  });
}

function init() {
  renderFilters();
  renderKingdomGrid();
  renderKingdomDetail();
  renderTimeline();
  renderNews();
  renderMessenger();
  renderMap();
  bindEvents();
}

init();
