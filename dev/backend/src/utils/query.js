import { db } from '../config/database.js';

function normalize(params) {
  return params.map((p) => (p === undefined ? null : p));
}

export function run(sql, params = []) {
  const stmt = db.prepare(sql);
  const result = stmt.run(...normalize(params));
  return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
}

export function get(sql, params = []) {
  return db.prepare(sql).get(...normalize(params));
}

export function all(sql, params = []) {
  return db.prepare(sql).all(...normalize(params));
}