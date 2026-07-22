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
      console.warn(`[data-integrity] تم اكتشاف ${issues.length} ملاحظة:`, issues);
    }

    // 6) تجهيز باقي الطبقات
    const businessLayer = createBusinessLayer(knowledgeLayer);
    const graphLayer = createGraphLayer(knowledgeLayer);
    const renderLayer = createRenderLayer({ knowledgeLayer, businessLayer, graphLayer });

    // 7) تشغيل الواجهة
    await renderLayer.applyBackground();
    await renderLayer.populateGroupSelect();
    await renderLayer.initFilterBar();
    await renderLayer.renderRows();

    if(migrationResult.migratedNodes || migrationResult.migratedEdges){
      console.info(`[migration] تم ترحيل ${migrationResult.migratedNodes} عقدة و ${migrationResult.migratedEdges} علاقة من النسخة القديمة.`);
    }
  }catch(err){
    console.error(err);
    statusEl.textContent = 'حصل خطأ أثناء تحميل البيانات. تفاصيل الخطأ في الـ console.';
  }
})();
