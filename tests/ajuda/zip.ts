// Lê os nomes e o conteúdo de texto de um .zip sem compressão (o que o sistema gera).
export function lerZip(dados: Uint8Array): Map<string, string> {
  const arquivos = new Map<string, string>();
  const v = new DataView(dados.buffer, dados.byteOffset, dados.byteLength);
  const dec = new TextDecoder();
  let p = 0;
  while (p + 30 <= dados.length && v.getUint32(p, true) === 0x04034b50) {
    const tamanho = v.getUint32(p + 18, true);
    const nomeLen = v.getUint16(p + 26, true);
    const extraLen = v.getUint16(p + 28, true);
    const nome = dec.decode(dados.subarray(p + 30, p + 30 + nomeLen));
    const ini = p + 30 + nomeLen + extraLen;
    arquivos.set(nome, dec.decode(dados.subarray(ini, ini + tamanho)));
    p = ini + tamanho;
  }
  return arquivos;
}
