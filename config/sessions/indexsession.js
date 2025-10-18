const express = require('express');
const { query } = require('../../config/db');

const router = express.Router();

async function allocateKey(connQuery) {
  const rows = await connQuery("SELECT id_key FROM pkey WHERE is_used=0 LIMIT 1");
  if (!rows.length) return null;
  const id = rows[0].id_key;
  await connQuery("UPDATE pkey SET is_used=1, note_key='in_use' WHERE id_key=?", [id]);
  return id;
}

async function releaseKey(pkeyId, connQuery) {
  if (!pkeyId) return;
  await connQuery("UPDATE pkey SET is_used=0, note_key='ok' WHERE id_key=?", [pkeyId]);
}

async function guard(req, res, next) {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) return res.status(400).json({ message: 'Missing x-device-id' });

    if (req.session && req.session.pkeyId) {
      await query("UPDATE device_sessions SET last_seen=NOW() WHERE session_id=? AND is_active=1", [req.sessionID]);
      return next();
    }

    const [existing] = await query(
      "SELECT * FROM device_sessions WHERE device_id=? AND is_active=1 LIMIT 1",
      [deviceId]
    );

    if (existing) {
      req.session.pkeyId = existing.pkey_id;
      req.session.deviceId = deviceId;
      await query("UPDATE device_sessions SET session_id=?, last_seen=NOW() WHERE id=?", [req.sessionID, existing.id]);
      return next();
    }

    const pkeyId = await allocateKey(query);
    if (!pkeyId) return res.status(429).json({ message: 'Out of session capacity' });

    req.session.pkeyId = pkeyId;
    req.session.deviceId = deviceId;
    req.session.issuedAt = Date.now();

    await query(
      "INSERT INTO device_sessions (device_id, session_id, pkey_id, last_seen, is_active) VALUES (?,?,?,NOW(),1)",
      [deviceId, req.sessionID, pkeyId]
    );

    next();
  } catch (e) {
    console.error('[session.guard] error', e);
    res.status(500).json({ message: 'Session guard error' });
  }
}

router.get('/check', async (req, res) => {
  const hasKey = !!(req.session && req.session.pkeyId);
  res.json({
    sessionId: req.sessionID,
    deviceId: req.session?.deviceId || null,
    hasKey,
    maxAgeMs: req.session?.cookie?.maxAge ?? null
  });
});

router.post('/release', async (req, res) => {
  try {
    const pkeyId = req.session?.pkeyId;
    const sid = req.sessionID;
    await query("UPDATE device_sessions SET is_active=0 WHERE session_id=?", [sid]);
    await releaseKey(pkeyId, query);
    req.session.destroy(() => res.json({ ok: true }));
  } catch (e) {
    console.error('[session.release] error', e);
    res.status(500).json({ message: 'Release error' });
  }
});

async function reclaimExpiredSessions() {
  try {
    console.log('[reclaimer] running...');
    // A) phiên mồ côi vì mất session-record
    const stale = await query(`
  SELECT ds.id, ds.pkey_id
  FROM device_sessions ds
  LEFT JOIN sessions s ON s.session_id = ds.session_id
  WHERE ds.is_active=1 AND s.session_id IS NULL
`);


    // B) phiên quá hạn theo last_seen (ví dụ 10 phút)
    const staleByLastSeen = await query(`
      SELECT id, pkey_id
      FROM device_sessions
      WHERE is_active=1 AND last_seen < NOW() - INTERVAL 10 MINUTE
    `);

    const all = [...stale, ...staleByLastSeen];
    if (all.length) {
      const ids = [...new Set(all.map(r => r.id))];
      const pids = [...new Set(all.map(r => r.pkey_id))];

      await query(`UPDATE device_sessions SET is_active=0 WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
      await query(`UPDATE pkey SET is_used=0, note_key='ok' WHERE id_key IN (${pids.map(() => '?').join(',')})`, pids);
      console.log(`[reclaimer] released ${pids.length} keys from ${ids.length} sessions`);
    }

    // C) pkey mồ côi: is_used=1 nhưng không bị ai giữ
    await query(`
  UPDATE pkey p
  LEFT JOIN device_sessions ds ON ds.pkey_id = p.id_key AND ds.is_active=1
  SET p.is_used = 0, p.note_key = 'ok'
  WHERE p.is_used = 1 AND ds.pkey_id IS NULL
`);

  } catch (e) {
    console.error('[reclaimer] error', e);
  }
}


module.exports = { guard, router, reclaimExpiredSessions };
