import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// E2E smoke (T-23): the placeholder home route loads and passes the axe-core a11y
// baseline (Design System lands in Session 4; the bare page must still be clean).
test("placeholder home route loads with no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "PULSE" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
