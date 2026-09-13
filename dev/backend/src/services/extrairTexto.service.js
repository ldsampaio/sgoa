import { readFile } from 'node:fs/promises';
import { extractText } from 'unpdf';

// Extrai texto útil de um arquivo para avaliação por LLM.
// v1: PDF (via unpdf) + txt/md/texto puro. docx e outros → erro explicativo.
// Retorna { texto, paginas?, origem }.

export async function extrairTexto(caminho, tipoArquivo) {
  const tipo = String(tipoArquivo || '').toLowerCase();
  if (['txt', 'md', 'markdown', 'text', 'plain'].includes(tipo)) {
    const texto = await readFile(caminho, 'utf8');
    return { texto: normalizar(texto), origem: 'texto' };
  }
  if (tipo === 'pdf') {
    const buffer = await readFile(caminho);
    const resultado = await extractText(new Uint8Array(buffer));
    const texto = typeof resultado === 'string' ? resultado : resultado?.text || '';
    const paginas = typeof resultado === 'object' ? resultado?.totalPages : undefined;
    return { texto: normalizar(texto), paginas, origem: 'pdf' };
  }
  throw new Error(
    `Formato .${tipo || '?'} não suportado pelo agente (v1: PDF ou TXT). Converta o arquivo e reenvie.`,
  );
}

function normalizar(texto) {
  return String(texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Divide em chunks cortando em fronteira de parágrafo.
// Se exceder maxChunks, mantém os (maxChunks-1) primeiros + o último.
export function dividirChunks(texto, chunkChars, maxChunks) {
  const paragrafos = String(texto).split(/\n{2,}|\n/);
  const chunks = [];
  let atual = '';
  for (const p of paragrafos) {
    const Paragrafo = p.trim();
    if (!Paragrafo) continue;
    if ((atual + '\n\n' + Paragrafo).trim().length > chunkChars && atual) {
      chunks.push(atual.trim());
      atual = Paragrafo;
    } else {
      atual = atual ? `${atual}\n\n${Paragrafo}` : Paragrafo;
    }
  }
  if (atual.trim()) chunks.push(atual.trim());
  if (chunks.length <= maxChunks) return { chunks, parcial: false };
  const mantidos = [...chunks.slice(0, maxChunks - 1), chunks[chunks.length - 1]];
  return { chunks: mantidos, parcial: true };
}
