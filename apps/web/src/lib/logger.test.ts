import { describe, expect, it } from "vitest";
import { createBaseLogger } from "./logger";

// Capture one Pino line written to an in-memory destination.
function captureLine(write: (logger: ReturnType<typeof createBaseLogger>) => void): {
  raw: string;
  json: Record<string, unknown>;
} {
  let raw = "";
  const logger = createBaseLogger({ write: (chunk: string) => (raw += chunk) });
  write(logger);
  return { raw, json: JSON.parse(raw) as Record<string, unknown> };
}

describe("structured logger (T-16)", () => {
  it("emits one JSON line with the standard fields and a string level", () => {
    const { json } = captureLine((logger) =>
      logger.info({ code: "TEST_OK", module: "logger", correlationId: "abc-123" }, "hello"),
    );
    expect(json.message).toBe("hello");
    expect(json.level).toBe("info");
    expect(json.code).toBe("TEST_OK");
    expect(json.module).toBe("logger");
    expect(json.correlationId).toBe("abc-123");
    expect(typeof json.timestamp).toBe("string");
  });

  it("redacts secrets and PII — they never appear in output", () => {
    const { raw, json } = captureLine((logger) =>
      logger.info(
        {
          password: "hunter2",
          token: "secret-token-value",
          AUTH_SECRET: "top-secret",
          DATABASE_URL: "postgresql://u:p@host/db",
        },
        "attempted to log secrets",
      ),
    );
    expect(raw).not.toContain("hunter2");
    expect(raw).not.toContain("secret-token-value");
    expect(raw).not.toContain("top-secret");
    expect(raw).not.toContain("postgresql://u:p@host/db");
    expect(json.password).toBe("[REDACTED]");
    expect(json.token).toBe("[REDACTED]");
  });
});
