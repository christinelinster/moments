import { describe, expect, it } from "vitest";

import { EmailValidationError, normalizeAndValidateEmail } from "./email.js";

describe("email validation", () => {
  it("trims and normalizes a valid email address", () => {
    expect(normalizeAndValidateEmail("  Person@Example.COM  ")).toBe(
      "person@example.com",
    );
  });

  it.each([
    "person.example.com",
    "person@@example.com",
    "@example.com",
    "person@",
    "",
    "   ",
    42,
    null,
  ])("rejects an email without exactly one usable @: %p", (value) => {
    expect(() => normalizeAndValidateEmail(value)).toThrow(EmailValidationError);
  });

  it.each([
    "person name@example.com",
    "person@example .com",
    "person\u0007@example.com",
    "person..name@example.com",
    "person@example..com",
    ".person@example.com",
    "person.@example.com",
  ])("rejects whitespace, control characters, or invalid dot placement: %p", (value) => {
    expect(() => normalizeAndValidateEmail(value)).toThrow(EmailValidationError);
  });

  it.each([
    "person@.example.com",
    "person@example.com.",
    "person@-example.com",
    "person@example-.com",
    `person@${"a".repeat(64)}.com`,
  ])("rejects invalid domain labels: %p", (value) => {
    expect(() => normalizeAndValidateEmail(value)).toThrow(EmailValidationError);
  });

  it("rejects a local part longer than 64 characters", () => {
    expect(() =>
      normalizeAndValidateEmail(`${"a".repeat(65)}@example.com`),
    ).toThrow(EmailValidationError);
  });

  it("rejects an address longer than 254 characters", () => {
    const domain = ["a", "b", "c", "d"].map((label) => "a".repeat(63)).join(".");

    expect(() => normalizeAndValidateEmail(`a@${domain}`)).toThrow(
      EmailValidationError,
    );
  });

  it("exposes a typed validation error with a safe public code", () => {
    try {
      normalizeAndValidateEmail("not-an-email");
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(EmailValidationError);
      expect((error as EmailValidationError).code).toBe("INVALID_EMAIL");
      expect((error as EmailValidationError).statusCode).toBe(400);
    }
  });
});
