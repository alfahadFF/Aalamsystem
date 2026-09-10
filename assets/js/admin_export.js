/* أدوات موحدة لشاشات الإدارة: تعمل محليًا وأوفلاين */
(function(){
  window.AdminExport = {
    excel: function(selector, name){
      var tables=[].slice.call(document.querySelectorAll(selector||'table'));
      if(!tables.length || !window.XLSX){ alert('لا يوجد جدول قابل للتصدير'); return; }
      var rows=[];
      tables.forEach(function(t,ti){ if(ti) rows.push([]); [].slice.call(t.querySelectorAll('tr')).forEach(function(tr){ rows.push([].slice.call(tr.cells).map(function(c){return String(c.innerText||'').trim();})); }); });
      var ws=XLSX.utils.aoa_to_sheet(rows), wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'التقرير'); XLSX.writeFile(wb,(name||'تقرير')+'.xlsx');
    },
    print: function(){ window.print(); }
  };
})();
