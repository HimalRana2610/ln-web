import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "../auth";

describe("loginSchema", () => {
  it("accepts a well-formed credential pair", () => {
    const result = loginSchema.safeParse({ email: "ada@example.edu", password: "anything" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "anything" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password without revealing length rules", () => {
    const result = loginSchema.safeParse({ email: "ada@example.edu", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Sign-in must not hint at the password policy - that is a registration concern.
      expect(result.error.issues[0].message).toBe("Enter your password");
    }
  });
});

describe("registerSchema", () => {
  const valid = {
    fullName: "Ada Lovelace",
    email: "ada@example.edu",
    institute: "Analytical Engine Institute",
    password: "correct-horse-battery",
    confirmPassword: "correct-horse-battery",
  };

  it("accepts a complete form", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("treats institute as optional", () => {
    expect(registerSchema.safeParse({ ...valid, institute: "" }).success).toBe(true);
  });

  it("rejects a password under the minimum length", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a repetitive password", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "aaaaaaaaaaaa",
      confirmPassword: "aaaaaaaaaaaa",
    });
    expect(result.success).toBe(false);
  });

  it("reports a mismatch against the confirm field", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "something-else" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const mismatch = result.error.issues.find((issue) =>
        issue.path.includes("confirmPassword"),
      );
      expect(mismatch?.message).toBe("Passwords do not match");
    }
  });

  it("mirrors the backend's minimum length", () => {
    // app/schemas/auth.py sets PASSWORD_MIN_LENGTH = 10. If that changes, this
    // fails and the two stay in step.
    const nineChars = "abcdefghi";
    expect(
      registerSchema.safeParse({
        ...valid,
        password: nineChars,
        confirmPassword: nineChars,
      }).success,
    ).toBe(false);
  });
});
