"use client";

import { useRouter } from "next/navigation";
import { Ellipsis, Pencil } from "lucide-react";
import { ActionMenu } from "@/components/pulse/action-menu";
import { Button } from "@/components/pulse/button";

/**
 * The AnswerStrip L1 line-end overflow (design authority §D3.1): `Edit member` and nothing
 * else in v1. Tertiary by design — the strip's one visible button is reserved for the
 * computed primary action, so member-admin verbs live behind the overflow.
 */
export function MemberOverflowMenu({ memberId }: { memberId: string }) {
  const router = useRouter();
  return (
    <ActionMenu
      trigger={
        <Button variant="ghost" size="icon" aria-label="More member actions">
          <Ellipsis aria-hidden className="size-4" />
        </Button>
      }
      items={[
        {
          label: "Edit member",
          icon: <Pencil aria-hidden className="size-4" />,
          onSelect: () => router.push(`/members/${memberId}/edit`),
        },
      ]}
    />
  );
}
