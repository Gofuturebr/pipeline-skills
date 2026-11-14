-- Marco 2: celular do participante, papéis, leitura do kit e contribuições.

-- Passos de leitura que a mesa marcou como "Lemos".
create table leitura (
  mesa_id  uuid not null references mesa(id) on delete cascade,
  passo_id uuid not null references passo(id) on delete cascade,
  lido_em  timestamptz not null default now(),
  primary key (mesa_id, passo_id)
);
alter table leitura enable row level security;

-- Texto do campo de contribuição no celular. Vazio quer dizer que a fase não
-- recebe contribuições.
alter table fase add column rotulo_contribuicao text not null default '';
update fase set rotulo_contribuicao = 'Uma dúvida ou um caso parecido que você já viveu'
  where chave = 'processo' and rotulo_contribuicao = '';
update fase set rotulo_contribuicao = 'Lembrou de uma exceção ou de algo que já deu errado?'
  where chave = 'entrevista' and rotulo_contribuicao = '';

-- O token identifica o celular: busca rápida e sem repetição.
create unique index participante_token_unico on participante (token);
