"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { TextInput, type TextInputProps } from "./text-input";
import { useFieldControl } from "./form-field";

/**
 * PULSE PasswordInput (Catalog §9) — TextInput plus the show/hide interaction, nothing
 * else: the input itself (name/autocomplete/FormField wiring) is the unchanged
 * TextInput, so password managers and autofill keep working. The toggle is a separate
 * `type="button"` sibling (never submits) with its own accessible name + `aria-pressed`,
 * a full-height 44px hit area, and logical positioning (`end-0`/`pe-11`) so RTL places
 * it on the correct side with zero layout shift — the padding is always reserved.
 */
export type PasswordInputProps = Omit<TextInputProps, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const t = useTranslations("common");
    const field = useFieldControl();
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <TextInput
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pe-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          aria-pressed={visible}
          aria-controls={field?.controlId}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-5" />
          ) : (
            <Eye aria-hidden className="size-5" />
          )}
        </button>
      </div>
    );
  },
);
