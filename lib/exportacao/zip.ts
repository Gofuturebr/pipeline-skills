// Gera um arquivo .zip sem compressão (método "store"). Os arquivos de uma
// skill são texto e pequenos; sem compressão o código fica curto e sem
// dependência externa. Nomes em UTF-8 (bit 11 ligado).

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(dados: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < dados.length; i++) c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dataDos(d: Date): { hora: number; data: number } {
  return {
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    data: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export interface ArquivoZip {
  caminho: string;
  conteudo: string | Uint8Array;
}

export function gerarZip(arquivos: ArquivoZip[], quando = new Date()): Uint8Array {
  const codificador = new TextEncoder();
  const { hora, data } = dataDos(quando);
  const locais: Uint8Array[] = [];
  const centrais: Uint8Array[] = [];
  let deslocamento = 0;

  for (const a of arquivos) {
    const nome = codificador.encode(a.caminho);
    const dados = typeof a.conteudo === "string" ? codificador.encode(a.conteudo) : a.conteudo;
    const crc = crc32(dados);

    const local = new Uint8Array(30 + nome.length + dados.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, hora, true);
    lv.setUint16(12, data, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dados.length, true);
    lv.setUint32(22, dados.length, true);
    lv.setUint16(26, nome.length, true);
    lv.setUint16(28, 0, true);
    local.set(nome, 30);
    local.set(dados, 30 + nome.length);
    locais.push(local);

    const central = new Uint8Array(46 + nome.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, hora, true);
    cv.setUint16(14, data, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dados.length, true);
    cv.setUint32(24, dados.length, true);
    cv.setUint16(28, nome.length, true);
    cv.setUint32(42, deslocamento, true);
    central.set(nome, 46);
    centrais.push(central);
    deslocamento += local.length;
  }

  const tamanhoCentral = centrais.reduce((s, c) => s + c.length, 0);
  const fim = new Uint8Array(22);
  const fv = new DataView(fim.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, arquivos.length, true);
  fv.setUint16(10, arquivos.length, true);
  fv.setUint32(12, tamanhoCentral, true);
  fv.setUint32(16, deslocamento, true);

  const total = deslocamento + tamanhoCentral + fim.length;
  const saida = new Uint8Array(total);
  let p = 0;
  for (const parte of [...locais, ...centrais, fim]) {
    saida.set(parte, p);
    p += parte.length;
  }
  return saida;
}
