import { AppError } from "../errors.js";

export class EmailValidationError extends AppError {
  constructor() {
    super(400, "Email address is invalid", "INVALID_EMAIL");
  }
}

function invalidEmail(): never {
  throw new EmailValidationError();
}

export function normalizeAndValidateEmail(input: unknown): string {
  if (typeof input !== "string") {
    return invalidEmail();
  }

  const email = input.trim().toLowerCase();
  if (!email || email.length > 254) {
    return invalidEmail();
  }

  if (/^[^@]*@[^@]*$/.test(email) === false) {
    return invalidEmail();
  }

  if (/[\s\u0000-\u001f\u007f-\u009f]/u.test(email)) {
    return invalidEmail();
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain || localPart.length > 64) {
    return invalidEmail();
  }

  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    domain.includes("..")
  ) {
    return invalidEmail();
  }

  const labels = domain.split(".");
  if (
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label),
    )
  ) {
    return invalidEmail();
  }

  return email;
}
