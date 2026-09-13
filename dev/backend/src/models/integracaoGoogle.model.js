import { get, run } from '../utils/query.js';
import { now } from '../config/database.js';

export function findByUsuario(idUsuario) {
  return get('SELECT * FROM integracoes_google WHERE id_usuario = ?', [idUsuario]);
}

export function upsert({ idUsuario, emailGoogle, refreshTokenEnc, accessToken, expiraEm }) {
  run(
    `INSERT INTO integracoes_google (id_usuario, email_google, refresh_token_enc, access_token, expira_em, data_conexao)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id_usuario) DO UPDATE SET
       email_google = excluded.email_google,
       refresh_token_enc = excluded.refresh_token_enc,
       access_token = excluded.access_token,
       expira_em = excluded.expira_em`,
    [idUsuario, emailGoogle, refreshTokenEnc, accessToken ?? null, expiraEm ?? null, now()],
  );
  return findByUsuario(idUsuario);
}

export function updateAccessToken(idUsuario, accessToken, expiraEm) {
  run('UPDATE integracoes_google SET access_token = ?, expira_em = ? WHERE id_usuario = ?', [
    accessToken ?? null,
    expiraEm ?? null,
    idUsuario,
  ]);
  return findByUsuario(idUsuario);
}

export function removeByUsuario(idUsuario) {
  run('DELETE FROM integracoes_google WHERE id_usuario = ?', [idUsuario]);
}
