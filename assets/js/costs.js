/* ================================================================
   costs.js — شاشة التكاليف وهوامش الربح — alfaprosys
   يحسب تكلفة كل صنف من وصفات المواد الخام (بعكس اتجاه القراءة)،
   ويعرض الهوامش ومصفوفة هندسة المنيو وتفاصيل تكلفة كل صنف.
   ================================================================ */

const DATA      = window.DEMO_DATA;
let menuItems, inventory, categories;
function bindCostData() {
  menuItems  = DATA.items      || [];
  inventory  = DATA.inventory  || [];
  categories = DATA.categories || [];
  rebuildRecipes();
}

/* ── أدوات مساعدة ── */
function fmtMoney(n){ return fmtNum(n) + ' ل.س'; }
/* ================================================================
   التنقل
   ================================================================ */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'costs';
const navLink = window.AlfaNav.linker(CURRENT);
let navOpen = false;
function toggleNav(){
  navOpen = !navOpen;
  document.getElementById('mgrMobileNav')?.classList.toggle('expanded', navOpen);
  document.getElementById('mgrNavScrim')?.classList.toggle('show', navOpen);
}
function closeNav(){
  navOpen = false;
  document.getElementById('mgrMobileNav')?.classList.remove('expanded');
  document.getElementById('mgrNavScrim')?.classList.remove('show');
}
function buildNav(){
  const side = document.getElementById('sideNav');
  const mob  = document.getElementById('mobileNavGrid');
  if(side) side.innerHTML = MGR_NAV.map(n=>navLink(n,false)).join('');
  if(mob)  mob.innerHTML  = MGR_NAV.map(n=>navLink(n,true)).join('');
}

/* ================================================================
   حساب التكلفة: تكلفة الصنف = Σ (تكلفة المادة الخام × الكمية)
   (الوصفات مخزّنة على المواد الخام وتشير إلى الأصناف — نعكسها عند القراءة)
   ================================================================ */
const recipeCost = {};
const recipeLines = {};   // item_id -> [{mat, qty, unitCost, total}]
function rebuildRecipes(){
  Object.keys(recipeCost).forEach(function (k) { delete recipeCost[k]; });
  Object.keys(recipeLines).forEach(function (k) { delete recipeLines[k]; });
  (inventory || []).forEach(function (inv) {
    (inv.recipe || []).forEach(function (line) {
      const unit = inv.cost_per_unit || 0;
      const total = unit * (line.qty || 0);
      recipeCost[line.item_id] = (recipeCost[line.item_id] || 0) + total;
      (recipeLines[line.item_id] = recipeLines[line.item_id] || []).push({
        mat: inv.name, qty: line.qty, unit: unit, total: total
      });
    });
  });
}
function effCost(item){
  if(item.cost_mode === 'manual' && Number(item.cost_manual) > 0) return Number(item.cost_manual);
  return recipeCost[item.id] || 0;
}

/* ── حالة الفلاتر ── */
let catFilter   = 'all';
let searchTerm  = '';
let sortKey     = 'margin_desc';
let onlyNoCost  = false;
let selectedId  = null;

/* ── التصنيف الهندسي (هامش × شعبية) ── */
function computeAverages(){
  const withCost = menuItems.filter(i => effCost(i) > 0);
  const avgMargin = withCost.length
    ? withCost.reduce((s,i)=>s+marginPct(i),0) / withCost.length : 0;
  const avgPop = menuItems.length
    ? menuItems.reduce((s,i)=>s+(i.order_count||0),0) / menuItems.length : 0;
  return { avgMargin, avgPop };
}
function marginPct(item){
  const c = effCost(item);
  if(!item.price) return 0;
  return Math.round(((item.price - c) / item.price) * 100);
}
function engineering(item, avg){
  if(effCost(item) <= 0) return { key:'none', label:'بدون تكلفة', icon:'⚪' };
  const hiM = marginPct(item) >= avg.avgMargin;
  const hiP = (item.order_count||0) >= avg.avgPop && (item.order_count||0) > 0;
  if(hiM && hiP) return { key:'star',   label:'نجمة',      icon:'⭐' };
  if(!hiM && hiP)return { key:'plow',   label:'حصان عمل',  icon:'🐴' };
  if(hiM && !hiP)return { key:'puzzle', label:'لغز',       icon:'🧩' };
  return            { key:'dog',   label:'عبء',       icon:'🐢' };
}

/* ================================================================
   العرض
   ================================================================ */
function filteredItems(){
  let list = menuItems.slice();
  if(catFilter !== 'all') list = list.filter(i => i.category_id === catFilter);
  if(searchTerm) list = list.filter(i => (i.name||'').includes(searchTerm));
  if(onlyNoCost) list = list.filter(i => effCost(i) <= 0);

  const cmp = {
    margin_desc:(a,b)=>marginPct(b)-marginPct(a),
    margin_asc :(a,b)=>marginPct(a)-marginPct(b),
    cost_desc  :(a,b)=>effCost(b)-effCost(a),
    pop_desc   :(a,b)=>(b.order_count||0)-(a.order_count||0),
    name       :(a,b)=>(a.name||'').localeCompare(b.name||'','ar'),
  }[sortKey];
  return list.sort(cmp);
}

function renderStats(){
  const withCost = menuItems.filter(i=>effCost(i)>0);
  const noCost   = menuItems.length - withCost.length;
  const avg = computeAverages();
  let best=null, worst=null;
  withCost.forEach(i=>{
    if(!best || marginPct(i)>marginPct(best)) best=i;
    if(!worst|| marginPct(i)<marginPct(worst)) worst=i;
  });
  document.getElementById('costStats').innerHTML = `
    <div class="mgr-stat-card"><div class="mgr-stat-lbl">متوسط الهامش</div>
      <div class="mgr-stat-val" style="color:#15803D">${Math.round(avg.avgMargin)}%</div>
      <div class="mgr-stat-sub">عبر ${withCost.length} صنفاً مُسعّراً</div></div>
    <div class="mgr-stat-card"><div class="mgr-stat-lbl">أصناف بتكلفة</div>
      <div class="mgr-stat-val">${withCost.length}<span style="font-size:14px;color:var(--text-muted)">/${menuItems.length}</span></div>
      <div class="mgr-stat-sub">محسوبة من الوصفات أو يدوياً</div></div>
    <div class="mgr-stat-card"><div class="mgr-stat-lbl">بلا تكلفة</div>
      <div class="mgr-stat-val" style="color:#B45309">${noCost}</div>
      <div class="mgr-stat-sub">تحتاج وصفة أو تكلفة يدوية</div></div>
    <div class="mgr-stat-card"><div class="mgr-stat-lbl">أعلى هامش</div>
      <div class="mgr-stat-val" style="color:#15803D">${best?marginPct(best)+'%':'—'}</div>
      <div class="mgr-stat-sub">${best?e(best.name):'—'}</div></div>
    <div class="mgr-stat-card"><div class="mgr-stat-lbl">أدنى هامش</div>
      <div class="mgr-stat-val" style="color:#991B1B">${worst?marginPct(worst)+'%':'—'}</div>
      <div class="mgr-stat-sub">${worst?e(worst.name):'—'}</div></div>
  `;

  const banner = document.getElementById('noCostBanner');
  if(noCost > 0){
    banner.style.display = 'flex';
    banner.innerHTML = `<span>⚠️</span><span>${noCost} صنفاً بدون تكلفة — الهامش غير محسوب لها.</span>
      <button onclick="setOnlyNoCost(true);document.getElementById('onlyNoCost').checked=true;">عرضها</button>`;
  } else banner.style.display = 'none';
}

function renderMatrix(){
  const avg = computeAverages();
  const cells = { star:0, plow:0, puzzle:0, dog:0 };
  menuItems.forEach(i=>{ const c=engineering(i,avg); if(cells[c.key]!==undefined) cells[c.key]++; });
  document.getElementById('costMatrix').innerHTML = `
    <div class="cost-mx-cell cost-mx-star"><div class="cost-mx-head">⭐ نجوم</div>
      <div class="cost-mx-desc">هامش عالٍ + مبيع عالٍ — روّج لها ووفّرها دائماً</div>
      <div class="cost-mx-count">${cells.star}</div></div>
    <div class="cost-mx-cell cost-mx-plow"><div class="cost-mx-head">🐴 خيول عمل</div>
      <div class="cost-mx-desc">مبيع عالٍ + هامش منخفض — ارفع سعرها أو خفّض تكلفتها</div>
      <div class="cost-mx-count">${cells.plow}</div></div>
    <div class="cost-mx-cell cost-mx-puzzle"><div class="cost-mx-head">🧩 ألغاز</div>
      <div class="cost-mx-desc">هامش عالٍ + مبيع منخفض — سوّقها وأبرِزها في المنيو</div>
      <div class="cost-mx-count">${cells.puzzle}</div></div>
    <div class="cost-mx-cell cost-mx-dog"><div class="cost-mx-head">🐢 أعباء</div>
      <div class="cost-mx-desc">هامش منخفض + مبيع منخفض — رشّحها للحذف أو إعادة التسعير</div>
      <div class="cost-mx-count">${cells.dog}</div></div>
  `;
}

function renderCatRow(){
  const chips = [{id:'all',name:'الكل',icon:'🍽️'}, ...categories].map(c=>`
    <button class="cost-cat ${catFilter===c.id?'active':''}" onclick="setCostCat('${e(c.id)}')">${c.icon||''} ${e(c.name)}</button>`).join('');
  document.getElementById('costCatRow').innerHTML = chips;
}

function pctColor(p){
  if(p < 0)  return '#991B1B';
  if(p < 60) return '#B45309';
  return '#15803D';
}

function renderTable(){
  const avg = computeAverages();
  const list = filteredItems();
  const body = document.getElementById('costBody');
  if(!list.length){
    body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">لا توجد أصناف مطابقة.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(i=>{
    const c = Math.round(effCost(i));
    const m = i.price - c;
    const p = marginPct(i);
    const eng = engineering(i, avg);
    const costCell = c>0 ? fmtNum(c) : '<span class="cost-nocost">بدون وصفة</span>';
    const marginCls = p<0?'cost-margin-neg':(p<60?'cost-margin-low':'cost-margin-pos');
    return `
    <tr>
      <td class="cost-name-cell">${e(i.name)}<span class="cost-name-sub">${e(i.category_name||'')}</span></td>
      <td class="cost-num">${fmtNum(i.price)}</td>
      <td class="cost-num">${costCell}</td>
      <td class="cost-num ${marginCls}">${c>0?fmtNum(m):'—'}</td>
      <td><div class="cost-pct-bar">
          <div class="cost-pct-track"><div class="cost-pct-fill" style="width:${Math.max(0,Math.min(100,p))}%;background:${pctColor(p)}"></div></div>
          <span class="cost-num ${marginCls}">${c>0?p+'%':'—'}</span></div></td>
      <td class="cost-num">${i.order_count||0}</td>
      <td><span class="cost-eng ${eng.key}">${eng.icon} ${eng.label}</span></td>
      <td>
        <button class="cost-row-btn" title="تفاصيل التكلفة" onclick="openCostDetail('${e(i.id)}')">🧮</button>
        <button class="cost-row-btn" title="تكلفة يدوية" onclick="setManualCost('${e(i.id)}')">✏️</button>
      </td>
    </tr>`;
  }).join('');
}

function renderDetail(){
  const box = document.getElementById('costDetail');
  if(!selectedId){ box.style.display='none'; return; }
  const item = menuItems.find(i=>i.id===selectedId);
  if(!item){ box.style.display='none'; return; }
  box.style.display='block';
  const lines = recipeLines[item.id] || [];
  const manual = item.cost_mode==='manual' && Number(item.cost_manual)>0;
  let body;
  if(manual){
    body = `<div class="cost-detail-line"><span>تكلفة يدوية مُدخلة</span><b>${fmtMoney(item.cost_manual)}</b></div>`;
  } else if(lines.length){
    body = lines.map(l=>`
      <div class="cost-detail-line">
        <span class="cost-detail-mat">${e(l.mat)}<small>${l.qty} × ${fmtNum(l.unit)}</small></span>
        <b>${fmtNum(Math.round(l.total))}</b>
      </div>`).join('');
  } else {
    body = `<div class="cost-detail-line"><span class="cost-nocost">لا توجد وصفة لهذا الصنف بعد — أدخل تكلفة يدوية ✏️ أو اربطه بمواد في المخزون.</span></div>`;
  }
  const c = Math.round(effCost(item));
  box.innerHTML = `
    <div class="cost-detail-head">
      <span style="font-size:22px">🧮</span>
      <span class="cost-detail-title">${e(item.name)}</span>
      <button class="cost-detail-close" onclick="closeCostDetail()">✕</button>
    </div>
    ${body}
    <div class="cost-detail-total"><span>إجمالي التكلفة → الهامش</span>
      <span>${fmtNum(c)} → ${fmtNum(item.price - c)} ل.س</span></div>
  `;
  box.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function renderAll(){
  renderStats();
  renderMatrix();
  renderCatRow();
  renderTable();
  renderDetail();
}

/* ================================================================
   إجراءات
   ================================================================ */
function setCostCat(id){ catFilter = id; renderCatRow(); renderTable(); }
function setCostSort(v){ sortKey = v; renderTable(); }
function setOnlyNoCost(v){ onlyNoCost = v; renderTable(); }
function onCostSearch(v){ searchTerm = v.trim(); renderTable(); }
function openCostDetail(id){ selectedId = id; renderDetail(); }
function closeCostDetail(){ selectedId = null; renderDetail(); }

function setManualCost(id){
  const item = menuItems.find(i=>i.id===id);
  if(!item) return;
  const val = prompt(`أدخل التكلفة اليدوية لـ「${item.name}」 (ل.س):`, item.cost_manual || '');
  if(val === null) return;
  const n = Number(val);
  if(isNaN(n) || n < 0){ showToast('قيمة غير صالحة','⚠️'); return; }
  item.cost_manual = n;
  item.cost_mode = n > 0 ? 'manual' : 'recipe';
  if (window.AlfaDB && AlfaDB.upsert) AlfaDB.upsert('items', item);
  else DATA.items = (DATA.items || []).slice();
  menuItems = DATA.items || menuItems;
  /* رفع مباشر فوري (كان pushSoon المؤجَّل يضيع عند التنقل السريع) */
  if (window.commitMenuNow) commitMenuNow(DATA.items, DATA.categories);
  else if (window.MenuSync) MenuSync.pushSoon();
  showToast(n>0 ? 'تم حفظ التكلفة اليدوية' : 'تمت العودة لتكلفة الوصفة', '💾');
  renderAll();
}

/* ── ربحية العروض: التكلفة = مجموع تكاليف المكونات (المجاني يكلّف ولا يُدخل إيراداً) ── */
function renderOffersCost(){
  const wrap = document.getElementById('offersCostWrap');
  const body = document.getElementById('offersCostBody');
  if (!wrap || !body) return;
  const today = new Date(), p = n => String(n).padStart(2, '0');
  const todayStr = today.getFullYear() + '-' + p(today.getMonth() + 1) + '-' + p(today.getDate());
  const offers = (DATA.offers || []).filter(o => o.active !== false && (!o.expires_at || o.expires_at >= todayStr));
  if (!offers.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  body.innerHTML = offers.map(o => {
    let cost = 0;
    const names = (o.items || []).map(l => {
      const it = menuItems.find(i => i.id === l.item_id);
      if (it) cost += effCost(it) * (l.qty || 1);   // المجاني يُكلَّف أيضاً — يُقدَّم فعلياً
      return (l.free ? '🎁' : '') + (it ? it.name : '؟') + ((l.qty || 1) > 1 ? ' ×' + fmtNum(l.qty) : '');
    }).join(' + ');
    const price = Number(o.price) || 0;
    const margin = price - cost;
    const pct = price > 0 ? Math.round(margin / price * 100) : 0;
    return `<tr>
      <td><strong>${e(o.title)}</strong></td>
      <td class="cost-offer-inc">${e(names)}</td>
      <td>${fmtNum(Math.round(cost))}</td>
      <td><strong>${fmtNum(price)}</strong></td>
      <td><span class="mgr-badge ${margin >= 0 ? '' : 'gold'}">${fmtNum(Math.round(margin))} (${pct}%)</span></td>
    </tr>`;
  }).join('');
}

/* ── بدء ── */
(window.alfaStart||function(fn){fn();})(function () {
  bindCostData();
  buildNav();
  renderAll();
  renderOffersCost();
});
