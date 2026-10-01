# Inventário para perfis de mercado

Levantamento inicial da Fase A. Nenhum destes pontos é alterado nesta fase.

| Área | Estado atual | Próxima fase |
|---|---|---|
| Idioma | `User.locale`: `de`, `en`, `pt-BR`; rotas `next-intl` | Preservar; resolver em conjunto com o perfil na Fase B. |
| Data | `Tenant.dateFormat` já existe; `dateTime()` fixa `Europe/Berlin` | Fase B: usar `Tenant.timeZone`, distinguindo data civil de instante. |
| Moeda | `money()` fixa `EUR`; valores financeiros são `Decimal` | Fase B: contexto de moeda-base. Multi-moeda por lançamento em fase posterior. |
| Setup/bootstrap | Criam tenant sem perfil explícito | Fase D: permitir BR no setup após os gates de base. |
| Endereços | `Tenant.address` livre; imóvel usa `street`, `zip`, `city` | Fase C: endereço estruturado internacional. |
| Documentos | Não há identificador nacional tipado | Fase C: CPF, CNPJ, CIN vinculada ao CPF e documento estrangeiro. |
| Integrações e documentos legais | Há pressupostos alemães, como Enable Banking e Wohnungsgeberbestätigung | Projetos posteriores; não são habilitados nem removidos nesta fase. |

O perfil `BR` aceita proprietários com endereço estrangeiro. Um endereço nos EUA, telefone internacional ou valor em USD não habilita perfil `US`.
