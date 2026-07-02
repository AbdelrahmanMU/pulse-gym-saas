import { LoadingState } from "@/components/pulse/loading-state";

/**
 * Auth-segment loading fallback (Sprint 1.6). Renders the catalog skeleton card in the
 * centered auth column while a route in the segment resolves, mirroring the `(app)`
 * pattern (immediate, low-CLS feedback instead of a blank column).
 */
export default function AuthLoading() {
  return <LoadingState label="Loading sign-in…" />;
}
