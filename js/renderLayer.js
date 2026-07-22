// ============================================================
// Rendering / Presentation Layer
// كل تعامل مع DOM يحصل هنا فقط. بيقرأ من KnowledgeLayer/GraphLayer/BusinessLayer
// وما بيغيّرش في البيانات مباشرة — بيستدعي BusinessLayer عشان كده.
//
// ملاحظة أمان: أي نص جاي من بيانات المستخدم (عناوين، أسباب روابط) بيتحط
// بـ textContent مش innerHTML، عشان نمنع XSS.
// ============================================================

function createRenderLayer({ knowledgeLayer, businessLayer, graphLayer }){

  const rowsView = document.getElementById('rowsView');
  const statusEl = document.getElementById('status');
  const graphView = document.getElementById('graphView');
  const detailOverlay = document.getElementById('detailOverlay');
  const detailBody = document.getElementById('detailBody');
  const addModal = document.getElementById('addModal');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const addStep2 = document.getElementById('addStep2');
  const groupSelect = document.getElementById('groupSelect');
  const linkModal = document.getElementById('linkModal');
  const linkTargetSearch = document.getElementById('linkTargetSearch');
  const linkTargetResults = document.getElementById('linkTargetResults');
  const linkReasonInput = document.getElementById('linkReasonInput');
  const globalSearchInput = document.getElementById('globalSearchInput');
  const typeFilterChips = document.getElementById('typeFilterChips');
  const metricsBtn = document.getElementById('metricsBtn');
  const metricsModal = document.getElementById('metricsModal');
  const metricsBody = document.getElementById('metricsBody');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importDataBtn = document.getElementById('importDataBtn');
  const importDataFileInput = document.getElementById('importDataFileInput');

  let pickedItem = null;
  let linkFromNode = null;
  let linkPickedTarget = null;

  // ---------------- حالة الفلترة (بحث + نوع) ----------------
  // اتنقلت لـ SearchService (src/services) — بتتحمّل مرة واحدة بس (lazy + cached)
  // عبر dynamic import، بنفس أسلوب BackgroundService فوق.
  let searchServicePromise = null;
  function getSearchService(){
    if(!searchServicePromise){
      searchServicePromise = import('../src/services/SearchService.js')
        .then(({ SearchService })=> new SearchService({ knowledgeLayer }));
    }
    return searchServicePromise;
  }

  // ---------------- KnowledgeService / GraphService ----------------
  // نفس أسلوب SearchService/BackgroundService فوق: lazy + cached عبر
  // dynamic import. من هنا، renderRows/renderGraph/openDetail/renderMetrics/
  // populateGroupSelect بقوا بيوصلوا لطبقتي المعرفة والشبكة عبر الخدمتين
  // دول بدل ما ينادوا knowledgeLayer/graphLayer مباشرة.
  let knowledgeServicePromise = null;
  function getKnowledgeService(){
    if(!knowledgeServicePromise){
      knowledgeServicePromise = import('../src/services/KnowledgeService.js')
        .then(({ KnowledgeService })=> new KnowledgeService({ knowledgeLayer }));
    }
    return knowledgeServicePromise;
  }

  let graphServicePromise = null;
  function getGraphService(){
    if(!graphServicePromise){
      graphServicePromise = import('../src/services/GraphService.js')
        .then(({ GraphService })=> new GraphService({ graphLayer }));
    }
    return graphServicePromise;
  }

  async function initFilterBar(){
    const searchService = await getSearchService();
    const typesPresent = [...new Set(knowledgeLayer.getAllNodes().map(n=> n.type))];
    searchService.initTypes(typesPresent);

    typeFilterChips.innerHTML = '';
    typesPresent.forEach(type=>{
      const chip = Utils.createTextEl('div', typeLabel(type), 'type-chip active');
      chip.dataset.type = type;
      chip.onclick = async ()=>{
        const svc = await getSearchService();
        svc.toggleType(type);
        if(svc.isTypeActive(type)){
          chip.classList.add('active');
          chip.classList.remove('inactive');
        } else {
          chip.classList.remove('active');
          chip.classList.add('inactive');
        }
        applyFilters();
      };
      typeFilterChips.appendChild(chip);
    });
  }

  const onSearchInput = Utils.debounce(async ()=>{
    const searchService = await getSearchService();
    searchService.setQuery(globalSearchInput.value);
    applyFilters();
  }, 250);
  globalSearchInput.oninput = onSearchInput;

  function applyFilters(){
    renderRows();
    if(graphView.style.display !== 'none'){
      renderGraph();
    }
  }

  // ---------------- خلفية الموقع ----------------
  // BackgroundService بيتحمّل مرة واحدة بس (lazy + cached) عبر dynamic import،
  // ومن هنا وأي نداء StorageLayer.*Background* المباشر بقى ممنوع (قاعدة الطبقات:
  // UI ميلمسش Storage غير عبر خدمة).
  // ---------------- EventBus مشترك ----------------
  // instance واحد مشترك بين كل الخدمات اللي محتاجة تبعت أحداث (BackgroundService،
  // ExportImportService) — lazy + cached بنفس الأسلوب.
  let eventBusPromise = null;
  function getEventBus(){
    if(!eventBusPromise){
      eventBusPromise = import('../src/core/EventBus.js').then(({ EventBus })=> new EventBus());
    }
    return eventBusPromise;
  }

  let backgroundServicePromise = null;
  function getBackgroundService(){
    if(!backgroundServicePromise){
      backgroundServicePromise = Promise.all([
        getEventBus(),
        import('../src/services/BackgroundService.js')
      ]).then(([eventBus, { BackgroundService }])=>{
        return new BackgroundService({ storageLayer: StorageLayer, eventBus });
      });
    }
    return backgroundServicePromise;
  }

  // ---------------- Export / Import ----------------
  let exportImportServicePromise = null;
  function getExportImportService(){
    if(!exportImportServicePromise){
      exportImportServicePromise = Promise.all([
        getEventBus(),
        import('../src/services/ExportImportService.js')
      ]).then(([eventBus, { ExportImportService }])=>{
        return new ExportImportService({ knowledgeLayer, storageLayer: StorageLayer, eventBus });
      });
    }
    return exportImportServicePromise;
  }

  async function applyBackground(){
    const backgroundService = await getBackgroundService();
    const bg = backgroundService.getBackground();
    if(bg){
      document.body.style.backgroundImage = `url(${bg})`;
      document.body.classList.add('has-bg');
    } else {
      document.body.style.backgroundImage = '';
      document.body.classList.remove('has-bg');
    }
  }

  function typeLabel(type){
    return CONFIG.NODE_TYPE_LABELS[type] || type;
  }

  // ---------------- بناء الكارت (موحّد لكل الحالات) ----------------
  // كان فيه تكرار منطق بين عرض المجموعات وعرض بدون مجموعات، مع فرق سلوك:
  // عرض المجموعات كان بيجيب بوستر TMDB فعليًا، وعرض بدون مجموعات كان بياخد
  // بس نص ثابت (typeLabel) من غير أي محاولة تحميل بوستر. اتوحّد السلوك هنا:
  // كل كارت (سواء جوه مجموعة أو لأ) بيحاول يجيب بوستر TMDB بنفس الطريقة.
  function buildCard(node){
    const card = document.createElement('div');
    card.className = 'card';

    const poster = document.createElement('div');
    poster.className = 'poster placeholder';
    poster.textContent = '...';

    const titleEl = Utils.createTextEl('div', node.title, 'card-title');
    const typeEl = Utils.createTextEl('div', typeLabel(node.type), 'card-type');

    card.appendChild(poster);
    card.appendChild(titleEl);
    card.appendChild(typeEl);
    card.onclick = ()=> openDetail(node);

    businessLayer.fetchTmdbData(node.title, node.type).then(data=>{
      if(data.poster){
        const img = document.createElement('img');
        img.className = 'poster';
        img.src = data.poster;
        img.alt = data.title;
        poster.replaceWith(img);
      } else if(node.type === 'movie' || node.type === 'tv'){
        poster.textContent = data.title;
      } else {
        poster.textContent = typeLabel(node.type);
      }
    });

    return card;
  }

  // ---------------- عرض الصفوف ----------------
  async function renderRows(){
    rowsView.innerHTML = '';
    const searchService = await getSearchService();
    const knowledgeService = await getKnowledgeService();
    let visibleTotal = 0;
    for(const group of knowledgeService.getGroups()){
      const items = knowledgeService.getNodesByGroup(group.id).filter(n=> searchService.matches(n));
      if(!items.length) continue;
      visibleTotal += items.length;

      const rowEl = document.createElement('div');
      rowEl.className = 'group-row';

      const header = document.createElement('div');
      header.className = 'group-header';
      const h2 = Utils.createTextEl('h2', group.name);
      const count = Utils.createTextEl('span', `${items.length} عنصر`, 'group-count');
      header.appendChild(h2);
      header.appendChild(count);

      const scrollEl = document.createElement('div');
      scrollEl.className = 'group-scroll';
      scrollEl.id = 'scroll-' + group.id;

      rowEl.appendChild(header);
      rowEl.appendChild(scrollEl);
      rowsView.appendChild(rowEl);

      for(const node of items){
        scrollEl.appendChild(buildCard(node));
      }
    }

    // عقد بدون مجموعة زمنية (character, team, organization, location, artifact, event...)
    // بتتجمع في صف واحد منفصل عشان تظهر في عرض الصفوف كمان مش بس في عرض الشبكة
    const ungrouped = knowledgeService.getAllNodes().filter(n=> !n.group).filter(n=> searchService.matches(n));
    if(ungrouped.length){
      visibleTotal += ungrouped.length;
      const rowEl = document.createElement('div');
      rowEl.className = 'group-row';
      const header = document.createElement('div');
      header.className = 'group-header';
      header.appendChild(Utils.createTextEl('h2', 'شخصيات ومنظمات وعناصر أخرى'));
      header.appendChild(Utils.createTextEl('span', `${ungrouped.length} عنصر`, 'group-count'));
      const scrollEl = document.createElement('div');
      scrollEl.className = 'group-scroll';
      rowEl.appendChild(header);
      rowEl.appendChild(scrollEl);
      rowsView.appendChild(rowEl);

      ungrouped.forEach(node=>{
        scrollEl.appendChild(buildCard(node));
      });
    }

    if(visibleTotal === 0){
      const empty = Utils.createTextEl('div', 'مفيش نتائج مطابقة للفلترة الحالية.', '');
      empty.style.cssText = 'padding:40px;text-align:center;color:var(--muted)';
      rowsView.appendChild(empty);
    }

    const totalAll = knowledgeService.getAllNodes().length;
    statusEl.textContent = searchService.isFilterActive()
      ? `${visibleTotal} من ${totalAll} عنصر مطابق للفلترة`
      : `${totalAll} عنصر إجمالاً عبر ${knowledgeService.getGroups().length} مجموعة زمنية`;
  }

  // ---------------- تفاصيل العنصر ----------------
  async function openDetail(node){
    detailBody.innerHTML = '';
    const loading = Utils.createTextEl('div', 'بيتحمّل...', '');
    loading.style.cssText = 'padding:40px;text-align:center;color:var(--muted)';
    detailBody.appendChild(loading);
    detailOverlay.classList.add('show');

    const data = await businessLayer.fetchTmdbData(node.title, node.type);
    const isMedia = node.type === 'movie' || node.type === 'tv';

    detailBody.innerHTML = '';

    const hero = document.createElement('div');
    hero.className = 'detail-hero';

    if(isMedia && data.poster){
      const img = document.createElement('img');
      img.className = 'detail-poster';
      img.src = data.poster;
      img.alt = data.title;
      hero.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'detail-poster';
      placeholder.style.cssText = 'display:flex;align-items:center;justify-content:center;background:var(--panel);color:var(--muted)';
      placeholder.textContent = isMedia ? 'مفيش بوستر' : typeLabel(node.type);
      hero.appendChild(placeholder);
    }

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'detail-body';
    bodyDiv.appendChild(Utils.createTextEl('h2', node.title));
    const metaText = isMedia
      ? `${typeLabel(node.type)} ${data.date ? '· ' + data.date : ''}`
      : typeLabel(node.type);
    bodyDiv.appendChild(Utils.createTextEl('div', metaText, 'detail-meta'));
    bodyDiv.appendChild(Utils.createTextEl('div', (isMedia ? (data.overview || 'مفيش ملخص متاح.') : 'لا يوجد ملخص TMDB لهذا النوع من العقد.'), 'detail-overview'));

    if(isMedia && data.id){
      const link = document.createElement('a');
      link.className = 'detail-link';
      link.href = `https://www.themoviedb.org/${node.type==='tv'?'tv':'movie'}/${data.id}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'فتح صفحة TMDB الكاملة ↗';
      bodyDiv.appendChild(link);
    }

    hero.appendChild(bodyDiv);
    detailBody.appendChild(hero);

    // ---- روابط وتلميحات ----
    const linksSection = document.createElement('div');
    linksSection.className = 'detail-links-section';
    const linksHeader = document.createElement('div');
    linksHeader.className = 'detail-links-header';
    linksHeader.appendChild(Utils.createTextEl('h3', '🔗 روابط وتلميحات'));
    const addLinkBtn = document.createElement('button');
    addLinkBtn.className = 'small-btn';
    addLinkBtn.textContent = '➕ اربط بعقدة تانية';
    addLinkBtn.onclick = ()=> openLinkModal(node);
    linksHeader.appendChild(addLinkBtn);
    linksSection.appendChild(linksHeader);

    const linksList = document.createElement('div');
    linksList.id = 'linksList';
    const knowledgeService = await getKnowledgeService();
    const relations = knowledgeService.getEdgesForNode(node.id);

    if(!relations.length){
      linksList.appendChild(Utils.createTextEl('div', 'مفيش روابط أو تلميحات مسجّلة لسه.', ''));
    } else {
      relations.forEach(({ edge, otherNode })=>{
        const item = document.createElement('div');
        item.className = 'link-item';
        const titleLine = document.createElement('div');
        titleLine.className = 'link-item-title';
        titleLine.textContent = '🔗 ' + (otherNode ? otherNode.title : '(عقدة غير موجودة)');
        const typeTag = document.createElement('span');
        typeTag.style.cssText = 'color:var(--muted);font-size:11px;margin-inline-start:6px;';
        typeTag.textContent = `[${edge.type}]`;
        titleLine.appendChild(typeTag);
        const reasonLine = Utils.createTextEl('div', edge.description || '', 'link-item-reason');
        item.appendChild(titleLine);
        item.appendChild(reasonLine);
        if(otherNode){
          item.onclick = ()=> openDetail(otherNode);
        }
        linksList.appendChild(item);
      });
    }
    linksSection.appendChild(linksList);
    detailBody.appendChild(linksSection);
  }

  document.getElementById('detailClose').onclick = ()=> detailOverlay.classList.remove('show');
  detailOverlay.onclick = (e)=>{ if(e.target===detailOverlay) detailOverlay.classList.remove('show'); };

  // ---------------- عرض الشبكة (D3) ----------------
  function renderGraphLegend(){
    const existing = document.getElementById('graphLegend');
    if(existing) existing.remove();

    const legend = document.createElement('div');
    legend.id = 'graphLegend';
    legend.className = 'graph-legend';

    Object.keys(CONFIG.NODE_TYPE_VISUALS).forEach(type=>{
      if(type === 'default') return;
      const visual = CONFIG.NODE_TYPE_VISUALS[type];
      const item = document.createElement('div');
      item.className = 'graph-legend-item';
      const dot = document.createElement('span');
      dot.className = 'graph-legend-dot';
      dot.style.background = visual.color;
      item.appendChild(dot);
      item.appendChild(Utils.createTextEl('span', typeLabel(type)));
      legend.appendChild(item);
    });

    graphView.appendChild(legend);
  }

  async function renderGraph(){
    const searchService = await getSearchService();
    const graphService = await getGraphService();
    renderGraphLegend();
    const svg = d3.select('#graphSvg');
    svg.selectAll('*').remove();
    const width = graphView.clientWidth, height = graphView.clientHeight;
    svg.attr('viewBox', [0,0,width,height]);

    const zoomLayer = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.2,4]).on('zoom', (e)=> zoomLayer.attr('transform', e.transform)));

    const { nodesData, linksData } = graphService.buildGraphData();

    const sim = d3.forceSimulation(nodesData)
      .force('link', d3.forceLink(linksData).id(d=>d.id).distance(d=> d.source.isHub || d.target.isHub ? 70 : (d.isCross ? 90 : 40)))
      .force('charge', d3.forceManyBody().strength(-140))
      .force('center', d3.forceCenter(width/2, height/2))
      .force('collide', d3.forceCollide().radius(d=> d.isHub ? 50 : 22));

    const link = zoomLayer.append('g').selectAll('line').data(linksData).join('line')
      .attr('class', d=> d.isCross ? 'glink cross-link' : 'glink');
    const gnode = zoomLayer.append('g').selectAll('g').data(nodesData).join('g')
      .attr('class', d=> d.isHub ? 'gnode hub' : 'gnode')
      .call(d3.drag()
        .on('start',(e,d)=>{ if(!e.active) sim.alphaTarget(0.2).restart(); d.fx=d.x; d.fy=d.y; })
        .on('drag',(e,d)=>{ d.fx=e.x; d.fy=e.y; })
        .on('end',(e,d)=>{ if(!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }));

    gnode.append('circle')
      .attr('r', d=> d.isHub ? 34 : (CONFIG.NODE_TYPE_VISUALS[d.node.type] || CONFIG.NODE_TYPE_VISUALS.default).radius)
      .attr('fill', d=> d.isHub ? 'var(--panel)' : (CONFIG.NODE_TYPE_VISUALS[d.node.type] || CONFIG.NODE_TYPE_VISUALS.default).color);
    gnode.filter(d=> !d.isHub && !searchService.matches(d.node)).classed('dimmed', true);
    gnode.append('text').text(d=> d.label.length>16 ? d.label.slice(0,16)+'…' : d.label)
      .attr('text-anchor','middle').attr('y', d=> d.isHub ? 50 : 26);
    gnode.filter(d=>!d.isHub).on('click', (e,d)=> openDetail(d.node));

    sim.on('tick', ()=>{
      link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
      gnode.attr('transform', d=>`translate(${d.x},${d.y})`);
    });
  }

  // ---------------- إحصائيات الشبكة ----------------
  async function renderMetrics(){
    metricsBody.innerHTML = '';
    const knowledgeService = await getKnowledgeService();
    const metrics = knowledgeService.computeMetrics();

    const summary = document.createElement('div');
    summary.className = 'metrics-summary';
    [
      { num: metrics.totalNodes, label: 'إجمالي العقد' },
      { num: metrics.totalEdges, label: 'إجمالي العلاقات' },
      { num: metrics.totalGroups, label: 'مجموعات زمنية' }
    ].forEach(item=>{
      const div = document.createElement('div');
      div.className = 'metrics-summary-item';
      div.appendChild(Utils.createTextEl('div', String(item.num), 'num'));
      div.appendChild(Utils.createTextEl('div', item.label, 'label'));
      summary.appendChild(div);
    });
    metricsBody.appendChild(summary);

    metricsBody.appendChild(buildMetricsBarSection('توزيع الأنواع', metrics.nodesByType, typeLabel));
    metricsBody.appendChild(buildMetricsBarSection('توزيع أنواع العلاقات', metrics.edgesByType, t=>t));

    const topSection = document.createElement('div');
    topSection.className = 'metrics-section';
    topSection.appendChild(Utils.createTextEl('h4', 'أكثر العناصر ارتباطًا'));
    metrics.topConnected.forEach(({ node, degree })=>{
      const item = document.createElement('div');
      item.className = 'metrics-top-item';
      item.appendChild(Utils.createTextEl('span', `${typeLabel(node.type)} ${node.title}`));
      item.appendChild(Utils.createTextEl('span', String(degree), 'degree'));
      item.onclick = ()=>{ metricsModal.classList.remove('show'); openDetail(node); };
      topSection.appendChild(item);
    });
    metricsBody.appendChild(topSection);
  }

  function buildMetricsBarSection(title, countsByKey, labelFn){
    const section = document.createElement('div');
    section.className = 'metrics-section';
    section.appendChild(Utils.createTextEl('h4', title));
    const entries = Object.entries(countsByKey).sort((a,b)=> b[1]-a[1]);
    const max = Math.max(...entries.map(e=>e[1]), 1);
    entries.forEach(([key, count])=>{
      const row = document.createElement('div');
      row.className = 'metrics-bar-row';
      row.appendChild(Utils.createTextEl('div', labelFn(key), 'metrics-bar-label'));
      const track = document.createElement('div');
      track.className = 'metrics-bar-track';
      const fill = document.createElement('div');
      fill.className = 'metrics-bar-fill';
      fill.style.width = Math.round((count/max)*100) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(Utils.createTextEl('div', String(count), 'metrics-bar-count'));
      section.appendChild(row);
    });
    return section;
  }

  metricsBtn.onclick = async ()=>{
    await renderMetrics();
    metricsModal.classList.add('show');
  };
  document.getElementById('metricsModalClose').onclick = ()=> metricsModal.classList.remove('show');
  metricsModal.onclick = (e)=>{ if(e.target===metricsModal) metricsModal.classList.remove('show'); };

  // ---------------- تبديل العرض ----------------
  const viewRowsBtn = document.getElementById('viewRowsBtn');
  const viewGraphBtn = document.getElementById('viewGraphBtn');
  viewRowsBtn.onclick = ()=>{
    viewRowsBtn.classList.add('active'); viewGraphBtn.classList.remove('active');
    rowsView.style.display='block'; graphView.style.display='none';
  };
  viewGraphBtn.onclick = ()=>{
    viewGraphBtn.classList.add('active'); viewRowsBtn.classList.remove('active');
    rowsView.style.display='none'; graphView.style.display='block';
    renderGraph();
  };

  // ---------------- إضافة عنصر جديد (بحث TMDB) ----------------
  document.getElementById('addNodeBtn').onclick = ()=>{
    addModal.classList.add('show');
    searchInput.value=''; searchResults.innerHTML=''; addStep2.style.display='none'; pickedItem=null;
    searchInput.focus();
  };
  document.getElementById('addClose').onclick = ()=> addModal.classList.remove('show');
  addModal.onclick = (e)=>{ if(e.target===addModal) addModal.classList.remove('show'); };

  async function populateGroupSelect(){
    groupSelect.innerHTML = '';
    const knowledgeService = await getKnowledgeService();
    knowledgeService.getGroups().forEach(g=>{
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      groupSelect.appendChild(opt);
    });
  }

  const doSearch = Utils.debounce(async (q)=>{
    searchResults.innerHTML = '';
    searchResults.appendChild(Utils.createTextEl('div', 'بيدوّر...', ''));
    const results = await businessLayer.searchTmdbMulti(q);
    searchResults.innerHTML = '';
    if(results === null){
      searchResults.appendChild(Utils.createTextEl('div', 'حصل خطأ في الاتصال بـ TMDB', ''));
      return;
    }
    if(!results.length){
      searchResults.appendChild(Utils.createTextEl('div', 'مفيش نتائج', ''));
      return;
    }
    results.forEach(r=>{
      const div = document.createElement('div');
      div.className = 'search-result';
      const img = document.createElement('img');
      img.src = r.poster || '';
      img.onerror = ()=>{ img.style.visibility = 'hidden'; };
      const textWrap = document.createElement('div');
      textWrap.appendChild(Utils.createTextEl('div', r.title, 'sr-title'));
      textWrap.appendChild(Utils.createTextEl('div', `${r.year} · ${r.type==='tv'?'مسلسل':'فيلم'}`, 'sr-year'));
      div.appendChild(img);
      div.appendChild(textWrap);
      div.onclick = ()=>{
        pickedItem = { title: r.title, type: r.type };
        document.getElementById('pickedTitle').textContent = `اخترت: ${r.title}`;
        addStep2.style.display = 'block';
      };
      searchResults.appendChild(div);
    });
  }, 400);

  searchInput.oninput = ()=>{
    const q = searchInput.value.trim();
    if(q.length < 2){ searchResults.innerHTML = ''; return; }
    doSearch(q);
  };

  document.getElementById('confirmAddBtn').onclick = ()=>{
    if(!pickedItem) return;
    businessLayer.addMovieOrTvNode({ title: pickedItem.title, type: pickedItem.type, group: groupSelect.value });
    addModal.classList.remove('show');
    renderRows();
    if(graphView.style.display !== 'none') renderGraph();
  };

  // ---------------- ربط عقدتين يدويًا ----------------
  function openLinkModal(node){
    linkFromNode = node;
    linkPickedTarget = null;
    document.getElementById('linkFromTitle').textContent = node.title;
    linkTargetSearch.value = '';
    linkReasonInput.value = '';
    linkTargetResults.innerHTML = '';
    linkModal.classList.add('show');
    linkTargetSearch.focus();
  }
  document.getElementById('linkModalClose').onclick = ()=> linkModal.classList.remove('show');
  linkModal.onclick = (e)=>{ if(e.target===linkModal) linkModal.classList.remove('show'); };

  linkTargetSearch.oninput = async ()=>{
    const q = linkTargetSearch.value.trim();
    linkPickedTarget = null;
    linkTargetResults.innerHTML = '';
    if(q.length < 1) return;
    const searchService = await getSearchService();
    const matches = searchService.searchByTitle(q, { excludeTitle: linkFromNode.title, limit: 15 });
    if(!matches.length){
      linkTargetResults.appendChild(Utils.createTextEl('div', 'مفيش نتايج', ''));
      return;
    }
    matches.forEach(n=>{
      const opt = Utils.createTextEl('div', n.title, 'link-target-option');
      opt.onclick = ()=>{
        linkTargetResults.querySelectorAll('.link-target-option').forEach(o=>o.classList.remove('picked'));
        opt.classList.add('picked');
        linkPickedTarget = n;
      };
      linkTargetResults.appendChild(opt);
    });
  };

  document.getElementById('confirmLinkBtn').onclick = ()=>{
    if(!linkPickedTarget || !linkReasonInput.value.trim()){
      alert('لازم تختار عقدة وتكتب سبب الربط الأول');
      return;
    }
    businessLayer.addManualEdge({
      fromNodeId: linkFromNode.id,
      toNodeId: linkPickedTarget.id,
      description: linkReasonInput.value.trim(),
      type: 'connected_to'
    });
    linkModal.classList.remove('show');
    openDetail(linkFromNode);
    if(graphView.style.display !== 'none') renderGraph();
  };

  // ---------------- الخلفية ----------------
  document.getElementById('bgBtn').onclick = ()=> document.getElementById('bgFileInput').click();
  document.getElementById('bgFileInput').onchange = (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async ()=>{
      const backgroundService = await getBackgroundService();
      backgroundService.setBackground(reader.result);
      await applyBackground();
    };
    reader.readAsDataURL(file);
  };
  document.getElementById('bgResetBtn').onclick = async ()=>{
    const backgroundService = await getBackgroundService();
    backgroundService.clearBackground();
    await applyBackground();
  };

  // ---------------- تصدير / استيراد بيانات المستخدم ----------------
  exportDataBtn.onclick = async ()=>{
    const svc = await getExportImportService();
    const jsonString = svc.exportAsJsonString();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0,10);
    a.download = `marvel-map-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  importDataBtn.onclick = ()=> importDataFileInput.click();
  importDataFileInput.onchange = (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async ()=>{
      try{
        const payload = JSON.parse(reader.result);
        const svc = await getExportImportService();
        const result = svc.importData(payload);
        alert(`تم الاستيراد: ${result.importedNodes} عقدة جديدة، ${result.importedEdges} علاقة جديدة${result.backgroundRestored ? '، والخلفية اتحدّثت كمان' : ''}.`);
        if(result.backgroundRestored) await applyBackground();
        await renderRows();
        if(graphView.style.display !== 'none') await renderGraph();
      }catch(err){
        alert('حصل خطأ أثناء الاستيراد: ' + err.message);
      }finally{
        importDataFileInput.value = '';
      }
    };
    reader.readAsText(file);
  };

  return {
    applyBackground,
    renderRows,
    renderGraph,
    populateGroupSelect,
    openDetail,
    initFilterBar
  };
}
