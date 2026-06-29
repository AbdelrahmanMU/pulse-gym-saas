/**
 * PULSE Button — the application-facing surface of the token-styled Button primitive.
 * Route/page code imports from here (the PULSE layer), never from `components/ui`
 * directly (refinement R-1). The primitive is already restyled entirely to PULSE tokens;
 * this re-export is the public boundary between the app and the shadcn primitive layer.
 */
export { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";
