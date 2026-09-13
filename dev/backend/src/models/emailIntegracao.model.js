import { get, run } from '../utils/query.js';
import { now } from '../config/database.js';

// Nunca retorna a senha: só metadados + status.
export function findByUsuario(idUsuario) {
  return get(
    `SELECT id_usuario, email_remetente, smtp_user, requer_reconexao, data_atualizacao
     FROM email_integracoes WHERE id_usuario = ?`,
    [idUsuario],
  );
}

export function findCredenciais(idUsuario) {
  return get('SELECT * FROM email_integracoes WHERE id_usuario = ?', [idUsuario]);
}

export function upsert({ idUsuario, emailRemetente, smtpUser, smtpPassEnc }) {
  run(
    `INSERT INTO email_integracoes (id_usuario, email_remetente, smtp_user, smtp_pass_enc, requer_reconexao, data_atualizacao)
     VALUES (?, ?, ?, ?, 0, ?)
     ON CONFLICT(id_usuario) DO UPDATE SET
       email_remetente = excluded.email_remetente,
       smtp_user = excluded.smtp_user,
       smtp_pass_enc = excluded.smtp_pass_enc,
       requer_reconexao = 0,
       data_atualizacao = excluded.data_atualizacao`,
    [idUsuario, emailRemetente, smtpUser, smtpPassEnc, now()],
  );
  return findByUsuario(idUsuario);
}

export function marcarReconexao(idUsuario, requer = true) {
  run('UPDATE email_integracoes SET requer_reconexao = ?, data_atualizacao = ? WHERE id_usuario = ?', [
    requer ? 1 : 0,
    now(),
    idUsuario,
  ]);
  return findByUsuario(idUsuario);
}

export function removeByUsuario(idUsuario) {
  run('DELETE FROM email_integracoes WHERE id_usuario = ?', [idUsuario]);
}
