import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn()
}));

import Home from "./page";
import { redirect } from "next/navigation";

describe("Home page", () => {
  it("redirects to /oracle", () => {
    Home();
    expect(redirect).toHaveBeenCalledWith("/oracle");
  });
});

