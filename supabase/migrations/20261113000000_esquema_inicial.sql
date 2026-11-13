-- Mesa de Skills: esquema inicial.
-- Derivado da seção 7 de docs/especificacao.md. Tabelas extras (rodada, aviso,
-- papel_mesa, passo_concluido, entrevista) estão justificadas em docs/decisoes.md.
--
-- Acesso: todas as tabelas têm RLS ligado e nenhuma política. O navegador nunca
-- lê o banco direto; só o servidor, com a conexão de dono do banco.

create extension if not exists pgcrypto;

-- Evento ---------------------------------------------------------------------

create table evento (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null,
  data                  date not null,
  modo_liberacao        text not null default 'manual'
                        check (modo_liberacao in ('manual', 'automatico')),
  fase_referencia       int  not null default 0 check (fase_referencia between 0 and 7),
  iniciado_em           timestamptz,
  pausa_geral_desde     timestamptz,
  pausa_geral_ate       timestamptz,
  duracao_intervalo_min int  not null default 10,
  palavras_vagas        text[] not null default array['claro', 'profissional', 'de qualidade'],
  criado_em             timestamptz not null default now()
);

-- Fases e passos (roteiro editável por evento) --------------------------------

create table fase (
  id             uuid primary key default gen_random_uuid(),
  evento_id      uuid not null references evento(id) on delete cascade,
  ordem          int  not null check (ordem between 0 and 7),
  chave          text not null,
  nome           text not null,
  nome_curto     text not null,
  duracao_min    int  not null check (duracao_min > 0),
  entrega        text not null default '',
  criterio       text not null,
  criterio_texto text not null default '',
  aprofundamento text not null default '',
  unique (evento_id, ordem)
);

create table passo (
  id             uuid primary key default gen_random_uuid(),
  fase_id        uuid not null references fase(id) on delete cascade,
  ordem          int  not null check (ordem >= 1),
  chave          text not null,
  instrucao      text not null,
  papel          text not null check (papel in
                   ('dono', 'piloto', 'guardiao', 'cetico', 'testador', 'porta_voz', 'mesa')),
  tipo_atividade text not null check (tipo_atividade in
                   ('papeis', 'leitura', 'frase', 'entrevista', 'editor', 'rodada',
                    'caixa', 'conferencias', 'placar', 'relatorio', 'conserto')),
  criterio       text not null,
  config         jsonb not null default '{}'::jsonb,
  permite_editar boolean not null default false,
  unique (fase_id, ordem)
);

-- Processo ---------------------------------------------------------------------

create table processo (
  id             uuid primary key default gen_random_uuid(),
  evento_id      uuid not null references evento(id) on delete cascade,
  nome           text not null,
  ficha          jsonb not null default '{}'::jsonb,
  kit_materiais  text not null default '',
  exemplo_bom    text not null default '',
  exemplo_ruim   text not null default '',
  caso_exemplo   text not null default '',
  caso_novo      text not null default '',
  criado_em      timestamptz not null default now()
);

-- Mesa -------------------------------------------------------------------------

create table mesa (
  id                 uuid primary key default gen_random_uuid(),
  evento_id          uuid not null references evento(id) on delete cascade,
  numero             int  not null,
  nome               text not null,
  codigo             text not null unique,
  processo_id        uuid references processo(id) on delete set null,
  fase_atual         int  not null default 0 check (fase_atual between 0 and 7),
  passo_atual        int  not null default 1 check (passo_atual >= 1),
  estado             text not null default 'em_andamento'
                     check (estado in ('em_andamento', 'pronta', 'pausada')),
  estado_antes_pausa text check (estado_antes_pausa in ('em_andamento', 'pronta')),
  fase_iniciada_em   timestamptz not null default now(),
  pausada_desde      timestamptz,
  pausa_acumulada_s  int  not null default 0,
  ajuste_tempo_s     int  not null default 0,
  reaberta_em        timestamptz,
  tarefa             text not null default '',
  nome_skill         text not null default '',
  final              boolean not null default false,
  versao             int  not null default 1,
  criado_em          timestamptz not null default now(),
  unique (evento_id, numero)
);

create table papel_mesa (
  mesa_id         uuid not null references mesa(id) on delete cascade,
  papel           text not null check (papel in
                    ('dono', 'piloto', 'guardiao', 'cetico', 'testador', 'porta_voz')),
  nome            text not null,
  participante_id uuid,
  primary key (mesa_id, papel)
);

create table passo_concluido (
  mesa_id      uuid not null references mesa(id) on delete cascade,
  passo_id     uuid not null references passo(id) on delete cascade,
  concluido_em timestamptz not null default now(),
  primary key (mesa_id, passo_id)
);

create table participante (
  id              uuid primary key default gen_random_uuid(),
  mesa_id         uuid not null references mesa(id) on delete cascade,
  primeiro_nome   text not null check (char_length(primeiro_nome) between 1 and 40),
  token           text not null default encode(gen_random_bytes(24), 'hex'),
  ultimo_sinal_em timestamptz not null default now(),
  criado_em       timestamptz not null default now()
);
create index on participante (mesa_id);

alter table papel_mesa
  add constraint papel_mesa_participante_fk
  foreign key (participante_id) references participante(id) on delete set null;

-- Pasta: arquivo e histórico (RN06) -----------------------------------------------

create table arquivo (
  id            uuid primary key default gen_random_uuid(),
  mesa_id       uuid not null references mesa(id) on delete cascade,
  caminho       text not null,
  conteudo      text not null default '',
  versao        int  not null default 1,
  fase_alterada int  not null,
  passo_alterado int,
  autor         text not null default 'mesa',
  atualizado_em timestamptz not null default now(),
  unique (mesa_id, caminho)
);

create table arquivo_versao (
  id         uuid primary key default gen_random_uuid(),
  arquivo_id uuid not null references arquivo(id) on delete cascade,
  versao     int  not null,
  conteudo   text not null,
  fase       int  not null,
  passo      int,
  autor      text not null,
  criado_em  timestamptz not null default now(),
  unique (arquivo_id, versao)
);

-- Toda inserção ou alteração de conteúdo em arquivo gera uma linha de histórico.
create function registrar_versao_arquivo() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.conteudo is not distinct from old.conteudo and new.caminho = old.caminho then
      return new;
    end if;
    new.versao := old.versao + 1;
    new.atualizado_em := now();
  end if;
  return new;
end $$;

create function gravar_versao_arquivo() returns trigger
language plpgsql as $$
begin
  insert into arquivo_versao (arquivo_id, versao, conteudo, fase, passo, autor)
  values (new.id, new.versao, new.conteudo, new.fase_alterada, new.passo_alterado, new.autor)
  on conflict (arquivo_id, versao) do nothing;
  return new;
end $$;

create trigger arquivo_antes before update on arquivo
  for each row execute function registrar_versao_arquivo();
create trigger arquivo_depois after insert or update on arquivo
  for each row execute function gravar_versao_arquivo();

-- Conversa e entrevista ------------------------------------------------------------

create table mensagem (
  id        uuid primary key default gen_random_uuid(),
  mesa_id   uuid not null references mesa(id) on delete cascade,
  autor     text not null check (autor in ('mesa', 'ia')),
  texto     text not null,
  fase      int  not null,
  passo     int,
  tipo      text not null default 'conversa',
  meta      jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index on mensagem (mesa_id, criado_em);

create table entrevista (
  mesa_id      uuid primary key references mesa(id) on delete cascade,
  n_perguntas  int  not null default 0,
  temas        jsonb not null default '{}'::jsonb,
  encerrada_em timestamptz
);

-- Contribuições dos celulares ------------------------------------------------------

create table contribuicao (
  id              uuid primary key default gen_random_uuid(),
  mesa_id         uuid not null references mesa(id) on delete cascade,
  participante_id uuid references participante(id) on delete set null,
  fase            int  not null,
  passo           int  not null,
  texto           text not null check (char_length(texto) between 1 and 280),
  estado          text not null default 'pendente'
                  check (estado in ('pendente', 'aceita', 'descartada')),
  criado_em       timestamptz not null default now()
);
create index on contribuicao (mesa_id, estado);

-- Prova, rodadas e teste cruzado ----------------------------------------------------

create table conferencia (
  id            uuid primary key default gen_random_uuid(),
  mesa_id       uuid not null references mesa(id) on delete cascade,
  ordem         int  not null,
  descricao     text not null default '',
  fonte         text not null default '',
  valida        boolean not null default false,
  motivo_recusa text,
  unique (mesa_id, ordem)
);

create table rodada (
  id         uuid primary key default gen_random_uuid(),
  mesa_id    uuid not null references mesa(id) on delete cascade,
  fase       int  not null,
  tipo       text not null check (tipo in
               ('exemplo', 'segunda', 'prova', 'teste', 'conserto_antes', 'conserto_depois')),
  entrada    text not null default '',
  saida      text not null default '',
  relatorio  jsonb not null default '{}'::jsonb,
  criado_em  timestamptz not null default now()
);

create table resultado_conferencia (
  id             uuid primary key default gen_random_uuid(),
  rodada_id      uuid not null references rodada(id) on delete cascade,
  conferencia_id uuid references conferencia(id) on delete set null,
  descricao      text not null default '',
  passou         boolean not null,
  prova          text not null default '',
  observacao     text not null default ''
);

create table teste_cruzado (
  id                uuid primary key default gen_random_uuid(),
  evento_id         uuid not null references evento(id) on delete cascade,
  mesa_autora_id    uuid not null references mesa(id) on delete cascade,
  mesa_testadora_id uuid not null references mesa(id) on delete cascade,
  estado            text not null default 'aguardando'
                    check (estado in ('aguardando', 'em_teste', 'enviado')),
  rodada_id         uuid references rodada(id) on delete set null,
  enviado_em        timestamptz,
  criado_em         timestamptz not null default now(),
  check (mesa_autora_id <> mesa_testadora_id),
  unique (mesa_testadora_id)
);

create table conserto (
  id                       uuid primary key default gen_random_uuid(),
  mesa_id                  uuid not null references mesa(id) on delete cascade,
  resultado_conferencia_id uuid references resultado_conferencia(id) on delete set null,
  camada                   text check (camada in ('processo', 'caixa', 'prova')),
  o_que_deu_errado         text not null default '',
  o_que_mudou              text not null default '',
  rodada_antes_id          uuid references rodada(id) on delete set null,
  rodada_depois_id         uuid references rodada(id) on delete set null,
  aprovado_em              timestamptz,
  criado_em                timestamptz not null default now()
);

-- Chamados, avisos e registro --------------------------------------------------------

create table chamado (
  id           uuid primary key default gen_random_uuid(),
  mesa_id      uuid not null references mesa(id) on delete cascade,
  fase         int  not null,
  passo        int  not null,
  aberto_em    timestamptz not null default now(),
  estado       text not null default 'aberto'
               check (estado in ('aberto', 'atendido', 'cancelado')),
  atendido_por text,
  atendido_em  timestamptz
);
-- No máximo um chamado aberto por mesa.
create unique index chamado_um_aberto on chamado (mesa_id) where estado = 'aberto';

create table aviso (
  id        uuid primary key default gen_random_uuid(),
  evento_id uuid not null references evento(id) on delete cascade,
  mesa_id   uuid references mesa(id) on delete cascade,
  texto     text not null check (char_length(texto) between 1 and 280),
  autor     text not null,
  criado_em timestamptz not null default now()
);
create index on aviso (evento_id, criado_em);

create table registro (
  id           uuid primary key default gen_random_uuid(),
  evento_id    uuid not null references evento(id) on delete cascade,
  mesa_id      uuid references mesa(id) on delete cascade,
  acao         text not null,
  autor_perfil text not null check (autor_perfil in ('gestor', 'facilitador', 'mesa', 'sistema')),
  autor_nome   text not null default '',
  detalhes     jsonb not null default '{}'::jsonb,
  criado_em    timestamptz not null default now()
);
create index on registro (mesa_id, criado_em);
create index on registro (evento_id, criado_em);

-- RLS ligado em todas as tabelas, sem políticas: só o dono do banco acessa. ----------

alter table evento                enable row level security;
alter table fase                  enable row level security;
alter table passo                 enable row level security;
alter table processo              enable row level security;
alter table mesa                  enable row level security;
alter table papel_mesa            enable row level security;
alter table passo_concluido       enable row level security;
alter table participante          enable row level security;
alter table arquivo               enable row level security;
alter table arquivo_versao        enable row level security;
alter table mensagem              enable row level security;
alter table entrevista            enable row level security;
alter table contribuicao          enable row level security;
alter table conferencia           enable row level security;
alter table rodada                enable row level security;
alter table resultado_conferencia enable row level security;
alter table teste_cruzado         enable row level security;
alter table conserto              enable row level security;
alter table chamado               enable row level security;
alter table aviso                 enable row level security;
alter table registro              enable row level security;
