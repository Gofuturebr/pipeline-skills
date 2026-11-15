// Arquivos da pasta são texto com títulos "#" e "##". Estas funções dividem e
// juntam o arquivo por seções, para o editor por seções e para as atualizações
// automáticas (por exemplo, a seção Pronto quando).

export interface Secao {
  nome: string;
  corpo: string;
}

export interface ArquivoPorSecoes {
  /** Título da linha "# ...". */
  titulo: string;
  /** Texto entre o título e a primeira seção. */
  abertura: string;
  secoes: Secao[];
}

export function dividirSecoes(conteudo: string): ArquivoPorSecoes {
  const linhas = conteudo.replace(/\r\n/g, "\n").split("\n");
  let titulo = "";
  const abertura: string[] = [];
  const secoes: Secao[] = [];
  let atual: { nome: string; linhas: string[] } | null = null;
  for (const linha of linhas) {
    const h1 = linha.match(/^#\s+(.*)$/);
    const h2 = linha.match(/^##\s+(.*)$/);
    if (h1 && !titulo && !atual) {
      titulo = h1[1].trim();
    } else if (h2) {
      if (atual) secoes.push({ nome: atual.nome, corpo: atual.linhas.join("\n").trim() });
      atual = { nome: h2[1].trim(), linhas: [] };
    } else if (atual) {
      atual.linhas.push(linha);
    } else {
      abertura.push(linha);
    }
  }
  if (atual) secoes.push({ nome: atual.nome, corpo: atual.linhas.join("\n").trim() });
  return { titulo, abertura: abertura.join("\n").trim(), secoes };
}

export function juntarSecoes(a: ArquivoPorSecoes): string {
  const partes: string[] = [];
  if (a.titulo) partes.push(`# ${a.titulo}`);
  if (a.abertura) partes.push(a.abertura);
  for (const s of a.secoes) partes.push(`## ${s.nome}\n${s.corpo}`.trim());
  return `${partes.join("\n\n").trim()}\n`;
}

/** Troca o corpo de uma seção (ou acrescenta a seção no fim, se não existir). */
export function trocarSecao(conteudo: string, nome: string, corpo: string): string {
  const a = dividirSecoes(conteudo);
  const i = a.secoes.findIndex((s) => s.nome.toLowerCase() === nome.toLowerCase());
  if (i >= 0) a.secoes[i] = { nome: a.secoes[i].nome, corpo };
  else a.secoes.push({ nome, corpo });
  return juntarSecoes(a);
}

export interface MudancaDeSecao {
  secao: string;
  tipo: "mudou" | "nova" | "tirada";
  /** Texto atual da seção (vazio quando foi tirada). */
  texto: string;
}

/** Seções que mudaram de uma versão para outra, na ordem do arquivo novo. O título conta como "Nome da skill". */
export function mudancasEntre(antes: string, depois: string): MudancaDeSecao[] {
  const a = dividirSecoes(antes);
  const d = dividirSecoes(depois);
  const mudancas: MudancaDeSecao[] = [];
  if (a.titulo.trim() !== d.titulo.trim()) mudancas.push({ secao: "Nome da skill", tipo: "mudou", texto: d.titulo });
  const chave = (nome: string) => nome.trim().toLowerCase();
  const antigas = new Map(a.secoes.map((s) => [chave(s.nome), s.corpo.trim()]));
  for (const s of d.secoes) {
    const anterior = antigas.get(chave(s.nome));
    if (anterior === undefined) mudancas.push({ secao: s.nome, tipo: "nova", texto: s.corpo });
    else if (anterior !== s.corpo.trim()) mudancas.push({ secao: s.nome, tipo: "mudou", texto: s.corpo });
  }
  const atuais = new Set(d.secoes.map((s) => chave(s.nome)));
  for (const s of a.secoes) if (!atuais.has(chave(s.nome))) mudancas.push({ secao: s.nome, tipo: "tirada", texto: "" });
  return mudancas;
}

export function lerSecao(conteudo: string, nome: string): string | null {
  const s = dividirSecoes(conteudo).secoes.find((x) => x.nome.toLowerCase() === nome.toLowerCase());
  return s ? s.corpo : null;
}
