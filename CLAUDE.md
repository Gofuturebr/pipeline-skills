# Mesa de Skills: contexto do projeto

Este arquivo é o contexto permanente do projeto. Leia inteiro antes de qualquer tarefa.
A especificação funcional completa está em `docs/especificacao.md` e é a fonte da verdade.
Se este arquivo e a especificação divergirem, vale a especificação.
A especificação de frontend está em `docs/frontend.md`: direção de design, tokens,
wireframes, tipos de atividade, textos de interface e critérios de aceite visuais.
Leia antes de criar ou alterar qualquer tela.

## O que é

Aplicação web que conduz grupos de 5 a 6 pessoas, passo a passo, da leitura de um
processo pré-curado até uma skill do Claude testada e exportada. Um gestor acompanha
e controla a fase de cada grupo por um painel admin.

## Para que evento

- Oficina de Criação de Skills (InovaPB), Ação 02 do projeto Sebrae Campina Grande e Orbie ICT.
- Data: 03/12/2026. Duração: 3 horas (180 minutos).
- 85 participantes, cerca de 15 mesas, meta de 09 skills entregues.
- Uma tela compartilhada por mesa (notebook com Chrome) e celulares como apoio.
- Público: empreendedores e gestores, não técnicos. Tudo em português do Brasil,
  linguagem simples, sem jargão.

É um software de evento: precisa funcionar muito bem por 3 horas, com 20 mesas e 100
celulares conectados. Não é um produto de uso contínuo. Prefira o simples e robusto.

## Método de base

O fluxo segue o método "Um agente, uma pasta" (JP Labs):
https://freebies.thejplabs.com/playbook-de-agente

Quatro movimentos, que viram fases da jornada:

1. Entrevista: a IA entrevista o grupo, uma pergunta por vez, e só então escreve o SKILL.md.
2. Caixa de ferramentas: o que saiu certo vira modelo reutilizável salvo na pasta.
3. Prova: lista de conferências verificáveis contra uma fonte externa ("Pronto quando").
4. Conserto: todo erro é corrigido na pasta, na camada que falhou (processo, caixa ou prova).

Os prompts do sistema de cada fase devem ser escritos por nós, com base nesses
princípios. Não copie o texto do playbook.

## Vocabulário

| Termo | Significado |
| --- | --- |
| Mesa | Um grupo de 5 a 6 pessoas e sua tela compartilhada |
| Gestor | Quem opera o admin e libera as fases |
| Processo | Tarefa pré-curada atribuída a uma mesa, com ficha e kit |
| Kit | Materiais do processo: entradas, exemplo bom, exemplo ruim, caso de exemplo, caso novo |
| Fase | Uma das 8 etapas da jornada (0 a 7), mais o intervalo |
| Passo | Unidade de instrução dentro de uma fase, com papel responsável |
| Pasta | A skill em construção: SKILL.md, arquivos/, exemplos/, notas.md |
| Conferência | Um item verificável da seção "Pronto quando" |
| Teste cruzado | Uma mesa roda a skill de outra com um caso novo |
| Papéis | Dono do processo, Piloto, Guardião da pasta, Cético, Testador, Porta-voz |

## As três superfícies

1. `/mesa/[codigo]`: tela compartilhada. Três zonas fixas: Trilha (esquerda),
   Atividade (centro), Pasta viva (direita). Um passo ativo por vez.
2. `/p/[codigo]`: celular do participante. Mostra fase, passo e papel. Envia
   contribuições. Não edita arquivos nem conversa com a IA.
3. `/admin`: painel do gestor. Grade com um cartão por mesa, ações de fase,
   cronômetro, avisos, chamados, exportação. Protegido por senha.

## Regras que não podem ser quebradas

- A mesa nunca avança de fase sozinha. Ela declara "Concluímos a fase" e o gestor ou um facilitador libera.
- Voltar de fase nunca apaga conteúdo.
- Existe uma única versão de cada arquivo por mesa. Toda alteração entra no histórico.
- Na entrevista, a IA faz uma pergunta por vez e não gera o SKILL.md antes de 8
  perguntas e dos 8 temas cobertos.
- Uma conferência só é aceita com fonte externa declarada e sem palavras vagas.
- No teste cruzado, a mesa testadora vê a pasta da parceira em modo leitura e não vê a conversa.
- Nada com padrão de senha, chave de acesso, CPF ou CNPJ é salvo na pasta.
- A chave da API da Anthropic fica só no servidor. Nunca vai para o navegador.

A lista completa está na seção 6 da especificação (RN01 a RN16).

## Stack padrão

- Next.js (App Router) com TypeScript e Tailwind.
- Supabase: Postgres para dados e Realtime para sincronizar mesa, celular e admin.
- IA: API da Anthropic pelo SDK oficial, com streaming, chamada só em rotas de servidor.
  O modelo vem da variável `ANTHROPIC_MODEL`. Consulte a documentação atual antes de
  fixar nomes de modelo ou parâmetros.
- Exportação: geração de .zip no servidor.
- Deploy: Vercel.

Se houver motivo forte para trocar algo da stack, proponha antes de implementar.

## Variáveis de ambiente

```
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
```

Mantenha um `.env.example` atualizado. Nunca faça commit de `.env`.

## Organização do repositório

```
docs/especificacao.md     especificação funcional (fonte da verdade)
docs/decisoes.md          decisões tomadas durante o desenvolvimento, com data
app/                      rotas: mesa, p, admin, api
lib/jornada/              definição das fases, passos e critérios (dados, não código espalhado)
lib/ia/prompts/           um arquivo de prompt de sistema por fase
lib/exportacao/           montagem da pasta e do .zip
supabase/migrations/      esquema do banco
supabase/seed/            evento de demonstração com 3 mesas e 2 processos
tests/                    testes dos critérios de aceite
```

## Convenções

- Código e nomes de arquivos em inglês ou português, mas de forma consistente.
  Todo texto visível ao usuário em português do Brasil.
- Textos de instrução dos passos ficam em dados editáveis pelo admin, não fixos em componentes.
- Durações das fases são configuráveis por evento. Os valores padrão estão na seção 3 da especificação.
- Não use travessões nos textos de interface.
- Fonte grande e alto contraste na tela da mesa: ela é lida por 6 pessoas a 1 metro de distância.
- Cada entrega deve passar em `npm run lint`, `npm run typecheck` e `npm test`.
- Registre em `docs/decisoes.md` toda decisão que não está na especificação.

## Decisões em aberto e padrão assumido

Enquanto não houver resposta, implemente o padrão e mantenha configurável.

| Decisão | Padrão assumido |
| --- | --- |
| Quantos processos | Vários processos cadastráveis. Um processo pode ser atribuído a mais de uma mesa |
| IA integrada ou externa | Integrada, por API |
| Modo de liberação | Manual, com opção automática por evento |
| Facilitadores de apoio | Decidido: perfil de admin com senha própria, que atende chamados e libera fases (avançar, voltar, forçar). Não altera cadastros, não controla o cronômetro geral e não exporta |
| Contas Claude dos participantes | Fora do sistema. O sistema só entrega o .zip e o LEIA-ME |

## Fora de escopo na v1

- Escolha livre de processo pela mesa.
- Uso contínuo depois do evento.
- Login individual de participantes.
- Instalação automática das skills em contas Claude.
