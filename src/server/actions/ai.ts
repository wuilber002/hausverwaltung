"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { isAiConfigured, askAssistant } from "@/lib/ai";
import { computeStatement } from "@/server/statements";
import { money } from "@/lib/format";
import type { FormattingContext } from "@/lib/format";

export type AssistantState = { answer?: string; configured?: boolean; error?: string };

type AssistantLocale = "de" | "en" | "pt-BR";

function assistantLocale(locale: string): AssistantLocale {
  return locale === "en" || locale === "pt-BR" ? locale : "de";
}

function assistantSummaryFallback(locale: AssistantLocale, format: FormattingContext, ctx: {
  objekte: number;
  einheiten: number;
  vermietet: number;
  leerstand: number;
  sollmieteMonatlich: number;
  offenePostenSumme: number;
  ueberfaelligeForderungen: number;
  offeneTickets: number;
  faelligeWartungen: number;
}) {
  if (locale === "pt-BR") {
    return [
      "Assistente de IA não configurado (ANTHROPIC_API_KEY ausente). Indicadores dos imóveis administrados:",
      "• " + ctx.objekte + " imóveis, " + ctx.einheiten + " unidades (" + ctx.vermietet + " locadas, " + ctx.leerstand + " vagas)",
      "• Aluguel mensal previsto: " + money(ctx.sollmieteMonatlich, format),
      "• Itens em aberto: " + money(ctx.offenePostenSumme, format) + " (" + ctx.ueberfaelligeForderungen + " vencidos)",
      "• " + ctx.offeneTickets + " ocorrências abertas, " + ctx.faelligeWartungen + " manutenções vencidas",
    ].join("\n");
  }
  if (locale === "en") {
    return [
      "AI assistant is not configured (ANTHROPIC_API_KEY is missing). Portfolio metrics:",
      "• " + ctx.objekte + " properties, " + ctx.einheiten + " units (" + ctx.vermietet + " occupied, " + ctx.leerstand + " vacant)",
      "• Expected monthly rent: " + money(ctx.sollmieteMonatlich, format),
      "• Open items: " + money(ctx.offenePostenSumme, format) + " (" + ctx.ueberfaelligeForderungen + " overdue)",
      "• " + ctx.offeneTickets + " open tickets, " + ctx.faelligeWartungen + " overdue maintenance items",
    ].join("\n");
  }
  return [
    "KI-Assistent nicht konfiguriert (ANTHROPIC_API_KEY fehlt). Kennzahlen zum Bestand:",
    "• " + ctx.objekte + " Objekte, " + ctx.einheiten + " Einheiten (" + ctx.vermietet + " vermietet, " + ctx.leerstand + " leer)",
    "• Sollmiete/Monat: " + money(ctx.sollmieteMonatlich, format),
    "• Offene Posten: " + money(ctx.offenePostenSumme, format) + " (" + ctx.ueberfaelligeForderungen + " überfällig)",
    "• " + ctx.offeneTickets + " offene Tickets, " + ctx.faelligeWartungen + " fällige Wartungen",
  ].join("\n");
}

function statementFallback(
  locale: AssistantLocale,
  format: FormattingContext,
  year: number,
  property: string | undefined,
  total: number,
  units: Array<{ label: string; allocated: number; prepayment: number; balance: number }>,
) {
  const unitLines = units.map((unit) => {
    const balanceStatus = unit.balance >= 0
      ? locale === "pt-BR" ? "crédito" : locale === "en" ? "credit" : "Guthaben"
      : locale === "pt-BR" ? "valor a pagar" : locale === "en" ? "additional payment" : "Nachzahlung";

    if (locale === "pt-BR") {
      return "• " + unit.label + ": rateado " + money(unit.allocated, format) + ", adiantamentos " + money(unit.prepayment, format) + ", saldo " + money(unit.balance, format) + " (" + balanceStatus + ")";
    }
    if (locale === "en") {
      return "• " + unit.label + ": allocated " + money(unit.allocated, format) + ", prepayment " + money(unit.prepayment, format) + ", balance " + money(unit.balance, format) + " (" + balanceStatus + ")";
    }
    return "• " + unit.label + ": umgelegt " + money(unit.allocated, format) + ", VZ " + money(unit.prepayment, format) + ", Saldo " + money(unit.balance, format) + " (" + balanceStatus + ")";
  });

  if (locale === "pt-BR") {
    return [
      "Assistente de IA não configurado (ANTHROPIC_API_KEY ausente). Resumo do demonstrativo de " + year + ":",
      "• Imóvel: " + property,
      "• Total de custos rateáveis: " + money(total, format),
      ...unitLines,
    ].join("\n");
  }
  if (locale === "en") {
    return [
      "AI assistant is not configured (ANTHROPIC_API_KEY is missing). Summary of the " + year + " statement:",
      "• Property: " + property,
      "• Total allocable costs: " + money(total, format),
      ...unitLines,
    ].join("\n");
  }
  return [
    "KI-Assistent nicht konfiguriert (ANTHROPIC_API_KEY fehlt). Kurzfassung der Abrechnung " + year + ":",
    "• Objekt: " + property,
    "• Umlagefähige Kosten gesamt: " + money(total, format),
    ...unitLines,
  ].join("\n");
}

/** Baut einen kompakten Bestands-Kontext (nur Kennzahlen, keine PII) für den Assistenten. */
async function buildContext(tenantId: string) {
  const now = new Date();
  const [properties, units, leases, charges, openTickets, dueMaintenance] = await Promise.all([
    prisma.property.findMany({ where: { tenantId }, select: { name: true, city: true, management: true } }),
    prisma.unit.findMany({ where: { tenantId }, select: { leases: { select: { startDate: true, endDate: true } } } }),
    prisma.lease.findMany({
      where: { tenantId, startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] },
      include: { components: { select: { amount: true } } },
    }),
    prisma.charge.findMany({ where: { tenantId }, include: { payments: { select: { amount: true } } } }),
    prisma.ticket.count({ where: { tenantId, status: { not: "ERLEDIGT" } } }),
    prisma.maintenanceContract.count({ where: { tenantId, nextDue: { lt: now } } }),
  ]);

  const occupied = units.filter((u) =>
    u.leases.some((l) => l.startDate <= now && (!l.endDate || l.endDate >= now)),
  ).length;
  const monthlyRent = leases.reduce(
    (a, l) => a + Number(l.rentCold) + l.components.reduce((s, c) => s + Number(c.amount), 0),
    0,
  );
  let totalOpen = 0;
  let overdue = 0;
  for (const c of charges) {
    const open = Number(c.amount) - c.payments.reduce((a, p) => a + Number(p.amount), 0);
    if (open > 0.001) {
      totalOpen += open;
      if (c.dueDate < now) overdue++;
    }
  }

  return {
    objekte: properties.length,
    einheiten: units.length,
    vermietet: occupied,
    leerstand: units.length - occupied,
    sollmieteMonatlich: Math.round(monthlyRent * 100) / 100,
    offenePostenSumme: Math.round(totalOpen * 100) / 100,
    ueberfaelligeForderungen: overdue,
    offeneTickets: openTickets,
    faelligeWartungen: dueMaintenance,
    objektliste: properties.map((p) => p.name + " (" + p.city + ", " + p.management + ")"),
  };
}

export async function askAssistantAction(_prev: AssistantState, fd: FormData): Promise<AssistantState> {
  const user = await requireUser();
  const question = String(fd.get("question") ?? "").trim();
  if (!question) return { error: "Bitte eine Frage eingeben." };

  const ctx = await buildContext(user.tenantId);
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { aiProvider: true, aiBaseUrl: true, aiApiKey: true, aiModel: true },
  });
  const aiCfg = { provider: tenant?.aiProvider, baseUrl: tenant?.aiBaseUrl, apiKey: tenant?.aiApiKey, model: tenant?.aiModel };
  const configured = isAiConfigured(aiCfg);

  if (!configured) return { answer: assistantSummaryFallback(assistantLocale(user.locale), user.presentation, ctx), configured: false };

  try {
    const answer = await askAssistant(JSON.stringify(ctx), question, aiCfg);
    return { answer, configured: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "KI-Anfrage fehlgeschlagen", configured: true };
  }
}

/** Erklärt die Betriebskostenabrechnung eines Objekts/Jahres in Klartext. */
export async function explainStatement(_p: AssistantState, fd: FormData): Promise<AssistantState> {
  const user = await requireUser();
  const propertyId = String(fd.get("propertyId") ?? "");
  const year = Number(fd.get("year")) || new Date().getFullYear();
  if (!propertyId) return { error: "Kein Objekt" };

  const st = await computeStatement(user.tenantId, propertyId, year);
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { aiProvider: true, aiBaseUrl: true, aiApiKey: true, aiModel: true } });
  const aiCfg = { provider: tenant?.aiProvider, baseUrl: tenant?.aiBaseUrl, apiKey: tenant?.aiApiKey, model: tenant?.aiModel };

  const ctx = {
    objekt: st.property?.name,
    jahr: year,
    summeUmlagefaehig: st.totalUmlage,
    kosten: st.costs.map((c) => ({ typ: c.type, betrag: c.amount, schluessel: c.method, umlagefaehig: c.umlagefaehig })),
    einheiten: st.units.map((u) => ({ einheit: u.label, umgelegt: u.allocated, vorauszahlung: u.prepayment, saldo: u.balance })),
  };

  if (!isAiConfigured(aiCfg)) {
    return {
      answer: statementFallback(assistantLocale(user.locale), user.presentation, year, st.property?.name, st.totalUmlage, st.units),
      configured: false,
    };
  }
  try {
    const answer = await askAssistant(
      JSON.stringify(ctx),
      "Erkläre diese Betriebskostenabrechnung einem Mieter in einfachen, freundlichen Worten: was wurde nach welchem Schlüssel umgelegt, und wie kommt der Saldo je Einheit zustande. Kurz und verständlich.",
      aiCfg,
    );
    return { answer, configured: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "KI-Anfrage fehlgeschlagen", configured: true };
  }
}
