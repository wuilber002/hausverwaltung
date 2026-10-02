"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Check, Globe2, LockKeyhole, TriangleAlert } from "lucide-react";
import { updateMarketProfile } from "@/server/actions/config";
import type { ActionState } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type MarketProfileId = "DE" | "BR";

export function MarketProfileConfig({
  marketProfile,
  timeZone,
  currencyCode,
  locked,
}: {
  marketProfile: MarketProfileId;
  timeZone: string;
  currencyCode: string;
  locked: boolean;
}) {
  const t = useTranslations("settings");
  const [state, action, pending] = useActionState<ActionState, FormData>(updateMarketProfile, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe2 className="size-4" /> {t("marketProfile")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("marketProfileHint")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 space-y-1.5">
            <Label htmlFor="marketProfile">{t("marketProfile")}</Label>
            <select
              id="marketProfile"
              name="marketProfile"
              defaultValue={marketProfile}
              disabled={locked}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30"
            >
              <option value="DE">{t("marketProfileDE")}</option>
              <option value="BR">{t("marketProfileBR")}</option>
            </select>
          </div>
          {!locked && <Button type="submit" disabled={pending}>{t("save")}</Button>}
          {state.error && (
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <TriangleAlert className="size-4" /> {state.error}
            </span>
          )}
          {state.ok && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="size-4" /> {t("saved")}
            </span>
          )}
        </form>
        <p className="text-xs text-muted-foreground">
          {t("marketProfileDefaults", { timeZone, currencyCode })}
        </p>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          {locked && <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />}
          {locked ? t("marketProfileLocked") : t("marketProfileCanChange")}
        </p>
      </CardContent>
    </Card>
  );
}
