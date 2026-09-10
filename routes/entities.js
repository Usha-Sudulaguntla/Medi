import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

/**
 * Builds a CRUD router for a table, mirroring Base44's
 * entities.X.list()/.filter()/.create()/.update()/.delete() shape closely
 * enough that the frontend's data-fetching calls need no changes.
 *
 * @param {string} table - Postgres table name
 * @param {string[]} columns - whitelisted, writable columns
 * @param {object} [opts]
 * @param {(body: object, req) => Promise<object>} [opts.beforeCreate]
 * @param {boolean} [opts.publicRead] - if true, GET routes skip auth (e.g. the
 *   doctor-signup gate needs to check the Doctor table before the visitor has
 *   a token)
 * @param {string[]} [opts.writeRoles] - if set, only these `req.user.role`
 *   values may POST/PUT/DELETE (GET is governed by publicRead/requireAuth only)
 */
export function entityRouter(table, columns, opts = {}) {
  const router = Router();

  const readMiddleware = opts.publicRead ? [] : [requireAuth];
  const writeMiddleware = [requireAuth, ...(opts.writeRoles ? [requireRole(...opts.writeRoles)] : [])];

  // GET /?patient_id=...&status=...&sort=-created_date&limit=100
  // `sort` mirrors Base44's convention: "-field" = descending, "field" = ascending.
  router.get('/', ...readMiddleware, async (req, res) => {
    const { sort, limit, ...filterParams } = req.query;
    const filters = Object.entries(filterParams).filter(([k]) => columns.includes(k));
    const where = filters.map(([k], i) => `${k} = $${i + 1}`).join(' AND ');
    const values = filters.map(([, v]) => v);

    let orderBy = 'created_at DESC';
    if (typeof sort === 'string' && sort) {
      const desc = sort.startsWith('-');
      const field = desc ? sort.slice(1) : sort;
      const col = field === 'created_date' ? 'created_at' : field;
      if (columns.includes(col) || col === 'created_at') orderBy = `${col} ${desc ? 'DESC' : 'ASC'}`;
    }

    const limitClause = limit ? `LIMIT ${Math.min(parseInt(limit, 10) || 100, 500)}` : '';
    const sql = `SELECT *, created_at AS created_date FROM ${table} ${where ? `WHERE ${where}` : ''} ORDER BY ${orderBy} ${limitClause}`;
    const result = await query(sql, values);
    res.json(result.rows);
  });

  router.get('/:id', ...readMiddleware, async (req, res) => {
    const result = await query(`SELECT *, created_at AS created_date FROM ${table} WHERE id = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  });

  router.post('/', ...writeMiddleware, async (req, res) => {
    let body = req.body || {};
    if (opts.beforeCreate) body = await opts.beforeCreate(body, req);

    const keys = Object.keys(body).filter((k) => columns.includes(k));
    if (!keys.length) return res.status(400).json({ error: 'No valid fields provided' });

    const values = keys.map((k) => {
      const v = body[k];
      // jsonb columns (socrates, ayush_assessment, abnormal_values, ...) need an
      // explicit JSON string — pg serializes raw JS arrays/objects as Postgres's
      // own array syntax instead, which Postgres then rejects as invalid JSON.
      return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
    });
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *, created_at AS created_date`;
    const result = await query(sql, values);
    res.status(201).json(result.rows[0]);
  });

  router.put('/:id', ...writeMiddleware, async (req, res) => {
    const body = req.body || {};
    const keys = Object.keys(body).filter((k) => columns.includes(k));
    if (!keys.length) return res.status(400).json({ error: 'No valid fields provided' });

    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = keys.map((k) => {
      const v = body[k];
      // jsonb columns (socrates, ayush_assessment, abnormal_values, ...) need an
      // explicit JSON string — pg serializes raw JS arrays/objects as Postgres's
      // own array syntax instead, which Postgres then rejects as invalid JSON.
      return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
    });
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *, created_at AS created_date`;
    const result = await query(sql, [...values, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  });

  router.delete('/:id', ...writeMiddleware, async (req, res) => {
    const result = await query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });

  return router;
}