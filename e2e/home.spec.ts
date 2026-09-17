import { expect, test } from "@playwright/test";

test("signed-out homepage keeps read-only copy and disables generate", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
  await expect(page.getByText(/read-only access/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate" })).toBeDisabled();
  await expect(page.getByText(/Private repos too/i)).toHaveCount(0);
});
