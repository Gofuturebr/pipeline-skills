# Especificação de Frontend: Mesa de Skills

Atualizado em 13/11/2026

Complementa a especificação funcional (`docs/especificacao.md`). Define como as três superfícies (mesa, celular e admin) devem parecer e se comportar.

## 1. Direção de design

O conceito é a bancada de oficina: uma superfície de trabalho clara e calma, onde a única coisa que chama atenção é a pasta da skill enchendo de arquivos.

### Quem usa e em que condição

- **Mesa:** 5 a 6 pessoas lendo o mesmo notebook a cerca de 1 metro, em sala clara e barulhenta, por 3 horas. Público não técnico.
- **Participante:** celular na mão, atenção dividida, uso em rajadas de poucos segundos.
- **Gestor e facilitadores:** de pé, circulando, olhando o painel de relance para decidir quem liberar e quem ajudar.

### Princípios

1. **Um passo, uma tela.** A mesa nunca vê duas instruções concorrentes. O que não é do passo atual fica recolhido.
2. **Legível a 1 metro.** Na tela da mesa, nenhum texto de trabalho abaixo de 20 px. A pergunta da IA é o maior elemento da tela.
3. **A pasta é o troféu.** A Pasta viva é o único elemento com cor quente e com movimento próprio. Todo o resto é neutro e quieto.
4. **Estado nunca é só cor.** Todo estado tem ícone e palavra, porque o painel é lido de longe e por pessoas diferentes.
5. **O servidor manda na fase.** A interface nunca mostra uma fase que o servidor não confirmou. Mudança de fase é um acontecimento visível, não uma troca silenciosa.

### Elemento de assinatura

A Pasta viva é desenhada como uma pasta de arquivo, com aba e cor amarela. Cada arquivo criado entra nela com um movimento único de "guardar". É o único movimento automático da tela da mesa.

### O que evitar

- Grade de cartões idênticos com a mesma sombra e o mesmo raio em tudo. Na tela da mesa não há cartões: há a trilha, a folha de trabalho e a pasta.
- Rótulos em caixa alta, etiquetas decorativas acima de títulos e setas em botões.
- Gradientes e ilustrações genéricas de IA (robôs, faíscas, cérebros).
- Animação de entrada em cada bloco. Movimento só em dois momentos: arquivo entrando na pasta e fase liberada.
- Aparência de chat. A entrevista mostra uma pergunta por vez, não um fio de mensagens.

## 2. Tokens

A paleta tem uma base fria e neutra, uma cor de ação e uma única cor quente reservada à pasta. Os tokens ficam em variáveis CSS e no tema do Tailwind, com estes nomes.

### Cores de base

| Token | Hex | Uso |
| --- | --- | --- |
| `bancada` | #EEF1F0 | Fundo geral das três superfícies |
| `papel` | #FFFFFF | Folha de trabalho, campos, cartões do admin |
| `tinta` | #14262B | Texto principal |
| `tinta-suave` | #4A5C61 | Texto de apoio, rótulos |
| `linha` | #C9D2D0 | Bordas e divisores |
| `petroleo` | #0E5A6B | Ação principal, fase atual, foco |
| `petroleo-claro` | #DCEBEE | Fundo de item ativo, seleção |
| `pasta` | #F5B82E | Somente a Pasta viva e o que representa arquivo salvo |
| `pasta-sombra` | #C98F12 | Aba e lombada da pasta |

### Cores de estado

Cada estado tem cor, ícone e palavra. Os três aparecem sempre juntos.

| Estado | Hex | Ícone | Palavra |
| --- | --- | --- | --- |
| Em andamento | #0E5A6B | círculo em progresso | Em andamento |
| Pronta | #2B8A3E | visto | Pronta |
| Atrasada | #D9480F | relógio | Atrasada |
| Pediu ajuda | #C2255C | mão levantada | Pediu ajuda |
| Pausada | #4A5C61 | pausa | Pausada |
| Sem conexão | #868E96 | sinal cortado | Sem conexão |

Passou e falhou, no placar de conferências, usam o verde de Pronta e o laranja de Atrasada, com visto e xis.

### Tipografia

| Papel | Família | Por quê |
| --- | --- | --- |
| Títulos, pergunta da IA, números de fase | Bricolage Grotesque (600 e 700) | Tem personalidade de oficina e continua nítida em corpo grande |
| Texto e interface | Atkinson Hyperlegible (400 e 700) | Desenhada para leitura difícil: letras que não se confundem a distância |
| Nomes de arquivo e conteúdo de arquivo | JetBrains Mono (400 e 600) | Usada só onde o conteúdo é literalmente um arquivo |

As três famílias são carregadas localmente com o projeto, não de um servidor externo, para não depender da rede do evento.

| Escala | Mesa | Celular | Admin |
| --- | --- | --- | --- |
| Pergunta ou título do passo | 40 px / 1,15 | 26 px | 22 px |
| Título de seção | 28 px / 1,2 | 20 px | 17 px |
| Texto de trabalho | 20 px / 1,5 | 17 px | 15 px |
| Apoio e rótulo | 16 px / 1,4 | 14 px | 13 px |
| Cronômetro | 32 px, algarismos tabulares | 20 px | 20 px |

Texto alinhado à esquerda em todas as superfícies. Linhas de leitura com no máximo 70 caracteres. Sem caixa alta em rótulos.

### Forma, espaço e movimento

- **Espaçamento:** base de 4 px. Passos usados: 4, 8, 12, 16, 24, 32, 48, 64.
- **Raio:** 4 px em folhas e campos, 10 px em botões, e a forma própria da pasta com aba. Não há um raio único para tudo.
- **Sombra:** só na folha de trabalho (`0 1px 0 #C9D2D0`) e na pasta. O admin separa cartões por borda, não por sombra.
- **Alvo de toque:** mínimo de 48 px no celular e 44 px na mesa.
- **Movimento:** 180 ms para respostas a ações, 450 ms para o arquivo entrando na pasta, 1,2 s para o anúncio de fase liberada. Com `prefers-reduced-motion`, tudo vira troca instantânea.

## 3. Arquitetura do frontend

São três superfícies sobre o mesmo estado, cada uma com seu layout. O estado de fase vem sempre do servidor, por tempo real.

### Rotas

| Rota | Superfície | Layout |
| --- | --- | --- |
| `/` | Entrada: campo para o código da mesa | Centralizado, simples |
| `/mesa/[codigo]` | Tela compartilhada da mesa | Três zonas fixas, sem rolagem de página |
| `/mesa/[codigo]/imprimir` | Roteiro da mesa para impressão (plano B) | Folha A4 |
| `/p/[codigo]` | Celular do participante | Coluna única |
| `/admin/entrar` | Senha do gestor ou do facilitador | Centralizado |
| `/admin` | Painel de controle | Barra superior e grade de mesas |
| `/admin/mesa/[id]` | Detalhe da mesa | Gaveta lateral sobre o painel |
| `/admin/preparo` | Cadastros: evento, processos, mesas, roteiro | Abas e formulários |

### Estado

- **Estado do servidor:** evento, mesa (fase, passo, estado), arquivos, conferências, contribuições, chamados. Chega por assinatura de tempo real e é a única fonte para fase e passo.
- **Estado local:** texto em digitação, arquivo aberto na visualização, gaveta aberta. Rascunhos de texto são guardados no navegador a cada tecla e restaurados ao recarregar.
- **Sem atualização otimista em fase.** "Concluímos a fase" e as ações do admin mostram estado de envio e só mudam a tela quando o servidor confirma.
- **Atualização otimista permitida** em marcar passo, aceitar contribuição e editar arquivo, com desfazer se o servidor recusar.

### Registro de atividades

Cada passo da jornada tem um tipo de atividade nos dados. O centro da tela da mesa renderiza o componente correspondente a esse tipo. Trocar o roteiro não exige mexer em componente.

```
lib/jornada/             fases, passos, papel, tipo de atividade, critério
components/mesa/         Trilha, FolhaDeTrabalho, PastaViva, BarraSuperior
components/atividades/   um componente por tipo (seção 5)
components/admin/        GradeDeMesas, CartaoDaMesa, BarraDeFases, GavetaDaMesa
components/base/         Botao, Campo, Selo, Cronometro, Aviso, Dialogo
```

### Conexão

- Um indicador discreto na barra superior mostra o estado: conectado, reconectando, sem conexão.
- Sem conexão, a mesa continua lendo e digitando. Ações que dependem do servidor ficam desabilitadas com o motivo escrito.
- Ao reconectar, a tela busca o estado atual e volta ao passo em que o servidor diz que a mesa está.
- A resposta da IA aparece aos poucos. Se falhar no meio, o texto parcial fica na tela com o botão "Tentar de novo".

## 4. Tela da mesa

A tela ocupa a janela inteira, sem rolagem de página, em três zonas de largura fixa: Trilha (240 px), Folha de trabalho (flexível) e Pasta viva (320 px). Só a Folha de trabalho rola por dentro.

```
+-----------------------------------------------------------------------------------+
| Mesa 07   Responder pedido de orçamento pelo WhatsApp      (o) conectado  1:42:10 |
+----------------+--------------------------------------------------+---------------+
| TRILHA         | FOLHA DE TRABALHO                                | PASTA VIVA    |
|                |                                                  |  ___________  |
| (v) 0 Check-in | Fase 2, passo 1 de 6           Dono do processo  | /orcamento-   |
| (v) 1 Processo |                                                  | | whatsapp    |
| (>) 2 Entrev.  | O que você confere antes de                      | |-------------|
|      18:24     | mandar o orçamento ao cliente?                   | | SKILL.md  * |
|   [x] passo 1  |                                                  | | arquivos/   |
|   [ ] passo 2  | +----------------------------------------------+ | |  INDICE.md  |
|   [ ] passo 3  | | resposta da mesa...                          | | | exemplos/   |
| ( ) 3 Caixa    | +----------------------------------------------+ | | notas.md    |
| ( ) 4 Prova    | [ Responder ]                                    | |_____________|
| ( ) 5 Teste    |                                                  |               |
| ( ) 6 Conserto | Temas cobertos  [##][##][##][  ][  ][  ][  ][  ] | 2 arquivos    |
| ( ) 7 Entrega  | Contribuições do grupo (3)                     v | * novo nesta  |
|                |                                                  |   fase        |
| [Pedir ajuda]  |                    [ Passo concluído ]           |               |
+----------------+--------------------------------------------------+---------------+
| Aviso do gestor: faltam 5 minutos para o fim da entrevista.                       |
+-----------------------------------------------------------------------------------+
```

Os rótulos em maiúsculas no desenho só identificam as zonas. Na interface não há rótulos em caixa alta.

### Barra superior

- Nome da mesa, tarefa em uma linha, indicador de conexão e cronômetro geral do evento.
- Altura fixa de 64 px. Não tem menu nem ações.

### Trilha

- Lista vertical das 8 fases, com número, nome curto e marcador: concluída, atual ou bloqueada. A numeração é real, porque a jornada é uma sequência.
- A fase atual abre para mostrar o cronômetro da fase e os passos, cada um com caixa de conclusão.
- Fase concluída é clicável e abre em modo leitura, com uma faixa "Vocês estão revendo a Fase 1" e o botão "Voltar ao passo atual".
- Fase bloqueada não é clicável e mostra o cadeado.
- "Pedir ajuda" fica fixo no pé da Trilha. Depois de acionado, vira "Ajuda a caminho" na cor de Pediu ajuda, com a opção "Cancelar pedido".

### Folha de trabalho

- Cabeçalho: "Fase 2, passo 1 de 6" à esquerda e o papel responsável à direita, em selo.
- Corpo: a instrução do passo em corpo de título, seguida da atividade do passo (seção 5).
- Pé fixo: o botão "Passo concluído". Desabilitado, mostra ao lado o que falta, por exemplo "Falta cobrir 5 temas".
- No último passo, o botão muda para "Concluímos a fase".

### Pasta viva

- Desenhada como pasta, com aba que traz o nome da skill.
- Árvore de arquivos com nomes em fonte monoespaçada. Um ponto marca o que foi criado ou alterado na fase atual.
- Clicar em um arquivo abre a visualização sobre a Folha de trabalho, com "Fechar" e, quando o passo permite, "Editar".
- Pasta vazia, nas Fases 0 e 1, mostra a pasta aberta com o texto "A skill de vocês vai aparecer aqui".
- Arquivo novo entra com o movimento de guardar e o contador de arquivos atualiza.

### Estados de tela inteira

| Estado | O que a mesa vê |
| --- | --- |
| Aguardando liberação | "Fase concluída. Aguardando liberação." e, abaixo, uma atividade de aprofundamento opcional |
| Fase liberada | Anúncio de 1,2 s com o número e o nome da nova fase. Depois, o primeiro passo |
| Pausada | "Intervalo. Voltamos em 08:12." com o cronômetro da pausa |
| Fase reaberta pelo gestor | Faixa "O gestor reabriu a Fase 3. Nada foi apagado." |
| Sem conexão | Faixa fixa no topo: "Sem conexão. Continuem escrevendo, nada se perde." |
| Código inválido | "Não encontramos esta mesa. Confira o código no cartão da mesa." |

### Larguras

- De 1366 px para cima: três zonas.
- De 1024 a 1365 px: a Pasta viva recolhe em uma aba lateral que abre por cima.
- Abaixo de 1024 px: aviso para usar o notebook da mesa, com link para a tela do participante.

## 5. Atividades por fase

O centro da tela assume um de 11 tipos de atividade, conforme o passo. Cada tipo é um componente com critério de conclusão próprio.

| Tipo | Fases | O que mostra | Concluído quando |
| --- | --- | --- | --- |
| `papeis` | 0 | Seis cartões de papel com descrição. A mesa arrasta ou escolhe um nome para cada papel | Todos os papéis têm nome |
| `leitura` | 1 | Ficha do processo e materiais do kit em abas, com exemplo bom e exemplo ruim lado a lado | A mesa marca "Lemos" |
| `frase` | 1, 7 | Um campo de uma linha com contador e exemplo de formato | Texto com verbo e resultado, até 90 caracteres |
| `entrevista` | 2 | A pergunta atual em corpo grande, campo de resposta, barra dos 8 temas e fila de contribuições | 8 perguntas e 8 temas |
| `editor` | 2, 6, 7 | Arquivo em edição por seções, com visualização formatada ao lado e "Aprovar" | A mesa aprova |
| `rodada` | 3, 4, 6 | Caso de entrada à esquerda, resultado da IA à direita, com "Congelar" em cada bloco do resultado | Resultado gerado |
| `caixa` | 3 | Lista do que foi congelado, com nome do arquivo, para que serve e "Salvar como exemplo" | 1 modelo e 1 exemplo |
| `conferencias` | 4 | Lista editável: cada linha tem "O que confere" e "Contra qual fonte" | De 5 a 10 linhas válidas |
| `placar` | 4, 5 | Uma linha por conferência: passou ou falhou, com a prova usada, e total no topo | Todas executadas |
| `relatorio` | 5, 6 | Falhas do teste cruzado com a observação do Testador. Na Fase 6, permite escolher uma falha | Relatório enviado ou falha escolhida |
| `conserto` | 6 | Três opções de camada (processo, caixa, prova), a proposta da IA e a comparação antes e depois | Conserto aprovado e registrado |

### Entrevista

- Uma pergunta por vez. As anteriores ficam recolhidas em "Perguntas respondidas (4)", que abre uma lista.
- A pergunta usa a família de títulos em 40 px. É o maior elemento da tela.
- O campo de resposta aceita digitação e ditado por voz do navegador, quando disponível.
- A barra de temas tem 8 segmentos com nome. Passar o cursor mostra o que falta cobrir.
- A fila de contribuições mostra o que chegou dos celulares, com "Incluir na resposta" e "Descartar".
- "Encerrar entrevista" só aparece com 8 perguntas e 8 temas. Antes disso, o lugar do botão diz o que falta.

### Conferências

- A validação acontece ao sair do campo. Linha recusada fica com borda laranja e o motivo escrito abaixo.
- Motivos possíveis: "Falta dizer contra qual fonte" e "A palavra 'profissional' não dá para conferir. Troque por algo que se possa contar ou comparar".
- Um exemplo fixo no topo mostra uma conferência boa e uma ruim.

### Rodada e congelar

- O resultado da IA é dividido em blocos. Cada bloco tem o botão "Congelar".
- Ao congelar, a IA mostra a versão com lacunas entre colchetes e o nome de arquivo sugerido. A mesa confirma com "Guardar na pasta".
- Confirmado, o arquivo entra na Pasta viva com o movimento de guardar.

### Teste cruzado

- A Pasta viva troca de cor de aba e de nome para deixar claro que a pasta é de outra mesa: "Pasta da Mesa 08, somente leitura".
- No placar, cada falha abre um campo "O que aconteceu?" para o Testador.
- Ao enviar o relatório, a tela volta a mostrar a pasta da própria mesa.

## 6. Celular do participante

O celular tem uma única tela que muda conforme a fase. A pessoa sempre vê onde a mesa está e qual é o seu papel, e só escreve quando o passo pede.

```
+---------------------------+
| Mesa 07         Fase 2    |
| Entrevista        18:24   |
+---------------------------+
| Seu papel                 |
| Cético                    |
| Você escreve as           |
| conferências da prova.    |
+---------------------------+
| A mesa está respondendo:  |
| O que você confere antes  |
| de mandar o orçamento?    |
+---------------------------+
| Lembrou de uma exceção ou |
| de algo que já deu errado?|
| +-----------------------+ |
| |                       | |
| +-----------------------+ |
| [ Enviar para a mesa ]    |
+---------------------------+
| Enviadas: 2  Aceitas: 1   |
+---------------------------+
```

### Fluxo de entrada

1. A pessoa lê o QR da mesa e cai em `/p/[codigo]`.
2. Informa o primeiro nome. É o único campo.
3. Vê a tela de espera até a mesa distribuir os papéis.

O nome fica guardado no navegador. Se a pessoa fechar e abrir de novo, volta direto para a mesa.

### Conteúdo por fase

| Fase | O que o celular mostra |
| --- | --- |
| 0 | Campo do nome. Depois, o papel recebido |
| 1 | Resumo da ficha do processo e campo "Uma dúvida ou um caso parecido" |
| 2 | Pergunta atual da entrevista e campo de contribuição |
| 3, 4, 6 | Fase, passo e papel. Sem campo de envio |
| 5 | "Vocês estão testando a skill da Mesa 08" e o placar em leitura |
| 7 | Botão "Baixar a pasta" e instruções de instalação em 3 passos |
| Pausa | Cronômetro do intervalo |

### Comportamento

- Depois de enviar, o campo limpa e aparece "Enviado para a mesa" por 3 segundos.
- Limite de 280 caracteres por contribuição, com contador.
- Avisos do gestor aparecem no topo, na mesma faixa da tela da mesa.
- Mudança de fase atualiza a tela sozinha, sem recarregar.
- Botões com altura mínima de 48 px e campo de texto que não é coberto pelo teclado.

## 7. Admin

O painel cabe em uma tela sem rolagem para até 20 mesas e responde a duas perguntas de relance: quem precisa de mim agora e quem já pode avançar.

```
+--------------------------------------------------------------------------------------+
| InovaPB 03/12     Tempo do evento 1:42:10     [ Pausar todas ]  [ Enviar aviso ]     |
+--------------------------------------------------------------------------------------+
| Fase de referência: 2 Entrevista          Restam 06:10        [ +5 min ] [ -5 min ]  |
|  0      1      2        3      4      5      6      7                                |
|  .      .    #####     ##      .      .      .      .     mesas em cada fase         |
|               12        3                                                            |
|                                   [ Avançar as 5 mesas prontas ]  [ Avançar todas ]  |
+--------------------------------------------------------------------------------------+
| Mostrar: (Todas 15) (Pediu ajuda 2) (Prontas 5) (Atrasadas 1)                        |
+--------------------------------------------------------------------------------------+
| +--------------+ +--------------+ +--------------+ +--------------+ +--------------+ |
| | Mesa 01      | | Mesa 02      | | Mesa 03      | | Mesa 04      | | Mesa 05      | |
| | Orçamento    | | Cobrança     | | Proposta     | | Orçamento    | | Agenda       | |
| | Fase 2  4/6  | | Fase 2  6/6  | | Fase 3  1/5  | | Fase 2  2/6  | | Fase 2  5/6  | |
| | 18:24        | | 21:02        | | 03:40        | | 24:15        | | 19:30        | |
| | Em andamento | | (v) Pronta   | | Em andamento | | (!) Ajuda    | | Em andamento | |
| | 6 pessoas    | | 5 pessoas    | | 6 pessoas    | | 6 pessoas    | | 5 pessoas    | |
| | [ Avançar ]  | | [ Avançar ]  | | [ Avançar ]  | | [ Atender ]  | | [ Avançar ]  | |
| +--------------+ +--------------+ +--------------+ +--------------+ +--------------+ |
|   ... mais duas linhas de cartões                                                    |
+--------------------------------------------------------------------------------------+
```

### Barra de fases

- Mostra a fase de referência do evento, o tempo restante e a distribuição de mesas por fase.
- "Avançar as N mesas prontas" é a ação principal do painel. Fica desabilitada quando N é zero.
- "Avançar todas" pede confirmação e informa quantas mesas ainda não concluíram.

### Cartão da mesa

- Posição fixa por número da mesa. Os cartões não mudam de lugar, para o gestor memorizar onde cada mesa está.
- Conteúdo, nesta ordem: nome, processo, fase e passo, tempo na fase, estado, pessoas conectadas, ação principal.
- O estado aparece em uma faixa na borda esquerda do cartão, com ícone e palavra. Pediu ajuda pulsa uma vez ao chegar e toca um som curto, que pode ser desligado.
- A ação principal muda com o estado: "Avançar" em Pronta, "Atender" em Pediu ajuda. Em Em andamento, "Avançar" aparece como ação secundária e equivale a forçar.
- Clicar no cartão abre a gaveta de detalhe.

### Gaveta de detalhe

Abre pela direita, sobre o painel, sem sair dele.

| Aba | Conteúdo |
| --- | --- |
| Agora | Fase, passo, critérios atendidos e pendentes, pessoas e papéis. Ações: avançar, voltar, forçar, pausar, ajustar tempo, enviar aviso |
| Pasta | A Pasta viva da mesa em leitura, com visualização de arquivos |
| Conversa | A entrevista e as rodadas da mesa, em leitura |
| Linha do tempo | Entrada e saída de cada fase, chamados e ações do gestor ou do facilitador, com horário e autor |
| Teste | Mesa parceira, placar e relatório. Permite trocar a mesa parceira |

### Confirmações

| Ação | Confirmação |
| --- | --- |
| Avançar mesa pronta | Sem confirmação. Aviso com "Desfazer" por 5 segundos |
| Forçar avanço | Diálogo: "A Mesa 04 ainda não cobriu 3 temas. Avançar mesmo assim?" |
| Voltar fase | Diálogo: "A Mesa 04 volta para a Fase 2. Nada será apagado." |
| Avançar todas | Diálogo com a contagem de mesas que não concluíram |
| Iniciar teste cruzado | Diálogo com a lista de pares e as mesas que ainda não têm pasta testável |

### Perfil de facilitador

Vê o mesmo painel. Não vê "Pausar todas", os ajustes de tempo do evento, a aba de preparo nem a exportação. As ações de fase por mesa ficam disponíveis.

### Preparo

Quatro abas de formulário: Evento, Processos, Mesas e Roteiro. Em Mesas, cada linha gera o código, o QR e um cartão de mesa para imprimir. Em Roteiro, os textos dos passos são editados com pré-visualização da tela da mesa ao lado.

### Larguras

- De 1280 px para cima: 5 cartões por linha.
- Tablet, de 768 a 1279 px: 3 cartões por linha, com a barra de fases fixa no topo. É o formato esperado para facilitadores circulando.
- Celular: lista de uma coluna, ordenada por Pediu ajuda, Prontas e depois as demais.

## 8. Componentes, textos, acessibilidade e aceite

### Componentes de base

| Componente | Variantes | Regras |
| --- | --- | --- |
| Botão | principal, secundário, discreto, perigo | Um botão principal por tela. Desabilitado sempre vem com o motivo escrito ao lado. Estado de envio troca o texto para o gerúndio ("Guardando") |
| Campo | linha, texto longo | Rótulo sempre visível acima. Erro escrito abaixo, com o que fazer |
| Selo | papel, estado | Estado sempre com ícone e palavra |
| Cronômetro | fase, evento, pausa | Algarismos tabulares. Muda para a cor de Atrasada ao zerar e passa a contar para cima com sinal de mais |
| Faixa de aviso | gestor, conexão, fase reaberta | Fixa no pé (gestor) ou no topo (sistema). Aviso do gestor some ao ser lido ou em 60 segundos |
| Diálogo | confirmação | Título diz a consequência. Botões repetem o verbo da ação ("Avançar mesmo assim", "Cancelar") |
| Barra de temas | 8 segmentos | Segmento coberto preenchido, com nome legível |
| Árvore de arquivos | editável, leitura | Nomes em fonte monoespaçada. Ponto para novo na fase |

### Textos de interface

A voz é a de um facilitador ao lado da mesa: frases curtas, verbo no início, "vocês" para a mesa e "você" no celular.

| Situação | Texto |
| --- | --- |
| Botão do passo | Passo concluído |
| Botão da fase | Concluímos a fase |
| Botão desabilitado na entrevista | Falta cobrir 3 temas |
| Espera | Fase concluída. Aguardando liberação. |
| Fase liberada | Fase 3 liberada: Caixa de ferramentas |
| Ajuda pedida | Ajuda a caminho |
| IA falhou | A resposta não chegou. O que vocês escreveram está salvo. |
| Conteúdo sensível | Isto parece um CPF. Troque por um dado fictício antes de guardar. |
| Pasta vazia | A skill de vocês vai aparecer aqui |
| Entrega | Skill pronta. Baixem a pasta pelo celular. |

Uma ação mantém o mesmo nome em todo o fluxo: o botão "Guardar na pasta" gera o aviso "Guardado na pasta". Termos fixos: mesa, fase, passo, pasta, conferência, rodada. A interface não usa "prompt", "token", "deploy" nem "markdown".

### Acessibilidade

- Contraste mínimo de 4,5 para 1 em texto e 3 para 1 em elementos de interface. A palavra de cada estado é escrita em tinta. A cor de estado fica no ícone e na faixa, onde vale o mínimo de 3 para 1. Conferir os pares com uma ferramenta de contraste antes de fechar os tokens.
- Foco de teclado sempre visível: contorno de 3 px na cor `petroleo`, com 2 px de afastamento.
- Todos os passos são operáveis só com teclado. Enter envia a resposta, Shift e Enter quebram linha.
- Mudança de fase, aviso do gestor e resposta da IA concluída são anunciados a leitores de tela.
- Movimento reduzido respeitado em todas as animações.
- A tela da mesa funciona com zoom do navegador em 125% sem cortar conteúdo.

### Desempenho

- Primeira tela da mesa utilizável em até 3 segundos em rede 4G.
- Fontes e ícones servidos junto com a aplicação. Nenhuma dependência de servidor externo em tempo de uso, além da IA e do banco.
- O painel do admin atualiza cartão por cartão, sem redesenhar a grade.

### Critérios de aceite do frontend

- [ ] Seis pessoas leem a pergunta da entrevista a 1 metro de um notebook de 14 polegadas.
- [ ] A tela da mesa não tem rolagem de página em 1366 por 768.
- [ ] Nenhum estado é comunicado só por cor, na mesa, no celular ou no admin.
- [ ] Todo botão desabilitado mostra o motivo.
- [ ] Um arquivo novo entra na Pasta viva com o movimento de guardar, e sem movimento quando o sistema pede movimento reduzido.
- [ ] A mudança de fase feita no admin aparece na mesa e no celular com o anúncio de fase liberada.
- [ ] Com a rede desligada, a mesa continua digitando e, ao religar, volta ao passo correto sem perder o texto.
- [ ] O painel mostra 20 mesas sem rolagem em 1440 por 900.
- [ ] O gestor identifica em até 3 segundos quais mesas pediram ajuda.
- [ ] O perfil de facilitador não vê pausa geral, preparo nem exportação.
- [ ] Nenhum texto de interface usa caixa alta em rótulos, travessões ou jargão técnico.

### Em aberto

- **Marcas.** A direção visual é própria da ferramenta. Os logotipos de Sebrae e Orbie entram só na tela de entrada e no cartão impresso da mesa, se as duas instituições autorizarem e enviarem os arquivos.
- **Nome do produto na interface.** "Mesa de Skills" é nome de trabalho.
