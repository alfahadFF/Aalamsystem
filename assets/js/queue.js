/* ================================================================
   queue.js — شاشة النداء / رقم الدور (مرتبطة بنقطة البيع)
   تعرض أرقام الدور الجاهزة (سفري/توصيل) ليستلمها العميل.
   ================================================================ */
const DATA = window.DEMO_DATA;
const ready = () => (DATA.invoices||[])
  .filter(i => i.kitchen_status==='ready' && i.queue_no)
  .sort((a,b)=> b.queue_no - a.queue_no);

function deliver(id){
  const inv=(DATA.invoices||[]).find(i=>i.id===id); if(!inv) return;
  inv.kitchen_status='delivered';
  DATA.invoices=(DATA.invoices||[]).slice();
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  if (window.alfaPersist) window.alfaPersist();
  render();
}

function render(){
  const list = ready();
  const grid = document.getElementById('queueGrid');
  if(!list.length){ grid.innerHTML = `<div class="mgr-empty" style="grid-column:1/-1"><div class="mgr-empty-icon">🔔</div>لا أرقام جاهزة للنداء حالياً</div>`; return; }
  grid.innerHTML = list.map((inv,idx)=>`
    <div class="queue-card ${idx===0?'now':''}">
      <div class="queue-no">${window.padNo?padNo(inv.queue_no):inv.queue_no}</div>
      <div class="queue-type">${e(inv.type==='delivery'?'توصيل':'سفري')} · ${e(inv.id)}</div>
      <button class="kds-act done" style="margin-top:8px" onclick="deliver('${e(inv.id)}')">تم التسليم</button>
    </div>`).join('');
}

(window.alfaStart||function(fn){fn();})(function () {
  render();
  setInterval(render, 5000);
});
