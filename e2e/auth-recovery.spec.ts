import { expect, test } from "@playwright/test";

test("a sign-in visitor can request a password reset link", async ({ page }) => {
  await page.route("**/auth/v1/recover**", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject({ email: "test@example.com" });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: "{}",
    });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByRole("button", { name: "Forgot?" }).click();
  await expect(page.getByRole("heading", { name: "Password recovery" })).toBeVisible();
  await page.getByRole("button", { name: "Send link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
});

test("an expired or missing recovery session is rejected", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByText("This link is invalid or expired.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
});
