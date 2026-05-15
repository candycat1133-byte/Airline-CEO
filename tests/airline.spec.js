import { expect, test } from "@playwright/test";

async function expectCanvasPainted(page, selector) {
  await expect
    .poll(async () =>
      page.locator(selector).evaluate((canvas) => {
        const ctx = canvas.getContext("2d");
        const { width, height } = canvas;
        if (!width || !height) return 0;
        const data = ctx.getImageData(0, 0, width, height).data;
        const colors = new Set();
        for (let i = 0; i < data.length; i += Math.max(4, Math.floor(data.length / 900)) * 4) {
          colors.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
        }
        return colors.size;
      }),
    )
    .toBeGreaterThan(3);
}

test("Airline CEO can start a new airline and reach the dashboard", async ({ page }) => {
  await page.goto("/airline.html");
  await expect(page.getByRole("heading", { name: "Airline CEO" })).toBeVisible();
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByLabel("Airline name").fill("Testline Air");
  await page.getByLabel("Callsign").fill("TEST");
  await page.getByRole("button", { name: "Next: Pick Hub" }).click();
  await expectCanvasPainted(page, "#hubCanvas");
  await page.getByRole("button", { name: /DFW -/ }).click();
  await page.getByRole("button", { name: "Confirm Hub" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Testline Air", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Executive Brief" })).toBeVisible();
  await expectCanvasPainted(page, "#networkCanvas");

  await page.locator(".nav").getByRole("button", { name: "Routes" }).click();
  await expect(page.getByRole("heading", { name: "Create Route" })).toBeVisible();
  await page.getByRole("button", { name: "Open Route" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.locator(".nav").getByRole("button", { name: "Routes" }).click();
  await expect(page.locator(".route-item").getByText("DFW to MCO")).toBeVisible();
  await page.locator("[data-route-price]").first().fill("215");
  await page.locator("[data-update-route]").first().click();
  await expect(page.locator("[data-route-price]").first()).toHaveValue("215");
  await page.locator(".nav").getByRole("button", { name: "Executives" }).click();
  await page.getByRole("button", { name: /Maya Chen/ }).click();
  await expect(page.getByText(/Maya Chen hired/)).toBeVisible();
  await page.locator(".nav").getByRole("button", { name: "Flights" }).click();
  await expect(page.getByRole("heading", { name: "Next Departures" })).toBeVisible();
});
