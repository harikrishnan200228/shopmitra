// ShopMitra website assistant. Adds POST /api/chat to your Express app.
// Needs Node 18+ and the environment variable ANTHROPIC_API_KEY.
// Optional env vars: CONTACT_PHONE, CHAT_MODEL, CHAT_DAILY_LIMIT
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CHAT_MODEL || 'claude-haiku-5-5';
const PHONE = process.env.CONTACT_PHONE || '';
const DAILY = parseInt(process.env.CHAT_DAILY_LIMIT || '500', 10);

// EDIT THE FACTS BELOW so they match your real offer. The bot only knows what is written here.
const SYSTEM = `You are the ShopMitra website assistant.
ShopMitra trains unemployed local youth ("operators") to run AI tools for small neighbourhood shops: WhatsApp and Instagram customer replies, social media posts, offer posters, stock and billing records, and Google review replies. Fashion and textile shops also get new-arrivals catalogues, festival offers, fabric stock sheets and tailor order trackers.
Principle: AI does not replace local people. It makes local people more valuable. The operator is a real person from the shop's own area, and the shop owner approves prices and any unusual request.
Facts you may state:
- The first 2 weeks are a free trial with no commitment.
- After the trial the monthly fee is usually around Rs 2,000 to 5,000 depending on the shop. The final price is confirmed on a call.
- Operators get 2 weeks of training and usually look after 5 to 10 shops.
- Pages on this site: /playbook.html (for shop owners), /jobseeker.html (for operators), /youth.html (fake job offer checker and job search tracker). Sign-up forms are on the home page.
Rules:
- Reply in the same language the user writes in (Malayalam, English or Manglish). Keep replies under 80 words, friendly and simple.
- You are an AI assistant. Say so if asked.
- Never invent prices, discounts, guarantees, income promises, customer names or statistics.
- If you do not know something, or the user wants a discount, a custom deal or has a complaint, say a team member will call, and ask for their name and phone number.
- Invite interested people to leave their name and phone number so the team can call.
- Never ask for OTP, bank details, card numbers or Aadhaar.
- Stay on ShopMitra, small shops and youth jobs. Politely decline other topics.
- Contact: ${PHONE || 'the sign-up form on the home page'}.`;

const hits = new Map();
let day = new Date().toDateString(), count = 0;

module.exports = function (app) {
  app.post('/api/chat', async (req, res) => {
    const fallback = 'Sorry, I cannot answer right now. ' + (PHONE ? 'Please call or WhatsApp ' + PHONE + '.' : 'Please use the sign-up form on this page and we will call you.');
    if (!KEY) return res.status(503).json({ reply: fallback });

    const ip = req.ip, now = Date.now();
    const list = (hits.get(ip) || []).filter((t) => now - t < 3600000);
    list.push(now); hits.set(ip, list);
    if (list.length > 20) return res.status(429).json({ reply: 'You have sent many messages. ' + fallback });
    if (day !== new Date().toDateString()) { day = new Date().toDateString(); count = 0; }
    if (++count > DAILY) return res.status(429).json({ reply: fallback });

    let msgs = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
    msgs = msgs
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }))
      .slice(-8);
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ reply: 'Please type a question.' });

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: ctl.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL, max_tokens: 400, system: SYSTEM, messages: msgs })
      });
      if (!r.ok) { console.error('chat api status', r.status); return res.status(502).json({ reply: fallback }); }
      const data = await r.json();
      const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      res.json({ reply: text || fallback });
    } catch (e) {
      console.error('chat error', e.name);
      res.status(502).json({ reply: fallback });
    } finally { clearTimeout(timer); }
  });
};
