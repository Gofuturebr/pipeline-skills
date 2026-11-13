# Especificação: Mesa de Skills (Workshop Sebrae CG)

Atualizado em 13/11/2026

## 1. Visão geral

A Mesa de Skills é uma aplicação web que conduz grupos de 5 a 6 pessoas, passo a passo, da leitura de um processo pré-curado até uma skill do Claude testada e exportada. O gestor acompanha e controla a fase de cada grupo por um painel admin.

**Contexto.** Oficina de Criação de Skills (InovaPB), Ação 02 do projeto Sebrae CG e Orbie: hands-on de 3h, 85 participantes, meta de 09 skills no Claude, em 03/12/2026.

**Método de base.** Os 4 prompts do playbook "Um agente, uma pasta" (JP Labs): entrevista, caixa de ferramentas, prova e conserto. O resultado de cada mesa é uma pasta com `SKILL.md`, `arquivos/`, `exemplos/` e `notas.md`.

### Objetivos

- Cada mesa termina com uma skill que passou por um teste feito por outra mesa.
- Nenhum participante precisa escrever prompt: a interface embute os prompts do método e mostra só a instrução do passo atual.
- O gestor sabe, a qualquer momento, em que fase cada mesa está e decide quando cada uma avança.
- Ao final, uma pasta única reúne todas as skills, pronta para os participantes usarem.

### Premissas

- Os processos são pré-curados e cadastrados pelo gestor antes do evento. Cada mesa recebe um processo já atribuído, com um kit de materiais.
- Cerca de 15 mesas simultâneas, uma tela compartilhada por mesa (notebook) e celulares dos participantes como apoio.
- A IA é integrada à interface. A mesa não alterna entre a aplicação e o Claude.
- A aplicação guarda a cópia mestre de cada pasta. Existe sempre uma única versão de cada arquivo.

### Fora de escopo (v1)

- Escolha livre de processo pela mesa.
- Uso contínuo depois do evento (edição da skill, novas rodadas).
- Contas individuais com login e senha para participantes.
- Instalação automática das skills nas contas Claude dos participantes.

## 2. Perfis e papéis

A solução tem três perfis de acesso. Dentro da mesa, os participantes assumem papéis que a interface usa para dizer quem faz cada passo.

### Perfis de acesso

| Perfil | Acesso | O que pode fazer |
| --- | --- | --- |
| Gestor | Admin, com senha | Cadastra evento, processos e mesas. Controla fases e cronômetro. Vê a pasta de qualquer mesa. Envia avisos. Exporta a pasta final |
| Mesa | Tela compartilhada, por código ou QR da mesa | Segue o passo a passo, conversa com a IA, edita a pasta, marca passos concluídos, pede ajuda |
| Participante | Celular, pelo QR da mesa, só com o primeiro nome | Envia contribuições para a mesa (exceções, casos que deram errado, votos) e vê o passo atual e o seu papel |
| Facilitador de apoio (opcional) | Admin, com senha própria | Vê o painel, atende pedidos de ajuda e libera fases (avançar, voltar, forçar). Não altera cadastros, não controla o cronômetro geral e não exporta |

### Papéis dentro da mesa

Os papéis são distribuídos na Fase 0. Cada passo da jornada indica o papel responsável.

| Papel | Responsabilidade |
| --- | --- |
| Dono do processo | Responde a entrevista da IA com base na ficha do processo e na experiência do grupo |
| Piloto | Opera a tela compartilhada |
| Guardião da pasta | Decide o que é salvo em `arquivos/` e `exemplos/` e confere o `INDICE.md` |
| Cético | Escreve as conferências do "Pronto quando" e descreve a versão ruim |
| Testador | Roda a skill da mesa parceira no teste cruzado e registra o resultado |
| Porta-voz (6ª pessoa) | Acompanha o tempo, aciona o pedido de ajuda e apresenta na entrega |

Em mesas de 5 pessoas, o Piloto acumula o papel de Porta-voz.

## 3. Jornada da mesa: fases e passo a passo

A jornada tem 8 fases e um intervalo, somando 180 minutos. A mesa vê um passo por vez, com o papel responsável, e só passa de fase quando o gestor ou um facilitador libera.

| Fase | Min | Entrega da fase | Concluída quando |
| --- | --- | --- | --- |
| 0. Check-in e papéis | 10 | Mesa formada | Todos os papéis têm um nome |
| 1. Entender o processo | 15 | Tarefa em uma linha | Ficha lida e frase da tarefa confirmada |
| 2. Entrevista | 35 | `SKILL.md` v1 | 8 temas cobertos e arquivo aprovado pela mesa |
| 3. Caixa de ferramentas | 25 | `arquivos/`, `exemplos/`, `INDICE.md` | Pelo menos 1 modelo e 1 exemplo salvos |
| Intervalo | 10 |  |  |
| 4. Prova | 20 | Seção "Pronto quando" | De 5 a 10 conferências válidas |
| 5. Teste cruzado | 30 | Relatório de teste | Placar registrado pela mesa parceira |
| 6. Conserto | 20 | Skill v2 e `notas.md` | Pelo menos 1 conserto registrado e nova rodada feita |
| 7. Entrega | 15 | Pasta exportada | Skill marcada como final |

### Fase 0. Check-in e papéis (10 min)

1. O Piloto abre o endereço da mesa e digita o código.
2. Cada participante lê o QR no celular e informa o primeiro nome.
3. A mesa distribui os papéis. A tela mostra a descrição de cada um.
4. O Porta-voz confirma a formação.

### Fase 1. Entender o processo (15 min)

1. A tela mostra a ficha do processo atribuído: objetivo, quem executa, frequência, entradas, resultado esperado.
2. A mesa lê o kit: materiais de entrada, um exemplo de resultado bom e um de resultado ruim.
3. Cada participante envia pelo celular uma dúvida ou um caso parecido que já viveu.
4. A mesa reescreve a tarefa em uma linha, com verbo e resultado, e confirma.

### Fase 2. Entrevista (35 min)

1. A IA faz uma pergunta por vez. O Dono do processo responde em voz alta e o Piloto digita ou dita.
2. Os demais enviam pelo celular exceções e casos que já deram errado. O Piloto anexa à resposta o que a mesa aprovar.
3. A barra de cobertura mostra os 8 temas: gatilho e frequência, o que precisa, passos na ordem real, decisões e regras, o que conferir, casos que deram errado, tom e padrão, como é a versão ruim.
4. Com no mínimo 8 perguntas e os 8 temas cobertos, a mesa encerra a entrevista.
5. A IA gera o `SKILL.md` com as seções: Pra que serve, Quando usar, O que precisa, Passos, Decisões, Pronto quando, Casos que já deram errado.
6. A IA pergunta o que errou e o que a mesa esqueceu de contar. A mesa corrige direto no arquivo e aprova.

### Fase 3. Caixa de ferramentas (25 min)

1. A mesa roda a tarefa uma vez, com o caso de exemplo do kit.
2. Em cada parte do resultado que ficou boa, o Guardião usa "congelar". A IA troca as informações específicas por lacunas entre colchetes e salva em `arquivos/`.
3. A IA atualiza o `SKILL.md` para citar cada arquivo pelo nome e acrescenta uma linha no `INDICE.md`.
4. O Guardião salva o resultado aprovado em `exemplos/`.
5. A mesa roda a tarefa de novo, do zero. A IA informa o que reusou e o que refez. O que foi refeito é candidato a entrar na caixa.

### Fase 4. Prova (20 min)

1. O Cético propõe de 5 a 10 conferências. Cada uma informa o que confere e contra qual fonte (arquivo de referência, número de origem, contagem, link).
2. A interface recusa conferência sem fonte ou com palavra vaga (claro, profissional, de qualidade).
3. A mesa roda a tarefa. A IA executa as conferências, conserta o que falhou e mostra uma linha por conferência: passou ou falhou, com a prova usada.
4. A IA lista o que não conseguiu conferir. A mesa decide se ajusta ou remove.

### Fase 5. Teste cruzado (30 min)

1. O gestor inicia o teste. Cada mesa recebe a pasta da mesa parceira, em modo leitura.
2. O Testador roda a skill recebida com um caso novo do kit, sem explicação oral da mesa autora.
3. A tela mostra o placar das conferências. O Testador registra, para cada falha, o que aconteceu.
4. A mesa testadora envia o relatório. A mesa autora o recebe na própria tela.

### Fase 6. Conserto (20 min)

1. A mesa lê o relatório e escolhe a falha mais importante.
2. A mesa marca a camada que falhou: processo (faltou passo ou regra), caixa (arquivo errado ou refeito) ou prova (faltou conferência).
3. A IA propõe o menor conserto duradouro nessa camada. A mesa aprova.
4. A IA registra a linha em `notas.md`: data, o que deu errado, o que mudou.
5. A mesa roda a tarefa de novo e compara antes e depois.

### Fase 7. Entrega (15 min)

1. A mesa revisa o nome da skill e a seção "Quando usar", escrita com as palavras que alguém digitaria para pedir a tarefa.
2. A mesa marca a skill como final.
3. O Porta-voz apresenta em 1 minuto: o processo, uma conferência da prova e o conserto feito.
4. Os participantes baixam a pasta pelo QR.

## 4. Interface da mesa

A tela compartilhada tem três zonas fixas e mostra sempre um único passo ativo. O celular do participante é um complemento, não uma segunda tela de trabalho. O detalhamento visual está em `docs/frontend.md`.

### Tela compartilhada (notebook)

| Zona | Conteúdo | Comportamento |
| --- | --- | --- |
| Trilha (esquerda) | Lista das fases, fase atual em destaque, cronômetro da fase, passos da fase com caixa de conclusão | Fases futuras aparecem bloqueadas. Fases concluídas podem ser consultadas em modo leitura |
| Atividade (centro) | Instrução do passo atual, papel responsável, e a área de trabalho do passo: conversa com a IA, editor de arquivo, lista de conferências ou placar | Um passo por vez. O botão "Passo concluído" só habilita quando o critério do passo é atendido |
| Pasta viva (direita) | Árvore de arquivos da skill, com indicação do que foi criado ou alterado na fase | Clicar em um arquivo abre a visualização. A edição é permitida só nos passos que pedem edição |

### Elementos fixos

- **Barra superior:** nome da mesa, processo atribuído, tarefa em uma linha, cronômetro geral do evento.
- **Botão "Pedir ajuda":** abre um chamado no admin com a fase e o passo da mesa. Fica visível até o gestor marcar como atendido.
- **Botão "Concluímos a fase":** habilita quando todos os critérios da fase estão atendidos. Muda o estado da mesa para "pronta" e mostra a tela de espera até a liberação.
- **Faixa de avisos:** mensagens enviadas pelo gestor para uma mesa ou para todas.
- **Caixa de contribuições:** fila do que os participantes enviaram pelo celular no passo atual. O Piloto aceita ou descarta cada item.

### Tela de espera

Quando a mesa conclui antes do tempo, a tela sugere uma atividade de aprofundamento da fase (por exemplo, acrescentar mais um caso que já deu errado) até o gestor liberar a próxima.

### Celular do participante

- Mostra a fase, o passo atual e o papel da pessoa.
- Oferece um campo de contribuição quando o passo pede (Fases 1 e 2) e o download da pasta na Fase 7.
- Não edita arquivos nem conversa com a IA.

## 5. Admin do gestor

O admin tem dois momentos: a preparação antes do evento e o painel de controle durante as 3 horas. No painel, o gestor vê todas as mesas em uma tela e controla a fase de cada uma.

### Preparação (antes do evento)

| Cadastro | Campos |
| --- | --- |
| Evento | Nome, data, duração de cada fase (editável), modo de liberação padrão |
| Processo pré-curado | Nome, ficha (objetivo, quem executa, frequência, entradas, resultado esperado), kit de materiais, exemplo bom, exemplo ruim, caso de exemplo (Fase 3), caso novo (Fase 5) |
| Mesa | Nome ou número, código de acesso, QR, processo atribuído, mesa parceira do teste cruzado |
| Roteiro | Textos de instrução de cada passo, editáveis sem mexer em código |

### Painel de controle (durante o evento)

Uma grade com um cartão por mesa. Cada cartão mostra:

- nome da mesa e processo;
- fase e passo atuais;
- tempo na fase e estado: em andamento, pronta, atrasada ou pediu ajuda;
- número de participantes conectados.

Acima da grade ficam o cronômetro geral, a fase de referência do evento e a contagem de mesas por fase.

### Ações do gestor

| Ação | Alcance | Efeito |
| --- | --- | --- |
| Avançar fase | Uma mesa ou todas | Libera a próxima fase. Em "todas", só avança as mesas que estão na fase de referência |
| Voltar fase | Uma mesa | Reabre a fase anterior, sem apagar nada do que foi produzido |
| Forçar avanço | Uma mesa | Avança mesmo sem os critérios atendidos. Fica registrado no histórico |
| Pausar ou retomar | Uma mesa ou todas | Congela o cronômetro e mostra tela de pausa (usado no intervalo) |
| Ajustar tempo | Uma mesa ou todas | Soma ou subtrai minutos da fase atual |
| Enviar aviso | Uma mesa ou todas | Mostra mensagem na faixa de avisos |
| Atender chamado | Uma mesa | Marca o pedido de ajuda como atendido |
| Ver pasta | Uma mesa | Abre a pasta e a conversa da mesa em modo leitura |
| Iniciar teste cruzado | Todas | Distribui as pastas entre as mesas parceiras |
| Exportar | Uma mesa ou todas | Gera o .zip da skill ou da pasta consolidada |

O facilitador de apoio pode avançar, voltar e forçar fase de uma mesa e atender chamados. As demais ações são só do gestor.

### Detalhe da mesa

Ao abrir um cartão, o gestor vê a linha do tempo da mesa (quando entrou e saiu de cada fase), os passos concluídos, os chamados, a pasta atual e o placar do teste cruzado.

## 6. Regras de negócio

A regra central: a mesa declara que concluiu, e só o gestor ou um facilitador libera a próxima fase.

| ID | Regra |
| --- | --- |
| RN01 | A mesa nunca avança de fase sozinha. "Concluímos a fase" muda o estado para "pronta" e aguarda o gestor ou um facilitador |
| RN02 | Modo de liberação configurável por evento: manual (padrão, o gestor ou um facilitador libera) ou automático (a mesa pronta avança sem espera). O gestor pode trocar o modo durante o evento |
| RN03 | "Concluímos a fase" só habilita com os critérios da fase atendidos (tabela da seção 3) |
| RN04 | O cronômetro da fase é informativo. Tempo esgotado muda o estado para "atrasada", mas não bloqueia a mesa |
| RN05 | Voltar fase nunca apaga conteúdo. A pasta mantém o que foi produzido |
| RN06 | Existe uma única versão de cada arquivo por mesa. Toda alteração gera um registro no histórico, com fase e horário |
| RN07 | Na Fase 2, a IA faz uma pergunta por vez e não gera o `SKILL.md` antes de 8 perguntas e da cobertura dos 8 temas |
| RN08 | Na Fase 4, uma conferência só é aceita com fonte externa declarada e sem termos da lista de palavras vagas |
| RN09 | Na Fase 5, a mesa testadora recebe a pasta em modo leitura e não vê a conversa da mesa autora |
| RN10 | O teste cruzado só começa para um par quando as duas mesas concluíram a Fase 4. Com número ímpar de mesas, forma-se um trio em ciclo (A testa B, B testa C, C testa A) |
| RN11 | Se a mesa parceira não tiver pasta testável, o gestor redefine o par pelo admin |
| RN12 | Na Fase 6, se mais de duas conferências falharam no teste, a IA aponta a parte do passo a passo que causou as falhas antes de propor conserto |
| RN13 | A IA não salva em `arquivos/` nada que a mesa não aprovou, nem resultado de uma vez só |
| RN14 | A interface alerta e bloqueia o salvamento de conteúdo com padrão de senha, chave de acesso, CPF ou CNPJ |
| RN15 | Skill marcada como final fica travada para edição. Só o gestor destrava |
| RN16 | Toda ação do gestor ou de um facilitador sobre fases (avançar, voltar, forçar) fica registrada com autor e horário |

## 7. Modelo de dados e pasta final

O modelo gira em torno da Mesa: ela pertence a um Evento, recebe um Processo e produz uma Pasta.

### Entidades

| Entidade | Campos principais | Relações |
| --- | --- | --- |
| Evento | nome, data, modo de liberação, fase de referência, estado do cronômetro | tem várias Mesas e Fases |
| Fase | ordem, nome, duração, critérios de conclusão | tem vários Passos |
| Passo | ordem, instrução, papel responsável, tipo de atividade, critério | pertence a uma Fase |
| Processo | nome, ficha, kit, exemplo bom, exemplo ruim, caso de exemplo, caso novo | atribuído a uma ou mais Mesas |
| Mesa | nome, código, fase atual, passo atual, estado, mesa parceira | pertence a um Evento, tem um Processo |
| Participante | primeiro nome, papel | pertence a uma Mesa |
| Arquivo | caminho, conteúdo, versão, fase em que foi alterado | pertence a uma Mesa |
| Mensagem | autor (mesa ou IA), texto, fase, passo | pertence a uma Mesa |
| Contribuição | texto, autor, estado (aceita ou descartada) | de um Participante, em um Passo |
| Conferência | descrição, fonte externa, ordem | pertence a uma Mesa |
| Teste cruzado | mesa autora, mesa testadora, resultado por conferência, observações | liga duas Mesas |
| Conserto | camada (processo, caixa, prova), o que deu errado, o que mudou | pertence a uma Mesa |
| Chamado | fase, passo, horário, estado | pertence a uma Mesa |
| Registro | ação, autor, horário | histórico de Evento e Mesa |

### Estados da mesa

Em cada fase, a mesa está em um destes estados: em andamento, pronta (aguardando liberação), atrasada, pausada. "Pediu ajuda" é um marcador que se soma a qualquer estado.

### Pasta final exportada

```
skills-sebrae-inovapb/
  LEIA-ME.md                  como instalar e usar cada skill no Claude
  01-[nome-da-skill]/
    SKILL.md                  cabeçalho (nome, descrição) + pra que serve, quando usar,
                              o que precisa, passos, decisões, pronto quando, casos
    arquivos/
      INDICE.md               uma linha por arquivo: nome, pra que serve, data
      modelo-[...].md         modelos com [lacunas]
      regras-[...].md         tom, padrão, palavras proibidas
    exemplos/
      bom-1.md                resultado aprovado pela mesa
    notas.md                  consertos, o mais novo em cima
  02-[nome-da-skill]/
  ...
```

- Cada skill também sai como .zip individual, no formato que o Claude aceita para instalação.
- O cabeçalho do `SKILL.md` (nome e descrição) é gerado a partir das seções "Pra que serve" e "Quando usar".
- A exportação não inclui a conversa com a IA nem os nomes dos participantes.

## 8. Requisitos não funcionais, aceite e decisões em aberto

### Requisitos não funcionais

| Tema | Requisito |
| --- | --- |
| Capacidade | 20 mesas e 100 celulares conectados ao mesmo tempo |
| Tempo real | Mudança de fase feita no admin aparece na mesa em até 2 segundos. Estado da mesa aparece no admin em até 2 segundos |
| Resiliência | Salvamento automático a cada alteração. Se a conexão cair, a mesa retoma no mesmo passo ao reconectar |
| Resposta da IA | Início da resposta em até 5 segundos, com texto aparecendo aos poucos. Falha da IA mostra "tentar de novo" sem perder o que foi digitado |
| Acesso | Mesa e participante entram por código ou QR, sem cadastro. Admin com senha |
| Dispositivos | Tela da mesa em Chrome no notebook (1366 px ou mais). Tela do participante em celular |
| Idioma | Português do Brasil, linguagem simples, sem jargão técnico |
| Privacidade | Coleta só o primeiro nome. Kits com dados fictícios ou anonimizados |
| Plano B | Versão impressa do roteiro por mesa, para o caso de queda de internet |

### Critérios de aceite

- [ ] Uma mesa percorre as 8 fases do início ao fim e exporta um .zip com `SKILL.md`, `arquivos/INDICE.md`, pelo menos 1 exemplo e `notas.md`.
- [ ] A mesa não consegue abrir uma fase que o gestor não liberou.
- [ ] O gestor avança, volta e força a fase de uma mesa, e a tela da mesa reflete em até 2 segundos.
- [ ] O gestor avança todas as mesas de uma vez e só as que estão na fase de referência mudam.
- [ ] O painel mostra corretamente os estados: em andamento, pronta, atrasada, pediu ajuda.
- [ ] A IA não gera o `SKILL.md` antes de 8 perguntas e dos 8 temas cobertos.
- [ ] Uma conferência com a palavra "profissional" ou sem fonte é recusada.
- [ ] No teste cruzado, a mesa testadora vê a pasta da parceira, mas não a edita.
- [ ] A skill exportada é instalada em uma conta Claude e executa a tarefa com o caso novo do kit.
- [ ] Um ensaio com 3 mesas reais termina dentro dos 180 minutos.

### Decisões em aberto

1. **Quantos processos pré-curados.** A especificação assume 9 processos distribuídos em cerca de 15 mesas, com os mais demandados em duas mesas. Um processo único para todas também é suportado, mas entrega 1 skill em 15 versões.
2. **Quem cura os processos e monta os kits.** Cada kit precisa de ficha, materiais de entrada, exemplo bom, exemplo ruim e dois casos. É o maior esforço de preparação.
3. **IA integrada ou externa.** A especificação assume IA integrada por API. A alternativa mais barata é a mesa usar o Claude em outra aba, com a interface só guiando e guardando a pasta, ao custo de copiar e colar.
4. **Modo de liberação padrão.** Decidido: liberação manual, feita pelo gestor ou por facilitadores de apoio. Falta definir quantos facilitadores haverá no dia.
5. **Contas Claude dos participantes.** Definir se cada participante sai com acesso para instalar a skill ou se a instalação é só demonstrada.
