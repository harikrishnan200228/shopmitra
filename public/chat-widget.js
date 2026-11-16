// ShopMitra chat widget. Put in /public and add <script src="/chat-widget.js" defer></script> before </body>.
(function () {
  if (window.__smChat) return; window.__smChat = 1;
  var css = '#smc *{box-sizing:border-box;font-family:"Anek Malayalam",system-ui,-apple-system,"Segoe UI",sans-serif}' +
  '#smc{--bg:#fffdf5;--ink:#1d2a1f;--leaf:#1f5a3a;--tur:#f2b01e;--bub:#f2ecd6;--line:#d9d2b8;position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9999}' +
  '@media (prefers-color-scheme:dark){#smc{--bg:#1b2b22;--ink:#f1ecd8;--leaf:#6fcf97;--bub:#14201a;--line:#33473a}}' +
  '#smc .fab{background:var(--tur);color:#1d2a1f;border:2px solid #1d2a1f;border-radius:30px;padding:12px 18px;font-weight:800;font-size:16px;cursor:pointer;box-shadow:3px 3px 0 #1d2a1f}' +
  '#smc .box{display:none;flex-direction:column;width:min(360px,calc(100vw - 32px));height:min(520px,calc(100vh - 100px));background:var(--bg);color:var(--ink);border:2px solid var(--ink);border-radius:14px;overflow:hidden;box-shadow:5px 5px 0 var(--leaf)}' +
  '#smc.open .box{display:flex}#smc.open .fab{display:none}' +
  '#smc .hd{background:var(--leaf);color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-weight:800}' +
  '@media (prefers-color-scheme:dark){#smc .hd{color:#10261a}}' +
  '#smc .hd button{background:none;border:0;color:inherit;font-size:22px;cursor:pointer;line-height:1}' +
  '#smc .log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}' +
  '#smc .m{padding:8px 12px;border-radius:12px;max-width:85%;white-space:pre-wrap;font-size:15px;line-height:1.45;background:var(--bub)}' +
  '#smc .u{background:var(--leaf);color:#fff;align-self:flex-end}' +
  '@media (prefers-color-scheme:dark){#smc .u{color:#10261a}}' +
  '#smc .f{display:flex;gap:6px;padding:8px;border-top:1px solid var(--line)}' +
  '#smc input,#smc select{font:inherit;font-size:15px;padding:8px 10px;border:2px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);min-width:0}' +
  '#smc .f input{flex:1}#smc .send{background:var(--tur);border:2px solid #1d2a1f;border-radius:6px;font-weight:800;padding:0 12px;cursor:pointer;color:#1d2a1f}' +
  '#smc .lead{display:none;flex-direction:column;gap:6px;padding:8px;border-top:1px solid var(--line)}#smc .lead.on{display:flex}' +
  '#smc .link{background:none;border:0;color:var(--leaf);font-weight:700;text-decoration:underline;cursor:pointer;padding:4px 8px;text-align:left;font-size:14px}' +
  '#smc button:focus-visible,#smc input:focus-visible,#smc select:focus-visible{outline:3px solid var(--leaf);outline-offset:2px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var root = document.createElement('div'); root.id = 'smc';
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  var fab = el('button', 'fab', 'Chat with us'); fab.setAttribute('aria-label', 'Open chat');
  var box = el('div', 'box'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'ShopMitra assistant');
  var hd = el('div', 'hd'); hd.appendChild(el('span', '', 'ShopMitra assistant'));
  var x = el('button', '', '\u00d7'); x.setAttribute('aria-label', 'Close chat'); hd.appendChild(x);
  var log = el('div', 'log'); log.setAttribute('aria-live', 'polite');
  var lead = el('div', 'lead');
  var ln = el('input'); ln.placeholder = 'Your name'; ln.maxLength = 100;
  var lp = el('input'); lp.placeholder = 'Phone / WhatsApp'; lp.type = 'tel'; lp.maxLength = 20;
  var lt = el('select'); [['shop', 'I own a shop'], ['operator', 'I want to be an operator']].forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; lt.appendChild(op); });
  var lb = el('button', 'send', 'Request a call'); lb.style.padding = '8px';
  lead.appendChild(ln); lead.appendChild(lp); lead.appendChild(lt); lead.appendChild(lb);
  var showLead = el('button', 'link', 'Leave my number for a call');
  var f = el('div', 'f'); var inp = el('input'); inp.placeholder = 'Ask a question...'; inp.maxLength = 500;
  var sb = el('button', 'send', 'Send'); f.appendChild(inp); f.appendChild(sb);
  [hd, log, showLead, lead, f].forEach(function (n) { box.appendChild(n); });
  root.appendChild(fab); root.appendChild(box); document.body.appendChild(root);

  var hist = [], busy = false;
  function add(role, text) { var m = el('div', 'm' + (role === 'user' ? ' u' : ''), text); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
  add('assistant', 'Hi! I am the ShopMitra AI assistant. Ask me about the free trial, pricing or becoming an operator. \u0d28\u0d3f\u0d19\u0d4d\u0d19\u0d33\u0d4d\u200d\u0d15\u0d4d\u0d15\u0d4d \u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d24\u0d4d\u0d24\u0d3f\u0d32\u0d41\u0d02 \u0d1a\u0d4b\u0d26\u0d3f\u0d15\u0d4d\u0d15\u0d3e\u0d02.');

  function open() { root.classList.add('open'); inp.focus(); }
  fab.onclick = open; x.onclick = function () { root.classList.remove('open'); fab.focus(); };
  showLead.onclick = function () { lead.classList.toggle('on'); };

  async function send() {
    var t = inp.value.trim(); if (!t || busy) return;
    inp.value = ''; busy = true; add('user', t); hist.push({ role: 'user', content: t });
    var w = add('assistant', 'Typing...');
    try {
      var r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: hist.slice(-8) }) });
      var j = await r.json(); w.textContent = j.reply || 'Sorry, something went wrong.'; hist.push({ role: 'assistant', content: w.textContent });
    } catch (e) { w.textContent = 'Sorry, I cannot connect right now. Please use the sign-up form on this page.'; hist.pop(); }
    busy = false; log.scrollTop = log.scrollHeight;
  }
  sb.onclick = send; inp.onkeydown = function (e) { if (e.key === 'Enter') send(); };

  lb.onclick = async function () {
    var name = ln.value.trim(), phone = lp.value.trim(); if (!name || phone.replace(/\D/g, '').length < 10) { add('assistant', 'Please enter your name and a valid phone number.'); return; }
    lb.disabled = true;
    try {
      var type = lt.value, body = { name: name, phone: phone, need: 'From chatbot', skills: 'From chatbot' };
      var r = await fetch('/api/' + type, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      var j = await r.json(); if (!r.ok) throw new Error(j.error || 'failed');
      add('assistant', 'Thank you, ' + name + '. We will call you within 2 days.'); ln.value = lp.value = ''; lead.classList.remove('on');
    } catch (e) { add('assistant', 'Could not save your number: ' + e.message); }
    lb.disabled = false;
  };
})();
