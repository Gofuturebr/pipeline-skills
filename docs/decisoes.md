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
