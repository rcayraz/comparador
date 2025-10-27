/* app.js
   Lógica de la aplicación: carga datasets desde /datos, normaliza, aplica filtros, ordena y renderiza.
*/
(function(){
  const DATA_PATH = '../datos/'; // ajustable según servidor
  const DATASETS = [
    { src: 'productos_aliexpress.json', source: 'aliexpress' },
    { src: 'productos_temu.json', source: 'temu' },
    { src: 'productos_shopify.csv', source: 'shopify' }
  ];

  // Estado en memoria
  const state = {
    raw: [], // objetos normalizados
    filtered: [],
    filters: {},
    sort: 'price_total_asc',
    view: 'cards'
  };

  // Utilitarios
  function el(id){return document.getElementById(id)}

  async function loadAll(){
    const all = [];
    for (const ds of DATASETS){
      const url = DATA_PATH + ds.src;
      try{
        if (ds.src.endsWith('.json')){
          const res = await fetch(url); const arr = await res.json();
          arr.forEach(r => all.push(Normalizer.normalizeRecord(ds.source, r)));
        } else if (ds.src.endsWith('.csv')){
          const res = await fetch(url); const txt = await res.text();
          const rows = parseCSV(txt);
          rows.forEach(r => all.push(Normalizer.normalizeRecord(ds.source, r)));
        }
      }catch(e){console.error('Error cargando',url,e)}
    }
    state.raw = all.map(addComputed);
    state.filtered = [...state.raw];
    populateBrandFilter();
    render();
  }

  function addComputed(item){
    const price = Number(item.price_amount||0);
    const ship = Number(item.shipping_cost||0);
    item.price_total = +(price + ship).toFixed(2);
    return item;
  }

  function parseCSV(text){
    const lines = text.split(/\r?\n/).filter(l=>l.trim());
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
    const rows = lines.slice(1).map(line => {
      const cols = line.split(',').map(c=>c.trim().replace(/^"|"$/g,''));
      const obj = {};
      headers.forEach((h,i)=>obj[h]=cols[i]||'');
      return obj;
    });
    return rows;
  }

  function populateBrandFilter(){
    const set = new Set();
    state.raw.forEach(r=>{ if (r.brand) set.add(r.brand) });
    const sel = el('brand');
    // limpiar
    sel.innerHTML = '<option value="">-- Todas --</option>';
    Array.from(set).sort().forEach(b=>{
      const o = document.createElement('option'); o.value=b; o.textContent=b; sel.appendChild(o);
    });
  }

  function gatherFilters(){
    const q = el('q').value.trim().toLowerCase();
    const marketplaces = Array.from(document.querySelectorAll('input[name="marketplace"]:checked')).map(i=>i.value);
    const brand = el('brand').value;
    const priceMin = el('priceMin').value; const priceMax = el('priceMax').value;
    const maxShippingDays = el('maxShippingDays').value;
    const onlyOffers = el('onlyOffers').checked;
    state.filters = { q, marketplaces, brand, priceMin, priceMax, maxShippingDays, onlyOffers };
  }

  function applyFilters(){
    const f = state.filters;
    let out = state.raw.filter(r => f.marketplaces.includes(r.marketplace));
    if (f.q) {
      out = out.filter(r => (r.title||'').toLowerCase().includes(f.q) || (r.brand||'').toLowerCase().includes(f.q));
    }
    if (f.brand) out = out.filter(r => r.brand === f.brand);
    if (f.priceMin){ const n = Number(f.priceMin); if (!Number.isFinite(n)) return showError('Precio mínimo no válido'); out = out.filter(r=> r.price_total >= n) }
    if (f.priceMax){ const n = Number(f.priceMax); if (!Number.isFinite(n)) return showError('Precio máximo no válido'); out = out.filter(r=> r.price_total <= n) }
    if (f.priceMin && f.priceMax && Number(f.priceMin) > Number(f.priceMax)) return showError('Rango precio inválido: min > max');
    if (f.maxShippingDays){ const n = Number(f.maxShippingDays); if (!Number.isFinite(n)) return showError('Días de envío no válidos'); out = out.filter(r=> r.shipping_time_days <= n) }
    if (f.onlyOffers) out = out.filter(r=> r.is_offer);
    state.filtered = out;
    clearError();
  }

  function showError(msg){
    // simple alert area (reusing noResults)
    const noRes = el('noResults'); noRes.classList.remove('hidden'); noRes.innerHTML = '<p style="color:var(--danger)">'+msg+'</p>';
  }
  function clearError(){ const noRes = el('noResults'); if (state.filtered.length) noRes.classList.add('hidden'); else noRes.classList.remove('hidden'); }

  function applySort(){
    const s = state.sort;
    if (s === 'price_total_asc') state.filtered.sort((a,b)=>a.price_total - b.price_total);
    else if (s === 'price_total_desc') state.filtered.sort((a,b)=>b.price_total - a.price_total);
    else if (s === 'fastest_shipping') state.filtered.sort((a,b)=>a.shipping_time_days - b.shipping_time_days);
    else if (s === 'best_price_time') state.filtered.sort((a,b)=> (a.price_total*0.7 + a.shipping_time_days*0.3) - (b.price_total*0.7 + b.shipping_time_days*0.3) );
  }

  function render(){
    // counters
    el('resultsCount').textContent = state.filtered.length;
    renderActiveFilters();
    applySort();
    if (state.view === 'cards') renderCards(); else renderTable();
  }

  function renderActiveFilters(){
    const container = el('activeFilters'); container.innerHTML='';
    const f = state.filters; if (!f) return;
    if (f.q) container.appendChild(chip('q:'+f.q));
    f.marketplaces.forEach(m=>container.appendChild(chip(m)));
    if (f.brand) container.appendChild(chip('brand:'+f.brand));
    if (f.priceMin) container.appendChild(chip('min:'+f.priceMin));
    if (f.priceMax) container.appendChild(chip('max:'+f.priceMax));
    if (f.onlyOffers) container.appendChild(chip('Solo oferta'));
  }

  function chip(text){ const d=document.createElement('span'); d.className='chip'; d.textContent=text; return d }

  function marketplaceBadge(m){
    const elb = document.createElement('span'); 
    elb.className='badge ' + m.toLowerCase(); 
    elb.textContent = m.charAt(0).toUpperCase() + m.slice(1);
    return elb;
  }

  function renderCards(){
    el('cardsView').classList.remove('hidden'); el('tableView').classList.add('hidden');
    const area = el('cardsView'); area.innerHTML='';
    if (!state.filtered.length){ el('noResults').classList.remove('hidden'); return }
    el('noResults').classList.add('hidden');
    state.filtered.forEach(r=>{
      const c = document.createElement('article'); c.className='card';
      
      // Thumb con imagen
      const thumb = document.createElement('div'); thumb.className='thumb';
      const img = document.createElement('img'); 
      img.alt = r.title || 'Imagen producto'; 
      img.src = r.image || 'assets/placeholder.png'; 
      thumb.appendChild(img);
      
      // Badge oferta (absoluto sobre imagen)
      if (r.is_offer) { 
        const of = document.createElement('span'); 
        of.className='offer'; 
        of.textContent='🔥 OFERTA'; 
        thumb.appendChild(of);
      }
      c.appendChild(thumb);
      
      // Título
      const title = document.createElement('div'); 
      title.innerHTML = '<strong>'+escapeHtml(r.title)+'</strong>'; 
      c.appendChild(title);
      
      // Meta: marca + marketplace badge
      const meta = document.createElement('div'); 
      meta.className='muted'; 
      meta.textContent = (r.brand||'—') + ' · '; 
      meta.appendChild(marketplaceBadge(r.marketplace)); 
      c.appendChild(meta);
      
      // Precio
      const priceRow = document.createElement('div'); 
      priceRow.innerHTML = '<div class="price">'+formatMoney(r.price_amount,r.price_currency)+'</div>';
      c.appendChild(priceRow);
      
      // Envío y rating
      const shippingInfo = document.createElement('div');
      shippingInfo.className = 'muted';
      shippingInfo.innerHTML = '📦 Envío: ' + formatMoney(r.shipping_cost,r.price_currency) + ' · ' + r.shipping_time_days + ' días';
      if (r.rating) {
        shippingInfo.innerHTML += ' · <span class="rating">' + r.rating.toFixed(1) + '</span>';
      }
      c.appendChild(shippingInfo);
      
      // Botón ver
      const actions = document.createElement('div'); 
      actions.style.marginTop='auto';
      actions.style.paddingTop='12px';
      const a = document.createElement('a'); 
      a.className='btn primary'; 
      a.textContent='Ver en tienda →'; 
      a.href = r.url || '#'; 
      a.target='_blank'; 
      a.rel='noopener'; 
      actions.appendChild(a);
      c.appendChild(actions);
      
      area.appendChild(c);
    });
  }

  function renderTable(){
    el('cardsView').classList.add('hidden'); el('tableView').classList.remove('hidden');
    const tbody = document.querySelector('#resultsTable tbody'); tbody.innerHTML='';
    state.filtered.forEach(r=>{
      const tr = document.createElement('tr');
      const imgTd = document.createElement('td'); imgTd.innerHTML = '<img src="'+(r.image||'assets/placeholder.png')+'" alt="" style="height:48px;object-fit:cover">'; tr.appendChild(imgTd);
      tr.appendChild(td(escapeHtml(r.title)));
      tr.appendChild(td(escapeHtml(r.brand)));
      tr.appendChild(td(r.marketplace));
      tr.appendChild(td(formatMoney(r.price_amount,r.price_currency)));
      tr.appendChild(td(formatMoney(r.shipping_cost,r.price_currency)));
      tr.appendChild(td(formatMoney(r.price_total,r.price_currency)));
      tr.appendChild(td(r.shipping_time_days));
      tr.appendChild(td(r.is_offer? 'Sí' : ''));
      const act = document.createElement('td'); const a = document.createElement('a'); a.href=r.url;a.target='_blank';a.rel='noopener';a.textContent='Ver';a.className='btn'; act.appendChild(a); tr.appendChild(act);
      tbody.appendChild(tr);
    });
  }

  function td(content){ const d=document.createElement('td'); d.innerHTML = content; return d }

  function formatMoney(amount, currency){ if (amount === null || amount === undefined) return '-'; return (currency? currency+' ':'') + Number(amount).toFixed(2) }
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

  // Handlers
  function setupHandlers(){
    el('btnSearch').addEventListener('click', ()=>{ gatherFilters(); applyFilters(); render(); });
    el('btnClear').addEventListener('click', ()=>{ document.getElementById('filtersForm').reset(); state.view='cards'; el('viewMode').value='cards'; gatherFilters(); state.filtered = [...state.raw]; render(); });
    el('sortSelect').addEventListener('change', (e)=>{ state.sort = e.target.value; render(); });
    el('viewMode').addEventListener('change', (e)=>{ state.view = e.target.value; render(); });
    el('exportBtn').addEventListener('click', ()=>{ // menu simple
      const rows = state.filtered.map(r => ({id:r.id,title:r.title,brand:r.brand,marketplace:r.marketplace,price_total:r.price_total,shipping_time_days:r.shipping_time_days,url:r.url}));
      Exporter.exportCSV('resultados.csv', rows);
    });
    // table header sorting by column
    document.querySelectorAll('#resultsTable th[data-key]').forEach(th=>{
      th.addEventListener('click', ()=>{
        const key = th.getAttribute('data-key'); state.filtered.sort((a,b)=>{
          if (a[key] < b[key]) return -1; if (a[key] > b[key]) return 1; return 0;
        }); render();
      });
    });
  }

  // Inicialización
  document.addEventListener('DOMContentLoaded', ()=>{
    setupHandlers(); loadAll();
    // valores iniciales
    gatherFilters(); state.view = 'cards';
  });

})();
