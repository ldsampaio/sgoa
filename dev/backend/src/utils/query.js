import { isPostgres, getPool, getSqlite } from '../config/database.js';

function normalize(params) {
  return params.map((p) => (p === undefined ? null : p));
}

// Postgres usa placeholders numerados ($1, $2, ...). Conversão centralizada:
// o restante do código segue escrevendo `?`, válido nos dois drivers.
function toPg(sql) {
  let i = 0;
  return String(sql).replace(/\?/g, () => `$${++i}`);
}

export async function run(sql, params = []) {
  const p = normalize(params);
  if (isPostgres()) {
    const res = await (await getPool()).query(toPg(sql), p);
    return { changes: res.rowCount ?? 0 };
  }
  const result = getSqlite().prepare(sql).run(...p);
  return { changes: result.changes };
}

export async function get(sql, params = []) {
  const p = normalize(params);
  if (isPostgres()) {
    const res = await (await getPool()).query(toPg(sql), p);
    return res.rows[0];
  }
  return getSqlite().prepare(sql).get(...p);
}

export async function all(sql, params = []) {
  const p = normalize(params);
  if (isPostgres()) {
    const res = await (await getPool()).query(toPg(sql), p);
    return res.rows;
  }
  return getSqlite().prepare(sql).all(...p);
}
