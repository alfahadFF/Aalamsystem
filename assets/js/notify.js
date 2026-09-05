/* ============================================================
   notify.js — الإشعارات الصوتية والوميض للطلبات الأونلاين
   - صوت "ديم" مُصنَّع عبر Web Audio (يعمل دون إنترنت، بلا ملفات).
   - يتتبع الطلبات المُبلَّغ عنها والمُشاهَدة في localStorage.
   - يومض زر «أونلاين» (.online-ot-btn) عند وصول طلب جديد.
   - يعمل عبر التبويبات (storage event).
   ============================================================ */
window.Notify = (function () {
  const LS_NOTIFIED = 'alfaprosys_notified_v1';
  const LS_SEEN     = 'alfaprosys_seen_v1';
  const LS_MUTED    = 'alfaprosys_muted_v1';
  let ctx = null, timer = null;

  function audio() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // نغمة تنبيه من طبقتين
  function chime() {
    const c = audio(); if (!c) return;
    const now = c.currentTime;
    [880, 1174.66].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.3,  now + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.42);
      o.connect(g).connect(c.destination);
      o.start(now + i * 0.18); o.stop(now + i * 0.18 + 0.5);
    });
  }

  const get = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  function isMuted(){ try { return localStorage.getItem(LS_MUTED) === '1'; } catch (e) { return false; } }
  function setMuted(m){ try { localStorage.setItem(LS_MUTED, m ? '1' : '0'); } catch (e) {} }

  const orders  = () => (window.DEMO_DATA && window.DEMO_DATA.online_orders) || [];
  const newIds  = () => orders().filter(o => o.status === 'new').map(o => o.id);

  function blink(on) {
    document.querySelectorAll('.online-ot-btn').forEach(el => el.classList.toggle('blink', on));
  }

  // silent=true: تعليم الموجود عند الإقلاع دون صوت
  function check(silent) {
    const notified = get(LS_NOTIFIED);
    const fresh = newIds().filter(id => !notified.includes(id));
    if (fresh.length) {
      if (!silent && !isMuted()) chime();
      set(LS_NOTIFIED, notified.concat(fresh));
    }
    const unseen = newIds().filter(id => !get(LS_SEEN).includes(id));
    blink(unseen.length > 0);
    return fresh.length;
  }

  function markAllSeen() {
    const cur = newIds();
    set(LS_SEEN, Array.from(new Set(cur.concat(get(LS_SEEN)))));
    blink(false);
  }

  function init(opts) {
    opts = opts || {};
    check(true);                    // علّم الموجود صامتًا
    if (opts.markSeenOnLoad) markAllSeen();
    // استئناف الصوت بعد أول تفاعل (سياسة المتصفحات)
    const resume = () => { audio(); window.removeEventListener('pointerdown', resume); };
    window.addEventListener('pointerdown', resume);
    clearInterval(timer);
    timer = setInterval(() => check(false), 4000);
    window.addEventListener('storage', e => { if (e.key && e.key.indexOf('alfaprosys') === 0) check(false); });
  }

  return { init, check, chime, ping: () => { if (!isMuted()) chime(); }, isMuted, setMuted, markAllSeen, blink };
})();
