# Critérios de aceite: onde cada um é conferido

Mapa dos critérios de aceite da especificação (seção 8 de `docs/especificacao.md`) e do
frontend (seção 8 de `docs/frontend.md`). Cada item aponta o teste automático que o confere ou,
quando não dá para automatizar, o que fazer à mão antes do evento.

Para rodar tudo:

```bash
npm test
```

```bash
npm run build && npm run test:e2e
```

## Especificação, seção 8

| Critério | Como é conferido |
| --- | --- |
| Uma mesa percorre as 8 fases e exporta um .zip com SKILL.md, arquivos/INDICE.md, pelo menos 1 exemplo e notas.md | Automático: `tests/integracao/aceite.test.ts`, "uma mesa percorre as 8 fases, sem forçar nada". Também `tests/integracao/marco5.test.ts` |
| A mesa não consegue abrir uma fase que o gestor não liberou | Automático: `tests/integracao/fases.test.ts` (o servidor não manda o conteúdo e recusa com 403) e `tests/e2e/marco1.spec.ts` (fases futuras não são botões) |
| O gestor avança, volta e força a fase de uma mesa, e a tela reflete em até 2 segundos | Automático: `tests/e2e/marco1.spec.ts` (mede o tempo; cerca de 240 ms) e `tests/integracao/fases.test.ts` |
| O gestor avança todas as mesas de uma vez e só as que estão na fase de referência mudam | Automático: `tests/integracao/fases.test.ts`, "avançar todas muda só as mesas da fase de referência" |
| O painel mostra os estados em andamento, pronta, atrasada e pediu ajuda | Automático: `tests/integracao/aceite.test.ts`, "o painel mostra em andamento, pronta, atrasada e pediu ajuda" |
| A IA não gera o SKILL.md antes de 8 perguntas e dos 8 temas | Automático: `tests/integracao/marco3.test.ts`, "RN07: com 5 perguntas, a IA não escreve o SKILL.md" |
| Uma conferência com "profissional" ou sem fonte é recusada | Automático: `tests/integracao/marco4.test.ts` e `tests/e2e/marco4.spec.ts` |
| No teste cruzado, a mesa testadora vê a pasta da parceira, mas não a edita | Automático: `tests/integracao/aceite.test.ts`, "a mesa testadora vê a pasta da parceira, mas não edita", e `tests/integracao/marco5.test.ts` (a conversa da parceira nunca chega) |
| A skill exportada é instalada numa conta Claude e executa a tarefa com o caso novo do kit | **À mão.** O formato é conferido automaticamente (`tests/integracao/marco5.test.ts`: cabeçalho com name e description, nome da pasta igual ao name, pasta na raiz do .zip). Antes do evento: baixe uma skill de teste, instale no claude.ai (Personalizar > Skills > Enviar uma skill, com a execução de código ligada) e peça a tarefa com o caso novo do kit |
| Um ensaio com 3 mesas reais termina dentro dos 180 minutos | **À mão**, no ensaio. A soma das durações padrão dá 180 minutos (`tests/jornada.test.ts`) e o Preparo mostra a soma ao editar |

## Requisitos não funcionais

| Requisito | Como é conferido |
| --- | --- |
| 20 mesas e 100 celulares ao mesmo tempo | `npm run carga` (`scripts/carga.ts`). Resultado em 15/11/2026, servidor local, 60 segundos: 1.225 buscas de estado do celular com mediana de 7 ms e 95% abaixo de 14 ms; 410 buscas da tela da mesa, 95% abaixo de 17 ms; 206 contribuições; 121 canais de tempo real abertos; nenhum erro |
| Mudança de fase no admin aparece na mesa em até 2 segundos | No mesmo teste de carga: 28 mudanças de fase, 95% chegaram à mesa em até 19 ms. Na Vercel, o caminho é o Supabase Realtime, que não foi testado (ver README) |
| Início da resposta da IA em até 5 segundos, texto aparecendo aos poucos | Medido com a IA de verdade: a pergunta da entrevista começa a aparecer em cerca de 2 segundos. Rodadas e placar mostram o resultado enquanto ele é escrito |
| Falha da IA mostra "tentar de novo" sem perder o que foi digitado | Automático: `tests/integracao/marco3.test.ts` (resposta incompleta vira mensagem e libera a trava). Os rascunhos ficam no navegador |
| Reconexão: a mesa retoma no mesmo passo | Automático: `tests/e2e/marco6-aceite.spec.ts`, "sem rede, a mesa continua digitando" |
| Plano B: versão impressa do roteiro | `/mesa/CODIGO/imprimir`, aberto pelo detalhe da mesa no painel |

## Frontend, seção 8

| Critério | Como é conferido |
| --- | --- |
| Seis pessoas leem a pergunta da entrevista a 1 metro de um notebook de 14 polegadas | **À mão**, no ensaio. A pergunta usa 40 px, o maior texto da tela |
| A tela da mesa não tem rolagem de página em 1366 por 768 | Automático: `tests/e2e/marco1.spec.ts` |
| Nenhum estado é comunicado só por cor | Por construção: estados sempre com ícone e palavra (`components/base/Selo.tsx`); placar com "Passou", "Falhou" e "Não deu para conferir" |
| Todo botão desabilitado mostra o motivo | Por construção: o componente `Botao` escreve o motivo ao lado. No painel, onde não cabia, o botão dá lugar a um texto curto ("Nenhuma mesa pronta") |
| Arquivo novo entra na Pasta viva com o movimento de guardar, sem movimento quando o sistema pede | Por construção: `movimento-guardar` em `app/globals.css`, desligado com `prefers-reduced-motion` |
| A mudança de fase feita no admin aparece na mesa e no celular com o anúncio | Automático: `tests/e2e/marco1.spec.ts` (mesa) e `tests/e2e/marco6-aceite.spec.ts` (celular) |
| Com a rede desligada, a mesa continua digitando e, ao religar, volta ao passo certo sem perder o texto | Automático: `tests/e2e/marco6-aceite.spec.ts` |
| O painel mostra 20 mesas sem rolagem em 1440 por 900 | Automático: `tests/e2e/marco6-aceite.spec.ts` |
| O gestor identifica em até 3 segundos quais mesas pediram ajuda | Por construção: o cartão pisca, toca um som e o filtro "Pediu ajuda" mostra a contagem. Conferir no ensaio |
| O perfil de facilitador não vê pausa geral, preparo nem exportação | Automático: `tests/e2e/marco6-aceite.spec.ts` e `tests/e2e/marco5.spec.ts` |
| Nenhum texto de interface usa caixa alta em rótulos, travessões ou jargão técnico | Automático para travessões e caixa alta: `tests/textos.test.ts` e `tests/jornada.test.ts`. Jargão: revisão à mão |

## Antes do evento: o que conferir à mão

1. Instalar uma skill exportada numa conta Claude e rodar o caso novo do kit.
2. Fazer o ensaio com 3 mesas reais e cronometrar.
3. No ensaio, ler a pergunta da entrevista a 1 metro de um notebook de 14 polegadas.
4. Se o evento for na Vercel: conferir o tempo real pelo Supabase (o gestor avança uma mesa e a tela muda em até 2 segundos).
5. Conferir o limite de pedidos por minuto da conta da Anthropic para 15 mesas usando a IA ao mesmo tempo.
