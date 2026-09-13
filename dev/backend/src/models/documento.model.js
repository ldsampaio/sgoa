import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { basename, isAbsolute, join, resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function create({ idOrientacao, idUploader, idTipoDocumento, nomeArquivo, tipoArquivo, caminho, descricao, versao }) {
  const id = uuid();
  // Guarda só o nome do arquivo (relativo). O absoluto do host quebra dentro do Docker.
  const caminhoRel = basename(String(caminho ?? ''));
  await run(
    `INSERT INTO documentos (id_documento, id_orientacao, id_uploader, id_tipo_documento, nome_arquivo, tipo_arquivo, caminho_armazenamento, descricao, versao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, idOrientacao, idUploader, idTipoDocumento ?? null, nomeArquivo, tipoArquivo, caminhoRel, descricao ?? null, versao ?? 1],
  );
  return findById(id);
}

export async function findById(id) {
  return await get(
    `SELECT d.*, u.nome AS nome_uploader, t.nome AS categoria FROM documentos d
     JOIN usuarios u ON u.id_usuario = d.id_uploader
     LEFT JOIN tipos_documento t ON t.id_tipo = d.id_tipo_documento
     WHERE d.id_documento = ?`,
    [id],
  );
}

export async function listByOrientacao(idOrientacao) {
  return await all(
    `SELECT d.*, u.nome AS nome_uploader, t.nome AS categoria FROM documentos d
     JOIN usuarios u ON u.id_usuario = d.id_uploader
     LEFT JOIN tipos_documento t ON t.id_tipo = d.id_tipo_documento
     WHERE d.id_orientacao = ? ORDER BY d.data_upload DESC`,
    [idOrientacao],
  );
}

export async function nextVersion(idOrientacao, nomeBase) {
  const base = nomeBase.includes('.') ? nomeBase.split('.').slice(0, -1).join('.') : nomeBase;
  const rows = await all(
    `SELECT nome_arquivo FROM documentos WHERE id_orientacao = ? AND nome_arquivo LIKE ?`,
    [idOrientacao, `${base}%`],
  );
  const versions = new Set();
  for (const r of rows) {
    const m = r.nome_arquivo.match(/\(v(\d+)\)/);
    if (m) {
      versions.add(parseInt(m[1], 10));
    } else if (r.nome_arquivo.startsWith(base)) {
      versions.add(1);
    }
  }
  return versions.size ? Math.max(...versions) + 1 : 1;
}

export function storagePath(uploadDir) {
  const dir = resolve(uploadDir ?? './uploads');
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Resolve o caminho físico do arquivo a partir do valor guardado no banco.
// Aceita linhas legadas com absoluto do host (/home/.../uploads/x.pdf),
// valores relativos (uploads/x.pdf) ou só o basename (x.pdf).
// Sempre resolve contra UPLOAD_DIR atual, funcionando no host e no Docker (/app/uploads).
export function resolverCaminhoArmazenamento(caminhoArmazenamento, uploadDir) {
  const bruto = String(caminhoArmazenamento ?? '');
  if (!bruto) throw new Error('Documento sem caminho de armazenamento.');
  const nome = isAbsolute(bruto) ? basename(bruto) : basename(bruto.replace(/\\/g, '/'));
  return join(storagePath(uploadDir ?? process.env.UPLOAD_DIR), nome);
}