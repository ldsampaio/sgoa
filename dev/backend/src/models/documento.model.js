import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function create({ idOrientacao, idUploader, nomeArquivo, tipoArquivo, caminho, descricao, versao }) {
  const id = uuid();
  run(
    `INSERT INTO documentos (id_documento, id_orientacao, id_uploader, nome_arquivo, tipo_arquivo, caminho_armazenamento, descricao, versao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, idOrientacao, idUploader, nomeArquivo, tipoArquivo, caminho, descricao ?? null, versao ?? 1],
  );
  return findById(id);
}

export async function findById(id) {
  return get(
    `SELECT d.*, u.nome AS nome_uploader FROM documentos d
     JOIN usuarios u ON u.id_usuario = d.id_uploader
     WHERE d.id_documento = ?`,
    [id],
  );
}

export async function listByOrientacao(idOrientacao) {
  return all(
    `SELECT d.*, u.nome AS nome_uploader FROM documentos d
     JOIN usuarios u ON u.id_usuario = d.id_uploader
     WHERE d.id_orientacao = ? ORDER BY d.data_upload DESC`,
    [idOrientacao],
  );
}

export async function nextVersion(idOrientacao, nomeBase) {
  const base = nomeBase.includes('.') ? nomeBase.split('.').slice(0, -1).join('.') : nomeBase;
  const rows = all(
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