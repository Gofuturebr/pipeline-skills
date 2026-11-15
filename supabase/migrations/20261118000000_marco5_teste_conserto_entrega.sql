-- Marco 5: teste cruzado, conserto e entrega.

-- Proposta da IA para o conserto, guardada até a mesa aprovar.
alter table conserto add column proposta jsonb;
alter table conserto add column diagnostico text not null default '';

-- Marcas da entrega (Fase 7).
create table entrega (
  mesa_id            uuid primary key references mesa(id) on delete cascade,
  nome_confirmado_em timestamptz,
  quando_revisado_em timestamptz,
  final_em           timestamptz
);
alter table entrega enable row level security;

create index conserto_mesa on conserto (mesa_id, criado_em);
create index teste_autora on teste_cruzado (mesa_autora_id);
