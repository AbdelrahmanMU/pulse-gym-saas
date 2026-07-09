import base from "@pulse/config/eslint";

/**
 * Web app ESLint config = the shared flat config, plus a local ignore for `scripts/**` —
 * standalone Node/Playwright tooling (e.g. the Arabic-RTL evidence pass), not shipped app
 * source, so it is outside the app lint scope (same class as the globally-ignored config files).
 */
export default [...base, { ignores: ["scripts/**"] }];
