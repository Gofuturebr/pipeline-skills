-- Prova sem número mínimo além de 1 conferência e passo de revisão mais curto
-- (docs/decisoes.md, 15/11/2026). Só troca os textos que ainda estão iguais aos
-- do roteiro padrão: o que o gestor já editou no Preparo fica como está.

update fase
set criterio_texto = 'De 1 a 10 conferências válidas'
where chave = 'prova' and criterio_texto = 'De 5 a 10 conferências válidas';

update passo p
set instrucao = 'Cético, escreva as conferências, até 10. Cada uma diz o que confere e contra qual fonte.'
from fase f
where f.id = p.fase_id and f.chave = 'prova' and p.chave = 'escrever'
  and p.instrucao = 'Cético, escreva de 5 a 10 conferências. Cada uma diz o que confere e contra qual fonte.';

update passo p
set instrucao = 'Confiram o que mudou no SKILL.md e aprovem.'
from fase f
where f.id = p.fase_id and f.chave = 'entrevista' and p.chave = 'revisar'
  and p.instrucao = 'Respondam às duas perguntas da IA: o que ela errou e o que vocês esqueceram de contar. Corrijam direto no arquivo e aprovem.';
