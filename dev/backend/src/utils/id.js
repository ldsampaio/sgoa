import { randomUUID } from 'node:crypto';

export function uuid() {
  return randomUUID();
}

export function parseId(value) {
  return String(value ?? '');
}