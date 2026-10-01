import { describe, expect, it } from "vitest";
import { isKnownAge, parseAge, safeReturnTo } from "@/util/profileInput";

describe("isKnownAge", () => {
  it("treats 0, null and out-of-range values as not set", () => {
    expect(isKnownAge(0)).toBe(false);
    expect(isKnownAge(null)).toBe(false);
    expect(isKnownAge(undefined)).toBe(false);
    expect(isKnownAge(121)).toBe(false);
    expect(isKnownAge(1)).toBe(true);
    expect(isKnownAge(78)).toBe(true);
    expect(isKnownAge(120)).toBe(true);
  });
});

describe("parseAge", () => {
  it("accepts whole numbers from 1 to 120", () => {
    expect(parseAge("78")).toBe(78);
    expect(parseAge(" 1 ")).toBe(1);
    expect(parseAge(120)).toBe(120);
  });

  it("rejects empty, zero, too old, decimals and text", () => {
    for (const value of ["", "0", "121", "7.5", "-3", "abc", null, undefined]) {
      expect(parseAge(value)).toBeNull();
    }
  });
});

describe("safeReturnTo", () => {
  it("accepts same-site paths", () => {
    expect(safeReturnTo("/dashboard")).toBe("/dashboard");
    expect(safeReturnTo("/dashboard/schemes?id=X")).toBe(
      "/dashboard/schemes?id=X",
    );
  });

  it("rejects other sites and anything not starting with a single slash", () => {
    for (const value of [
      null,
      "",
      "dashboard",
      "//evil.example",
      "/\\evil.example",
      "https://evil.example",
      "javascript:alert(1)",
      "/\nfoo",
    ]) {
      expect(safeReturnTo(value)).toBeNull();
    }
  });
});
