# Manual de uso da Mesa de Skills

Este manual descreve o sistema como ele está hoje, ao fim do Marco 1. Ele é atualizado a
cada marco. O que ainda não existe aparece marcado com o marco em que chega.

## 1. Quem usa o quê

| Pessoa | Onde | Endereço |
| --- | --- | --- |
| Gestor | Notebook ou celular | `/admin`, com a senha do gestor |
| Facilitador | Celular ou notebook | `/admin`, com a senha do facilitador |
| Mesa (grupo de 5 a 6 pessoas) | Notebook da mesa, com Chrome | `/mesa/CODIGO` ou a página inicial, digitando o código |
| Participante | Celular | `/p/CODIGO`, pelo QR da mesa. **Chega no Marco 2** |

No evento de demonstração, os códigos são:

| Mesa | Código | Processo |
| --- | --- | --- |
| Mesa 01 | `K7PX2M` | Responder pedido de orçamento pelo WhatsApp |
| Mesa 02 | `R4TW9H` | Cobrar cliente com pagamento atrasado |
| Mesa 03 | `B8NC3F` | Responder pedido de orçamento pelo WhatsApp |

## 2. Antes de começar

### Ligar o sistema no computador

1. Abra o terminal na pasta do projeto.
2. Rode `npm run dev` e deixe essa janela aberta. Se ela for fechada, o sistema para.
3. No Chrome, abra `http://localhost:3000`.

O arquivo `.env.local` guarda as senhas e o endereço do banco. As senhas do admin são as que
estiverem em `ADMIN_PASSWORD` (gestor) e `FACILITADOR_PASSWORD` (facilitador).

### Recomeçar a demonstração do zero

Para voltar todas as mesas para a Fase 0 e apagar tudo o que foi feito, rode `npm run db:reset`
num segundo terminal. Depois recarregue as páginas abertas com F5. Esse comando só funciona com
banco no próprio computador.

## 3. Fases da jornada

Cada mesa passa por 8 fases. A mesa nunca muda de fase sozinha: ela avisa que concluiu e o
gestor ou um facilitador libera.

| Fase | Nome | Duração padrão |
| --- | --- | --- |
| 0 | Check-in e papéis | 10 min |
| 1 | Entender o processo | 15 min |
| 2 | Entrevista | 35 min |
| 3 | Caixa de ferramentas | 25 min |
| 4 | Prova | 20 min |
| 5 | Teste cruzado | 30 min |
| 6 | Conserto | 20 min |
| 7 | Entrega | 15 min |

O intervalo não é uma fase: é uma pausa geral que o gestor liga (10 minutos por padrão).

### Estados de uma mesa

| Estado | O que quer dizer |
| --- | --- |
| Em andamento | A mesa está trabalhando na fase |
| Pronta | A mesa clicou em "Concluímos a fase" e espera a liberação |
| Atrasada | O tempo da fase acabou. O cronômetro fica vermelho e conta para cima, com sinal de mais |
| Pausada | O gestor pausou a mesa ou chamou o intervalo |
| Pediu ajuda | A mesa chamou alguém. Aparece por cima do estado e toca um som no admin |

## 4. Tela da mesa

Abra no notebook da mesa, com a janela maximizada. A tela precisa de pelo menos 1024 pixels de
largura; numa tela menor ela mostra só um aviso para usar o notebook.

### Entrar

Na página inicial, digite o código que está no cartão da mesa e clique em **Entrar na mesa**.
Também dá para abrir direto `/mesa/CODIGO`.

### As três zonas

- **Trilha**, à esquerda: as 8 fases. A fase atual mostra os passos e o cronômetro. As fases já
  feitas podem ser abertas para rever. As fases futuras ficam trancadas. No pé da Trilha fica o
  botão **Pedir ajuda**.
- **Folha de trabalho**, no centro: o passo atual, com a instrução, o papel responsável e a
  atividade.
- **Pasta viva**, à direita: a skill em construção. Em telas entre 1024 e 1365 pixels ela vira
  uma aba na borda direita, que abre ao clicar em **Pasta**.

No topo ficam o nome da mesa, o processo e o tempo total do evento.

### Seguir os passos

1. Leiam a instrução do passo e façam a atividade.
2. Cliquem em **Passo concluído**. A tela vai para o próximo passo.
3. No último passo da fase, o botão vira **Concluímos a fase**. Ele só funciona com todos os
   passos da fase concluídos.
4. A tela passa a mostrar **Fase concluída. Aguardando liberação.**, com uma atividade de
   aprofundamento para aproveitar a espera.
5. Quando o gestor libera, a tela mostra **Fase N liberada** e abre o primeiro passo da fase
   seguinte.

Para voltar a um passo da fase atual, cliquem nele na Trilha. Para rever uma fase já feita,
cliquem no nome dela; aparece **Vocês estão revendo a Fase N** e o botão **Voltar ao passo
atual**.

### Avisos que podem aparecer

| Aviso | O que fazer |
| --- | --- |
| Faixa "Aviso do gestor: ..." | Ler. Some sozinha em 1 minuto ou ao fechar |
| "O gestor reabriu a Fase N. Nada foi apagado." | O gestor voltou a mesa de fase. Tudo o que foi feito continua lá |
| Tela cheia "Mesa pausada pelo gestor" | Aguardar a retomada |
| Tela cheia "Intervalo. Voltamos em ..." | Intervalo geral, com contagem regressiva |
| "Sem conexão. Continuem escrevendo, nada se perde." | A internet caiu. A tela volta sozinha quando a conexão voltar |

### Pedir ajuda

Cliquem em **Pedir ajuda** no pé da Trilha. Aparece **Ajuda a caminho** e o cartão da mesa
pisca no admin. Se não precisar mais, cliquem em **Cancelar pedido**.

## 5. Painel do gestor

### Entrar

Abra `/admin`, digite seu nome e a senha do gestor. O nome fica gravado no registro de cada ação.
A sessão dura 12 horas. Para sair, use **Sair** no canto superior direito.

### Barra superior

| Item | Para que serve |
| --- | --- |
| **Iniciar evento** | Liga o cronômetro geral e zera o cronômetro das mesas que ainda estão na Fase 0. Depois de clicado, vira o tempo do evento |
| **Liberação manual** / **Liberação automática** | Troca o modo. No manual, o gestor libera cada mesa pronta. No automático, a mesa passa para a fase seguinte assim que conclui |
| **Pausar todas** | Abre o intervalo. Pergunta quantos minutos (10 se ficar vazio). O cronômetro das fases para; o do evento continua |
| **Retomar todas** | Encerra o intervalo. Retoma também as mesas pausadas uma a uma |
| **Enviar aviso** | Manda um aviso de até 280 caracteres para todas as mesas |
| **Som ligado** / **Som desligado** | Liga ou desliga o som de pedido de ajuda |
| Indicador de conexão | Mostra se o painel está recebendo as atualizações ao vivo |

### Barra de fases

- **Fase de referência**: a fase em que a maioria das mesas deveria estar. Serve de base para
  "Avançar todas".
- **Tempo de todas as mesas**: **+5 min** e **-5 min** valem para todas as mesas de uma vez.
- **Avançar as N mesas prontas**: libera de uma vez todas as mesas prontas, em qualquer fase.
- **Avançar todas**: passa para a fase seguinte todas as mesas que estão na fase de referência,
  prontas ou não. Antes, um diálogo diz quantas ainda não concluíram. As que não concluíram ficam
  registradas como avanço forçado. Mesas em outras fases não mudam. A fase de referência passa
  para a seguinte.
- Abaixo, uma linha com as 8 fases mostra quantas mesas estão em cada uma.

### Filtros

**Todas**, **Pediu ajuda**, **Prontas** e **Atrasadas**, cada um com a contagem.

### Cartão de cada mesa

Mostra o nome, o cronômetro da fase, o processo, a fase e o passo, o estado e quantas pessoas estão
conectadas pelo celular. A contagem de pessoas fica em zero até o Marco 2.

O botão do cartão muda conforme o estado:

| Estado | Botão | O que faz |
| --- | --- | --- |
| Pronta | **Avançar** | Libera a fase seguinte. Aparece **Desfazer** por 30 segundos, caso tenha sido engano |
| Em andamento ou atrasada | **Avançar** (discreto) | Força o avanço. Pede confirmação e mostra o que falta |
| Pausada | **Retomar** | Retoma a mesa |
| Pediu ajuda | **Atender** | Marca o chamado como atendido |
| Fase 7 | "Última fase" | Nada a avançar |

### Detalhe da mesa

Clique no nome ou no corpo do cartão para abrir a gaveta de detalhe, na aba **Agora**:

- **Fase**: **Avançar**, **Forçar avanço** e **Voltar fase**. Voltar nunca apaga nada; a mesa
  vê a faixa de fase reaberta.
- **Tempo**: **Pausar** ou **Retomar** só essa mesa, e **+5 min** ou **-5 min** só para ela.
- **Aviso para a mesa**: um aviso só para essa mesa.
- Se a mesa pediu ajuda: **Marcar chamado como atendido**.

Feche com o X ou com a tecla Esc. As abas Pasta, Conversa, Linha do tempo e Teste chegam nos
Marcos 5 e 6.

### No celular

O painel funciona no celular. Os cartões ficam em lista, com as mesas que pediram ajuda primeiro,
depois as prontas e depois as demais.

## 6. Facilitador

O facilitador entra pelo mesmo `/admin`, com a senha de facilitador. Ele vê o mesmo painel, mas
só pode:

- avançar, forçar, voltar e desfazer a fase de uma mesa;
- atender pedidos de ajuda.

Ele não vê os botões de iniciar evento, modo de liberação, pausar, ajustar tempo, enviar aviso,
fase de referência e ações em lote.

## 7. QR codes e celulares dos participantes

**Ainda não existem.** Chegam no Marco 2, junto com a tela do celular (`/p/CODIGO`):

- o participante lê o QR da mesa, digita o primeiro nome e vê a fase, o passo e o seu papel;
- envia contribuições para a mesa, que aceita ou descarta;
- o cartão no admin passa a contar as pessoas conectadas.

Os QR codes vão ficar numa página do admin com um cartão por mesa (nome, código e QR), pronta para
imprimir. Para os celulares abrirem o sistema rodando num computador, os dois precisam estar na
mesma rede Wi-Fi, e o QR aponta para o endereço de rede que aparece no terminal, na linha
`Network:`.

## 8. O que ainda está em construção

| Parte | Chega no |
| --- | --- |
| Celular do participante, QR codes, papéis, ficha e kit, contribuições | Marco 2 |
| Entrevista com a IA e geração do SKILL.md, Pasta viva com histórico | Marco 3 |
| Caixa de ferramentas, conferências e placar | Marco 4 |
| Teste cruzado, conserto, entrega e exportação do .zip | Marco 5 |
| Cadastros pelo admin, linha do tempo, versão para impressão, teste de carga | Marco 6 |

Enquanto isso, as atividades dos passos mostram "Esta atividade ainda está em construção e chega
no Marco N". Esses passos podem ser concluídos normalmente, para testar o controle de fases.

## 9. Problemas comuns

| Problema | Causa provável | Solução |
| --- | --- | --- |
| "Algo deu errado" ao abrir o admin ou entrar na mesa | O sistema não conseguiu falar com o banco | Confira a senha em `DATABASE_URL` no `.env.local`, rode `npm run db:reset` e reinicie o `npm run dev` |
| `autenticação do tipo senha falhou` | Senha do banco errada no `.env.local` | Corrija a senha e reinicie o `npm run dev` |
| A tela da mesa só mostra "Esta é a tela do notebook da mesa" | Janela estreita | Maximize a janela do Chrome |
| "Não encontramos esta mesa" | Código errado | Confira o código no cartão da mesa |
| A página não abre | O `npm run dev` foi fechado | Rode `npm run dev` de novo |
| O servidor sobe na porta 3001 | Outro servidor ainda está rodando | Feche o outro terminal ou encerre os processos Node e suba de novo |
