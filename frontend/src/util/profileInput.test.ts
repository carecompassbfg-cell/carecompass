import { describe, expect, it } from "vitest";
import {
  isKnownAge,
  parseAge,
  parsePostalCode,
  parseRecipientName,
  POSTAL_CODE_ERROR,
  RECIPIENT_NAME_ERROR,
  safeReturnTo,
} from "@/util/profileInput";

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

describe("parseRecipientName", () => {
  it("trims, and treats empty as null", () => {
    expect(parseRecipientName("  Mum ")).toEqual({ value: "Mum" });
    expect(parseRecipientName("")).toEqual({ value: null });
    expect(parseRecipientName("   ")).toEqual({ value: null });
    expect(parseRecipientName(null)).toEqual({ value: null });
  });

  it("allows up to 40 characters", () => {
    expect(parseRecipientName("a".repeat(40)).value).toBe("a".repeat(40));
    expect(parseRecipientName("a".repeat(41)).error).toBe(RECIPIENT_NAME_ERROR);
  });

  it("rejects control characters", () => {
    expect(parseRecipientName("Mum\nTan").error).toBeDefined();
  });
});

describe("parsePostalCode", () => {
  it("strips spaces and accepts 6 digits", () => {
    expect(parsePostalCode(" 520 123 ")).toEqual({ value: "520123" });
  });

  it("treats empty as null", () => {
    expect(parsePostalCode("")).toEqual({ value: null });
    expect(parsePostalCode("  ")).toEqual({ value: null });
  });

  it("rejects anything that isn't 6 digits", () => {
    for (const value of ["12345", "1234567", "52O123", "S520123"]) {
      expect(parsePostalCode(value).error).toBe(POSTAL_CODE_ERROR);
    }
  });
});
