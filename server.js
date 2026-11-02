const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const DB = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'leads.json');
const DISTRICTS = ['Thiruvananthapuram','Kollam','Pathanamthitta','Alappuzha','Kottayam','Idukki','Ernakulam','Thrissur','Palakkad','Malappuram','Kozhikode','Wayanad','Kannur','Kasaragod'];

fs.mkdirSync(path.dirname(DB), { recursive: true });
const load = () => { try { return JSON.parse(fs.readFileSync(DB, 'utf8')); } catch { return []; } };
const save = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 1));
const clean = (s, n = 200) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const km = (a, b, c, d) => { const r = (x) => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };

app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const hits = new Map();
const limited = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  list.push(now); hits.set(ip, list);
  return list.length > 20;
};

const FIELDS = {
  shop: ['name', 'business', 'shopType', 'phone', 'district', 'area', 'need'],
  operator: ['name', 'phone', 'district', 'area', 'skills', 'availability'],
  task: ['name', 'business', 'phone', 'district', 'title', 'details'],
  application: ['name', 'phone', 'taskId']
};

app.post('/api/:type(shop|operator|task|application)', (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: 'Too many submissions. Try again later.' });
  const type = req.params.type, b = req.body || {};
  if (b.website) return res.json({ ok: true });
  const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, status: 'new', approved: false, createdAt: new Date().toISOString() };
  FIELDS[type].forEach((f) => (rec[f] = clean(b[f], f === 'details' || f === 'need' ? 400 : 200)));
  const phone = rec.phone.replace(/[^\d+]/g, '');
  if (!rec.name || phone.length < 10) return res.status(400).json({ error: 'Enter your name and a valid phone number.' });
  rec.phone = phone;
  if (!DISTRICTS.includes(rec.district)) rec.district = '';
  const lat = parseFloat(b.lat), lng = parseFloat(b.lng);
  if (type !== 'application' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) { rec.lat = +lat.toFixed(2); rec.lng = +lng.toFixed(2); } // ~1 km precision
  const all = load();
  if (type === 'task') {
    rec.pay = Math.min(1e6, parseInt(b.pay) || 0);
    if (!rec.title || rec.pay < 1) return res.status(400).json({ error: 'Add a task title and the pay in rupees.' });
  }
  if (type === 'application') {
    const t = all.find((x) => x.id === rec.taskId && x.type === 'task' && x.approved);
    if (!t) return res.status(400).json({ error: 'This task is no longer available.' });
    rec.taskTitle = t.title; rec.taskPay = t.pay;
  }
  all.push(rec); save(all);
  res.json({ ok: true });
});

// Public, privacy-safe lists: no phone numbers, only approved records
app.get('/api/tasks', (req, res) => {
  const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng), here = isFinite(lat) && isFinite(lng);
  let t = load().filter((x) => x.type === 'task' && x.approved && x.status !== 'closed').map((x) => ({
    id: x.id, title: x.title, details: x.details, pay: x.pay, business: x.business, district: x.district,
    distance: here && x.lat != null ? Math.round(km(lat, lng, x.lat, x.lng) * 10) / 10 : null
  }));
  if (here) t.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
  res.json(t.slice(0, 60));
});
app.get('/api/shops', (req, res) => {
  const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng), here = isFinite(lat) && isFinite(lng);
  let s = load().filter((x) => x.type === 'shop' && x.approved && x.status !== 'closed').map((x) => ({
    business: x.business || x.name, shopType: x.shopType, area: x.area, district: x.district,
    distance: here && x.lat != null ? Math.round(km(lat, lng, x.lat, x.lng) * 10) / 10 : null
  }));
  if (here) s.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
  res.json(s.slice(0, 60));
});
app.get('/api/stats', (req, res) => {
  const all = load(), perDistrict = {};
  all.filter((x) => x.type === 'operator' && x.status !== 'closed' && x.district).forEach((x) => (perDistrict[x.district] = (perDistrict[x.district] || 0) + 1));
  const tasks = all.filter((x) => x.type === 'task' && x.approved && x.status !== 'closed');
  res.json({ jobseekers: perDistrict, openTasks: tasks.length, avgPay: tasks.length ? Math.round(tasks.reduce((a, x) => a + x.pay, 0) / tasks.length) : 0, districts: DISTRICTS });
});

const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const pass = Buffer.from(h.replace('Basic ', ''), 'base64').toString().split(':').slice(1).join(':');
  if (pass === ADMIN_PASSWORD) return next();
  res.set('WWW-Authenticate', 'Basic realm="ShopMitra admin"').status(401).send('Login required');
};
app.get('/admin', auth, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/api/admin/leads', auth, (req, res) => res.json(load().reverse()));
app.get('/api/admin/summary', auth, (req, res) => {
  const done = load().filter((x) => x.type === 'application' && x.status === 'completed');
  const total = done.reduce((a, x) => a + (x.taskPay || 0), 0);
  res.json({ completed: done.length, total, platform: Math.round(total * 0.3), workers: Math.round(total * 0.7) });
});
app.patch('/api/admin/leads/:id', auth, (req, res) => {
  const all = load(), lead = all.find((l) => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Not found' });
  if (req.body.status !== undefined) {
    const s = clean(req.body.status, 20);
    if (!['new', 'contacted', 'trial', 'paying', 'completed', 'closed'].includes(s)) return res.status(400).json({ error: 'Bad status' });
    lead.status = s;
  }
  if (typeof req.body.approved === 'boolean') lead.approved = req.body.approved;
  save(all); res.json(lead);
});
app.get('/api/admin/export.csv', auth, (req, res) => {
  const cols = ['createdAt', 'type', 'status', 'approved', 'name', 'business', 'shopType', 'phone', 'district', 'area', 'title', 'pay', 'taskTitle', 'taskPay', 'need', 'skills', 'availability'];
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = [cols.join(',')].concat(load().map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n');
  res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=shopmitra-leads.csv' }).send(csv);
});
// Public: how many shops are waiting vs operators ready, per district (no personal data)
app.get('/api/demand', (req, res) => {
  const all = load().filter((l) => l.status !== 'closed');
  const rows = DISTRICTS.map((d) => ({
    district: d,
    shops: all.filter((l) => l.type === 'shop' && l.district === d).length,
    operators: all.filter((l) => l.type === 'operator' && l.district === d).length
  })).filter((r) => r.shops || r.operators);
  rows.sort((a, b) => (b.shops - b.operators) - (a.shops - a.operators));
  res.json(rows);
});

// Admin: "pods" = up to 8 nearby shops grouped under one operator in the same district
app.get('/api/admin/pods', auth, (req, res) => {
  const all = load();
  const cap = (o) => (o.availability.startsWith('Full') ? 8 : o.availability.startsWith('Part') ? 5 : 3);
  const out = [];
  DISTRICTS.forEach((d) => {
    const shops = all.filter((l) => l.type === 'shop' && l.district === d && l.status !== 'closed').sort((a, b) => a.area.localeCompare(b.area));
    const ops = all.filter((l) => l.type === 'operator' && l.district === d && l.status !== 'closed')
      .sort((a, b) => (a.availability.startsWith('Full') ? 0 : 1) - (b.availability.startsWith('Full') ? 0 : 1));
    if (!shops.length && !ops.length) return;
    const pods = ops.map((o) => ({ operator: o, shops: [] }));
    const waiting = [];
    let i = 0;
    shops.forEach((s) => {
      while (i < pods.length && pods[i].shops.length >= cap(pods[i].operator)) i++;
      if (i < pods.length) pods[i].shops.push(s); else waiting.push(s);
    });
    out.push({ district: d, pods, waiting });
  });
  res.json(out);
});

app.get('/health', (req, res) => res.send('ok'));
app.listen(PORT, () => console.log('ShopMitra running on port ' + PORT));
