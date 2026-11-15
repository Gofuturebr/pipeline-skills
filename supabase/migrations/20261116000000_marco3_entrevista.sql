-- Marco 3: entrevista com a IA, SKILL.md e aprovação.

-- Trava para a IA não responder duas vezes ao mesmo tempo na mesma mesa.
alter table entrevista add column ocupada_ate timestamptz;
-- Versão do SKILL.md que a mesa aprovou. Editar depois pede nova aprovação.
alter table entrevista add column skill_aprovada_versao int;
-- Respostas às duas perguntas finais da IA.
alter table entrevista add column respostas_finais jsonb not null default '{}'::jsonb;

create index mensagem_mesa_fase on mensagem (mesa_id, fase, criado_em);
