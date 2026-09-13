import { get, run } from '../utils/query.js';
import { now } from '../config/database.js';

export async function findByUsuario(idUsuario) {
  return await get('SELECT * FROM integracoes_google WHERE id_usuario = ?', [idUsuario]);
}

export async function upsert({ idUsuario, emailGoogle, refreshTokenEnc, accessToken, expiraEm }) {
  await run(
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

export async function updateAccessToken(idUsuario, accessToken, expiraEm) {
  await run('UPDATE integracoes_google SET access_token = ?, expira_em = ? WHERE id_usuario = ?', [
    accessToken ?? null,
    expiraEm ?? null,
    idUsuario,
  ]);
  return findByUsuario(idUsuario);
}

export async function removeByUsuario(idUsuario) {
  await run('DELETE FROM integracoes_google WHERE id_usuario = ?', [idUsuario]);
}
