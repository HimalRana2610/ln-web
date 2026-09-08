import { describe, expect, it } from "vitest";

import { createClassroomSchema, joinClassroomSchema, THEME_COLORS } from "../classroom";

describe("createClassroomSchema", () => {
  const valid = {
    name: "Discrete Mathematics",
    section: "B",
    type: "personal" as const,
    theme_color: THEME_COLORS[0],
  };

  it("accepts a complete form", () => {
    expect(createClassroomSchema.safeParse(valid).success).toBe(true);
  });

  it("treats section as optional", () => {
    expect(createClassroomSchema.safeParse({ ...valid, section: "" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createClassroomSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a theme the backend does not know", () => {
    // Mirrors the backend's THEME_COLORS validator; an unknown value is a 422.
    const result = createClassroomSchema.safeParse({
      ...valid,
      theme_color: "from-puce-500 to-beige-600",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown visibility", () => {
    const result = createClassroomSchema.safeParse({ ...valid, type: "secret" });
    expect(result.success).toBe(false);
  });
});

describe("joinClassroomSchema", () => {
  it("uppercases the code so the backend always sees canonical form", () => {
    const result = joinClassroomSchema.safeParse({ code: "a1b2c3" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.code).toBe("A1B2C3");
  });

  it("trims surrounding whitespace from a pasted code", () => {
    const result = joinClassroomSchema.safeParse({ code: "  A1B2C3  " });
    expect(result.success).toBe(true);
  });

  it("rejects a code of the wrong length", () => {
    expect(joinClassroomSchema.safeParse({ code: "A1B2C" }).success).toBe(false);
    expect(joinClassroomSchema.safeParse({ code: "A1B2C3D" }).success).toBe(false);
  });

  it("rejects non-alphanumeric characters", () => {
    expect(joinClassroomSchema.safeParse({ code: "A1B2-3" }).success).toBe(false);
  });
});

describe("THEME_COLORS", () => {
  it("are all Tailwind gradient pairs", () => {
    // These strings must appear literally in source: Tailwind generates
    // utilities by scanning files, so a gradient that only ever exists in a
    // database row would never be compiled into the stylesheet.
    for (const theme of THEME_COLORS) {
      expect(theme).toMatch(/^from-[a-z]+-\d{3} to-[a-z]+-\d{3}$/);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(THEME_COLORS).size).toBe(THEME_COLORS.length);
  });
});
