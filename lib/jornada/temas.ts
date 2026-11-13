// Os 8 temas da entrevista (Fase 2, passo 3 da especificação).
// A trava da RN07 exige os 8 cobertos e pelo menos 8 perguntas.

export const TEMAS_ENTREVISTA = [
  { chave: "gatilho", nome: "Gatilho e frequência" },
  { chave: "entradas", nome: "O que precisa" },
  { chave: "passos", nome: "Passos na ordem real" },
  { chave: "decisoes", nome: "Decisões e regras" },
  { chave: "conferir", nome: "O que conferir" },
  { chave: "erros", nome: "Casos que deram errado" },
  { chave: "tom", nome: "Tom e padrão" },
  { chave: "versao_ruim", nome: "Como é a versão ruim" },
] as const;

export type TemaEntrevista = (typeof TEMAS_ENTREVISTA)[number]["chave"];

export const MINIMO_PERGUNTAS = 8;
