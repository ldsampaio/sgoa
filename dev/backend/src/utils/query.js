import { getPool } from '../config/database.js';

function normalize(params) {
  return params.map((p) => (p === undefined ? null : p));
}

// Postgres usa placeholders numerados ($1, $2, ...). Conversão centralizada:
// o restante do código segue escrevendo `?`.
function toPg(sql) {
  let i = 0;
  return String(sql).replace(/\?/g, () => `$${++i}`);
}

export async function run(sql, params = []) {
  const res = await (await getPool()).query(toPg(sql), normalize(params));
  return { changes: res.rowCount ?? 0 };
}

export async function get(sql, params = []) {
  const res = await (await getPool()).query(toPg(sql), normalize(params));
  return res.rows[0];
}

export async function all(sql, params = []) {
  const res = await (await getPool()).query(toPg(sql), normalize(params));
  return res.rows;
}
