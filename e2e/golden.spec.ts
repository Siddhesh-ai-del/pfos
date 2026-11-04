// Golden-path E2E (§2.6). Structure:
//   • Ambient checks (Beat 0, reset) ALWAYS run — no LLM involved.
//   • Beat 1–9 conversational assertions run ONLY when OPENROUTER_API_KEY is
//     present in the environment; otherwise they are SKIPPED EXPLICITLY and the
//     file says why. They are never silently skipped by an `|| true`.
//
// Run: PFOS_BASE_URL=http://localhost:3214 npx playwright test
// With LLM: OPENROUTER_API_KEY=... PFOS_BASE_URL=http://localhost:3214 npx playwright test
import { test, expect } from "@playwright/test";

const HAS_LLM = Boolean(process.env.OPENROUTER_API_KEY);

test.describe.serial("Beat 0 — fresh load + reset", () => {
  test("rail shows the seeded §2.3 figures and reset restores them", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Personal Financial Operating System/);

    // TopBar: product name + ledger-derived month label
    await expect(
      page.getByRole("banner").getByText("PFOS", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByText("November 2026"),
    ).toBeVisible();

    // Context rail — pre-demo numbers (§2.3 / §2.6 Beat 0)
    await expect(page.getByText("₹2,650", { exact: false }).first()).toBeVisible(); // Food left
    await expect(page.getByText("₹1,405", { exact: false }).first()).toBeVisible(); // Transport
    await expect(page.getByText("₹500", { exact: false }).first()).toBeVisible(); // Discretionary
    await expect(page.getByText("₹4,100", { exact: false }).first()).toBeVisible(); // Tiffin prepaid balance
    await expect(page.getByText("₹1,445", { exact: false }).first()).toBeVisible(); // November to-date
    await expect(
      page.getByText("Continuing tiffin subscription next month"),
    ).toBeVisible();

    // Reset demo → seeded state returns
    await page.getByRole("button", { name: "Reset demo data" }).click();
    await expect(page.getByText("₹2,650", { exact: false }).first()).toBeVisible();
  });
});

test.describe.serial("Beats 1–9 — scripted conversation (LLM REQUIRED)", () => {
  test.skip(
    !HAS_LLM,
    "OPENROUTER_API_KEY not set — conversational beats require a live model; " +
      "covered mechanically by vitest (executor/weave/cards) and manually by the §2.6 drive.",
  );

  test("full §2.6 replay", async ({ page }) => {
    await page.goto("/");
    // ensure canonical Beat 0
    await page.getByRole("button", { name: "Reset demo data" }).click();
    await expect(page.getByText("₹2,650", { exact: false }).first()).toBeVisible();

    const type = async (line: string) => {
      await page.getByLabel("Expense or question").fill(line);
      await page.getByRole("button", { name: "Send" }).click();
    };

    // Beat 1 — capture + ₹120 lunch + confirm → budget refreshes
    await type("spent ₹120 on lunch today");
    await expect(page.getByText("Estimated", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: /Confirm ₹120/ }).click();
    await expect(page.getByText("₹2,530", { exact: false }).first()).toBeVisible();

    // Beat 2 — headphone overflow gate: ₹500 left, ₹2,500 over
    await type("bought headphones for ₹3,000");
    await expect(
      page.getByText(/₹500 left in Discretionary/i),
    ).toBeVisible();
    // no draft created — audit trail is the source of truth
    await expect(
      page.getByRole("button", { name: /Confirm ₹3,000/ }),
    ).toHaveCount(0);

    // Beat 3 — planned purchase → draft appears
    await type("yes, planned");
    await expect(
      page.getByRole("button", { name: /Confirm ₹3,000/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Confirm ₹3,000/ }).click();

    // Beat 4 — commitment
    await type("cap Swiggy at 8 orders a month");
    await expect(
      page.getByText("Cap Swiggy at 8 orders a month", { exact: false }).last(),
    ).toBeVisible();

    // Beat 7 — tiffin refill
    await type("had lunch at the mess today");
    await expect(
      page.getByRole("button", { name: /Confirm.*[Ll]unch/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Confirm.*[Ll]unch/i }).click();
    await expect(page.getByText("₹4,000", { exact: false })).toBeVisible();

    // Beat 8 — daily report card appears in chat
    await type("show me today's report");
    await expect(page.getByText(/Daily report/i)).toBeVisible();

    // Beat 9 — monthly statement appears
    await type("how's my month looking?");
    await expect(page.getByText(/Monthly statement/i)).toBeVisible();
  });
});
