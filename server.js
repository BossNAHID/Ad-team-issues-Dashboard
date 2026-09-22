require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== DATABASE ====================
// For local testing without a Turso account, this falls back to a local
// SQLite file (file:local.db). In production, set TURSO_DATABASE_URL and
// TURSO_AUTH_TOKEN (from `turso db show` / `turso db tokens create`).
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consignment_id TEXT NOT NULL,
      merchant TEXT NOT NULL,
      issue_tag TEXT NOT NULL,
      details TEXT NOT NULL,
      remarks TEXT DEFAULT '',
      in_process INTEGER DEFAULT 0,
      solved INTEGER DEFAULT 0,
      issue_date TEXT NOT NULL,
      issue_time TEXT NOT NULL,
      created_at TEXT NOT NULL,
      responded_by TEXT,
      responded_at TEXT
    )
  `);

  // Safe migration for databases created before responded_by/responded_at existed.
  // ALTER TABLE ADD COLUMN has no "IF NOT EXISTS" in SQLite, so we probe first.
  const cols = await db.execute(`PRAGMA table_info(issues)`);
  const colNames = cols.rows.map((r) => r.name);
  if (!colNames.includes('responded_by')) {
    await db.execute(`ALTER TABLE issues ADD COLUMN responded_by TEXT`);
  }
  if (!colNames.includes('responded_at')) {
    await db.execute(`ALTER TABLE issues ADD COLUMN responded_at TEXT`);
  }
}

// ==================== HELPERS ====================
function pad(n, len) {
  return String(n).padStart(len, '0');
}

function makeTicketId(id, isoDate) {
  const d = new Date(isoDate);
  const mm = pad(d.getMonth() + 1, 2);
  const dd = pad(d.getDate(), 2);
  return `CB-${mm}${dd}-${pad(id, 5)}`;
}

function rowToIssue(row) {
  return {
    id: row.id,
    ticketId: makeTicketId(row.id, row.issue_date),
    date: row.issue_date,
    timestamp: row.issue_time,
    consignmentId: row.consignment_id,
    merchant: row.merchant,
    issueTag: row.issue_tag,
    details: row.details,
    remarks: row.remarks || '',
    inProcess: !!row.in_process,
    solved: !!row.solved,
    respondedBy: row.responded_by || null,
    respondedAt: row.responded_at || null,
  };
}

function nowParts() {
  const now = new Date();
  // Render runs the server clock in UTC, but issue_date/issue_time are
  // treated everywhere downstream (dashboard "Submitted" column, ticket
  // IDs, date-range filters, CSV exports) as Asia/Dhaka (UTC+6) local
  // wall-clock values. Shift the epoch by +6h and read it back with the
  // UTC getters to get correct Dhaka date/time regardless of the server's
  // own timezone — same technique the dashboard's office-hours math uses.
  const dhaka = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const pad2 = (n) => String(n).padStart(2, '0');
  const date = `${dhaka.getUTCFullYear()}-${pad2(dhaka.getUTCMonth() + 1)}-${pad2(dhaka.getUTCDate())}`;
  const time = `${pad2(dhaka.getUTCHours())}:${pad2(dhaka.getUTCMinutes())}:${pad2(dhaka.getUTCSeconds())}`;
  return { date, time, iso: now.toISOString() };
}

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// List all issues (dashboard reads this)
app.get('/api/issues', async (req, res) => {
  try {
    const result = await db.execute(
      'SELECT * FROM issues ORDER BY created_at DESC'
    );
    const issues = result.rows.map(rowToIssue);
    res.json(issues);
  } catch (err) {
    console.error('GET /api/issues error:', err);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Create a new issue (form submits here; dashboard's "Raise Issue" also uses this)
app.post('/api/issues', async (req, res) => {
  try {
    const consignmentId = (req.body.consignmentId || '').trim();
    const merchant = (req.body.merchantName || req.body.merchant || '').trim();
    const issueTag = (req.body.issueTag || '').trim();
    const details = (req.body.issueDetails || req.body.details || '').trim();

    if (!consignmentId || !merchant || !issueTag || !details) {
      return res.status(400).json({ error: 'consignmentId, merchantName, issueTag, and issueDetails are all required' });
    }

    const { date, time, iso } = nowParts();

    const result = await db.execute({
      sql: `INSERT INTO issues (consignment_id, merchant, issue_tag, details, remarks, in_process, solved, issue_date, issue_time, created_at)
            VALUES (?, ?, ?, ?, '', 0, 0, ?, ?, ?)`,
      args: [consignmentId, merchant, issueTag, details, date, time, iso],
    });

    const newId = Number(result.lastInsertRowid);
    const row = await db.execute({ sql: 'SELECT * FROM issues WHERE id = ?', args: [newId] });
    res.status(201).json(rowToIssue(row.rows[0]));
  } catch (err) {
    console.error('POST /api/issues error:', err);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// Update status (dashboard's Open / In Progress / Resolved buttons)
app.patch('/api/issues/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, respondedBy } = req.body;
    if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'status must be Open, In Progress, or Resolved' });
    }
    const inProcess = status === 'In Progress' ? 1 : 0;
    const solved = status === 'Resolved' ? 1 : 0;

    if (respondedBy && respondedBy.trim()) {
      await db.execute({
        sql: 'UPDATE issues SET in_process = ?, solved = ?, responded_by = ?, responded_at = ? WHERE id = ?',
        args: [inProcess, solved, respondedBy.trim(), nowParts().iso, id],
      });
    } else {
      await db.execute({
        sql: 'UPDATE issues SET in_process = ?, solved = ? WHERE id = ?',
        args: [inProcess, solved, id],
      });
    }

    const row = await db.execute({ sql: 'SELECT * FROM issues WHERE id = ?', args: [id] });
    if (row.rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    res.json(rowToIssue(row.rows[0]));
  } catch (err) {
    console.error('PATCH /api/issues/:id/status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Optional: update remarks
app.patch('/api/issues/:id/remarks', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const remarks = (req.body.remarks || '').toString();
    await db.execute({ sql: 'UPDATE issues SET remarks = ? WHERE id = ?', args: [remarks, id] });
    const row = await db.execute({ sql: 'SELECT * FROM issues WHERE id = ?', args: [id] });
    if (row.rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    res.json(rowToIssue(row.rows[0]));
  } catch (err) {
    console.error('PATCH /api/issues/:id/remarks error:', err);
    res.status(500).json({ error: 'Failed to update remarks' });
  }
});

// Serve the form and dashboard pages explicitly
app.get('/form', (req, res) => res.sendFile(path.join(__dirname, 'public', 'form.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`CarryBee server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
