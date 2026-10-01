# ADR 0001 — Perfil de mercado por organização

- Status: aceito
- Data: 2026-10-01
- Escopo: Fase A — fundação, sem alteração de cálculos ou telas de negócio

## Contexto

O HaVeWa permite idioma por usuário e formato de data por organização, mas assume EUR e Europe/Berlin em vários pontos. A Nikoli operará no Brasil, inclusive com proprietários residentes no exterior.

## Decisão

Cada organização terá um perfil de mercado versionado: `DE` ou `BR`.

- `DE` preserva os defaults históricos: `de`, `Europe/Berlin`, `EUR`.
- `BR` define defaults: `pt-BR`, `America/Sao_Paulo`, `BRL`.
- O locale continua no usuário e pode divergir do perfil da organização.
- Endereço estrangeiro, documento estrangeiro e USD não criam perfil `US`.
- A migration classifica todos os tenants existentes como `DE` e não altera comportamento nesta fase.

O contrato fica em `src/lib/market-profile.ts`; a persistência no `Tenant` é aditiva: perfil, versão, timezone e moeda-base.

## Consequências

- A Fase B substituirá defaults implícitos de moeda e fuso pelo contexto do tenant, após inventário e testes de regressão.
- Endereços, documentos, CPF/CNPJ/CIN, multi-moeda por lançamento e cálculos pertencem a fases posteriores.
- O perfil não será trocável livremente após dados operacionais; mudança futura exigirá migration explícita, auditável e reversível.
