/* exporter.js
   Exporta resultados visibles a CSV o (opcional) Excel.
   Implementa CSV simple. XLSX debe usar SheetJS (comentado) si se quiere agregar.
*/
(function(global){
  function toCSV(rows){
    if (!rows || !rows.length) return '';
    const keys = Object.keys(rows[0]);
    const esc = v => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g,'""') + '"';
    const lines = [keys.map(esc).join(',')];
    rows.forEach(r => {
      lines.push(keys.map(k => esc(r[k])).join(','));
    });
    return lines.join('\n');
  }

  function download(filename, content, mime){
    const blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display='none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function exportCSV(filename, rows){
    const csv = toCSV(rows);
    download(filename.endsWith('.csv')?filename:filename+'.csv', csv, 'text/csv;charset=utf-8;');
  }

  // Stub: export to XLSX using SheetJS (optional).
  // function exportXLSX(filename, rows){
  //   // If you want to support XLSX, include SheetJS (xlsx.full.min.js) and implement:
  //   // const wb = XLSX.utils.book_new();
  //   // const ws = XLSX.utils.json_to_sheet(rows);
  //   // XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
  //   // XLSX.writeFile(wb, filename);
  // }

  global.Exporter = { exportCSV /*, exportXLSX */ };
})(window);
