-- Marco 4: rodadas, caixa de ferramentas e prova.

-- De quem é a pasta usada na rodada. No teste cruzado, a mesa testadora roda a
-- pasta da parceira.
alter table rodada add column pasta_mesa_id uuid references mesa(id) on delete cascade;
update rodada set pasta_mesa_id = mesa_id where pasta_mesa_id is null;

-- Número da conferência no placar e se a IA conseguiu conferir com a fonte dada.
alter table resultado_conferencia add column numero int not null default 0;
alter table resultado_conferencia add column conseguiu_conferir boolean not null default true;
alter table resultado_conferencia add column fonte text not null default '';

create index rodada_mesa on rodada (mesa_id, criado_em);
create index resultado_rodada on resultado_conferencia (rodada_id, numero);
