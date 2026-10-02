"use client";

import * as React from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ActionState } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

type PreservedField =
  | { kind: "value"; value: string }
  | { kind: "checked"; checked: boolean };

function snapshotNonSensitiveFields(form: HTMLFormElement) {
  const snapshot = new Map<number, PreservedField>();

  for (const [index, field] of Array.from(form.elements).entries()) {
    if (
      !(field instanceof HTMLInputElement) &&
      !(field instanceof HTMLSelectElement) &&
      !(field instanceof HTMLTextAreaElement)
    ) {
      continue;
    }

    if (!field.name || field.disabled) continue;

    if (
      field instanceof HTMLInputElement &&
      ["password", "file", "hidden", "submit", "reset", "button"].includes(field.type)
    ) {
      continue;
    }

    if (
      field instanceof HTMLInputElement &&
      ["checkbox", "radio"].includes(field.type)
    ) {
      snapshot.set(index, { kind: "checked", checked: field.checked });
      continue;
    }

    snapshot.set(index, { kind: "value", value: field.value });
  }

  return snapshot;
}

function restoreFields(form: HTMLFormElement, snapshot: Map<number, PreservedField>) {
  for (const [index, field] of Array.from(form.elements).entries()) {
    const value = snapshot.get(index);
    if (!value) continue;

    if (
      !(field instanceof HTMLInputElement) &&
      !(field instanceof HTMLSelectElement) &&
      !(field instanceof HTMLTextAreaElement)
    ) {
      continue;
    }

    if (value.kind === "checked" && field instanceof HTMLInputElement) {
      field.checked = value.checked;
    } else if (value.kind === "value") {
      field.value = value.value;
    }
  }
}

export function CrudDialog({
  trigger,
  title,
  action,
  submitLabel,
  preserveFieldsOnError = false,
  children,
}: {
  trigger: React.ReactElement;
  title: string;
  action: Action;
  submitLabel?: string;
  /** Retains non-sensitive fields after an action validation error. */
  preserveFieldsOnError?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Wirft die Server-Action (statt {error} zurückzugeben), blieb der Dialog
  // sonst offen ohne Hinweis. Fehler abfangen und anzeigen; echte Redirects
  // (NEXT_REDIRECT, z. B. Login-Guard) müssen durchgereicht werden.
  const safeAction: Action = async (prev, fd) => {
    try {
      return await action(prev, fd);
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
        throw e;
      }
      return { error: e instanceof Error ? e.message : t("actionFailed") };
    }
  };
  const [state, formAction, pending] = useActionState<ActionState, FormData>(safeAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const preservedFields = useRef<Map<number, PreservedField>>(new Map());

  // Erfolg genau EINMAL je Absenden behandeln. Ohne den Ref-Guard feuerte der
  // Effekt bei jedem Re-Render (durch router.refresh) erneut → Toast-Endlosschleife.
  const handledState = useRef<ActionState | null>(null);
  useEffect(() => {
    if (state.ok && handledState.current !== state) {
      handledState.current = state;
      preservedFields.current.clear();
      setOpen(false);
      toast.success(t("saved"));
      router.refresh(); // abhängige Übersichten sofort aktualisieren
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!preserveFieldsOnError || !state.error || !formRef.current) return;
    restoreFields(formRef.current, preservedFields.current);
  }, [preserveFieldsOnError, state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (preserveFieldsOnError) {
      preservedFields.current = snapshotNonSensitiveFields(event.currentTarget);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) preservedFields.current.clear();
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* key remountet Formular je Öffnung → frische Felder */}
        <form
          ref={formRef}
          action={formAction}
          key={open ? "open" : "closed"}
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          {children}
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {submitLabel ?? t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
