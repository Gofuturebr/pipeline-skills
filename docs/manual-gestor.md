# Manual do gestor e do facilitador

Para quem opera o painel durante a oficina. Descreve o sistema como ele está hoje. Todas as
partes já funcionam. O que precisa ser conferido à mão antes do dia está no fim, na seção
"Antes do dia: o que conferir".

## 1. Os endereços

| Quem | Onde abre | O que digita |
| --- | --- | --- |
| Gestor | `/admin` no notebook ou no celular | Seu nome e a senha do gestor |
| Facilitador | `/admin` no celular ou no notebook | Seu nome e a senha do facilitador |
| Mesa | Página inicial no notebook da mesa | O código da mesa, que está no cartão |
| Participante | Lê o QR do cartão ou da tela da mesa | Só o primeiro nome. Quem já entrou toca no próprio nome |

O nome digitado na entrada do painel fica gravado em cada ação, para saber depois quem
avançou ou voltou cada mesa. A sessão dura 12 horas.

## 2. Antes da oficina

1. **Confira o preparo.** No painel, abra **Mais** e clique em **Preparo** (veja abaixo). Confira
   o nome e a data do evento, os processos, as mesas e o processo de cada uma.
   **Para acrescentar uma mesa,** clique no cartão **Adicionar mesa**, no fim da grade do painel.
   Ele aparece até você clicar em **Iniciar evento**. A mesa nova recebe o código sozinha e, como
   o evento tem um processo só, já vem com ele. Depois de iniciar, acrescente pela aba **Mesas** do
   Preparo. Toda mesa nova precisa do cartão impresso.
2. **Imprima os cartões das mesas.** No painel, abra **Mais**, clique em **Cartões com QR** e
   depois em **Imprimir os cartões**. Saem dois cartões por folha, cada um com o nome da mesa, o processo,
   o código para o notebook e o QR para os celulares.
3. **Teste um QR com o seu celular** antes de imprimir tudo. Se a tela da mesa abrir no
   celular, está tudo certo. Se não abrir, avise o responsável técnico: o celular precisa
   conseguir chegar ao endereço que aparece no topo da página de cartões.
4. **Abra cada notebook** na página inicial e digite o código da mesa. Deixe a janela do Chrome
   em tela cheia.
5. **Imprima um roteiro de reserva** de cada mesa, se quiser ter um plano para a internet
   cair: no detalhe da mesa, clique em **Roteiro para imprimir**.
6. Quando todos estiverem sentados, clique em **Iniciar evento**. Isso liga o cronômetro geral
   e zera o cronômetro das mesas que estão na Fase 0.

### A página de Preparo

Só o gestor abre. Tem quatro abas, e tudo que você guarda aparece nas telas na hora.

| Aba | O que dá para fazer |
| --- | --- |
| **Evento** | Mudar o nome, a data, os minutos de intervalo e a lista de palavras vagas que a Prova recusa |
| **Processos** | Criar, editar e remover processos: ficha, materiais do kit, exemplo bom, exemplo ruim, caso de exemplo e caso novo. Um processo pode ir para mais de uma mesa. Só sai o processo que não está em nenhuma mesa |
| **Mesas** | Criar mesas (**Acrescentar mesa**), mudar o nome e o processo de cada uma. O código da mesa é criado sozinho. Se o evento tem um processo só, a mesa nova já vem com ele. Só sai a mesa que ainda não começou: na Fase 0, sem pasta e sem celulares |
| **Roteiro** | Mudar os minutos de cada fase, a atividade da tela de espera e o texto de cada passo. Ao lado, aparece como a mesa vai ver. A soma dos minutos aparece no topo |

Os textos não podem ter travessão: a tela pede para trocar por vírgula, ponto ou dois-pontos.

## 3. As fases

Cada mesa passa por 8 fases. A mesa nunca muda de fase sozinha: ela avisa que concluiu
("Concluímos a fase") e você ou um facilitador libera a próxima.

| Fase | Nome | Tempo | A mesa só consegue concluir quando |
| --- | --- | --- | --- |
| 0 | Check-in e papéis | 10 min | Os 6 papéis têm um nome |
| 1 | Entender o processo | 15 min | Marcou "Lemos" na ficha e no kit e confirmou a tarefa em uma linha |
| 2 | Entrevista | 35 min | A IA cobriu os 8 temas e a mesa aprovou o arquivo |
| 3 | Caixa de ferramentas | 25 min | Guardou pelo menos 1 modelo e 1 exemplo |
| 4 | Prova | 20 min | Tem de 5 a 10 conferências válidas |
| 5 | Teste cruzado | 30 min | A mesa parceira registrou o placar |
| 6 | Conserto | 20 min | Registrou pelo menos 1 conserto e rodou de novo |
| 7 | Entrega | 15 min | Marcou a skill como final |

O intervalo não é uma fase: é uma pausa geral que você liga quando quiser (10 minutos se não
disser outro tempo).

### Estados de uma mesa

| Estado | O que quer dizer |
| --- | --- |
| Em andamento | A mesa está trabalhando na fase |
| Pronta | A mesa clicou em "Concluímos a fase" e espera a liberação |
| Atrasada | O tempo da fase acabou. O cronômetro fica vermelho e conta para cima. A mesa continua trabalhando normalmente |
| Pausada | Você pausou a mesa ou chamou o intervalo |
| Pediu ajuda | A mesa chamou alguém. Aparece por cima do estado, o cartão pisca e toca um som |

## 4. O painel

### Barra de cima

| Botão | Para que serve |
| --- | --- |
| **Iniciar evento** | Liga o cronômetro geral. Depois de clicado, vira o tempo do evento |
| **Liberação manual** ou **Liberação automática** | Troca o modo. No manual, você libera cada mesa pronta. No automático, a mesa passa para a fase seguinte assim que conclui |
| **Pausar todas** | Abre o intervalo. Pergunta quantos minutos. O tempo das fases para; o tempo do evento continua |
| **Retomar todas** | Encerra o intervalo. Retoma também as mesas pausadas uma a uma |
| **Enviar aviso** | Manda um aviso curto (até 280 letras) para todas as mesas e todos os celulares |
| **Mais** | Abre três opções: **Preparo** (evento, processos, mesas e textos do roteiro), **Cartões com QR** (para imprimir) e **Exportar todas (.zip)** (a pasta com todas as skills, um LEIA-ME e o .zip de cada uma, pronto para enviar ao claude.ai) |
| **Som ligado** ou **Som desligado** | Liga ou desliga o som de pedido de ajuda |
| **Sair** | Sai do painel |

### Barra de fases

- **Fase de referência:** a fase em que a maioria das mesas deveria estar agora. Serve de base
  para "Avançar todas".
- **Todas as mesas:** **+5 min** e **-5 min** valem para todas de uma vez.
- **Avançar as mesas prontas:** libera de uma vez todas as mesas que estão prontas. Quando
  nenhuma está pronta, aparece o texto "Nenhuma mesa pronta" no lugar do botão.
- **Iniciar teste cruzado:** forma os pares do teste cruzado. Clique quando as primeiras mesas
  chegarem à Fase 5. Depois de formados, aparece o texto "Pares do teste formados".
- **Avançar todas:** passa para a fase seguinte todas as mesas que estão na fase de referência,
  prontas ou não. Antes, aparece quantas ainda não concluíram. Mesas em outras fases não mudam.
- Logo abaixo, uma linha mostra quantas mesas estão em cada fase.

### Filtros

**Todas**, **Pediu ajuda**, **Prontas** e **Atrasadas**, cada um com o número de mesas.

### Cartão de cada mesa

Mostra o nome, o tempo da fase, o processo, a fase e o passo, o estado e **quantas pessoas
estão com o celular conectado** naquele momento. Quando a skill já foi marcada como final,
aparece "Final." antes do número de pessoas. O número cai quando o celular fica com a tela
apagada por mais de 45 segundos; isso é normal.

| Estado | Botão | O que faz |
| --- | --- | --- |
| Pronta | **Avançar** | Libera a fase seguinte. Aparece **Desfazer** por 30 segundos, caso tenha sido engano |
| Em andamento ou atrasada | **Avançar** (mais discreto) | Força o avanço. Pede confirmação e mostra o que falta para a mesa |
| Pausada | **Retomar** | Retoma a mesa |
| Pediu ajuda | **Atender** | Marca o pedido como atendido. Faça isso quando chegar à mesa |
| Fase 7 | "Última fase" | Nada a avançar |

### Detalhe da mesa

Clique no corpo do cartão para abrir o detalhe, do lado direito. No topo ficam o código da
mesa, **Abrir a tela da mesa** e **Roteiro para imprimir** (o plano B, veja a seção 7).

O detalhe tem abas. A aba **Agora** tem as ações:

- **Fase:** **Avançar**, **Forçar avanço** e **Voltar fase**. Voltar nunca apaga nada; a mesa
  vê uma faixa avisando que a fase foi reaberta.
- **Tempo:** **Pausar** ou **Retomar** só essa mesa, e **+5 min** ou **-5 min** só para ela.
- **Aviso para a mesa:** um aviso só para essa mesa e os celulares dela.
- **Skill e teste cruzado:** qual mesa ela testa (dá para trocar), **Destravar a skill** quando
  ela já foi marcada como final, e **Baixar a skill (.zip)**.
- Se a mesa pediu ajuda: **Marcar chamado como atendido**.

As outras abas são só para ler, e só o gestor vê:

| Aba | O que mostra |
| --- | --- |
| **Pasta** | Os arquivos da mesa, com a versão de cada um. Clique no nome para ler |
| **Conversa** | A entrevista inteira, pergunta e resposta, com a hora. Embaixo, o que os celulares mandaram |
| **Linha do tempo** | Tudo que aconteceu com a mesa, com a hora e quem fez: avanços, voltas, avisos, arquivos guardados, rodadas, consertos. Embaixo, os pedidos de ajuda e quem atendeu |
| **Teste** | O teste que a mesa fez na parceira e o teste que recebeu, com o placar de cada um |

Feche com o X ou com a tecla Esc.

### No celular

O painel funciona no celular. Os cartões aparecem em lista: primeiro as mesas que pediram ajuda,
depois as prontas, depois as demais.

## 5. O facilitador

O facilitador entra pelo mesmo endereço, com a senha de facilitador. Ele vê o mesmo painel, mas
só pode:

- avançar, forçar, voltar e desfazer a fase de uma mesa;
- atender pedidos de ajuda.

Ele não vê os botões de iniciar evento, modo de liberação, pausar, ajustar tempo, enviar aviso,
o menu **Mais** (preparo, cartões com QR e exportar), fase de referência, ações em todas as
mesas, teste cruzado e destravar. No detalhe da mesa, ele vê só a aba **Agora** e o link do
roteiro para imprimir.

## 6. O que a mesa e os celulares fazem em cada fase

Saber isso ajuda a atender os pedidos de ajuda.

**Fase 0, Check-in e papéis**

1. A tela da mesa mostra um QR grande. Cada pessoa lê com o celular e digita o primeiro nome.
   Os nomes aparecem na tela da mesa na hora. Quem está sem celular participa do mesmo jeito.
2. A mesa escolhe quem fica com cada um dos 6 papéis. Para cada papel, escolhe um nome da lista
   de quem entrou ou digita outro nome. Uma pessoa pode ficar com dois papéis. O botão de
   avançar só libera com os 6 papéis preenchidos.
3. O Porta-voz confere a lista e a mesa conclui a fase. No celular, cada pessoa vê o seu papel.

**Fase 1, Entender o processo**

1. A mesa lê a ficha do processo e clica em **Lemos**.
2. A mesa lê o kit: o exemplo bom ao lado do exemplo ruim, e os materiais. Clica em **Lemos**.
3. Cada pessoa manda pelo celular uma dúvida ou um caso parecido. Os envios aparecem na tela da
   mesa, com o nome de quem mandou, e o Piloto clica em **Aceitar** ou **Descartar**. O celular
   mostra quantos envios a mesa aceitou.
4. A mesa escreve a tarefa em uma linha (até 90 letras, com verbo e resultado) e clica em
   **Confirmar a tarefa**. A tarefa passa a aparecer no alto da tela da mesa.

**Fase 2, Entrevista**

1. Ao abrir a fase, a IA faz a primeira pergunta sozinha. Ela pergunta uma coisa por vez, em letra
   grande, e a resposta da mesa vai no campo logo abaixo. A próxima pergunta chega em poucos
   segundos.
2. No alto aparece a barra com os 8 temas que a IA precisa cobrir. Cada tema coberto fica pintado.
3. O botão **Encerrar entrevista** só aparece depois de 8 perguntas respondidas e dos 8 temas
   cobertos. Antes disso, a tela diz o que falta.
4. Os celulares mostram a pergunta da vez e recebem exceções e casos que deram errado. Na tela da
   mesa, cada envio tem **Incluir na resposta**, que leva o texto para o campo de resposta.
5. A mesa pede à IA para escrever o SKILL.md. Leva cerca de meio minuto, e o texto vai aparecendo
   na tela. O arquivo entra na pasta amarela, do lado direito.
6. A IA faz duas perguntas finais: o que ela errou e o que a mesa esqueceu de contar. A mesa pode
   pedir para a IA corrigir ou corrigir cada parte do arquivo com **Editar**. No fim, clica em
   **Aprovar o SKILL.md**. Se mudar o arquivo depois, precisa aprovar de novo.

**Fase 3, Caixa de ferramentas**

1. A mesa clica em **Rodar a tarefa**: a IA usa a skill para fazer a tarefa com o caso de exemplo
   do kit. O caso aparece à esquerda e o resultado à direita. Leva cerca de 15 segundos.
2. O Guardião clica em **Congelar** nas partes boas do resultado. A IA propõe um modelo com
   lacunas, como [nome do cliente], e a mesa confirma com **Guardar na pasta**. O modelo entra em
   arquivos/, com uma linha no índice.
3. O Guardião salva o resultado aprovado como exemplo.
4. A mesa roda a tarefa de novo, do zero, e vê o que a IA reusou da pasta e o que precisou refazer.

**Fase 4, Prova**

1. O Cético escreve de 5 a 10 conferências: o que confere e contra qual fonte. Se a lista estiver
   vazia, dá para começar com **Trazer do SKILL.md**.
2. A tela recusa conferência sem fonte ou com palavra vaga, como "claro", "profissional" ou "de
   qualidade", e diz o motivo.
3. A mesa clica em **Rodar a tarefa e conferir**. Em cerca de 20 segundos aparece o placar, por
   exemplo "8 de 10 passaram", com a prova de cada item.
4. Itens que a IA não conseguiu conferir aparecem marcados. A mesa ajusta a fonte ou tira o item.

**Fase 5, Teste cruzado**

1. Quando as primeiras mesas estiverem chegando à Fase 5, clique em **Iniciar teste cruzado**. O
   sistema forma os pares pelo número da mesa: 1 testa 2 e 2 testa 1, 3 e 4, e assim por diante.
   Com número ímpar de mesas, as três últimas formam um ciclo.
2. Uma mesa só começa a testar quando as duas do par estão na Fase 5. Até lá, a tela avisa que a
   parceira está terminando a Prova.
3. O Testador roda a skill da outra mesa com o caso novo do kit. A pasta da parceira aparece do
   lado direito, em outra cor, só para ler. A conversa da outra mesa não aparece.
4. Para cada falha, o Testador escreve o que aconteceu e envia o relatório. A outra mesa recebe na
   hora.
5. Para trocar um par (por exemplo, se uma mesa atrasou muito), abra o detalhe da mesa e escolha
   em **Esta mesa testa a skill da**. O teste daquela mesa recomeça.

**Fase 6, Conserto**

1. A mesa escolhe a falha mais importante do relatório que recebeu.
2. Marca a camada que falhou: processo, caixa ou prova.
3. Pede a proposta da IA, ajusta se quiser e aprova. Com mais de duas falhas, a IA mostra antes a
   causa no passo a passo. O conserto fica registrado em notas.md.
4. Roda a tarefa de novo e vê o placar de antes e de depois lado a lado.

**Fase 7, Entrega**

1. A mesa confirma o nome da skill e revisa a seção Quando usar.
2. Marca a skill como final. Depois disso, ninguém edita mais. Se precisar mudar algo, abra o
   detalhe da mesa e clique em **Destravar a skill**.
3. A tela mostra o roteiro da apresentação de 1 minuto e o QR para os celulares baixarem a skill.

A pasta amarela guarda todas as versões de cada arquivo. Clicando no arquivo e em **Ver versões
anteriores**, aparece cada versão com a hora e quem mudou: a IA ou a mesa.

Os celulares mostram o tempo da fase, o papel da pessoa e o que a mesa está fazendo. Nas Fases
1 e 2 eles têm o campo de envio. Nas outras fases, servem para acompanhar.

## 7. Pedidos de ajuda comuns

| A mesa diz | O que fazer |
| --- | --- |
| "O botão de avançar não funciona" | Leia o texto ao lado do botão: ele diz o que falta, por exemplo "Faltam 2 papéis sem nome" ou "Marquem Lemos depois de ler" |
| "Alguém não consegue entrar pelo celular" | Peça para a pessoa ler o QR que está na tela da mesa. Se não abrir, ela participa sem celular: o nome dela pode ser digitado na distribuição dos papéis |
| "Entrei com o nome errado no celular" | No pé da tela do celular, toque em **Não é você? Trocar o nome** |
| "Meu papel sumiu do celular" ou "o celular pediu o nome de novo" | Na tela de entrada, em "Já entrou nesta mesa?", a pessoa toca no próprio nome. Ela volta com o papel e com o que já mandou. Se digitar o nome em vez de tocar, o celular pergunta "É você?": toque em **Sou eu** |
| "Tem duas pessoas com o mesmo nome na mesa" | A segunda toca em **Sou outra pessoa** e digita o nome com a inicial do sobrenome, por exemplo "Ana B" |
| "Mandei uma coisa e a mesa não vê" | O envio só aparece nas Fases 1 e 2. Confira se a mesa está numa delas |
| "A tela mostra Algo deu errado" ou "não conseguiu falar com o banco de dados" | Aperte F5. Se continuar, avise o responsável técnico |
| "A resposta da IA não chegou" | Clique em **Tentar de novo**. O que a mesa escreveu continua guardado. Se repetir várias vezes em várias mesas, avise o responsável técnico |
| "A IA está com muitos pedidos agora" | Espere alguns segundos e tente de novo. Acontece quando muitas mesas pedem ao mesmo tempo |
| "Isto parece um CPF" (ou CNPJ, senha, chave) | A mesa escreveu um dado que não pode entrar na skill. Troque por um dado inventado |
| "O botão Encerrar entrevista não aparece" | A tela diz o que falta: perguntas ou temas. A mesa continua respondendo |
| "O modelo não foi guardado: precisa de lacunas" | O modelo é para reusar em outros casos. Peça para trocarem nomes, valores e datas por lacunas entre colchetes |
| "A conferência foi recusada" | Leia o motivo abaixo da linha: falta a fonte ou tem palavra vaga. Ajude a trocar por algo que dá para contar ou comparar |
| "Não deu para conferir" no placar | A fonte não estava no caso nem nos materiais. A mesa troca a fonte ou tira o item |
| "A parceira ainda está terminando a Prova" | O teste espera as duas mesas do par chegarem à Fase 5. Se a outra mesa estiver muito atrasada, troque o par no detalhe da mesa |
| "Não consigo mais editar a skill" | Ela foi marcada como final. Se precisar, abra o detalhe da mesa e clique em **Destravar a skill** |
| "O botão de baixar não aparece no celular" | Ele só aparece depois que a mesa marca a skill como final |
| "A tela ficou pequena e só mostra um aviso" | Maximize a janela do Chrome. A tela da mesa precisa de um notebook |
| "Não encontramos esta mesa" | Confira o código no cartão da mesa |
| "Fechamos a janela sem querer" | Abram a página inicial e digitem o código. A mesa volta no mesmo passo, com tudo que já fez |
| "A internet caiu e não volta" | A mesa continua digitando: o texto fica guardado no notebook e vai quando a internet voltar. Se demorar muito, entregue o roteiro impresso (detalhe da mesa, **Roteiro para imprimir**). Ele tem as fases, os passos, a ficha, o kit, as perguntas da entrevista e espaço para escrever. Quando voltar, o Piloto passa para a tela |

## 8. Antes do dia: o que conferir

1. **Instale uma skill de teste numa conta Claude.** Baixe a skill de uma mesa de teste, abra o
   claude.ai, vá em Personalizar, Skills, envie o .zip e peça a tarefa com o caso novo do kit.
   A execução de código precisa estar ligada nas configurações da conta.
2. **Faça um ensaio com 3 mesas de verdade** e marque o tempo de cada fase. Se alguma fase
   passar muito, ajuste os minutos na aba **Roteiro** do Preparo.
3. **No ensaio, leia a pergunta da entrevista a 1 metro** de um notebook de 14 polegadas, como
   as pessoas vão ler no dia.
4. **Avance uma mesa no painel e veja a tela dela mudar** em até 2 segundos, já no endereço
   que vai ser usado no dia.
5. **Peça ao responsável técnico para confirmar** que a conta da IA aguenta todas as mesas
   pedindo ao mesmo tempo.
