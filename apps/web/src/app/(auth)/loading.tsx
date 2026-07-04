import { getTranslations } from "next-intl/server";
import { LoadingState } from "@/components/pulse/loading-state";

/**
 * Auth-segment loading fallback (Sprint 1.6). Renders the catalog skeleton card in the
 * centered auth column while a route in the segment resolves, mirroring the `(app)`
 * pattern (immediate, low-CLS feedback instead of a blank column).
 */
export default async function AuthLoading() {
  const t = await getTranslations("auth");
  return <LoadingState label={t("loading")} />;
}
