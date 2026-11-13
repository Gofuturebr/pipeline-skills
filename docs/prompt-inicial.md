# Prompt inicial para o Claude Code

Antes de colar o prompt:

1. Descompacte o `mesa-de-skills.zip`. A pasta já vem com `CLAUDE.md` na raiz e,
   em `docs/`, os arquivos `especificacao.md` e `frontend.md`.
2. Abra o Claude Code dentro dessa pasta.
3. Cole o prompt abaixo, inteiro.

---

## Prompt

```
Você vai construir a "Mesa de Skills", uma aplicação web para um workshop presencial
de criação de skills do Claude.

LEITURA OBRIGATÓRIA, NESTA ORDEM
1. CLAUDE.md, na raiz: contexto, stack, convenções e regras que não podem ser quebradas.
2. docs/especificacao.md: especificação funcional completa. É a fonte da verdade.
3. docs/frontend.md: direção de design, tokens, wireframes, tipos de atividade e
   textos de interface. Siga os tokens e os wireframes. Não use o visual padrão de
   biblioteca de componentes.

Não escreva código antes de ler os três arquivos inteiros.

O QUE CONSTRUIR
Três superfícies sobre o mesmo estado, sincronizadas em tempo real:
- Tela da mesa: guia o grupo por 8 fases, um passo por vez, com a IA integrada e a
  pasta da skill crescendo ao vivo.
- Celular do participante: mostra fase, passo e papel, e envia contribuições.
- Admin do gestor: mostra todas as mesas e controla a fase de cada uma.
Ao final, o sistema exporta uma pasta com todas as skills e um .zip por skill.

PRIMEIRA RESPOSTA: SÓ O PLANO
Antes de implementar, me entregue:
a) Um resumo, em até 10 linhas, do que você entendeu.
b) O esquema do banco, derivado da seção 7 da especificação.
c) A máquina de estados da mesa: fases, estados (em andamento, pronta, atrasada,
   pausada), marcador "pediu ajuda" e as transições que o gestor dispara.
d) A lista de rotas e de canais de tempo real.
e) Como cada regra RN01 a RN16 será garantida, e em que camada (banco, servidor ou interface).
f) Dúvidas que bloqueiam. Se algo estiver ambíguo, pergunte. Não invente requisito.
Espere meu "pode seguir" antes de começar o Marco 1.

MARCOS DE ENTREGA
Trabalhe um marco por vez. Ao fim de cada um: rode lint, typecheck e testes, faça
commit, me diga como testar na mão em até 5 passos e pare para eu validar.

Marco 1. Fundação e controle de fases
- Projeto, esquema do banco, seed com 1 evento, 3 mesas e 2 processos de demonstração.
- Definição da jornada em dados (lib/jornada): fases, passos, papéis, critérios, durações.
- Entrada da mesa por código, tela com as três zonas, navegação por passos.
- Admin com senha, grade de mesas, e as ações: avançar, voltar, forçar, pausar,
  ajustar tempo, enviar aviso.
- Tempo real entre admin e mesa.
Pronto quando: abro o admin e duas mesas em três abas, avanço uma mesa e só ela muda,
em até 2 segundos. A mesa não consegue abrir fase não liberada.

Marco 2. Fases 0 e 1 e o celular do participante
- Check-in por QR, primeiro nome, distribuição de papéis.
- Ficha do processo e kit na tela. Contribuições pelo celular, com fila de aceitar
  ou descartar na mesa. Tarefa em uma linha.
Pronto quando: um celular entra pelo QR, envia uma contribuição e ela aparece na
fila da mesa.

Marco 3. IA integrada e Fase 2 (entrevista)
- Rota de servidor com streaming para a API da Anthropic. Chave só no servidor.
- Prompt de sistema da entrevista em lib/ia/prompts, escrito por nós a partir dos
  princípios do método descritos no CLAUDE.md. Não copie o texto do playbook.
- Uma pergunta por vez, barra de cobertura dos 8 temas, trava de 8 perguntas (RN07).
- Geração do SKILL.md com as 7 seções, as duas perguntas finais da IA e o editor
  para a mesa corrigir e aprovar.
- Pasta viva com histórico de versões (RN06).
Pronto quando: faço uma entrevista completa e o SKILL.md aparece na pasta. Tentar
gerar o arquivo com 5 perguntas é recusado.

Marco 4. Fases 3 e 4 (caixa e prova)
- Rodar a tarefa com o caso de exemplo. Ação "congelar" que cria modelo com lacunas
  em arquivos/, atualiza o SKILL.md e o INDICE.md. Salvar exemplo aprovado.
- Segunda rodada com o relatório do que foi reusado e do que foi refeito.
- Editor de conferências com fonte externa obrigatória e lista de palavras vagas (RN08).
- Execução das conferências pela IA com uma linha por conferência: passou ou falhou, e a prova.
- Bloqueio de conteúdo sensível ao salvar (RN14).
Pronto quando: uma conferência com a palavra "profissional" é recusada e o placar
aparece depois de rodar a tarefa.

Marco 5. Fases 5, 6 e 7 (teste cruzado, conserto, entrega)
- Pareamento de mesas no admin, com trio em ciclo para número ímpar (RN10, RN11).
- Mesa testadora recebe a pasta parceira em modo leitura, sem a conversa (RN09).
  Placar, observações por falha, relatório enviado à mesa autora.
- Conserto: escolha da camada, proposta do menor conserto, registro em notas.md,
  nova rodada com antes e depois (RN12).
- Entrega: revisar nome e "Quando usar", marcar como final (RN15), download por QR.
- Exportação: pasta consolidada e .zip por skill, com LEIA-ME.md e cabeçalho do
  SKILL.md (nome e descrição) gerado a partir de "Pra que serve" e "Quando usar".
  Confira na documentação atual da Anthropic o formato exigido para skills antes de
  implementar a exportação.
Pronto quando: duas mesas completam o teste cruzado entre si e eu baixo um .zip com
SKILL.md, arquivos/INDICE.md, um exemplo e notas.md.

Marco 6. Robustez para o dia do evento
- Chamados de ajuda, tela de espera com atividade de aprofundamento, detalhe da mesa
  no admin com linha do tempo, perfil de facilitador (libera fases e atende chamados,
  sem alterar cadastros, cronômetro geral ou exportação).
- Cadastro de processos, kits, mesas e textos dos passos pelo admin, sem mexer em código.
- Reconexão: a mesa retoma no mesmo passo. Salvamento automático. "Tentar de novo"
  quando a IA falha, sem perder o que foi digitado.
- Teste de carga simulando 20 mesas e 100 celulares.
- Versão para impressão do roteiro por mesa, como plano B.
- Testes automatizados para cada item dos critérios de aceite da seção 8.
Pronto quando: todos os critérios de aceite da seção 8 passam.

REGRAS DE TRABALHO
- A especificação manda. Se quiser desviar dela, proponha e espere resposta.
- Simples e robusto vence elegante. É um software para 3 horas de evento.
- Fases, passos, critérios e textos ficam em dados, não espalhados em componentes.
- Todo texto de interface em português do Brasil, simples, sem jargão e sem travessões.
- Tela da mesa com fonte grande e alto contraste.
- Não deixe nada simulado sem avisar. Se algo ficou como stub, diga qual e por quê.
- Registre em docs/decisoes.md toda decisão que não está na especificação.
- Não instale dependência pesada sem justificar em uma linha.
- Nunca faça commit de segredos.

Comece agora pela leitura dos dois arquivos e me entregue o plano.
```

---

## Depois do plano

Prompts curtos para usar ao longo do trabalho:

- **Liberar um marco:** `Plano aprovado. Pode seguir com o Marco 1.`
- **Validar um marco:** `Testei o Marco N. Funcionou: [...]. Problemas: [...]. Corrija antes de seguir.`
- **Mudança de requisito:** `Atualizei docs/especificacao.md na seção X. Leia de novo, me diga o que muda no que já existe e só então altere.`
- **Antes do evento:** `Rode todos os critérios de aceite da seção 8 e me dê uma linha por critério: passou ou falhou, com a prova.`
