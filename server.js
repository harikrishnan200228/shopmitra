const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const DB = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'leads.json');

fs.mkdirSync(path.dirname(DB), { recursive: true });
const load = () => { try { return JSON.parse(fs.readFileSync(DB, 'utf8')); } catch { return []; } };
const save = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 1));
const clean = (s, n = 200) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// very small in-memory rate limit: 10 submissions per IP per hour
const hits = new Map();
const limited = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  list.push(now); hits.set(ip, list);
  return list.length > 10;
};

const FIELDS = {
  shop: ['name', 'business', 'shopType', 'phone', 'area', 'need'],
  operator: ['name', 'phone', 'area', 'skills', 'availability']
};

app.post('/api/:type(shop|operator)', (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: 'Too many submissions. Try again later.' });
  const type = req.params.type;
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot
  const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, status: 'new', createdAt: new Date().toISOString() };
  FIELDS[type].forEach((f) => (rec[f] = clean(b[f])));
  const phone = rec.phone.replace(/[^\d+]/g, '');
  if (!rec.name || phone.length < 10) return res.status(400).json({ error: 'Enter your name and a valid phone number.' });
  rec.phone = phone;
  const all = load(); all.push(rec); save(all);
  res.json({ ok: true });
});

const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const pass = Buffer.from(h.replace('Basic ', ''), 'base64').toString().split(':').slice(1).join(':');
  if (pass === ADMIN_PASSWORD) return next();
  res.set('WWW-Authenticate', 'Basic realm="ShopMitra admin"').status(401).send('Login required');
};

app.get('/admin', auth, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/api/admin/leads', auth, (req, res) => res.json(load().reverse()));
app.patch('/api/admin/leads/:id', auth, express.json(), (req, res) => {
  const all = load();
  const lead = all.find((l) => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Not found' });
  const s = clean(req.body.status, 20);
  if (!['new', 'contacted', 'trial', 'paying', 'closed'].includes(s)) return res.status(400).json({ error: 'Bad status' });
  lead.status = s; save(all); res.json(lead);
});
app.get('/api/admin/export.csv', auth, (req, res) => {
  const rows = load();
  const cols = ['createdAt', 'type', 'status', 'name', 'business', 'shopType', 'phone', 'area', 'need', 'skills', 'availability'];
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n');
  res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=shopmitra-leads.csv' }).send(csv);
});

app.get('/health', (req, res) => res.send('ok'));
app.listen(PORT, () => console.log('ShopMitra running on port ' + PORT));
