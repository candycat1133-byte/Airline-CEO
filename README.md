# Airline CEO

Airline CEO is a browser-based airline management game prototype built with vanilla HTML, CSS, and JavaScript.

The game currently includes:

- Main menu, airline creation, and hub selection
- A stylized U.S. route map
- Fleet, aircraft market, new/used/lease aircraft
- Route creation, fare/frequency tuning, and flight simulation
- Staff, suppliers, contracts, executives, finance, reports, and events screens
- Reputation, passenger happiness, safety, brand awareness, on-time performance, and cash flow
- Browser save/load through `localStorage`
- Playwright smoke test coverage

## Run Locally

Use the project-local Node install if present:

```bash
PATH="$PWD/.tools/node/bin:$PATH" npm run dev
```

Then open:

```text
http://127.0.0.1:8001/airline.html
```

If Node is installed system-wide, `npm run dev` also works.

## Test

```bash
PATH="$PWD/.tools/node/bin:$PATH" npm run check:js
PATH="$PWD/.tools/node/bin:$PATH" npm run format:check
PATH="$PWD/.tools/node/bin:$PATH" npm test
```

`npm test` uses `scripts/test-playwright.sh`, which automatically adds the local Playwright Linux library bundle if it exists.

## Project Layout

```text
web/airline.html
web/airline-ceo/main.js
web/airline-ceo/styles.css
web/airline-ceo/data/
web/airline-ceo/systems/
web/airline-ceo/ui/
tests/airline.spec.js
```

## GitHub

The repository is ready for GitHub. After creating an empty GitHub repo, add it as a remote and push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Or use HTTPS:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
