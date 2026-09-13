import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import * as PasswordResetModel from '../models/passwordReset.model.js';

export const CODIGO_TAMANHO = 6;
export const CODIGO_VALIDADE_MIN = 15;
export const CODIGO_MAX_TENTATIVAS = 5;
export const MAX_PEDIDOS_POR_HORA = 3;

const KEY_LEN = 64;

function hashCodigo(codigo) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(codigo), salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

export function codigoConfere(codigo, armazenado) {
  const [salt, hash] = Stringarmazenado(armazenado);
  if (!salt || !hash) return false;
  const candidato = scryptSync(String(codigo), salt, KEY_LEN);
  const esperado = Buffer.from(hash, 'hex');
  return candidato.length === esperado.length && timingSafeEqual(candidato, esperado);
}

function Stringarmazenado(v) {
  return String(v || '').split(':');
}

export function gerarCodigo() {
  return String(randomInt(100000, 1000000));
}

export function expiracaoCodigo(base = new Date()) {
  return new Date(base.getTime() + CODIGO_VALIDADE_MIN * 60 * 1000).toISOString();
}

export function codigoExpirado(registro) {
  return !registro || new Date(registro.expira_em).getTime() < Date.now();
}

export function codigoBloqueado(registro) {
  return (registro?.tentativas ?? 0) >= CODIGO_MAX_TENTATIVAS;
}

export function solicitarCodigo(idUsuario) {
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  if (PasswordResetModel.contarRecentes(idUsuario, umaHoraAtras) >= MAX_PEDIDOS_POR_HORA) {
    const err = new Error('Muitas solicitações. Aguarde uma hora antes de tentar novamente.');
    err.status = 429;
    throw err;
  }
  PasswordResetModel.invalidarAnteriores(idUsuario);
  const codigo = gerarCodigo();
  PasswordResetModel.criar({
    idUsuario,
    codigoHash: hashCodigo(codigo),
    expiraEm: expiracaoCodigo(),
  });
  return codigo;
}

// Valida sem consumir: usada na etapa "verificar código".
// Retorna { ok, motivo } sem revelar detalhes além do necessário.
export function conferirCodigo(idUsuario, codigo) {
  const registro = PasswordResetModel.buscarAtivo(idUsuario);
  if (!registro) return { ok: false, motivo: 'Código inválido ou expirado.' };
  if (codigoExpirado(registro)) return { ok: false, motivo: 'Código expirado. Solicite um novo código.' };
  if (codigoBloqueado(registro)) return { ok: false, motivo: 'Muitas tentativas. Solicite um novo código.' };
  if (!codigoConfere(codigo, registro.codigo_hash)) {
    const atualizado = PasswordResetModel.incrementarTentativa(registro.id);
    if (codigoBloqueado(atualizado)) {
      return { ok: false, motivo: 'Muitas tentativas. Solicite um novo código.' };
    }
    return { ok: false, motivo: 'Código inválido.' };
  }
  return { ok: true, registro };
}

// Valida e consome (uso único) — usado na redefinição final.
export function consumirCodigo(idUsuario, codigo) {
  const resultado = conferirCodigo(idUsuario, codigo);
  if (!resultado.ok) return resultado;
  PasswordResetModel.marcarUsado(resultado.registro.id);
  PasswordResetModel.invalidarAnteriores(idUsuario);
  return { ok: true, registro: resultado.registro };
}
