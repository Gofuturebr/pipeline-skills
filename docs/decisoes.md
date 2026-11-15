# Decisões tomadas durante o desenvolvimento

Registro das decisões que não estão na especificação. A especificação manda:
se alguma decisão abaixo conflitar com ela, vale a especificação e esta lista é corrigida.

## 13/11/2026: Marco 1

### Dúvidas do plano, respondidas com o padrão proposto

O plano foi aprovado sem resposta às dúvidas. Foram adotados os padrões propostos,
todos fáceis de trocar.

| Dúvida | Padrão adotado | Onde está |
| --- | --- | --- |
| Fase de referência | O gestor escolhe no admin. "Avançar todas" passa a referência para a fase seguinte | `lib/servidor/acoes.ts` (`avancarTodas`, `configurarEvento`) |
| Conclusão da Fase 5 | A mesa precisa ter enviado o relatório sobre a parceira e recebido o relatório sobre a própria skill | `lib/jornada/fases.ts` (Fase 5). O critério de dados chega no Marco 5 |
| Intervalo | Não é fase da mesa. É a pausa geral do gestor, com contagem regressiva (10 min por padrão). O cronômetro das fases para; o cronômetro geral do evento continua, porque o intervalo faz parte dos 180 minutos | `pausarTodas`, `evento.pausa_geral_ate` |
| "Avançar todas" | Muda só as mesas na fase de referência (seção 5). As prontas avançam; as outras são forçadas e o registro mostra "forcar". O diálogo diz quantas não concluíram | `avancarTodas` |
| Senha do facilitador | Duas variáveis novas: `FACILITADOR_PASSWORD` e `SESSION_SECRET` (assina o cookie do admin). Na entrada, a pessoa informa o nome, que vai para o registro (RN16) | `lib/servidor/sessao-admin.ts` |

### Outros padrões assumidos

- **Palavras vagas (RN08):** a lista começa com "claro", "profissional" e "de qualidade" e é guardada por evento (`evento.palavras_vagas`). A edição pelo admin chega no Marco 6.
- **Tarefa em uma linha:** até 90 caracteres. A confirmação de que tem verbo e resultado é da mesa (Marco 2).
- **Celulares conectados:** contados pelo último sinal do celular nos últimos 45 segundos, e não pela presença do Supabase. Fica mais simples para o painel com 20 mesas (Marco 2).
- **Download no celular:** só depois que a skill é marcada como final (Marco 5).

### Arquitetura

- **Acesso ao banco por conexão direta ao Postgres** (`DATABASE_URL`, pacote `postgres`), em vez do cliente do Supabase pela API REST. Motivo: as transições de fase precisam de transação com trava de linha, e os testes rodam num Postgres local, sem Docker. No Supabase, usar a string de conexão do pooler em modo transação. Variáveis novas: `DATABASE_URL` e `DATABASE_URL_TESTE` (só para testes).
- **Tempo real como sinal, não como dado.** O servidor manda pelo Broadcast do Supabase Realtime só `{ tipo, mesaId }`. A tela, ao receber, busca o estado na rota do servidor, que aplica as regras de visibilidade (RN09). Assim nenhuma tabela precisa ficar legível pelo navegador: todas têm RLS ligado e nenhuma política.
- **Canal local por SSE quando o Supabase não está configurado.** Sem `NEXT_PUBLIC_SUPABASE_URL`, o servidor entrega os sinais em `/api/sinais` (SSE). Funciona com um único processo de servidor: desenvolvimento, testes e demonstração. Na Vercel, com vários processos, é obrigatório configurar o Supabase Realtime.
- **Reserva contra sinal perdido:** toda tela busca o estado de novo a cada 15 segundos, ao reconectar e ao voltar para a aba.
- **Transições de fase em TypeScript, dentro de transação com `select ... for update`**, em vez de funções em PL/pgSQL como dizia o plano. A máquina de estados ficou como função pura (`lib/maquina.ts`), testada sem banco. O efeito é o mesmo: a mudança de fase e o registro (RN16) entram juntos ou não entram.
- **"Atrasada" não é guardado.** É calculado a partir do horário de início da fase, das pausas e dos ajustes (RN04). O painel e a mesa recalculam a cada segundo, sem depender do servidor.
- **Um evento por vez.** O admin trabalha com o evento mais recente do banco.
- **Next.js 16 com `cacheComponents` desligado.** Todas as telas mostram estado ao vivo, buscado pelo navegador; o cache de componentes não traz ganho e complica o código.

### Banco: tabelas além da seção 7

| Tabela | Por quê |
| --- | --- |
| `papel_mesa` | Quem ficou com cada papel. Um nome pode ocupar dois papéis (mesa de 5 pessoas) |
| `passo_concluido` | Passos marcados. Voltar de fase não apaga (RN05) |
| `entrevista` | Contadores da RN07 (perguntas e temas), conferidos pelo servidor |
| `rodada` e `resultado_conferencia` | Entrada, saída e placar das rodadas das Fases 3 a 6 |
| `aviso` | A ação "Enviar aviso" não tinha entidade |
| `_migracao` | Controle das migrações aplicadas |

O histórico de arquivos (RN06) é gravado por gatilho no banco: toda inserção ou alteração de conteúdo em `arquivo` cria uma linha em `arquivo_versao`.

### Jornada

- **Papel "Toda a mesa"** para passos feitos pelo grupo inteiro (por exemplo, distribuir papéis). A especificação só lista os 6 papéis individuais.
- **Passos de cada fase.** A seção 3 descreve as fases em itens; o roteiro virou 29 passos (de 3 a 4 por fase), cada um com papel, tipo de atividade e critério. Ações automáticas da IA (por exemplo, atualizar o `INDICE.md` ao congelar) ficam dentro do passo que as dispara, e não são passos separados.
- **Atividades em construção não bloqueiam.** Enquanto o tipo de atividade de um passo não foi construído, a tela mostra "Esta atividade ainda está em construção e chega no Marco N" e o critério daquele passo não bloqueia a mesa. Cada marco acrescenta os seus tipos em `ATIVIDADES_PRONTAS` (`lib/jornada/criterios.ts`). A conclusão de todos os passos continua obrigatória para "Concluímos a fase".
- **Fase reaberta:** a mesa entra no primeiro passo não concluído da fase ou, se todos já estavam concluídos, no último.

### Admin

- **"Avançar as N mesas prontas"** libera todas as mesas prontas, em qualquer fase.
- **"+5 min" e "-5 min" na barra de fases** valem para todas as mesas.
- **Desfazer avanço:** disponível por 30 segundos depois de avançar uma mesa pronta. Devolve a mesa à fase anterior, pronta, com o cronômetro e o passo de antes.
- **"Retomar todas"** retoma também as mesas que tinham sido pausadas uma a uma.
- **"Iniciar evento":** botão do gestor que liga o cronômetro geral e zera o cronômetro das mesas que ainda estão na Fase 0.
- **Permissões do facilitador:** segui a seção 5 da especificação, que é mais restrita que o frontend. O facilitador avança, volta, força e desfaz a fase de uma mesa e atende chamados. Pausar, ajustar tempo, enviar aviso, ações em lote, modo de liberação e fase de referência são só do gestor.
- **Rotas em lote** ficam em `/api/admin/todas/[acao]` (no plano estavam em `/api/admin/mesas/...`, que conflitava com o id da mesa).

### Interface

- **Fontes** pelos pacotes `@fontsource`, servidas junto com a aplicação.
- **Ícones** desenhados em SVG no próprio projeto (`components/base/Icone.tsx`), sem biblioteca.
- **Gaveta de detalhe:** no Marco 1 só tem a aba "Agora". Pasta, Conversa, Linha do tempo e Teste chegam nos Marcos 5 e 6.
- **Tela da mesa abaixo de 1024 px:** mostra o aviso para usar o notebook. O link para a tela do participante entra no Marco 2, quando ela existir.

## 15/11/2026: Marco 2

### Celular do participante

- **Identificação por cookie.** Ao entrar com o primeiro nome, o celular recebe um cookie só da mesa (`mesa_p_CODIGO`, 12 horas, sem acesso pelo JavaScript). O primeiro nome também fica guardado no navegador, para preencher o campo se a pessoa entrar de novo. "Não é você? Trocar o nome" apaga o cookie.
- **Sinal de vida.** Cada busca do celular (a cada 15 segundos e a cada mudança) atualiza o último sinal da pessoa. O cartão do admin conta quem deu sinal nos últimos 45 segundos.
- **Campo de envio por fase.** A fase tem um texto de rótulo (`fase.rotulo_contribuicao`). Fase com rótulo recebe envios pelo celular; sem rótulo, não. No roteiro padrão, só as Fases 1 e 2, como na seção 6 do frontend. O servidor recusa envio em outra fase.
- **Fila de contribuições.** Fica na Folha de trabalho, abaixo da atividade, em toda fase que recebe envios, e em destaque no passo "Cada pessoa envia pelo celular...". Pendentes de uma fase continuam na fila na fase seguinte, para nada se perder. Aceitar pode ser desfeito ("Desfazer" volta o item para a fila). Uma pessoa pode ter até 20 envios esperando a mesa.

### Papéis, leitura e tarefa

- **Papéis.** Cada cartão de papel tem um seletor com os nomes de quem entrou pelo celular e a opção "Digitar outro nome", para quem está sem celular. Uma pessoa pode ficar com dois papéis. O celular mostra o papel quando a pessoa foi escolhida da lista ou quando o nome digitado é igual ao dela.
- **"Lemos".** Os passos da ficha e do kit têm o botão "Lemos". A marca fica numa tabela própria (`leitura`) e pode ser desfeita.
- **Tarefa em uma linha.** O sistema confere o tamanho (até 90 caracteres) e se há pelo menos três palavras. Se tem verbo e resultado, quem confirma é a mesa.
- **Ficha e kit só a partir da Fase 1.** O caso de exemplo e o caso novo não vão para a tela nesta fase: são usados nas Fases 3 e 5.
- **Atividade pronta por variante.** O tipo "frase" ficou pronto para a tarefa (Fase 1), mas a frase do nome da skill (Fase 7) e a leitura da entrega chegam no Marco 5. Por isso, "em construção" agora é decidido pelo tipo e pela variante do passo (`atividadePronta` em `lib/jornada/criterios.ts`).
- **Ações de atividade só na fase liberada.** Definir papel, marcar "Lemos" e confirmar a tarefa são recusados se a fase atual da mesa não tem aquele tipo de atividade, e quando a mesa está pausada.

### QR codes

- **Cartões para imprimir antecipados para o Marco 2.** A especificação põe o cartão da mesa no cadastro do admin (Marco 6), mas o check-in pelo celular precisa dele agora. A página `/admin/cartoes`, só do gestor, mostra um cartão por mesa com nome, processo, código e QR, dois por folha A4.
- **QR também na tela da mesa**, no passo de check-in e no passo de envios pelo celular, para quem não tem o cartão impresso.
- **Endereço do QR.** Vale a variável nova `URL_PUBLICA`, quando definida (por exemplo, o endereço na Vercel). Sem ela, se o navegador abriu por `localhost`, o QR usa o endereço do computador na rede Wi-Fi, porque o celular não alcança `localhost`. Nos outros casos, o mesmo endereço que o navegador usou.
- **QR gerado no servidor** em SVG, pelo pacote `qrcode` (já estava nas dependências), em `/api/qr/CODIGO`.

### Robustez

- **Mensagem quando o banco falha.** As rotas da mesa, do celular e do painel devolvem "O sistema não conseguiu falar com o banco de dados. Avisem o gestor." quando o banco recusa a conexão, a senha está errada, o banco não existe ou faltam as tabelas. O detalhe técnico vai para o terminal do servidor.

## 15/11/2026: Marco 3

### IA

- **Modelo e chamada.** O modelo vem de `ANTHROPIC_MODEL`; vazio, vale `claude-opus-5-5`. A chamada usa o SDK oficial (`@anthropic-ai/sdk`), com streaming, só em rotas de servidor (`lib/ia/cliente.ts`). O endereço da API é fixo (`https://api.anthropic.com`), para nenhuma variável do ambiente desviar as chamadas.
- **Esforço por tarefa.** Perguntas da entrevista com esforço baixo (a primeira palavra chega em cerca de 2 segundos; a especificação pede até 5). Escrita do SKILL.md com esforço médio (cerca de 25 segundos).
- **Troca automática de modelo quando a IA recusa.** Nos modelos que aceitam, as chamadas pedem `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): se a IA recusar por regra de segurança, a API tenta outro modelo na mesma chamada. Se ainda assim recusar, a mesa vê a mensagem e o botão "Tentar de novo".
- **Pergunta e cobertura juntas.** Cada turno da entrevista volta em formato estruturado: os temas cobertos, o tema da pergunta e a pergunta. A tela mostra só a pergunta, que vai aparecendo enquanto a IA escreve. O servidor guarda a cobertura e só deixa encerrar e escrever o SKILL.md com 8 perguntas respondidas e os 8 temas cobertos (RN07). Tema coberto continua coberto.
- **Uma IA por mesa por vez.** Uma trava no banco impede duas chamadas simultâneas para a mesma mesa (dois cliques, duas abas).
- **IA simulada para testes.** Com `IA_SIMULADA=1`, o servidor usa uma IA simulada, sem custo. Só os testes de navegador ligam essa variável. Os testes automáticos usam a mesma simulação.

### Entrevista e SKILL.md

- **A primeira pergunta sai sozinha** ao abrir a entrevista.
- **Contribuições na entrevista.** Na fila da Fase 2, "Incluir na resposta" aceita o envio e acrescenta o texto no campo de resposta, para a mesa decidir antes de responder.
- **Ditado por voz** pelo reconhecimento de fala do navegador, quando o Chrome oferece.
- **Duas perguntas finais** ("O que eu errei?" e "O que vocês esqueceram de me contar?") aparecem no passo de revisão, com campo de resposta. A mesa pode corrigir direto no arquivo ou pedir para a IA aplicar as respostas.
- **Editor por seções.** Cada seção aparece formatada, com "Editar". Ao editar, vira campo de texto e "Guardar na pasta". A especificação pedia o texto formatado ao lado do campo; com 806 pixels na Folha de trabalho, lado a lado ficava apertado demais para leitura a um metro, então a mesma seção alterna entre ver e editar.
- **Aprovação por versão.** "Aprovar" vale para a versão atual do SKILL.md. Se o arquivo muda depois, a mesa aprova de novo.
- **Nome da pasta** sai do título do SKILL.md, em minúsculas e com hífens, e aparece na aba da Pasta viva.
- **Seções garantidas.** Se a IA esquecer alguma das 7 seções, o servidor acrescenta com "A completar".

### Pasta viva e histórico

- **Visualização sobre a Folha de trabalho**, com "Ver versões anteriores": cada versão mostra hora, fase e se foi a IA ou a mesa (RN06). A edição fica nos passos que pedem, não na visualização.
- **Conflito de versão.** Guardar uma seção leva o número da versão; se o arquivo mudou em outra tela, o servidor recusa com "O arquivo mudou em outra tela".

### Dados sensíveis (RN14)

- **Detector em `lib/sensivel.ts`**, usado na tela e no servidor. CPF e CNPJ com pontuação são sempre barrados; só números, apenas quando os dígitos verificadores batem, para não confundir com telefone. Também barra "senha: ...", chaves conhecidas e "token = ...".
- **Onde vale.** Bloqueia salvar arquivo na pasta e também enviar resposta da entrevista ou das perguntas finais, para o dado não chegar à IA. O texto que vem da IA passa por uma máscara de proteção antes de entrar na pasta.

## 15/11/2026: Marco 4

### Rodadas

- **O que a IA lê numa rodada:** a pasta da skill (SKILL.md, arquivos/, exemplos/), os materiais do kit e o caso. A conversa da entrevista nunca entra, como no teste cruzado (RN09): a skill tem que funcionar sozinha.
- **Data de hoje** vai junto no pedido, para a IA calcular validades e prazos.
- **Resposta estruturada:** o resultado, o que a IA reusou da pasta (arquivo e para quê) e o que refez do zero. A tela mostra o resultado enquanto ele é escrito; o relatório de reuso aparece na segunda rodada.
- **Quebras de linha preservadas** na visualização: numa mensagem de WhatsApp, cada linha importa.

### Caixa de ferramentas

- **Congelar** acontece no passo do Guardião: o resultado da última rodada aparece dividido em partes (parágrafos), cada uma com "Congelar". A IA propõe nome do arquivo, para que serve e o modelo com lacunas; a mesa pode ajustar e confirma com "Guardar na pasta". Nada entra em arquivos/ sem essa confirmação (RN13).
- **Modelo precisa de lacuna.** O servidor recusa guardar um modelo sem nenhuma lacuna entre colchetes: seria um resultado de uma vez só (RN13).
- **INDICE.md e citação no SKILL.md são feitos pelo sistema, não pela IA.** Ao guardar, o sistema acrescenta a linha no INDICE.md (nome, para que serve e data) e cita o arquivo na seção "O que precisa" do SKILL.md. Assim a regra de "citar cada arquivo pelo nome" vale sempre, sem depender da IA.
- **Exemplo** é o resultado da última rodada, que a mesa pode corrigir antes de salvar. Entra como exemplos/bom-N.md, com a entrada e o resultado.

### Prova

- **Validação ao sair da linha (RN08):** falta do que confere, palavra vaga ("A palavra 'profissional' não dá para conferir...") ou falta de fonte ("Falta dizer contra qual fonte"). A linha recusada fica guardada com o motivo, para a mesa corrigir. As palavras vagas valem por evento (`evento.palavras_vagas`).
- **Trazer do SKILL.md:** com a lista vazia, a mesa pode começar pelos itens que a IA escreveu na seção Pronto quando. Cada um passa pela mesma validação.
- **Pronto quando sincronizado:** toda mudança nas conferências reescreve a seção Pronto quando do SKILL.md com as válidas, no formato "- [ ] o que conferir (fonte: onde conferir)". A entrega da Fase 4 fica sempre em dia.
- **Placar:** a IA faz a tarefa, confere item por item, conserta o que falhou e devolve, para cada conferência, passou ou falhou, a prova usada e se conseguiu conferir. Fonte que não veio no caso (por exemplo, uma planilha do balcão) aparece como "Não deu para conferir", e o passo seguinte pede para a mesa ajustar ou tirar esses itens.
- **Critério da Fase 4:** de 5 a 10 conferências válidas e nenhuma recusada na lista.

## 15/11/2026: Marco 5

### Formato da skill exportada

Conferido na documentação atual da Anthropic (Agent Skills, visão geral e boas práticas, e a central de ajuda do claude.ai):

- `SKILL.md` com cabeçalho YAML com `name` e `description`. O `name` tem até 64 caracteres, só minúsculas, números e hífens, sem "anthropic" nem "claude"; no claude.ai, precisa ser igual ao nome da pasta. A `description` diz o que a skill faz e quando usar, em terceira pessoa, até 1024 caracteres.
- A central de ajuda cita 200 caracteres para a descrição. O sistema monta a descrição tentando ficar abaixo disso: a primeira frase de "Pra que serve" e, se couber, as frases de "Quando usar".
- O .zip tem a pasta da skill na raiz. A instalação é em Personalizar > Skills no claude.ai, com a execução de código ligada.
- O prompt do SKILL.md passou a pedir "Pra que serve" em terceira pessoa, no presente, porque a descrição sai dessa seção.

### Exportação

- **.zip gerado pelo próprio sistema**, sem compressão, num código curto (`lib/exportacao/zip.ts`). Os arquivos são texto e pequenos; não vale uma dependência para isso.
- **LEIA-ME.md dentro da pasta da skill**, com os 3 passos de instalação. O formato aceita arquivos extras na pasta, e assim o .zip continua com uma única pasta na raiz, como o claude.ai pede.
- **notas.md sempre presente.** Sem conserto, sai com "Nenhum conserto registrado".
- **Pasta consolidada** (só o gestor): `skills-sebrae-inovapb/`, com LEIA-ME.md, uma pasta numerada por skill e, em `zips/`, o .zip de cada uma, pronto para enviar. Entram todas as mesas com SKILL.md; as que não foram marcadas como final aparecem assim no LEIA-ME.
- **Download pelo celular e pela tela da mesa** só depois da skill final. O gestor baixa a qualquer momento.

### Teste cruzado

- **"Iniciar teste cruzado"** (só o gestor) forma os pares por número de mesa: 1 e 2, 3 e 4. Com número ímpar, as três últimas formam o ciclo da RN10 (A testa B, B testa C, C testa A).
- **O teste só começa quando as duas mesas estão na Fase 5** (RN10). Antes disso, a tela diz que a parceira ainda está terminando a Prova.
- **Trocar o par** (RN11) fica no detalhe da mesa, no painel. Trocar recomeça o teste daquela mesa.
- **Pasta da parceira na Pasta viva**, com outra cor e o nome "Pasta da Mesa 02, somente leitura", nos passos de rodar, observar e enviar. A tela e a API mandam só os arquivos, nunca a conversa (RN09).
- **O teste confere sem consertar**, com esforço baixo da IA, para ser mais rápido. Usa o caso novo do kit da parceira.
- **Enviar o relatório** exige a observação do Testador em cada falha.

### Conserto

- **Um conserto por vez.** A mesa escolhe a falha do relatório recebido; sem falhas, descreve uma melhoria. Marca a camada, pede a proposta e aprova. Depois de aprovado, pode começar outro.
- **Diagnóstico (RN12)** só aparece quando mais de duas conferências falharam no teste.
- **A mesa pode ajustar a proposta** antes de aprovar: o texto do arquivo ou a conferência nova.
- **Camada prova** acrescenta uma conferência, que passa pela mesma validação da RN08, e a seção Pronto quando é atualizada.
- **notas.md**: cada conserto aprovado entra no topo, com data, o que deu errado, a camada e o que mudou.
- **Antes e depois:** o placar do teste da parceira (antes) e o da nova rodada com o mesmo caso novo (depois), lado a lado.

### Entrega

- **Nome da skill** vira o título do SKILL.md e o nome da pasta, convertido para minúsculas e hífens; a tela mostra como a pasta vai se chamar.
- **"Revisamos a seção Quando usar"** fica junto da descrição que o Claude vai ver, para a mesa entender por que essa seção importa.
- **Marcar como final** pede confirmação e trava a pasta (RN15). O gestor destrava no detalhe da mesa.
- **Apresentação de 1 minuto** sai pronta na tela: a tarefa, uma conferência que passou na prova e o que o conserto mudou.

## Marco 6: robustez para o dia do evento (15/11/2026)

### Detalhe da mesa

- **Abas Pasta, Conversa, Linha do tempo e Teste só para o gestor.** A seção 5 da especificação põe "Ver pasta" entre as ações do gestor, e o facilitador tem a função de atender chamados e liberar fases. O facilitador vê só a aba Agora. A rota `/api/admin/mesas/[id]/detalhe` confere o perfil (`ver_pasta`).
- **A Conversa do detalhe mostra a entrevista e os envios dos celulares.** É a única tela fora da própria mesa que mostra a conversa; a mesa testadora continua sem acesso (RN09).
- **Linha do tempo em frases**, a partir do registro de ações (RN16), com a hora e o nome de quem fez. Ações sem frase própria aparecem pelo nome.

### Preparo pelo admin

- **Página `/admin/preparo`, só do gestor**, com as abas Evento, Processos, Mesas e Roteiro. Cada alteração registra a ação e avisa as telas pelo canal de tempo real.
- **O código da mesa é gerado pelo sistema**, com 6 letras e números sem os que se confundem (0, O, 1, I, L). Não é editável, para não quebrar os cartões já impressos.
- **Só sai a mesa que não começou:** Fase 0, sem arquivos e sem celulares. Só sai o processo sem mesa. Assim, nada que a mesa fez se perde (RN05).
- **Textos do roteiro sem travessão.** O servidor recusa travessões nas instruções e na atividade da tela de espera, com a mensagem que diz o que usar no lugar. A instrução de um passo vai até 300 caracteres.
- **A aba Roteiro mostra a soma dos minutos** e uma prévia de como a mesa vê cada passo.

### Plano B impresso

- **`/mesa/[codigo]/imprimir`**: o roteiro da mesa numa folha A4, com fases, passos, papéis, ficha, kit, as perguntas guia dos 8 temas e linhas para escrever a skill e as conferências. Abre pelo detalhe da mesa ("Roteiro para imprimir") e com o código da mesa, como a própria tela.

### Painel com 20 mesas

- **Menu "Mais"** na barra de cima, com Preparo, Cartões com QR e Exportar todas. Com tudo à vista, a barra quebrava em duas linhas e a grade de 20 mesas passava de 900 px de altura.
- **Texto no lugar de botão desabilitado na barra de fases:** "Nenhuma mesa pronta" e "Pares do teste formados". O frontend pede que todo botão desabilitado mostre o motivo; o texto curto diz a mesma coisa e cabe numa linha.
- **Cartão mais baixo:** estado e ação na mesma linha, pessoas conectadas na linha da fase, "Final." antes das pessoas quando a skill foi marcada como final. Com isso, 20 cartões cabem em 1440 por 900 sem rolagem (teste em `tests/e2e/marco6-aceite.spec.ts`).

### Robustez

- **Rascunhos nas edições por seção**: o texto em edição fica no navegador (`localStorage`) até ser guardado, para não se perder com F5, queda de rede ou janela fechada.
- **Cookie do admin com `Secure` só em https.** Em http (rede local do evento ou `localhost`), o navegador recusaria o cookie e o gestor não conseguiria entrar.

### Teste de carga

- **Script próprio (`scripts/carga.ts`)**, sem dependência nova: abre um canal de tempo real por mesa, por celular e pelo admin, busca o estado com a frequência real das telas, manda contribuições e muda fases pelo admin, medindo quanto a mudança leva para chegar à mesa.
- **Resultado em 15/11/2026**, servidor de produção local com o canal local de tempo real, 20 mesas, 100 celulares e 60 segundos: nenhum erro; estado do celular com mediana de 7 ms e 95% abaixo de 14 ms; painel com 95% abaixo de 280 ms; mudança de fase chegando à mesa com mediana de 9 ms e 95% abaixo de 19 ms.
- **Não testado:** o caminho do Supabase Realtime e a IA de verdade com muitas mesas ao mesmo tempo. Os dois ficam na lista de conferências antes do evento (`docs/aceite.md`).

### Testes

- **IA simulada nos testes** (`IA_SIMULADA=1`, `lib/ia/simulada.ts`): os testes de navegador e de integração percorrem as 8 fases sem chave e sem custo. A IA simulada respeita os mesmos esquemas de resposta da real.
- **Teste de textos** (`tests/textos.test.ts`): falha se algum texto do código tiver travessão ou se algum componente usar caixa alta.
- **Mapa de aceite** em `docs/aceite.md`, ligando cada critério das seções 8 da especificação e do frontend ao teste que o confere ou à conferência manual.

### Ajuste depois do Marco 6 (15/11/2026)

- **Celular pela rede Wi-Fi no `npm run dev`.** O Next 16 bloqueia, em desenvolvimento, a conexão interna de quem abre o servidor por um endereço que não é localhost, e a tela do celular ficava parada em "Abrindo a mesa". O `next.config.ts` passou a liberar (`allowedDevOrigins`) os endereços IPv4 do próprio computador e as faixas de rede local (192.168, 10 e 172.16 a 172.31). Não muda nada no modo de produção. Conferido com um navegador de celular simulado abrindo a tela pelo IP da rede, antes e depois da mudança.- **Celular sem cookie escolhe quem é.** O celular é reconhecido por um cookie. Quando ele se perdia (QR aberto em outro navegador, aba anônima, "Trocar o nome"), digitar o nome de novo criava outra pessoa, sem o papel recebido, e o nome aparecia repetido na mesa. Agora a tela de entrada mostra quem já entrou na mesa, com os papéis e se o celular está conectado: a pessoa toca no próprio nome e volta com os papéis e os envios dela. Embaixo fica "Primeira vez nesta mesa?" com o campo do nome. Se o nome digitado já existe na mesa (sem diferença de maiúsculas), o celular pergunta "É você?": "Sou eu" entra como essa pessoa; "Sou outra pessoa" pede o nome com a inicial do sobrenome. Sem login, qualquer pessoa da mesa pode tocar em qualquer nome; o risco é baixo e cabe na regra de só primeiro nome.

### Caso único de comunicação e mesas novas pelo painel (15/11/2026)

- **Evento de demonstração com um processo só**, a pedido: "Planejar um evento e a comunicação para engajar o público". O grupo parte de uma pesquisa de temas, escolhe a temática, monta a ideia do evento, a agenda, os convidados e o local, e com isso escreve o convite e a estratégia de divulgação. As 3 mesas de demonstração usam esse processo. O `CLAUDE.md` ainda fala em 2 processos no seed; vale este registro.
- **Kit com dados que dá para conferir**: pesquisa de temas com percentuais, locais com capacidade, custo e datas livres, convidados com assunto, datas e cachê, e regras de comunicação (prazo do convite, lembretes, meta de inscritos de 120% dos lugares, melhores horários por canal). Assim a Prova tem fontes de verdade: a data do convidado bate com a do local, o custo cabe no orçamento, o convite sai 15 dias antes.
- **Datas do kit em março de 2027**, depois da oficina, para que a regra de 15 dias do convite possa ser cumprida no dia 03/12/2026. Os dias da semana do kit foram conferidos no calendário.
- **Caso de exemplo e caso novo com solução possível e diferente**: a rede de confeiteiras (até 60 pessoas, R$ 1.000,00, de manhã) e o coletivo de salões (até 35 pessoas, R$ 400,00, sem pagar local, só Instagram e WhatsApp). O exemplo bom é de um terceiro grupo, para não entregar a resposta.
- **Adicionar mesa pelo painel antes de iniciar o evento**: cartão tracejado no fim da grade, só para o gestor, enquanto o evento não foi iniciado, no filtro Todas e com menos de 20 mesas (o limite do painel sem rolagem). O aviso mostra o nome e o código da mesa nova. Depois de iniciar, a mesa nova continua possível pela aba Mesas do Preparo.
- **Mesa nova herda o processo** quando o evento tem um processo só, tanto pelo painel quanto pelo Preparo.

### Diagnóstico da IA (15/11/2026)

- **`npm run ia:testar`** (`scripts/testar-ia.ts`): faz uma chamada pequena à IA com a chave e o modelo do `.env.local`, sem mostrar a chave, e explica a causa da falha em português: chave recusada, sem permissão ou sem créditos, modelo inexistente, limite de pedidos, sem internet, conexão recusada, certificado trocado no caminho (antivírus ou rede que inspeciona HTTPS).
- **Mensagens da mesa mais específicas** quando a IA falha: sem conexão ("O servidor não conseguiu se conectar à IA"), modelo inexistente e IA sobrecarregada, além das que já existiam (chave recusada, muitos pedidos). O detalhe técnico continua só no terminal do servidor.
- **"Faltam 8 perguntas e 8 temas"**: o aviso da entrevista concorda no plural e ficou mais curto.- **Nome do modelo tolerante**: `ANTHROPIC_MODEL` aceita o nome comercial ("Opus 5.5", "Claude Sonnet 5.5") e o sistema converte para o identificador da API ("claude-opus-5-5"). Vazio vale o padrão. Um `.env.local` com "Opus 5.5" fazia toda chamada falhar com "modelo não encontrado".

### Celular nos passos 2 e 3 da entrevista (15/11/2026)

- **O celular mostra o SKILL.md para ler** nos passos de escrever e revisar da Fase 2, com a versão, um botão para recolher o texto e, no passo de revisar, as duas perguntas da IA ("O que eu errei?" e "O que vocês esqueceram de me contar?"). Enquanto a IA escreve, aparece um aviso. O celular continua sem editar arquivos e sem ver a conversa (CLAUDE.md, seção das três superfícies).
- **O campo de envio muda de pergunta** nesses passos: "Leu o SKILL.md? Mande o que está errado ou o que faltou contar." Os envios caem na fila da tela da mesa, que já aparece nos passos do editor.
- **A pergunta da entrevista só aparece no passo 1.** Antes, a última pergunta sem resposta continuava no celular depois de encerrar a entrevista.
- **Sinal para os celulares no fim de cada ação da IA** (pergunta nova, SKILL.md escrito ou corrigido, rodadas): os celulares buscam o estado na hora, em vez de esperar a busca de 15 segundos.

### Prova e revisão mais curtas (15/11/2026)

- **Prova sem número mínimo além de 1**, a pedido: o Cético conclui o passo com 1 conferência válida, até 10. A especificação pedia de 5 a 10; vale este registro. A regra da RN08 continua igual: fonte declarada e sem palavras vagas. A lista de palavras vagas não mudou ("tudo" e "qualquer uma" continuam aceitos, por decisão do pedido).
- **Lista de conferências compacta**: uma linha por conferência (número, o que confere, fonte, situação e Tirar), com os rótulos no cabeçalho da lista. O exemplo bom e o ruim viraram duas linhas curtas.
- **Passo 3 da entrevista é validar**: no alto, o que mudou no SKILL.md desde a versão que a IA escreveu no passo 2 (por parte do arquivo: mudou, nova ou tirada) e o botão Aprovar. Responder às perguntas da IA e corrigir parte por parte ficam recolhidos. O arquivo inteiro continua na Pasta viva.
- **Textos do roteiro atualizados nos eventos existentes** pela migração `20261119000000_prova_e_revisao_mais_curtas.sql`, só quando o texto ainda é o padrão: o que o gestor editou no Preparo fica como está.

