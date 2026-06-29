import { PERMISSION_KEYS } from "@pulse/auth";
import { currentUser } from "@/lib/auth/current-user";
import { authorize } from "@/lib/auth/assert";
import { AppError } from "@/lib/errors";

/**
 * A permission-gated Route Handler demonstrating the server-side gate with real HTTP
 * status codes (T-20): unauthenticated → **401**, holds `dashboard.view` → **200**,
 * authenticated-but-missing-permission → **403** (deny-by-default). The response body
 * carries only a stable error code — never a stack, SQL, or internal id
 * (error-handling.md). Node runtime (the gate reads the session).
 */
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const principal = await currentUser.get();
    authorize(principal, PERMISSION_KEYS.DASHBOARD_VIEW);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
