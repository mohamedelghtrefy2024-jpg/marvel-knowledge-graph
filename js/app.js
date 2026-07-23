// ============================================================
// Entry Point
// بيربط كل الطبقات ببعض وبيبدأ التطبيق. لا يحتوي على منطق مباشر —
// فقط تنسيق (composition) بين الطبقات المستقلة.
// ============================================================

(async function bootstrap(){
  const statusEl = document.getElementById('status');

  try{
    // 0) استنى الإعدادات (CONFIG) تتحمّل فعليًا من config/*.json قبل أي استخدام لها
    await window.CONFIG_READY;

    // 1) تحميل البيانات الأساسية من ملفات JSON
    const base = await StorageLayer.loadBaseData();

    // 2) تجهيز طبقة المعرفة بالبيانات الأساسية
    const knowledgeLayer = createKnowledgeLayer();
    knowledgeLayer.setData(base);

    // 3) هجرة أي بيانات قديمة (v1) كان المستخدم أضافها بنفسه، مرة واحدة فقط
    const migrationResult = StorageLayer.migrateLegacyDataIfNeeded(knowledgeLayer);

    // 4) تحميل العقد/العلاقات المخصصة (سواء كانت موجودة من قبل أو انهجرت للتو)
    StorageLayer.loadCustomNodes().forEach(n=> knowledgeLayer.addCustomNode(n));
    StorageLayer.loadCustomEdges().forEach(e=> knowledgeLayer.addCustomEdge(e));

    // 5) فحص سلامة البيانات (لا يوقف التشغيل، فقط تحذير في الـ console)
    const issues = knowledgeLayer.validateIntegrity();
    if(issues.length){
      Logger.warn('data-integrity', `تم اكتشاف ${issues.length} ملاحظة:`, issues);
    }

    // 6) تجهيز باقي الطبقات
    // EventBus instance واحد مشترك بين كل الطبقات (businessLayer + renderLayer)
    // عشان أخطاء ErrorManager المُبلَّغة من أي طبقة توصل لنفس المشترك (toast) في renderLayer.
    const { EventBus } = await import('../src/core/EventBus.js');
    const eventBus = new EventBus();
    const { ErrorManager } = await import('../src/services/ErrorManager.js');
    const errorManager = new ErrorManager({ eventBus });

    const { CacheManager } = await import('../src/services/CacheManager.js');
    const cacheManager = new CacheManager({ storageLayer: StorageLayer, eventBus });
    const businessLayer = createBusinessLayer(knowledgeLayer, cacheManager, errorManager, eventBus);
    const graphLayer = createGraphLayer(knowledgeLayer);
    const renderLayer = createRenderLayer({ knowledgeLayer, businessLayer, graphLayer, eventBus });

    // 7) تشغيل الواجهة
    await renderLayer.applyBackground();
    await renderLayer.populateGroupSelect();
    await renderLayer.initFilterBar();
    await renderLayer.renderRows();
    await renderLayer.renderDashboard();

    if(migrationResult.migratedNodes || migrationResult.migratedEdges){
      Logger.info('migration', `تم ترحيل ${migrationResult.migratedNodes} عقدة و ${migrationResult.migratedEdges} علاقة من النسخة القديمة.`);
    }

    // 8) نظام الـ plugins (أساس فقط، بدون أي plugin فعلي حاليًا) — أي
    // plugin اتسجّل مسبقًا في window.MarvelMapPlugins (عبر سكريبت قبل
    // app.js) بيتحمّل init() بتاعته هنا، بعد ما التطبيق بقى جاهز فعليًا.
    const { PluginManager } = await import('../src/core/PluginManager.js');
    const pluginManager = new PluginManager({ eventBus });
    const { KnowledgeService } = await import('../src/services/KnowledgeService.js');
    const { GraphService } = await import('../src/services/GraphService.js');
    const { SearchService } = await import('../src/services/SearchService.js');
    const pluginContext = {
      knowledgeService: new KnowledgeService({ knowledgeLayer }),
      graphService: new GraphService({ graphLayer }),
      searchService: new SearchService({ knowledgeLayer, storageLayer: StorageLayer })
    };
    (window.MarvelMapPlugins || []).forEach(plugin=>{
      try{ pluginManager.register(plugin); }
      catch(e){ Logger.error('plugin-registration', e); }
    });
    await pluginManager.initAll(pluginContext);
    eventBus.emit('app:ready', { pluginsLoaded: pluginManager.list() }); // = SYSTEM_EVENTS.APP_READY
  }catch(err){
    // فشل هنا معناه إن التحميل الأساسي (nodes/edges/config) نفسه فشل — renderLayer
    // لسه مش موجود أصلًا في الحالة دي، فمفيش toast ممكن نعرضه؛ statusEl هو
    // القناة الوحيدة المتاحة لإبلاغ المستخدم في هذه اللحظة تحديدًا.
    Logger.error('app:bootstrap', err);
    statusEl.textContent = 'حصل خطأ أثناء تحميل البيانات. تفاصيل الخطأ في الـ console.';
  }
})();
