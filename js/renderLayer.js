// ============================================================
// Rendering / Presentation Layer
// كل تعامل مع DOM يحصل هنا فقط. بيقرأ من KnowledgeLayer/GraphLayer/BusinessLayer
// وما بيغيّرش في البيانات مباشرة — بيستدعي BusinessLayer عشان كده.
//
// ملاحظة أمان: أي نص جاي من بيانات المستخدم (عناوين، أسباب روابط) بيتحط
// بـ textContent مش innerHTML، عشان نمنع XSS.
// ============================================================

function createRenderLayer({ knowledgeLayer, businessLayer, graphLayer, timelineLayer, eventBus: injectedEventBus }){

  const rowsView = document.getElementById('rowsView');
  const statusEl = document.getElementById('status');
  const errorToastEl = document.getElementById('errorToast');
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
  const globalSearchDropdown = document.getElementById('globalSearchDropdown');
  const typeFilterChips = document.getElementById('typeFilterChips');
  const metricsBtn = document.getElementById('metricsBtn');
  const metricsModal = document.getElementById('metricsModal');
  const metricsBody = document.getElementById('metricsBody');
  const shortestPathBtn = document.getElementById('shortestPathBtn');
  const shortestPathModal = document.getElementById('shortestPathModal');
  const spFromSearch = document.getElementById('spFromSearch');
  const spFromResults = document.getElementById('spFromResults');
  const spToSearch = document.getElementById('spToSearch');
  const spToResults = document.getElementById('spToResults');
  const spCalcBtn = document.getElementById('spCalcBtn');
  const spResultBody = document.getElementById('spResultBody');
  const networkAnalysisBtn = document.getElementById('networkAnalysisBtn');
  const networkAnalysisModal = document.getElementById('networkAnalysisModal');
  const networkAnalysisBody = document.getElementById('networkAnalysisBody');
  const comparisonBtn = document.getElementById('comparisonBtn');
  const comparisonModal = document.getElementById('comparisonModal');
  const cmpASearch = document.getElementById('cmpASearch');
  const cmpAResults = document.getElementById('cmpAResults');
  const cmpBSearch = document.getElementById('cmpBSearch');
  const cmpBResults = document.getElementById('cmpBResults');
  const cmpCalcBtn = document.getElementById('cmpCalcBtn');
  const cmpResultBody = document.getElementById('cmpResultBody');
  const analyticsBtn = document.getElementById('analyticsBtn');
  const analyticsModal = document.getElementById('analyticsModal');
  const analyticsBody = document.getElementById('analyticsBody');
  const inferenceBtn = document.getElementById('inferenceBtn');
  const inferenceModal = document.getElementById('inferenceModal');
  const inferenceBody = document.getElementById('inferenceBody');
  const relationshipModal = document.getElementById('relationshipModal');
  const relationshipBody = document.getElementById('relationshipBody');
  const detectiveBtn = document.getElementById('detectiveBtn');
  const detectiveModal = document.getElementById('detectiveModal');
  const detectiveBody = document.getElementById('detectiveBody');
  const storyBtn = document.getElementById('storyBtn');
  const storyModal = document.getElementById('storyModal');
  const storyFromSearch = document.getElementById('storyFromSearch');
  const storyFromResults = document.getElementById('storyFromResults');
  const storyToSearch = document.getElementById('storyToSearch');
  const storyToResults = document.getElementById('storyToResults');
  const storyCalcBtn = document.getElementById('storyCalcBtn');
  const storyResultBody = document.getElementById('storyResultBody');
  const researchBtn = document.getElementById('researchBtn');
  const researchModal = document.getElementById('researchModal');
  const researchSearch = document.getElementById('researchSearch');
  const researchResults = document.getElementById('researchResults');
  const researchBody = document.getElementById('researchBody');
  const replayBtn = document.getElementById('replayBtn');
  const replayModal = document.getElementById('replayModal');
  const replayBody = document.getElementById('replayBody');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importDataBtn = document.getElementById('importDataBtn');
  const importDataFileInput = document.getElementById('importDataFileInput');
  const dashboardView = document.getElementById('dashboardView');
  const filterBar = document.getElementById('filterBar');
  const toggleAdvancedFiltersBtn = document.getElementById('toggleAdvancedFiltersBtn');
  const advancedFiltersPanel = document.getElementById('advancedFiltersPanel');
  const groupFilterChips = document.getElementById('groupFilterChips');
  const minConnectionsInput = document.getElementById('minConnectionsInput');
  const resetAdvancedFiltersBtn = document.getElementById('resetAdvancedFiltersBtn');
  const dashSearchInput = document.getElementById('dashSearchInput');
  const dashSearchDropdown = document.getElementById('dashSearchDropdown');
  const dashStatsBody = document.getElementById('dashStatsBody');
  const dashHealthBody = document.getElementById('dashHealthBody');
  const dashStatusBody = document.getElementById('dashStatusBody');
  const dashRecentAddedBody = document.getElementById('dashRecentAddedBody');
  const dashRecentViewedBody = document.getElementById('dashRecentViewedBody');
  const dashBookmarksBody = document.getElementById('dashBookmarksBody');
  const dashRandomBody = document.getElementById('dashRandomBody');
  const dashRandomBtn = document.getElementById('dashRandomBtn');
  const dashGraphOverviewBody = document.getElementById('dashGraphOverviewBody');
  const dashOpenGraphBtn = document.getElementById('dashOpenGraphBtn');
  const graphViewModeSelect = document.getElementById('graphViewModeSelect');
  const toggleLayersBtn = document.getElementById('toggleLayersBtn');
  const graphLayersPanel = document.getElementById('graphLayersPanel');
  const timelineView = document.getElementById('timelineView');
  const timelineScroll = document.getElementById('timelineScroll');
  const timelineShowUngroupedToggle = document.getElementById('timelineShowUngroupedToggle');

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
        .then(({ SearchService })=> new SearchService({ knowledgeLayer, storageLayer: StorageLayer }));
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

  // ---------------- DashboardService (PART 04 — Phase A) ----------------
  let dashboardServicePromise = null;
  function getDashboardService(){
    if(!dashboardServicePromise){
      dashboardServicePromise = import('../src/services/DashboardService.js')
        .then(({ DashboardService })=> new DashboardService({ knowledgeLayer, storageLayer: StorageLayer }));
    }
    return dashboardServicePromise;
  }

  // ---------------- TimelineService / LayerService (PART 04 — Phase C) ----------------
  let timelineServicePromise = null;
  function getTimelineService(){
    if(!timelineServicePromise){
      timelineServicePromise = import('../src/services/TimelineService.js')
        .then(({ TimelineService })=> new TimelineService({ timelineLayer }));
    }
    return timelineServicePromise;
  }

  let layerServicePromise = null;
  function getLayerService(){
    if(!layerServicePromise){
      layerServicePromise = import('../src/services/LayerService.js')
        .then(({ LayerService })=> new LayerService({ layerGroups: CONFIG.LAYER_GROUPS }));
    }
    return layerServicePromise;
  }

  // ---------------- ExplorationService (PART 04 — Phase E) ----------------
  let explorationServicePromise = null;
  function getExplorationService(){
    if(!explorationServicePromise){
      explorationServicePromise = import('../src/services/ExplorationService.js')
        .then(({ ExplorationService })=> new ExplorationService({ knowledgeLayer, graphLayer }));
    }
    return explorationServicePromise;
  }

  // ---------------- InferenceEngine (MARVEL-FIX-MASTER-PROMPT Stage 1) ----------------
  let inferenceServicePromise = null;
  function getInferenceService(){
    if(!inferenceServicePromise){
      inferenceServicePromise = import('../src/services/InferenceEngine.js')
        .then(({ InferenceEngine })=> new InferenceEngine({ knowledgeLayer, graphLayer, storageLayer: StorageLayer }));
    }
    return inferenceServicePromise;
  }

  // نمط عرض الشبكة الحالي (force = الوضع الأصلي، radial/columns = الأنماط
  // الجديدة في Phase C). حالة عرض بحتة، مش جزء من أي Service.
  let graphViewMode = 'force';

  /**
   * دالة عامة بتربط أي input بمحرك SearchService (fuzzy + ترتيب + تظليل +
   * سجل بحث مشترك) وبتعرض النتائج جوه resultsEl. مستخدمة في مودال الربط
   * اليدوي ومودال أقصر مسار (من/إلى) — بدل تكرار نفس المنطق 3 مرات.
   * @param {HTMLInputElement} inputEl
   * @param {HTMLElement} resultsEl
   * @param {(node)=>void} onPick بتتنادى لما المستخدم يختار عقدة من النتائج
   * @param {{excludeTitle?: ()=>(string|null)}} [options] excludeTitle دالة (مش قيمة ثابتة) عشان تتقيّم وقت البحث
   */
  function wireNodeSearchInput(inputEl, resultsEl, onPick, { excludeTitle } = {}){
    inputEl.oninput = async ()=>{
      const q = inputEl.value.trim();
      onPick(null); // أي اختيار سابق بيتلغي فورًا لحد ما يختار نتيجة جديدة (زي السلوك الأصلي)
      resultsEl.innerHTML = '';
      if(q.length < 1) return;
      const searchService = await getSearchService();
      const matches = searchService.searchByTitle(q, {
        excludeTitle: excludeTitle ? excludeTitle() : null,
        limit: 15
      });
      if(!matches.length){
        resultsEl.appendChild(Utils.createTextEl('div', 'مفيش نتايج', ''));
        return;
      }
      matches.forEach(n=>{
        const opt = document.createElement('div');
        opt.className = 'link-target-option';
        Utils.renderHighlighted(opt, n.title, q);
        opt.onclick = async ()=>{
          resultsEl.querySelectorAll('.link-target-option').forEach(o=>o.classList.remove('picked'));
          opt.classList.add('picked');
          onPick(n);
          const svc = await getSearchService();
          svc.recordSearch(q);
        };
        resultsEl.appendChild(opt);
      });
    };

    inputEl.onfocus = async ()=>{
      if(inputEl.value.trim().length > 0) return;
      const searchService = await getSearchService();
      const history = searchService.getHistory();
      resultsEl.innerHTML = '';
      if(!history.length) return;
      resultsEl.appendChild(Utils.createTextEl('div', 'بحث سابق', 'search-dropdown-label'));
      history.forEach(h=>{
        const opt = Utils.createTextEl('div', h, 'link-target-option');
        opt.onclick = ()=>{ inputEl.value = h; inputEl.oninput(); };
        resultsEl.appendChild(opt);
      });
    };
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

    // ---- فلاتر متقدمة: المجموعة الزمنية (PART 04 — Phase B) ----
    const groups = knowledgeLayer.getGroups();
    const hasUngrouped = knowledgeLayer.getAllNodes().some(n=> !n.group);
    const groupKeys = groups.map(g=> g.id).concat(hasUngrouped ? ['__none__'] : []);
    searchService.initGroups(groupKeys);

    groupFilterChips.innerHTML = '';
    groups.forEach(group=>{
      const chip = Utils.createTextEl('div', group.name, 'type-chip active');
      chip.onclick = async ()=>{
        const svc = await getSearchService();
        svc.toggleGroup(group.id);
        chip.classList.toggle('active', svc.isGroupActive(group.id));
        chip.classList.toggle('inactive', !svc.isGroupActive(group.id));
        applyFilters();
      };
      groupFilterChips.appendChild(chip);
    });
    if(hasUngrouped){
      const chip = Utils.createTextEl('div', 'بدون مجموعة زمنية', 'type-chip active');
      chip.onclick = async ()=>{
        const svc = await getSearchService();
        svc.toggleGroup('__none__');
        chip.classList.toggle('active', svc.isGroupActive('__none__'));
        chip.classList.toggle('inactive', !svc.isGroupActive('__none__'));
        applyFilters();
      };
      groupFilterChips.appendChild(chip);
    }
  }

  toggleAdvancedFiltersBtn.onclick = ()=>{
    advancedFiltersPanel.hidden = !advancedFiltersPanel.hidden;
    toggleAdvancedFiltersBtn.classList.toggle('active', !advancedFiltersPanel.hidden);
  };

  minConnectionsInput.onchange = async ()=>{
    const svc = await getSearchService();
    svc.setMinConnections(Number(minConnectionsInput.value));
    applyFilters();
  };

  const minWeightInput = document.getElementById('minWeightInput');
  minWeightInput.onchange = async ()=>{
    const svc = await getSearchService();
    svc.setMinWeight(Number(minWeightInput.value));
    applyFilters();
  };

  resetAdvancedFiltersBtn.onclick = async ()=>{
    globalSearchInput.value = '';
    minConnectionsInput.value = '0';
    minWeightInput.value = '0';
    const svc = await getSearchService();
    svc.setQuery('');
    svc.setMinConnections(0);
    svc.setMinWeight(0);
    [...typeFilterChips.children].forEach(chip=>{
      chip.classList.add('active'); chip.classList.remove('inactive');
    });
    [...groupFilterChips.children].forEach(chip=>{
      chip.classList.add('active'); chip.classList.remove('inactive');
    });
    await initFilterBar(); // بيعيد تفعيل كل الأنواع/المجموعات في searchService نفسه
    applyFilters();
  };

  const onSearchInput = Utils.debounce(async ()=>{
    const searchService = await getSearchService();
    searchService.setQuery(globalSearchInput.value);
    applyFilters();
    await renderGlobalSearchDropdown();
  }, 250);
  globalSearchInput.oninput = onSearchInput;

  globalSearchInput.onfocus = ()=> renderGlobalSearchDropdown();
  globalSearchInput.onblur = ()=>{
    // تأخير بسيط عشان نداء onclick بتاع عنصر جوّه الـ dropdown يتنفذ الأول
    setTimeout(()=>{ globalSearchDropdown.hidden = true; }, 150);
  };
  globalSearchInput.onkeydown = async (e)=>{
    if(e.key === 'Enter'){
      const searchService = await getSearchService();
      searchService.recordSearch(globalSearchInput.value);
      globalSearchDropdown.hidden = true;
    } else if(e.key === 'Escape'){
      globalSearchDropdown.hidden = true;
      globalSearchInput.blur();
    }
  };

  /**
   * بيعرض إما سجل البحث السابق (لو المربع فاضي) أو أفضل النتائج المرتّبة
   * (لو فيه استعلام)، مع تظليل جزء التطابق. الضغط على نتيجة بيفتح تفاصيلها
   * مباشرة؛ الضغط على عنصر من السجل بيعيد تشغيل نفس الاستعلام.
   */
  async function renderGlobalSearchDropdown(){
    const searchService = await getSearchService();
    const q = globalSearchInput.value.trim();
    globalSearchDropdown.innerHTML = '';

    if(q.length === 0){
      const history = searchService.getHistory();
      if(!history.length){ globalSearchDropdown.hidden = true; return; }
      globalSearchDropdown.appendChild(Utils.createTextEl('div', 'بحث سابق', 'search-dropdown-label'));
      history.forEach(h=>{
        const item = Utils.createTextEl('div', h, 'search-dropdown-item');
        item.onclick = async ()=>{
          globalSearchInput.value = h;
          const svc = await getSearchService();
          svc.setQuery(h);
          svc.recordSearch(h);
          applyFilters();
          globalSearchDropdown.hidden = true;
        };
        globalSearchDropdown.appendChild(item);
      });
      globalSearchDropdown.hidden = false;
      return;
    }

    const results = searchService.searchByTitle(q, { limit: 8 });
    if(!results.length){
      globalSearchDropdown.appendChild(Utils.createTextEl('div', 'مفيش نتائج مطابقة', 'search-dropdown-empty'));
      globalSearchDropdown.hidden = false;
      return;
    }
    results.forEach(node=>{
      const item = document.createElement('div');
      item.className = 'search-dropdown-item';
      const titleEl = document.createElement('span');
      Utils.renderHighlighted(titleEl, node.title, q);
      const typeEl = Utils.createTextEl('span', typeLabel(node.type), 'sdi-type');
      item.appendChild(titleEl);
      item.appendChild(typeEl);
      item.onclick = async ()=>{
        const svc = await getSearchService();
        svc.recordSearch(q);
        globalSearchDropdown.hidden = true;
        openDetail(node);
      };
      globalSearchDropdown.appendChild(item);
    });
    globalSearchDropdown.hidden = false;
  }

  // ================= Dashboard (PART 04 — Phase A) =================

  /**
   * بحث سريع (Quick Search) في الـ Dashboard — نفس منطق renderGlobalSearchDropdown
   * بالظبط (fuzzy + ترتيب + تظليل + سجل بحث مشترك)، لكن من غير تطبيق أي فلترة
   * على شريط الأدوات: الاختيار هنا بيفتح تفاصيل العنصر مباشرة بس.
   */
  async function renderDashSearchDropdown(){
    const searchService = await getSearchService();
    const q = dashSearchInput.value.trim();
    dashSearchDropdown.innerHTML = '';

    if(q.length === 0){
      const history = searchService.getHistory();
      if(!history.length){ dashSearchDropdown.hidden = true; return; }
      dashSearchDropdown.appendChild(Utils.createTextEl('div', 'بحث سابق', 'search-dropdown-label'));
      history.forEach(h=>{
        const item = Utils.createTextEl('div', h, 'search-dropdown-item');
        item.onclick = ()=>{ dashSearchInput.value = h; renderDashSearchDropdown(); };
        dashSearchDropdown.appendChild(item);
      });
      dashSearchDropdown.hidden = false;
      return;
    }

    const results = searchService.searchByTitle(q, { limit: 8 });
    if(!results.length){
      dashSearchDropdown.appendChild(Utils.createTextEl('div', 'مفيش نتائج مطابقة', 'search-dropdown-empty'));
      dashSearchDropdown.hidden = false;
      return;
    }
    results.forEach(node=>{
      const item = document.createElement('div');
      item.className = 'search-dropdown-item';
      const titleEl = document.createElement('span');
      Utils.renderHighlighted(titleEl, node.title, q);
      const typeEl = Utils.createTextEl('span', typeLabel(node.type), 'sdi-type');
      item.appendChild(titleEl);
      item.appendChild(typeEl);
      item.onclick = async ()=>{
        const svc = await getSearchService();
        svc.recordSearch(q);
        dashSearchDropdown.hidden = true;
        dashSearchInput.value = '';
        openDetail(node);
      };
      dashSearchDropdown.appendChild(item);
    });
    dashSearchDropdown.hidden = false;
  }

  dashSearchInput.oninput = Utils.debounce(()=> renderDashSearchDropdown(), 250);
  dashSearchInput.onfocus = ()=> renderDashSearchDropdown();
  dashSearchInput.onblur = ()=>{
    setTimeout(()=>{ dashSearchDropdown.hidden = true; }, 150);
  };
  dashSearchInput.onkeydown = (e)=>{
    if(e.key === 'Escape'){ dashSearchDropdown.hidden = true; dashSearchInput.blur(); }
  };

  /** عنصر قابل للنقر يفتح تفاصيله (مستخدم في أكتر من ويدجت في الـ Dashboard). */
  function buildDashListItem(node, extraLabel){
    const item = document.createElement('div');
    item.className = 'dash-list-item';
    item.appendChild(Utils.createTextEl('span', node.title));
    item.appendChild(Utils.createTextEl('span', extraLabel || typeLabel(node.type), 'dli-type'));
    item.onclick = ()=> openDetail(node);
    return item;
  }

  function renderDashRandom(dashboardService){
    dashRandomBody.innerHTML = '';
    const node = dashboardService.getRandomNode();
    if(!node){
      dashRandomBody.appendChild(Utils.createTextEl('div', 'مفيش عناصر بعد.', 'dash-empty'));
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'dash-list-item';
    const textWrap = document.createElement('div');
    textWrap.appendChild(Utils.createTextEl('div', node.title, 'dash-random-title'));
    textWrap.appendChild(Utils.createTextEl('div', typeLabel(node.type), 'dash-random-type'));
    wrap.appendChild(textWrap);
    wrap.onclick = ()=> openDetail(node);
    dashRandomBody.appendChild(wrap);
  }

  dashRandomBtn.onclick = async ()=>{
    const dashboardService = await getDashboardService();
    renderDashRandom(dashboardService);
  };

  dashOpenGraphBtn.onclick = ()=> viewGraphBtn.click();

  /**
   * بناء كل ويدجتات الـ Dashboard. بتتنادى مرة عند الإقلاع، وبعد أي حدث ممكن
   * يغيّر محتواها (إضافة عنصر/رابط جديد، أو فتح تفاصيل عنصر — عشان "آخر ما
   * استكشفته" يتحدّث فورًا).
   */
  async function renderDashboard(){
    const dashboardService = await getDashboardService();

    // ---- إحصائيات المعرفة ----
    const stats = dashboardService.getKnowledgeStats();
    dashStatsBody.innerHTML = '';
    [
      { label: 'إجمالي العقد', value: stats.totalNodes },
      { label: 'إجمالي العلاقات', value: stats.totalEdges },
      { label: 'مجموعات زمنية', value: stats.totalGroups },
      { label: 'أنواع عقد مختلفة', value: Object.keys(stats.nodesByType).length }
    ].forEach(row=>{
      const div = document.createElement('div');
      div.className = 'dash-stat-row';
      div.appendChild(Utils.createTextEl('span', row.label, 'dash-stat-label'));
      div.appendChild(Utils.createTextEl('span', String(row.value), 'dash-stat-value'));
      dashStatsBody.appendChild(div);
    });
    const fullStatsBtn = Utils.createTextEl('div', 'إحصائيات تفصيلية كاملة ↗', 'dash-list-item');
    fullStatsBtn.onclick = async ()=>{ await renderMetrics(); metricsModal.classList.add('show'); };
    dashStatsBody.appendChild(fullStatsBtn);

    // ---- صحة البيانات (Knowledge Health Monitor موسّع — PART 04 Phase D) ----
    const health = dashboardService.getHealthReport();
    dashHealthBody.innerHTML = '';
    const coverageRow = document.createElement('div');
    coverageRow.className = 'dash-stat-row';
    coverageRow.appendChild(Utils.createTextEl('span', 'نسبة تغطية الشبكة (عقد ليها علاقة واحدة على الأقل)', 'dash-stat-label'));
    coverageRow.appendChild(Utils.createTextEl('span', health.coveragePct.toFixed(1) + '%', 'dash-stat-value'));
    dashHealthBody.appendChild(coverageRow);

    if(typeof health.evidenceCoveragePct === 'number'){
      const evidenceRow = document.createElement('div');
      evidenceRow.className = 'dash-stat-row';
      evidenceRow.appendChild(Utils.createTextEl('span', 'تغطية الأدلة (علاقات ليها مصدر مسجّل)', 'dash-stat-label'));
      evidenceRow.appendChild(Utils.createTextEl('span', health.evidenceCoveragePct.toFixed(1) + '%', 'dash-stat-value'));
      dashHealthBody.appendChild(evidenceRow);
    }

    if(!health.issues.length){
      dashHealthBody.appendChild(Utils.createTextEl('div', '✅ لا توجد أي مشاكل سلامة بيانات مكتشفة.', 'dash-health-ok'));
    } else {
      dashHealthBody.appendChild(Utils.createTextEl('div', `⚠️ ${health.issues.length} ملاحظة سلامة بيانات:`, 'dash-health-warn'));
      Object.entries(health.issuesByCategory).filter(([,count])=> count > 0).forEach(([category, count])=>{
        dashHealthBody.appendChild(Utils.createTextEl('div', `• ${category}: ${count}`, 'dash-health-detail'));
      });
    }

    if(health.orphanNodes.length){
      dashHealthBody.appendChild(Utils.createTextEl('div', `🕳️ ${health.orphanNodes.length} عنصر بدون أي علاقة مسجّلة (معزول عن باقي الشبكة).`, 'dash-health-warn'));
    }

    if(health.weakRelations && health.weakRelations.length){
      dashHealthBody.appendChild(Utils.createTextEl('div', `🔗 ${health.weakRelations.length} علاقة ضعيفة (قوة <= 2).`, 'dash-health-warn'));
    }

    // دورات في الشبكة (Circular Relations — PART03) — hasCycle موجودة في graphLayer، بتتفحص هنا بس
    // (مش جوه knowledgeLayer.computeHealthReport نفسها) عشان نتجنّب اعتمادية دائرية بين الطبقتين.
    const graphServiceForHealth = await getGraphService();
    if(graphServiceForHealth.hasCycle()){
      dashHealthBody.appendChild(Utils.createTextEl('div', `🔁 تم اكتشاف دورة (cycle) واحدة على الأقل في شبكة العلاقات.`, 'dash-health-warn'));
    }

    // ---- حالة النظام ----
    const status = dashboardService.getSystemStatus();
    dashStatusBody.innerHTML = '';
    [
      { label: 'عناصر أساسية', value: status.totalNodes },
      { label: 'مجموعات زمنية', value: status.totalGroups },
      { label: 'عناصر أضفتها بنفسك', value: status.customNodesCount },
      { label: 'روابط أضفتها بنفسك', value: status.customEdgesCount }
    ].forEach(row=>{
      const div = document.createElement('div');
      div.className = 'dash-stat-row';
      div.appendChild(Utils.createTextEl('span', row.label, 'dash-stat-label'));
      div.appendChild(Utils.createTextEl('span', String(row.value), 'dash-stat-value'));
      dashStatusBody.appendChild(div);
    });

    // ---- آخر إضافاتك (عقد وروابط مخصّصة، الأحدث أولًا) ----
    const { nodes: recentNodes, edges: recentEdges } = dashboardService.getRecentAdditions({ limit: 5 });
    dashRecentAddedBody.innerHTML = '';
    if(!recentNodes.length && !recentEdges.length){
      dashRecentAddedBody.appendChild(Utils.createTextEl('div', 'لسه ما ضفتش أي عنصر أو رابط بنفسك.', 'dash-empty'));
    } else {
      recentNodes.forEach(n=> dashRecentAddedBody.appendChild(buildDashListItem(n, 'عنصر جديد')));
      recentEdges.forEach(e=>{
        const fromNode = knowledgeLayer.findNodeById(e.from);
        const toNode = knowledgeLayer.findNodeById(e.to);
        if(!fromNode || !toNode) return;
        const item = document.createElement('div');
        item.className = 'dash-list-item';
        item.appendChild(Utils.createTextEl('span', `${fromNode.title} ↔ ${toNode.title}`));
        item.appendChild(Utils.createTextEl('span', 'رابط جديد', 'dli-type'));
        item.onclick = ()=> openDetail(fromNode);
        dashRecentAddedBody.appendChild(item);
      });
    }

    // ---- آخر ما استكشفته ----
    const viewed = dashboardService.getRecentlyViewed({ limit: 6 });
    dashRecentViewedBody.innerHTML = '';
    if(!viewed.length){
      dashRecentViewedBody.appendChild(Utils.createTextEl('div', 'لسه ما فتحتش تفاصيل أي عنصر.', 'dash-empty'));
    } else {
      viewed.forEach(n=> dashRecentViewedBody.appendChild(buildDashListItem(n)));
    }

    // ---- المفضّلة ----
    const bookmarked = dashboardService.getBookmarkedNodes();
    dashBookmarksBody.innerHTML = '';
    if(!bookmarked.length){
      dashBookmarksBody.appendChild(Utils.createTextEl('div', 'مفيش عناصر في المفضّلة لسه — افتح تفاصيل أي عنصر وضغط ⭐.', 'dash-empty'));
    } else {
      bookmarked.forEach(n=> dashBookmarksBody.appendChild(buildDashListItem(n)));
    }

    // ---- اكتشاف عشوائي ----
    renderDashRandom(dashboardService);

    // ---- نظرة عامة على الشبكة ----
    dashGraphOverviewBody.innerHTML = '';
    const topConnected = stats.topConnected && stats.topConnected[0];
    dashGraphOverviewBody.appendChild(Utils.createTextEl('div', `${stats.totalNodes} عقدة، ${stats.totalEdges} علاقة`, 'dash-stat-row'));
    if(topConnected){
      const item = buildDashListItem(topConnected.node, `الأكتر ارتباطًا (${topConnected.degree})`);
      dashGraphOverviewBody.appendChild(item);
    }
  }

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
      eventBusPromise = injectedEventBus
        ? Promise.resolve(injectedEventBus)
        : import('../src/core/EventBus.js').then(({ EventBus })=> new EventBus());
    }
    return eventBusPromise;
  }

  // ---------------- ErrorManager + toast الأخطاء ----------------
  // بتستخدم نفس الـ eventBus المشترك فوق — لو app.js حقن eventBus، فأي
  // خطأ اتبلّغ من businessLayer (عبر errorManager المحقون هناك) هيوصل
  // هنا كمان ويتعرض كـ toast، من غير ما renderLayer يعرف حاجة عن مصدره.
  let errorManagerPromise = null;
  function getErrorManager(){
    if(!errorManagerPromise){
      errorManagerPromise = Promise.all([
        getEventBus(),
        import('../src/services/ErrorManager.js')
      ]).then(([bus, { ErrorManager }])=> new ErrorManager({ eventBus: bus }));
    }
    return errorManagerPromise;
  }

  let errorToastTimer = null;
  function showErrorToast(message){
    if(!errorToastEl) return;
    errorToastEl.textContent = message;
    errorToastEl.hidden = false;
    clearTimeout(errorToastTimer);
    errorToastTimer = setTimeout(()=>{ errorToastEl.hidden = true; }, 6000);
  }

  async function initErrorToast(){
    const bus = await getEventBus();
    const { SYSTEM_EVENTS } = await import('../src/core/EventBus.js');
    bus.on(SYSTEM_EVENTS.APP_ERROR, ({ userMessage })=> showErrorToast(userMessage));
  }
  initErrorToast();

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

    const [data, dashboardService] = await Promise.all([
      businessLayer.fetchTmdbData(node.title, node.type),
      getDashboardService()
    ]);
    dashboardService.recordView(node.id);
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
    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;gap:10px;';
    titleRow.appendChild(Utils.createTextEl('h2', node.title));
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = 'small-btn bookmark-btn';
    const paintBookmarkBtn = ()=>{
      const isBookmarked = dashboardService.isBookmarked(node.id);
      bookmarkBtn.textContent = isBookmarked ? '⭐ في المفضّلة' : '☆ أضف للمفضّلة';
      bookmarkBtn.classList.toggle('active', isBookmarked);
    };
    paintBookmarkBtn();
    bookmarkBtn.onclick = ()=>{
      dashboardService.toggleBookmark(node.id);
      paintBookmarkBtn();
    };
    titleRow.appendChild(bookmarkBtn);
    bodyDiv.appendChild(titleRow);
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

    const knowledgeService = await getKnowledgeService();
    const relations = knowledgeService.getEdgesForNode(node.id);

    // ---- الإحصائيات (Smart Node Page — PART 04 Phase B) ----
    const statsSection = document.createElement('div');
    statsSection.className = 'detail-stats-section';
    statsSection.appendChild(Utils.createTextEl('h3', '📊 إحصائيات العنصر'));
    const statsGrid = document.createElement('div');
    statsGrid.className = 'detail-stats-grid';
    const typeBreakdown = {};
    relations.forEach(({ otherNode })=>{
      if(!otherNode) return;
      typeBreakdown[otherNode.type] = (typeBreakdown[otherNode.type] || 0) + 1;
    });
    const statLines = [`إجمالي العلاقات: ${relations.length}`];
    Object.entries(typeBreakdown).forEach(([type, count])=>{
      statLines.push(`${typeLabel(type)}: ${count}`);
    });
    if(node.createdAt){
      statLines.push(`أُضيفت بواسطتك في: ${new Date(node.createdAt).toLocaleDateString('ar-EG')}`);
    }
    statLines.forEach(line=> statsGrid.appendChild(Utils.createTextEl('div', line, 'detail-stat-chip')));
    statsSection.appendChild(statsGrid);
    detailBody.appendChild(statsSection);

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
        const inspectBtn = Utils.createTextEl('span', '🔍', 'link-item-inspect');
        inspectBtn.title = 'فحص العلاقة بالتفصيل';
        inspectBtn.onclick = (e)=>{ e.stopPropagation(); openRelationshipInspector(edge); };
        titleLine.appendChild(inspectBtn);
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

  /**
   * بيفلتر بيانات الشبكة (nodesData/linksData) حسب حالة LayerService الحالية:
   * أي عقدة نوعها في طبقة مخفية بتتشال، وأي عقدة hub بتتشال لو الطبقة الخاصة
   * بيها (Hubs) مطفية أو لو forceHideHubs=true (مستخدمة في النمطين الجديدين
   * اللي أصلًا مش بيعرضوا hubs). أي رابط طرفه عقدة اتشالت بيتشال معاها.
   */
  function filterGraphDataForLayers(nodesData, linksData, layerService, forceHideHubs){
    const hideHubsNow = forceHideHubs || !layerService.isHubsVisible();
    const filteredNodes = nodesData.filter(d=> d.isHub ? !hideHubsNow : layerService.isTypeVisible(d.node.type));
    const visibleIds = new Set(filteredNodes.map(d=> d.id));
    const filteredLinks = linksData.filter(l=>{
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return visibleIds.has(sourceId) && visibleIds.has(targetId);
    });
    return { nodesData: filteredNodes, linksData: filteredLinks };
  }

  async function renderGraph(){
    const searchService = await getSearchService();
    const graphService = await getGraphService();
    const layerService = await getLayerService();
    renderGraphLegend();
    const svg = d3.select('#graphSvg');
    svg.selectAll('*').remove();
    const width = graphView.clientWidth, height = graphView.clientHeight;
    svg.attr('viewBox', [0,0,width,height]);

    const zoomLayer = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.2,4]).on('zoom', (e)=> zoomLayer.attr('transform', e.transform)));

    const raw = graphService.buildGraphData();
    // أنماط "دائري" و"أعمدة" بيعرضوا العُقد الحقيقية فقط، من غير عُقد hub
    // الوهمية بتاعة تجميع المجموعة الزمنية (قرار نطاق: تجميع الـ hub مفهوم
    // خاص بالنمط الحر، مش له معنى في تخطيط دائري أو عمودي بموضع ثابت).
    const forceHideHubs = graphViewMode !== 'force';
    let { nodesData, linksData } = filterGraphDataForLayers(raw.nodesData, raw.linksData, layerService, forceHideHubs);
    // فلتر الحد الأدنى لقوة العلاقة (MARVEL-FIX-MASTER-PROMPT.md بند 1.2) — بيؤثر بس
    // على الروابط الحقيقية (cross-links)، مش روابط hub-التجميع الداخلية (مالهاش weight أصلًا).
    linksData = linksData.filter(l=> !l.isCross || searchService.edgeMatchesWeight({ weight: l.edgeWeight }));

    let sim;
    if(graphViewMode === 'radial'){
      const layerKeys = Object.keys(CONFIG.LAYER_GROUPS);
      const typeToLayerIndex = new Map();
      layerKeys.forEach((key, idx)=> CONFIG.LAYER_GROUPS[key].types.forEach(t=> typeToLayerIndex.set(t, idx)));
      const ringGap = Math.max(50, Math.min(width, height) / (layerKeys.length + 1) / 1.4);
      const ringRadius = d=>{
        const idx = typeToLayerIndex.has(d.node.type) ? typeToLayerIndex.get(d.node.type) : layerKeys.length;
        return ringGap * (idx + 1);
      };
      sim = d3.forceSimulation(nodesData)
        .force('link', d3.forceLink(linksData).id(d=>d.id).distance(60).strength(0.15))
        .force('charge', d3.forceManyBody().strength(-40))
        .force('radial', d3.forceRadial(ringRadius, width/2, height/2).strength(0.9))
        .force('collide', d3.forceCollide().radius(18));
    } else if(graphViewMode === 'columns'){
      const knowledgeServiceGroups = knowledgeLayer.getGroups();
      const columnWidth = width / (knowledgeServiceGroups.length + 1);
      const xForNode = d=>{
        const idx = knowledgeServiceGroups.findIndex(g=> g.id === d.node.group);
        return columnWidth * ((idx === -1 ? knowledgeServiceGroups.length : idx) + 0.5);
      };
      sim = d3.forceSimulation(nodesData)
        .force('link', d3.forceLink(linksData).id(d=>d.id).distance(50).strength(0.1))
        .force('charge', d3.forceManyBody().strength(-30))
        .force('x', d3.forceX(xForNode).strength(0.85))
        .force('y', d3.forceY(height/2).strength(0.04))
        .force('collide', d3.forceCollide().radius(16));
    } else {
      sim = d3.forceSimulation(nodesData)
        .force('link', d3.forceLink(linksData).id(d=>d.id).distance(d=> d.source.isHub || d.target.isHub ? 70 : (d.isCross ? 90 : 40)))
        .force('charge', d3.forceManyBody().strength(-140))
        .force('center', d3.forceCenter(width/2, height/2))
        .force('collide', d3.forceCollide().radius(d=> d.isHub ? 50 : 22));
    }

    const link = zoomLayer.append('g').selectAll('line').data(linksData).join('line')
      .attr('class', d=> d.isCross ? 'glink cross-link' : 'glink')
      .style('stroke-width', d=> d.isCross && typeof d.edgeWeight === 'number' ? Math.max(1, d.edgeWeight / 3) : null)
      .style('cursor', d=> d.isCross ? 'pointer' : null)
      .on('click', (e, d)=>{
        if(!d.isCross || !d.edgeId) return;
        const edge = knowledgeLayer.findEdgeById(d.edgeId);
        if(edge) openRelationshipInspector(edge);
      });
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

  // ---------------- لوحة الطبقات (Layers System) ----------------
  async function renderGraphLayersPanel(){
    graphLayersPanel.innerHTML = '';
    const layerService = await getLayerService();

    layerService.getLayers().forEach(layer=>{
      const row = document.createElement('label');
      row.className = 'layer-toggle-row';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = layer.visible;
      checkbox.onchange = ()=>{ layerService.toggleLayer(layer.key); renderGraph(); };
      row.appendChild(checkbox);
      row.appendChild(document.createTextNode(' ' + layer.label));
      graphLayersPanel.appendChild(row);
    });

    if(graphViewMode === 'force'){
      const hubRow = document.createElement('label');
      hubRow.className = 'layer-toggle-row';
      const hubCheckbox = document.createElement('input');
      hubCheckbox.type = 'checkbox';
      hubCheckbox.checked = layerService.isHubsVisible();
      hubCheckbox.onchange = ()=>{ layerService.toggleHubs(); renderGraph(); };
      hubRow.appendChild(hubCheckbox);
      hubRow.appendChild(document.createTextNode(' 🏛️ عُقد تجميع المجموعات الزمنية (Hubs)'));
      graphLayersPanel.appendChild(hubRow);
    }

    const resetBtn = Utils.createTextEl('button', '↺ إعادة تعيين الطبقات', 'small-btn');
    resetBtn.onclick = ()=>{ layerService.resetAll(); renderGraphLayersPanel(); renderGraph(); };
    graphLayersPanel.appendChild(resetBtn);
  }

  toggleLayersBtn.onclick = async ()=>{
    const willShow = graphLayersPanel.hidden;
    if(willShow) await renderGraphLayersPanel();
    graphLayersPanel.hidden = !willShow;
  };

  graphViewModeSelect.onchange = async ()=>{
    graphViewMode = graphViewModeSelect.value;
    await renderGraph();
    if(!graphLayersPanel.hidden) await renderGraphLayersPanel();
  };

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

  // ---------------- أقصر مسار بين عنصرين ----------------
  let spFromPicked = null;
  let spToPicked = null;

  wireNodeSearchInput(spFromSearch, spFromResults, (n)=>{ spFromPicked = n; });
  wireNodeSearchInput(spToSearch, spToResults, (n)=>{ spToPicked = n; }, {
    excludeTitle: ()=> spFromPicked ? spFromPicked.title : null
  });

  shortestPathBtn.onclick = ()=>{
    spFromPicked = null; spToPicked = null;
    spFromSearch.value = ''; spToSearch.value = '';
    spFromResults.innerHTML = ''; spToResults.innerHTML = '';
    spResultBody.innerHTML = '';
    shortestPathModal.classList.add('show');
    spFromSearch.focus();
  };
  document.getElementById('shortestPathModalClose').onclick = ()=> shortestPathModal.classList.remove('show');
  shortestPathModal.onclick = (e)=>{ if(e.target===shortestPathModal) shortestPathModal.classList.remove('show'); };

  spCalcBtn.onclick = async ()=>{
    spResultBody.innerHTML = '';
    if(!spFromPicked || !spToPicked){
      spResultBody.appendChild(Utils.createTextEl('div', 'لازم تختار عنصر "من" وعنصر "إلى" الأول (من نتائج البحث).', 'sp-no-path'));
      return;
    }
    const graphService = await getGraphService();
    const path = graphService.shortestPath(spFromPicked.id, spToPicked.id);
    if(!path){
      spResultBody.appendChild(Utils.createTextEl(
        'div',
        `مفيش مسار متصل بين "${spFromPicked.title}" و"${spToPicked.title}" في الشبكة الحالية.`,
        'sp-no-path'
      ));
      return;
    }
    const chain = document.createElement('div');
    chain.className = 'sp-path-chain';
    path.forEach((node, i)=>{
      if(i > 0) chain.appendChild(Utils.createTextEl('span', '←', 'sp-path-arrow'));
      const chip = Utils.createTextEl('span', node.title, 'sp-path-node');
      chip.onclick = ()=>{ shortestPathModal.classList.remove('show'); openDetail(node); };
      chain.appendChild(chip);
    });
    spResultBody.appendChild(Utils.createTextEl('div', `المسافة: ${path.length - 1} علاقة`, 'sp-label'));
    spResultBody.appendChild(chain);
  };

  // ---------------- تحليل الشبكة (مكوّنات متصلة + كشف دورات) ----------------
  async function renderNetworkAnalysis(){
    networkAnalysisBody.innerHTML = '';
    const graphService = await getGraphService();
    const hasCycle = graphService.hasCycle();
    const components = graphService.connectedComponents();

    const summary = document.createElement('div');
    summary.className = 'metrics-summary';
    [
      { num: components.length, label: components.length === 1 ? 'مكوّن متصل واحد (الشبكة كلها متصلة)' : 'مكوّنات متصلة منفصلة' },
      { num: hasCycle ? 'نعم' : 'لا', label: 'فيه دورة (cycle) في الشبكة؟' }
    ].forEach(item=>{
      const div = document.createElement('div');
      div.className = 'metrics-summary-item';
      div.appendChild(Utils.createTextEl('div', String(item.num), 'num'));
      div.appendChild(Utils.createTextEl('div', item.label, 'label'));
      summary.appendChild(div);
    });
    networkAnalysisBody.appendChild(summary);

    if(components.length > 1){
      const section = document.createElement('div');
      section.className = 'metrics-section';
      section.appendChild(Utils.createTextEl('h4', `تفاصيل المكوّنات (${components.length}) — الشبكة مجزّأة لأجزاء غير متصلة ببعض`));
      components.forEach((component, i)=>{
        const item = document.createElement('div');
        item.className = 'na-component-item';
        item.appendChild(Utils.createTextEl('div', `مكوّن ${i + 1} — ${component.length} عنصر`, 'na-component-size'));
        const namesPreview = component.slice(0, 8).map(n=> n.title).join('، ') + (component.length > 8 ? ' ...' : '');
        item.appendChild(Utils.createTextEl('div', namesPreview, 'na-component-members'));
        section.appendChild(item);
      });
      networkAnalysisBody.appendChild(section);
    }
  }

  networkAnalysisBtn.onclick = async ()=>{
    await renderNetworkAnalysis();
    networkAnalysisModal.classList.add('show');
  };
  document.getElementById('networkAnalysisModalClose').onclick = ()=> networkAnalysisModal.classList.remove('show');
  networkAnalysisModal.onclick = (e)=>{ if(e.target===networkAnalysisModal) networkAnalysisModal.classList.remove('show'); };

  // ---------------- محرك الاستنتاج (Inference Engine — MARVEL-FIX-MASTER-PROMPT Stage 1) ----------------
  async function renderInferenceSuggestions(){
    inferenceBody.innerHTML = '';
    const inferenceService = await getInferenceService();
    const suggestions = inferenceService.getSuggestions({ minCommonNeighbors: 2 });
    if(!suggestions.length){
      inferenceBody.appendChild(Utils.createTextEl('div', 'مفيش اقتراحات جديدة دلوقتي — إما كل الاحتمالات القوية اتغطّت، أو اتجاهلت قبل كده.', 'ie-empty'));
      return;
    }
    suggestions.forEach(s=>{
      const item = document.createElement('div');
      item.className = 'ie-suggestion-item';
      item.appendChild(Utils.createTextEl('div', `${s.fromTitle} ↔ ${s.toTitle}`, 'ie-suggestion-pair'));
      const reasonText = `${s.count} عنصر مشترك بينهم: ${s.commonNeighborTitles.slice(0, 5).join('، ')}${s.commonNeighborTitles.length > 5 ? ' ...' : ''}`;
      item.appendChild(Utils.createTextEl('div', reasonText, 'ie-suggestion-reason'));
      const actions = document.createElement('div');
      actions.className = 'ie-suggestion-actions';
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'ie-accept';
      acceptBtn.textContent = '✓ قبول وإضافة';
      acceptBtn.onclick = async ()=>{
        businessLayer.addManualEdge({
          fromNodeId: s.fromId,
          toNodeId: s.toId,
          description: `علاقة مقترحة (${s.count} عنصر مشترك) — اتقبلت من محرك الاستنتاج`,
          type: 'connected_to'
        });
        inferenceService.dismissSuggestion(s.id);
        await renderInferenceSuggestions();
        if(graphView.style.display !== 'none') renderGraph();
        if(dashboardView.style.display !== 'none') renderDashboard();
      };
      const dismissBtn = document.createElement('button');
      dismissBtn.className = 'ie-dismiss';
      dismissBtn.textContent = '✕ تجاهل';
      dismissBtn.onclick = async ()=>{
        inferenceService.dismissSuggestion(s.id);
        await renderInferenceSuggestions();
      };
      actions.appendChild(acceptBtn);
      actions.appendChild(dismissBtn);
      item.appendChild(actions);
      inferenceBody.appendChild(item);
    });
  }

  inferenceBtn.onclick = async ()=>{
    inferenceBody.innerHTML = '<div class="ie-empty">بيتحسب...</div>';
    inferenceModal.classList.add('show');
    await renderInferenceSuggestions();
  };
  document.getElementById('inferenceModalClose').onclick = ()=> inferenceModal.classList.remove('show');
  inferenceModal.onclick = (e)=>{ if(e.target===inferenceModal) inferenceModal.classList.remove('show'); };

  // ---------------- فحص العلاقة (Relationship Inspector — PART 04 Phase D) ----------------
  const EDGE_TYPE_LABELS = {
    connected_to: 'مرتبط بـ', first_appeared: 'ظهر لأول مرة في', created: 'من إنتاج/تأليف',
    introduced_in: 'اتقدّم في', member_of: 'عضو في', owns: 'بيمتلك', enemy_of: 'عدو لـ',
    uses: 'بيستخدم', located_in: 'موجود في', originated_from: 'ابتدى من',
    cameo: 'ظهور خاطف في', multiverse_link: 'رابط كون بديل', post_credit_to: 'مشهد ما بعد التتر يؤدي لـ'
  };
  function edgeTypeLabel(type){ return EDGE_TYPE_LABELS[type] || type; }

  async function renderRelationshipInspector(edge){
    relationshipBody.innerHTML = '';
    const knowledgeService = await getKnowledgeService();
    const fromNode = knowledgeService.findNodeById(edge.from);
    const toNode = knowledgeService.findNodeById(edge.to);

    const headerRow = document.createElement('div');
    headerRow.className = 'ri-header';
    const fromChip = Utils.createTextEl('span', fromNode ? fromNode.title : '(عنصر محذوف)', 'ri-node-chip');
    const arrow = Utils.createTextEl('span', edge.direction === 'directed' ? '→' : '↔', 'ri-arrow');
    const toChip = Utils.createTextEl('span', toNode ? toNode.title : '(عنصر محذوف)', 'ri-node-chip');
    if(fromNode) fromChip.onclick = ()=>{ relationshipModal.classList.remove('show'); openDetail(fromNode); };
    if(toNode) toChip.onclick = ()=>{ relationshipModal.classList.remove('show'); openDetail(toNode); };
    headerRow.appendChild(fromChip);
    headerRow.appendChild(arrow);
    headerRow.appendChild(toChip);
    relationshipBody.appendChild(headerRow);

    relationshipBody.appendChild(Utils.createTextEl('div', `النوع: ${edgeTypeLabel(edge.type)}`, 'ri-meta'));
    relationshipBody.appendChild(Utils.createTextEl('div', `الاتجاه: ${edge.direction === 'directed' ? 'اتجاهي (من الأول للتاني)' : 'غير اتجاهي (متبادل)'}`, 'ri-meta'));
    if(typeof edge.weight === 'number'){
      relationshipBody.appendChild(Utils.createTextEl('div', `قوة العلاقة: ${edge.weight}/10`, 'ri-meta'));
    }
    if(typeof edge.confidence === 'number'){
      relationshipBody.appendChild(Utils.createTextEl('div', `درجة الثقة: ${edge.confidence}%`, 'ri-meta'));
    }
    relationshipBody.appendChild(Utils.createTextEl('div', edge.description || 'مفيش وصف مسجّل لهذه العلاقة.', 'ri-description'));

    // ---- المصدر (Evidence System) — عرض + واجهة إضافة/تعديل يدوية (MARVEL-FIX-MASTER-PROMPT.md بند 1.1) ----
    const sourceRow = document.createElement('div');
    sourceRow.className = 'ri-source-row';
    const sourceLabel = Utils.createTextEl('span', edge.source ? `المصدر: ${edge.source}` : 'المصدر: (غير مسجّل)', 'ri-meta');
    const editSourceBtn = document.createElement('button');
    editSourceBtn.className = 'small-btn ri-edit-source-btn';
    editSourceBtn.textContent = edge.source ? '✏️ تعديل المصدر' : '➕ إضافة مصدر';
    editSourceBtn.onclick = ()=>{
      sourceRow.innerHTML = '';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'ri-source-input';
      input.value = edge.source || '';
      input.placeholder = 'اكتب مصدر العلاقة (مثلاً اسم فيلم/مسلسل)...';
      const saveBtn = document.createElement('button');
      saveBtn.className = 'small-btn';
      saveBtn.textContent = '💾 حفظ';
      saveBtn.onclick = ()=>{
        const updated = businessLayer.updateEdgeSource(edge.id, input.value);
        if(updated) renderRelationshipInspector(updated);
      };
      input.onkeydown = (e)=>{ if(e.key === 'Enter') saveBtn.click(); };
      sourceRow.appendChild(input);
      sourceRow.appendChild(saveBtn);
      input.focus();
    };
    sourceRow.appendChild(sourceLabel);
    sourceRow.appendChild(editSourceBtn);
    relationshipBody.appendChild(sourceRow);
    if(edge.createdAt){
      relationshipBody.appendChild(Utils.createTextEl('div', `أُضيفت بواسطتك في: ${new Date(edge.createdAt).toLocaleDateString('ar-EG')}`, 'ri-meta'));
    }

    if(fromNode && toNode){
      const otherBetweenSame = knowledgeService.getEdgesForNode(fromNode.id)
        .filter(({ edge: e2, otherNode })=> otherNode && otherNode.id === toNode.id && e2.id !== edge.id);
      if(otherBetweenSame.length){
        const section = document.createElement('div');
        section.className = 'ri-other-section';
        section.appendChild(Utils.createTextEl('h4', `علاقات أخرى بين نفس العنصرين (${otherBetweenSame.length})`));
        otherBetweenSame.forEach(({ edge: e2 })=>{
          const item = Utils.createTextEl('div', `${edgeTypeLabel(e2.type)} — ${e2.description || ''}`, 'ri-other-item');
          item.onclick = ()=> renderRelationshipInspector(e2);
          section.appendChild(item);
        });
        relationshipBody.appendChild(section);
      }
    }
  }

  function openRelationshipInspector(edge){
    if(!edge) return;
    renderRelationshipInspector(edge);
    relationshipModal.classList.add('show');
  }
  document.getElementById('relationshipModalClose').onclick = ()=> relationshipModal.classList.remove('show');
  relationshipModal.onclick = (e)=>{ if(e.target===relationshipModal) relationshipModal.classList.remove('show'); };

  // ---------------- مقارنة بين عنصرين (Comparison Engine — PART 04 Phase D) ----------------
  let cmpAPicked = null;
  let cmpBPicked = null;

  wireNodeSearchInput(cmpASearch, cmpAResults, (n)=>{ cmpAPicked = n; });
  wireNodeSearchInput(cmpBSearch, cmpBResults, (n)=>{ cmpBPicked = n; }, {
    excludeTitle: ()=> cmpAPicked ? cmpAPicked.title : null
  });

  comparisonBtn.onclick = ()=>{
    cmpAPicked = null; cmpBPicked = null;
    cmpASearch.value = ''; cmpBSearch.value = '';
    cmpAResults.innerHTML = ''; cmpBResults.innerHTML = '';
    cmpResultBody.innerHTML = '';
    comparisonModal.classList.add('show');
    cmpASearch.focus();
  };
  document.getElementById('comparisonModalClose').onclick = ()=> comparisonModal.classList.remove('show');
  comparisonModal.onclick = (e)=>{ if(e.target===comparisonModal) comparisonModal.classList.remove('show'); };

  cmpCalcBtn.onclick = async ()=>{
    cmpResultBody.innerHTML = '';
    if(!cmpAPicked || !cmpBPicked){
      cmpResultBody.appendChild(Utils.createTextEl('div', 'لازم تختار العنصر الأول والتاني الأول (من نتائج البحث).', 'sp-no-path'));
      return;
    }
    const graphService = await getGraphService();
    const knowledgeService = await getKnowledgeService();
    const degreeA = knowledgeService.getEdgesForNode(cmpAPicked.id).length;
    const degreeB = knowledgeService.getEdgesForNode(cmpBPicked.id).length;
    const shared = graphService.commonNeighbors(cmpAPicked.id, cmpBPicked.id);
    const path = graphService.shortestPath(cmpAPicked.id, cmpBPicked.id);

    const columns = document.createElement('div');
    columns.className = 'cmp-columns';
    [cmpAPicked, cmpBPicked].forEach((node, i)=>{
      const col = document.createElement('div');
      col.className = 'cmp-col';
      col.appendChild(Utils.createTextEl('h4', node.title));
      col.appendChild(Utils.createTextEl('div', `النوع: ${typeLabel(node.type)}`, 'ri-meta'));
      col.appendChild(Utils.createTextEl('div', `عدد العلاقات: ${i === 0 ? degreeA : degreeB}`, 'ri-meta'));
      if(node.group){
        const group = knowledgeService.getGroups().find(g=> g.id === node.group);
        col.appendChild(Utils.createTextEl('div', `المجموعة الزمنية: ${group ? group.name : node.group}`, 'ri-meta'));
      }
      columns.appendChild(col);
    });
    cmpResultBody.appendChild(columns);

    cmpResultBody.appendChild(Utils.createTextEl('div',
      cmpAPicked.type === cmpBPicked.type ? `✅ نفس النوع (${typeLabel(cmpAPicked.type)})` : `الأنواع مختلفة: ${typeLabel(cmpAPicked.type)} / ${typeLabel(cmpBPicked.type)}`,
      'ri-meta'));
    cmpResultBody.appendChild(Utils.createTextEl('div',
      (cmpAPicked.group && cmpAPicked.group === cmpBPicked.group) ? '✅ نفس المجموعة الزمنية' : 'مش في نفس المجموعة الزمنية',
      'ri-meta'));
    cmpResultBody.appendChild(Utils.createTextEl('div',
      path ? `أقصر مسافة بينهم: ${path.length - 1} علاقة` : 'مفيش مسار متصل بينهم في الشبكة الحالية.',
      'ri-meta'));

    const sharedSection = document.createElement('div');
    sharedSection.className = 'cmp-shared-section';
    sharedSection.appendChild(Utils.createTextEl('h4', `عناصر مشتركة بينهم (${shared.length})`));
    if(!shared.length){
      sharedSection.appendChild(Utils.createTextEl('div', 'مفيش عناصر مرتبطة بالاتنين مع بعض.', 'ri-meta'));
    } else {
      shared.forEach(n=>{
        const item = Utils.createTextEl('div', `${typeLabel(n.type)}: ${n.title}`, 'cmp-shared-item');
        item.onclick = ()=>{ comparisonModal.classList.remove('show'); openDetail(n); };
        sharedSection.appendChild(item);
      });
    }
    cmpResultBody.appendChild(sharedSection);
  };

  // ---------------- تحليلات المعرفة (Knowledge Analytics — PART 04 Phase D) ----------------
  const ROLE_LABELS = { actor: '🎭 الممثلين', director: '🎬 المخرجين', writer: '✍️ الكتّاب', composer: '🎼 الموسيقيين' };

  async function renderAnalytics(){
    analyticsBody.innerHTML = '';
    const knowledgeService = await getKnowledgeService();
    const analytics = knowledgeService.computeAnalytics();

    [
      { label: 'كثافة الشبكة (نسبة العلاقات الفعلية للممكنة)', value: analytics.density.toFixed(2) + '%' },
      { label: 'متوسط عدد العلاقات لكل عنصر', value: analytics.avgDegree.toFixed(2) },
      { label: 'نسبة العناصر المُضافة يدويًا', value: `${analytics.customRatio.nodes.custom} من ${analytics.customRatio.nodes.total}` },
      { label: 'نسبة العلاقات المُضافة يدويًا', value: `${analytics.customRatio.edges.custom} من ${analytics.customRatio.edges.total}` }
    ].forEach(row=>{
      const div = document.createElement('div');
      div.className = 'an-summary-row';
      div.appendChild(Utils.createTextEl('span', row.label));
      div.appendChild(Utils.createTextEl('span', String(row.value)));
      analyticsBody.appendChild(div);
    });

    const densitySection = document.createElement('div');
    densitySection.className = 'metrics-section';
    densitySection.appendChild(Utils.createTextEl('h4', 'الكثافة الزمنية (توزيع العناصر عبر المجموعات)'));
    const maxCount = Math.max(...analytics.temporalDensity.map(d=> d.count), 1);
    analytics.temporalDensity.forEach(({ group, count, pct })=>{
      const row = document.createElement('div');
      row.className = 'metrics-bar-row';
      row.appendChild(Utils.createTextEl('div', group.name, 'metrics-bar-label'));
      const track = document.createElement('div');
      track.className = 'metrics-bar-track';
      const fill = document.createElement('div');
      fill.className = 'metrics-bar-fill';
      fill.style.width = Math.round((count / maxCount) * 100) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(Utils.createTextEl('div', `${count} (${pct.toFixed(1)}%)`, 'metrics-bar-count'));
      densitySection.appendChild(row);
    });
    analyticsBody.appendChild(densitySection);

    const roleSection = document.createElement('div');
    roleSection.className = 'an-role-block';
    roleSection.appendChild(Utils.createTextEl('h4', 'الأكثر ارتباطًا بأفلام/مسلسلات حسب الدور'));
    Object.entries(ROLE_LABELS).forEach(([role, label])=>{
      const block = document.createElement('div');
      block.className = 'an-role-block';
      block.appendChild(Utils.createTextEl('h5', label));
      const list = analytics.topByRole[role];
      if(!list.length){
        block.appendChild(Utils.createTextEl('div', 'مفيش بيانات كافية لسه.', 'ri-meta'));
      } else {
        list.forEach(({ node, mediaCount })=>{
          const item = Utils.createTextEl('div', `${node.title} — ${mediaCount} ارتباط مباشر`, 'cmp-shared-item');
          item.onclick = ()=>{ analyticsModal.classList.remove('show'); openDetail(node); };
          block.appendChild(item);
        });
      }
      roleSection.appendChild(block);
    });
    analyticsBody.appendChild(roleSection);
  }

  analyticsBtn.onclick = async ()=>{
    await renderAnalytics();
    analyticsModal.classList.add('show');
  };
  document.getElementById('analyticsModalClose').onclick = ()=> analyticsModal.classList.remove('show');
  analyticsModal.onclick = (e)=>{ if(e.target===analyticsModal) analyticsModal.classList.remove('show'); };

  // ============================================================
  // أوضاع الاستكشاف (PART 04 — Phase E): وضع المحقق، وضع الحكاية،
  // بحث متعمّق، إعادة تشغيل الرحلة. الأربعة بيستخدموا بيانات حقيقية فقط
  // (علاقات/سجل مشاهدة موجود بالفعل) — مفيش أي محتوى مُختلَق.
  // ============================================================

  // ---------------- وضع المحقق (Detective Mode) ----------------
  let detectiveNode = null;
  let detectiveClues = [];
  let detectiveRevealedCount = 1;
  let detectiveSolved = false;

  async function renderDetective(){
    detectiveBody.innerHTML = '';
    if(!detectiveNode){
      detectiveBody.appendChild(Utils.createTextEl('div', 'مفيش عناصر كفاية في الخريطة الحالية عشان نبدأ لغز.', 'sp-no-path'));
      return;
    }
    detectiveBody.appendChild(Utils.createTextEl('div', `عنصر غامض — ${detectiveClues.length} دليل متاح، ظاهر منهم ${Math.min(detectiveRevealedCount, detectiveClues.length)}`, 'sp-label'));

    const clueList = document.createElement('div');
    clueList.className = 'detective-clue-list';
    detectiveClues.slice(0, detectiveRevealedCount).forEach((clue, i)=>{
      const item = document.createElement('div');
      item.className = 'detective-clue-item';
      item.appendChild(Utils.createTextEl('span', `دليل ${i + 1}`, 'detective-clue-num'));
      item.appendChild(Utils.createTextEl('span', clue.text));
      clueList.appendChild(item);
    });
    if(!detectiveClues.length){
      clueList.appendChild(Utils.createTextEl('div', 'العنصر ده مفيهوش أي علاقات موصوفة نقدر نستخرج منها أدلة — جرّب لغز تاني.', 'ri-meta'));
    }
    detectiveBody.appendChild(clueList);

    if(!detectiveSolved && detectiveRevealedCount < detectiveClues.length){
      const moreBtn = document.createElement('button');
      moreBtn.className = 'small-btn';
      moreBtn.textContent = '🔎 دليل كمان';
      moreBtn.onclick = ()=>{ detectiveRevealedCount++; renderDetective(); };
      detectiveBody.appendChild(moreBtn);
    }

    if(!detectiveSolved){
      const guessWrap = document.createElement('div');
      guessWrap.className = 'detective-guess-wrap';
      const guessInput = document.createElement('input');
      guessInput.type = 'text';
      guessInput.placeholder = 'خمّن اسم العنصر...';
      const guessResults = document.createElement('div');
      guessResults.className = 'sp-results';
      guessWrap.appendChild(guessInput);
      guessWrap.appendChild(guessResults);
      detectiveBody.appendChild(guessWrap);

      wireNodeSearchInput(guessInput, guessResults, async (picked)=>{
        // [FIX] wireNodeSearchInput بينادي onPick(null) فورًا مع كل حرف يتكتب
        // (عشان يلغي أي اختيار سابق) — من غير الشرط ده كان بيرمي استثناء على
        // طول (picked.id) مع أول حرف، فوضع المحقق كان بيبوظ فعليًا بمجرد ما
        // المستخدم يبدأ يكتب في حقل التخمين. اتكشفت بالـ E2E test الحقيقي.
        if(!picked) return;
        if(picked.id === detectiveNode.id){
          detectiveSolved = true;
          // [FIX] لازم نعمل renderDetective() هنا زي مسار "استسلم" بالظبط —
          // من غيرها حقل التخمين فضل ظاهر وزرار "استسلم واعرض الحل" فضل بنصه
          // القديم (بينما سلوكه الفعلي بقى "لغز جديد" بسبب detectiveSolved)،
          // يعني الزرار بيبقى بيكدب شكله. اتكشفت بالـ E2E test الحقيقي.
          await renderDetective();
          const resultEl = document.createElement('div');
          resultEl.className = 'detective-result detective-result-correct';
          resultEl.textContent = `✅ صح! العنصر الغامض كان "${detectiveNode.title}".`;
          const openBtn = document.createElement('button');
          openBtn.className = 'small-btn';
          openBtn.textContent = 'افتح تفاصيله';
          openBtn.onclick = ()=>{ detectiveModal.classList.remove('show'); openDetail(detectiveNode); };
          detectiveBody.appendChild(resultEl);
          detectiveBody.appendChild(openBtn);
        } else {
          const resultEl = document.createElement('div');
          resultEl.className = 'detective-result detective-result-wrong';
          resultEl.textContent = `❌ لأ، "${picked.title}" مش هو. جرّب دليل كمان أو خمّن تاني.`;
          detectiveBody.appendChild(resultEl);
        }
      });
    }

    const giveUpBtn = document.createElement('button');
    giveUpBtn.className = 'small-btn';
    giveUpBtn.textContent = detectiveSolved ? '🕵️ لغز جديد' : '🏳️ استسلم واعرض الحل';
    giveUpBtn.onclick = ()=>{
      if(detectiveSolved){ startNewMystery(); return; }
      detectiveSolved = true;
      renderDetective();
      const revealEl = Utils.createTextEl('div', `الحل: "${detectiveNode.title}"`, 'detective-result');
      detectiveBody.appendChild(revealEl);
      const openBtn = document.createElement('button');
      openBtn.className = 'small-btn';
      openBtn.textContent = 'افتح تفاصيله';
      openBtn.onclick = ()=>{ detectiveModal.classList.remove('show'); openDetail(detectiveNode); };
      detectiveBody.appendChild(openBtn);
    };
    detectiveBody.appendChild(giveUpBtn);
  }

  async function startNewMystery(){
    const explorationService = await getExplorationService();
    detectiveNode = explorationService.pickMysteryNode(2);
    detectiveClues = detectiveNode ? explorationService.getClues(detectiveNode.id) : [];
    detectiveRevealedCount = 1;
    detectiveSolved = false;
    await renderDetective();
  }

  detectiveBtn.onclick = async ()=>{
    detectiveModal.classList.add('show');
    await startNewMystery();
  };
  document.getElementById('detectiveModalClose').onclick = ()=> detectiveModal.classList.remove('show');
  detectiveModal.onclick = (e)=>{ if(e.target===detectiveModal) detectiveModal.classList.remove('show'); };

  // ---------------- وضع الحكاية (Story Mode) ----------------
  let storyFromPicked = null;
  let storyToPicked = null;

  wireNodeSearchInput(storyFromSearch, storyFromResults, (n)=>{ storyFromPicked = n; });
  wireNodeSearchInput(storyToSearch, storyToResults, (n)=>{ storyToPicked = n; }, {
    excludeTitle: ()=> storyFromPicked ? storyFromPicked.title : null
  });

  storyBtn.onclick = ()=>{
    storyFromPicked = null; storyToPicked = null;
    storyFromSearch.value = ''; storyToSearch.value = '';
    storyFromResults.innerHTML = ''; storyToResults.innerHTML = '';
    storyResultBody.innerHTML = '';
    storyModal.classList.add('show');
    storyFromSearch.focus();
  };
  document.getElementById('storyModalClose').onclick = ()=> storyModal.classList.remove('show');
  storyModal.onclick = (e)=>{ if(e.target===storyModal) storyModal.classList.remove('show'); };

  storyCalcBtn.onclick = async ()=>{
    storyResultBody.innerHTML = '';
    if(!storyFromPicked || !storyToPicked){
      storyResultBody.appendChild(Utils.createTextEl('div', 'لازم تختار عنصر "من" وعنصر "إلى" الأول (من نتائج البحث).', 'sp-no-path'));
      return;
    }
    const explorationService = await getExplorationService();
    const story = explorationService.buildStory(storyFromPicked.id, storyToPicked.id);
    if(!story){
      storyResultBody.appendChild(Utils.createTextEl(
        'div',
        `مفيش مسار متصل بين "${storyFromPicked.title}" و"${storyToPicked.title}" في الشبكة الحالية.`,
        'sp-no-path'
      ));
      return;
    }
    if(!story.steps.length){
      storyResultBody.appendChild(Utils.createTextEl('div', 'العنصرين هما نفس العنصر.', 'ri-meta'));
      return;
    }
    story.steps.forEach((step, i)=>{
      const stepEl = document.createElement('div');
      stepEl.className = 'story-step';
      const headerRow = document.createElement('div');
      headerRow.className = 'ri-header';
      const fromChip = Utils.createTextEl('span', step.from.title, 'ri-node-chip');
      const arrow = Utils.createTextEl('span', '→', 'ri-arrow');
      const toChip = Utils.createTextEl('span', step.to.title, 'ri-node-chip');
      fromChip.onclick = ()=>{ storyModal.classList.remove('show'); openDetail(step.from); };
      toChip.onclick = ()=>{ storyModal.classList.remove('show'); openDetail(step.to); };
      headerRow.appendChild(fromChip);
      headerRow.appendChild(arrow);
      headerRow.appendChild(toChip);
      stepEl.appendChild(Utils.createTextEl('div', `الخطوة ${i + 1}`, 'story-step-num'));
      stepEl.appendChild(headerRow);
      if(step.edge){
        stepEl.appendChild(Utils.createTextEl('div', `${edgeTypeLabel(step.edge.type)}: ${step.edge.description || ''}`, 'ri-description'));
      } else {
        stepEl.appendChild(Utils.createTextEl('div', 'مفيش وصف علاقة مسجّل بين الاتنين.', 'ri-meta'));
      }
      storyResultBody.appendChild(stepEl);
    });
  };

  // ---------------- بحث متعمّق (Research Mode) ----------------
  let researchPicked = null;

  wireNodeSearchInput(researchSearch, researchResults, async (n)=>{
    researchPicked = n;
    await renderResearch();
  });

  async function renderResearch(){
    researchBody.innerHTML = '';
    if(!researchPicked){
      researchBody.appendChild(Utils.createTextEl('div', 'دوّر واختار عنصر من نتائج البحث فوق عشان تشوف دوسيه البحث بتاعه.', 'ri-meta'));
      return;
    }
    const explorationService = await getExplorationService();
    const dossier = explorationService.researchDossier(researchPicked.id, 2);
    if(!dossier) return;

    const summary = document.createElement('div');
    summary.className = 'metrics-summary';
    [
      { num: dossier.node.title, label: typeLabel(dossier.node.type) },
      { num: dossier.directEdges.length, label: 'علاقة مباشرة' },
      { num: dossier.reachByDistance.filter(r=> r.distance === 2).length, label: 'عنصر على بعد خطوتين' }
    ].forEach(item=>{
      const div = document.createElement('div');
      div.className = 'metrics-summary-item';
      div.appendChild(Utils.createTextEl('div', String(item.num), 'num'));
      div.appendChild(Utils.createTextEl('div', item.label, 'label'));
      summary.appendChild(div);
    });
    researchBody.appendChild(summary);

    const directSection = document.createElement('div');
    directSection.className = 'metrics-section';
    directSection.appendChild(Utils.createTextEl('h4', `علاقات مباشرة (${dossier.directEdges.length})`));
    if(!dossier.directEdges.length){
      directSection.appendChild(Utils.createTextEl('div', 'العنصر ده معزول — مالوش أي علاقة مسجّلة.', 'ri-meta'));
    }
    dossier.directEdges.forEach(({ edge, otherNode })=>{
      const item = document.createElement('div');
      item.className = 'ri-other-item';
      item.textContent = `${otherNode ? otherNode.title : '(عنصر محذوف)'} — ${edgeTypeLabel(edge.type)}`;
      if(otherNode) item.onclick = ()=>{ researchModal.classList.remove('show'); openDetail(otherNode); };
      directSection.appendChild(item);
    });
    researchBody.appendChild(directSection);

    [1, 2].forEach(distance=>{
      const nodesAtDistance = dossier.reachByDistance.filter(r=> r.distance === distance);
      const section = document.createElement('div');
      section.className = 'metrics-section';
      section.appendChild(Utils.createTextEl('h4', `على بعد ${distance} ${distance === 1 ? 'علاقة' : 'علاقتين'} (${nodesAtDistance.length})`));
      if(!nodesAtDistance.length){
        section.appendChild(Utils.createTextEl('div', 'مفيش عناصر على البعد ده.', 'ri-meta'));
      }
      nodesAtDistance.forEach(({ node })=>{
        const item = Utils.createTextEl('div', `${typeLabel(node.type)}: ${node.title}`, 'cmp-shared-item');
        item.onclick = ()=>{ researchModal.classList.remove('show'); openDetail(node); };
        section.appendChild(item);
      });
      researchBody.appendChild(section);
    });
  }

  researchBtn.onclick = ()=>{
    researchPicked = null;
    researchSearch.value = '';
    researchResults.innerHTML = '';
    researchBody.innerHTML = '';
    researchModal.classList.add('show');
    researchSearch.focus();
    renderResearch();
  };
  document.getElementById('researchModalClose').onclick = ()=> researchModal.classList.remove('show');
  researchModal.onclick = (e)=>{ if(e.target===researchModal) researchModal.classList.remove('show'); };

  // ---------------- إعادة تشغيل الرحلة (Knowledge Replay) ----------------
  // بيعتمد بالكامل على سجل المشاهدة الحقيقي (DashboardService.getRecentlyViewed
  // — نفس السجل الظاهر في "🕓 آخر ما استكشفته" بالداشبورد)، من غير أي بيانات
  // مُختلَقة. المستخدم بيتنقّل خطوة بخطوة (الأقدم أولًا) بين آخر 12 عنصر فتحهم.
  let replayIndex = 0;
  let replayHistory = [];

  async function renderReplay(){
    replayBody.innerHTML = '';
    if(!replayHistory.length){
      replayBody.appendChild(Utils.createTextEl('div', 'لسه ماستكشفتش أي عنصر في الجلسة دي — افتح تفاصيل أي عنصر الأول.', 'sp-no-path'));
      return;
    }
    const node = replayHistory[replayIndex];
    replayBody.appendChild(Utils.createTextEl('div', `خطوة ${replayIndex + 1} من ${replayHistory.length} — الأقدم أولًا`, 'sp-label'));

    const headerRow = document.createElement('div');
    headerRow.className = 'ri-header';
    const chip = Utils.createTextEl('span', node.title, 'ri-node-chip');
    chip.onclick = ()=>{ replayModal.classList.remove('show'); openDetail(node); };
    headerRow.appendChild(chip);
    replayBody.appendChild(headerRow);
    replayBody.appendChild(Utils.createTextEl('div', typeLabel(node.type), 'ri-meta'));

    if(replayIndex < replayHistory.length - 1){
      const nextNode = replayHistory[replayIndex + 1];
      const connectingEdge = knowledgeLayer.findEdgeBetween(node.id, nextNode.id);
      if(connectingEdge){
        replayBody.appendChild(Utils.createTextEl('div', `⬇️ اللي بعده في رحلتك مرتبط مباشرة: ${edgeTypeLabel(connectingEdge.type)}`, 'ri-meta'));
      } else {
        replayBody.appendChild(Utils.createTextEl('div', '⬇️ اللي بعده في رحلتك مش مرتبط مباشرة بالعنصر ده في البيانات.', 'ri-meta'));
      }
    }

    const navRow = document.createElement('div');
    navRow.className = 'replay-nav';
    const prevBtn = document.createElement('button');
    prevBtn.className = 'small-btn';
    prevBtn.textContent = '→ السابق';
    prevBtn.disabled = replayIndex === 0;
    prevBtn.onclick = ()=>{ replayIndex--; renderReplay(); };
    const nextBtn = document.createElement('button');
    nextBtn.className = 'small-btn';
    nextBtn.textContent = 'التالي ←';
    nextBtn.disabled = replayIndex === replayHistory.length - 1;
    nextBtn.onclick = ()=>{ replayIndex++; renderReplay(); };
    navRow.appendChild(prevBtn);
    navRow.appendChild(nextBtn);
    replayBody.appendChild(navRow);
  }

  replayBtn.onclick = async ()=>{
    const dashboardService = await getDashboardService();
    // getRecentlyViewed بترجّع الأحدث أولًا؛ بنعكسها عشان الـ replay يبدأ بالأقدم (بداية الرحلة) وينتهي بالأحدث
    replayHistory = dashboardService.getRecentlyViewed().slice().reverse();
    replayIndex = 0;
    replayModal.classList.add('show');
    await renderReplay();
  };
  document.getElementById('replayModalClose').onclick = ()=> replayModal.classList.remove('show');
  replayModal.onclick = (e)=>{ if(e.target===replayModal) replayModal.classList.remove('show'); };

  // ---------------- الخط الزمني (Timeline Explorer) ----------------
  // مخطط أقواس (arc diagram) حقيقي: أعمدة مرتبة حسب المجموعة الزمنية،
  // عُقد كل مجموعة مرصوصة رأسيًا في عمودها، وأقواس منحنية بين أي عنصرين
  // ليهم مجموعة زمنية معروفة ومربوطين بعلاقة حقيقية. مرِّر الماوس على أي
  // عنصر يظلّل علاقاته، والضغط عليه يفتح تفاصيله (نفس سلوك باقي العروض).
  async function renderTimeline(){
    const timelineService = await getTimelineService();
    const { columns, ungroupedNodes, arcs } = timelineService.buildTimelineData();
    const showUngrouped = timelineShowUngroupedToggle.checked;

    const allColumns = (showUngrouped && ungroupedNodes.length)
      ? [...columns, { group: { id: '__ungrouped__', name: 'بدون مجموعة زمنية' }, nodes: ungroupedNodes }]
      : columns;

    const columnWidth = 190;
    const nodeSpacing = 30;
    const topPadding = 70;
    const maxNodesInColumn = Math.max(...allColumns.map(c=> c.nodes.length), 1);
    const width = Math.max(allColumns.length * columnWidth, timelineScroll.clientWidth || 800);
    const height = Math.max(topPadding + maxNodesInColumn * nodeSpacing + 40, timelineScroll.clientHeight || 500);

    const svg = d3.select('#timelineSvg');
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height).attr('viewBox', [0,0,width,height]);

    const posById = new Map();
    allColumns.forEach((col, colIndex)=>{
      const cx = columnWidth * colIndex + columnWidth/2;
      svg.append('text').attr('x', cx).attr('y', 26).attr('text-anchor','middle')
        .attr('class','timeline-col-title').text(col.group.name);
      svg.append('text').attr('x', cx).attr('y', 44).attr('text-anchor','middle')
        .attr('class','timeline-col-count').text(col.nodes.length + ' عنصر');
      svg.append('line').attr('x1', cx).attr('x2', cx).attr('y1', topPadding - 14).attr('y2', height - 10)
        .attr('class','timeline-axis');
      col.nodes.forEach((node, i)=>{
        posById.set(node.id, { x: cx, y: topPadding + i * nodeSpacing, node });
      });
    });

    const arcsGroup = svg.append('g').attr('class','timeline-arcs');
    const arcPaths = arcsGroup.selectAll('path').data(arcs).join('path')
      .attr('class', 'timeline-arc')
      .style('cursor', 'pointer')
      .attr('d', d=>{
        const a = posById.get(d.fromId), b = posById.get(d.toId);
        if(!a || !b) return '';
        const midY = (a.y + b.y) / 2;
        return `M${a.x},${a.y} C${a.x},${midY} ${b.x},${midY} ${b.x},${b.y}`;
      })
      .on('click', (e, d)=> openRelationshipInspector(d.edge));

    function highlightArcs(nodeId){
      arcPaths.classed('dimmed', d=> d.fromId !== nodeId && d.toId !== nodeId);
      arcPaths.classed('active', d=> d.fromId === nodeId || d.toId === nodeId);
    }
    function clearArcHighlight(){
      arcPaths.classed('dimmed', false).classed('active', false);
    }

    const nodesGroup = svg.append('g').attr('class','timeline-nodes');
    nodesGroup.selectAll('g').data([...posById.values()], d=> d.node.id).join('g')
      .attr('class','tnode')
      .attr('transform', d=> `translate(${d.x},${d.y})`)
      .on('click', (e,d)=> openDetail(d.node))
      .on('mouseenter', (e,d)=> highlightArcs(d.node.id))
      .on('mouseleave', clearArcHighlight)
      .call(g=>{
        g.append('circle')
          .attr('r', d=> ((CONFIG.NODE_TYPE_VISUALS[d.node.type] || CONFIG.NODE_TYPE_VISUALS.default).radius) * 0.75)
          .attr('fill', d=> (CONFIG.NODE_TYPE_VISUALS[d.node.type] || CONFIG.NODE_TYPE_VISUALS.default).color);
        g.append('text').attr('x', 14).attr('y', 4).attr('class','timeline-node-label')
          .text(d=> d.node.title.length > 22 ? d.node.title.slice(0,22) + '…' : d.node.title);
      });
  }

  timelineShowUngroupedToggle.onchange = ()=> renderTimeline();

  // ---------------- تبديل العرض (الرئيسية/صفوف/شبكة/الخط الزمني) ----------------
  const viewDashboardBtn = document.getElementById('viewDashboardBtn');
  const viewRowsBtn = document.getElementById('viewRowsBtn');
  const viewGraphBtn = document.getElementById('viewGraphBtn');
  const viewTimelineBtn = document.getElementById('viewTimelineBtn');
  function setActiveTab(activeBtn){
    [viewDashboardBtn, viewRowsBtn, viewGraphBtn, viewTimelineBtn].forEach(btn=> btn.classList.toggle('active', btn === activeBtn));
  }
  viewDashboardBtn.onclick = async ()=>{
    setActiveTab(viewDashboardBtn);
    dashboardView.style.display='block'; filterBar.style.display='none';
    rowsView.style.display='none'; graphView.style.display='none'; timelineView.style.display='none';
    await renderDashboard();
  };
  viewRowsBtn.onclick = ()=>{
    setActiveTab(viewRowsBtn);
    dashboardView.style.display='none'; filterBar.style.display='flex';
    rowsView.style.display='block'; graphView.style.display='none'; timelineView.style.display='none';
  };
  viewGraphBtn.onclick = ()=>{
    setActiveTab(viewGraphBtn);
    dashboardView.style.display='none'; filterBar.style.display='flex';
    rowsView.style.display='none'; graphView.style.display='block'; timelineView.style.display='none';
    renderGraph();
  };
  viewTimelineBtn.onclick = ()=>{
    setActiveTab(viewTimelineBtn);
    dashboardView.style.display='none'; filterBar.style.display='none';
    rowsView.style.display='none'; graphView.style.display='none'; timelineView.style.display='block';
    renderTimeline();
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
    if(dashboardView.style.display !== 'none') renderDashboard();
    if(timelineView.style.display !== 'none') renderTimeline();
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

  wireNodeSearchInput(linkTargetSearch, linkTargetResults, (n)=>{ linkPickedTarget = n; }, {
    excludeTitle: ()=> linkFromNode ? linkFromNode.title : null
  });

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
    if(dashboardView.style.display !== 'none') renderDashboard();
    if(timelineView.style.display !== 'none') renderTimeline();
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

  // ---------------- Export Center (Phase F) — تصدير الخريطة كلها ----------------
  function downloadTextFile(content, filename, mimeType){
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const exportCenterBtn = document.getElementById('exportCenterBtn');
  const exportCenterModal = document.getElementById('exportCenterModal');
  exportCenterBtn.onclick = ()=> exportCenterModal.classList.add('show');
  document.getElementById('exportCenterModalClose').onclick = ()=> exportCenterModal.classList.remove('show');
  exportCenterModal.onclick = (e)=>{ if(e.target===exportCenterModal) exportCenterModal.classList.remove('show'); };

  const exportStamp = ()=> new Date().toISOString().slice(0,10);

  document.getElementById('exportCsvBtn').onclick = async ()=>{
    const svc = await getExportImportService();
    const { nodesCsv, edgesCsv } = svc.exportFullGraphAsCsv();
    downloadTextFile(nodesCsv, `marvel-map-nodes-${exportStamp()}.csv`, 'text/csv');
    downloadTextFile(edgesCsv, `marvel-map-edges-${exportStamp()}.csv`, 'text/csv');
  };
  document.getElementById('exportMarkdownBtn').onclick = async ()=>{
    const svc = await getExportImportService();
    const md = svc.exportFullGraphAsMarkdown();
    downloadTextFile(md, `marvel-map-report-${exportStamp()}.md`, 'text/markdown');
  };
  document.getElementById('exportGraphmlBtn').onclick = async ()=>{
    const svc = await getExportImportService();
    const xml = svc.exportFullGraphAsGraphML();
    downloadTextFile(xml, `marvel-map-${exportStamp()}.graphml`, 'application/xml');
  };

  // ---------------- AI Assistant Panel (Phase F — hook فقط، بدون تكامل فعلي) ----------------
  const aiAssistantBtn = document.getElementById('aiAssistantBtn');
  const aiAssistantModal = document.getElementById('aiAssistantModal');
  aiAssistantBtn.onclick = ()=> aiAssistantModal.classList.add('show');
  document.getElementById('aiAssistantModalClose').onclick = ()=> aiAssistantModal.classList.remove('show');
  aiAssistantModal.onclick = (e)=>{ if(e.target===aiAssistantModal) aiAssistantModal.classList.remove('show'); };

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
        const errorManager = await getErrorManager();
        errorManager.report(err, {
          scope: 'renderLayer:import',
          userMessage: 'تعذّر استيراد الملف: ' + err.message
        });
      }finally{
        importDataFileInput.value = '';
      }
    };
    reader.readAsText(file);
  };

  // ---------------- إتاحة المودالز (Phase F — Accessibility) ----------------
  // بيتطبّق مرة واحدة على كل .overlay (13 مودال موجود + exportCenterModal
  // وaiAssistantModal الجداد) بدل تكرار نفس منطق role/focus-trap/Escape
  // في كل مكان بيفتح/يقفل مودال — نفس فلسفة تجنّب التكرار المتبعة في
  // باقي المشروع (زي wireNodeSearchInput).
  function initModalAccessibility(){
    const overlays = document.querySelectorAll('.overlay');
    overlays.forEach(overlay=>{
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('tabindex', '-1');
      const heading = overlay.querySelector('h3');
      if(heading){
        if(!heading.id) heading.id = overlay.id + 'Heading';
        overlay.setAttribute('aria-labelledby', heading.id);
      }

      let returnFocusEl = null;

      function focusableElements(){
        return Array.from(overlay.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ));
      }

      function onKeydown(e){
        if(e.key === 'Escape'){
          overlay.classList.remove('show');
          return;
        }
        if(e.key === 'Tab'){
          const focusables = focusableElements();
          if(!focusables.length) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if(e.shiftKey && document.activeElement === first){
            e.preventDefault();
            last.focus();
          } else if(!e.shiftKey && document.activeElement === last){
            e.preventDefault();
            first.focus();
          }
        }
      }

      new MutationObserver(mutations=>{
        mutations.forEach(m=>{
          if(m.attributeName !== 'class') return;
          const isShown = overlay.classList.contains('show');
          if(isShown && !overlay._a11yWired){
            overlay._a11yWired = true;
            returnFocusEl = document.activeElement;
            const focusables = focusableElements();
            (focusables[0] || overlay).focus();
            overlay.addEventListener('keydown', onKeydown);
          } else if(!isShown && overlay._a11yWired){
            overlay._a11yWired = false;
            overlay.removeEventListener('keydown', onKeydown);
            if(returnFocusEl && document.body.contains(returnFocusEl)) returnFocusEl.focus();
            returnFocusEl = null;
          }
        });
      }).observe(overlay, { attributes: true });
    });
  }
  initModalAccessibility();

  return {
    applyBackground,
    renderRows,
    renderGraph,
    renderTimeline,
    populateGroupSelect,
    openDetail,
    initFilterBar,
    renderDashboard
  };
}
