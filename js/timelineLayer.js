// ============================================================
// Timeline Layer  (PART 04 — Phase C)
// تجهيز بيانات "الخط الزمني" من طبقة المعرفة: أعمدة مرتبة حسب المجموعات
// الزمنية (بنفس ترتيب knowledgeLayer.getGroups())، والعقد اللي بدون مجموعة
// زمنية على حدة، بالإضافة لـ"أقواس" (arcs) العلاقات الحقيقية اللي بتربط
// عقدتين ليهم مجموعة زمنية معروفة الاتنين (العلاقات اللي طرف منها بدون
// مجموعة زمنية مش بتترسم كقوس هنا — قرار نطاق موثّق في تقرير الهجرة،
// لأن مفيش نقطة زمنية ثابتة نرسم منها القوس ليها).
// لا يوجد هنا رسم فعلي (ده مسؤولية Rendering Layer) — فقط تجهيز بيانات،
// بنفس فلسفة graphLayer.js.
// ============================================================

function createTimelineLayer(knowledgeLayer){

  function buildTimelineData(){
    const columns = knowledgeLayer.getGroups()
      .map(group=> ({ group, nodes: knowledgeLayer.getNodesByGroup(group.id) }))
      .filter(col=> col.nodes.length > 0);

    const ungroupedNodes = knowledgeLayer.getAllNodes().filter(n=> !n.group);

    const groupedIds = new Set();
    columns.forEach(col=> col.nodes.forEach(n=> groupedIds.add(n.id)));

    const arcs = [];
    const seenEdgeIds = new Set();
    groupedIds.forEach(nodeId=>{
      knowledgeLayer.getEdgesForNode(nodeId).forEach(({ edge, otherNode })=>{
        if(!otherNode || !groupedIds.has(otherNode.id)) return;
        if(edge.from === edge.to) return;
        if(seenEdgeIds.has(edge.id)) return;
        seenEdgeIds.add(edge.id);
        arcs.push({ edge, fromId: edge.from, toId: edge.to });
      });
    });

    return { columns, ungroupedNodes, arcs };
  }

  /**
   * كل الأقواس (arcs) الخاصة بعقدة معيّنة — مستخدمة في تظليل العلاقات
   * لما المستخدم يدوس على عقدة في الخط الزمني.
   */
  function arcsForNode(nodeId, arcs){
    return arcs.filter(a=> a.fromId === nodeId || a.toId === nodeId);
  }

  /**
   * الخط الزمني الفعلي داخل أحداث القصة (in-universe) — Timeline Intelligence
   * (PART 03 بند 1.7). **منفصل تمامًا عن `group`**: `group` بيمثّل تجميع
   * إصدار/عصر (مثلاً "أفلام التلاتينات من عمر السرد")، مش بالضرورة ترتيب
   * وقوع الأحداث داخل القصة. الحقل الجديد هو `storyOrder` (رقم صحيح اختياري
   * على العقدة، مش موجود افتراضيًا).
   * **قرار نطاق موثّق (MIGRATION_REPORT.md)**: الدالة دي بس بترتّب وترجّع؛
   * مفيش أي قيمة storyOrder بتتحسب أو بتتخمّن هنا — لو العقدة معهاش
   * storyOrder (`null`/`undefined`)، بترجع في `unordered` بدل ما تتحط في
   * مكان عشوائي داخل الترتيب الزمني (تجنّبًا لأي استنتاج غير موثّق، بنفس
   * قاعدة "لا اقتراحات مبنية على تخمين" المتّبعة في suggestMissingEdges).
   * @returns {{ordered: Array, unordered: Array}}
   */
  function buildStoryOrderTimeline(){
    const allNodes = knowledgeLayer.getAllNodes();
    const ordered = allNodes
      .filter(n=> typeof n.storyOrder === 'number')
      .sort((a, b)=> a.storyOrder - b.storyOrder);
    const unordered = allNodes.filter(n=> typeof n.storyOrder !== 'number');
    return { ordered, unordered };
  }

  /**
   * اكتشاف التداخلات الزمنية (Timeline Overlaps) — امتداد لبند 1.7، طلب صريح من المستخدم.
   * بتقارن كل زوج عقد ليهم `storyPeriod` (مدى {start,end} بنفس ترقيم storyOrder) وترجّع الأزواج
   * اللي مداها متقاطع. **قرار نطاق موثّق (MIGRATION_REPORT.md / STORY_PERIOD_AND_OVERLAPS_PROMPT.md)**:
   * العقد اللي معهاش storyPeriod أصلًا بتتجاهل تمامًا من المقارنة دي (مش بتتحط كنقطة واحدة) —
   * تجنّبًا لأي استنتاج غير موثّق.
   * @param {Array} orderedNodes مصفوفة عقد (نتيجة buildStoryOrderTimeline().ordered عادةً)
   * @returns {Array<{a: object, b: object}>} كل زوج عقد بمدى متقاطع فعليًا، بدون تكرار
   */
  function findOverlaps(orderedNodes){
    const withPeriod = orderedNodes.filter(n=> n.storyPeriod && typeof n.storyPeriod.start === 'number' && typeof n.storyPeriod.end === 'number');
    const overlaps = [];
    for(let i = 0; i < withPeriod.length; i++){
      for(let j = i + 1; j < withPeriod.length; j++){
        const a = withPeriod[i], b = withPeriod[j];
        if(a.id === b.id) continue;
        const intersects = a.storyPeriod.start <= b.storyPeriod.end && b.storyPeriod.start <= a.storyPeriod.end;
        if(intersects) overlaps.push({ a, b });
      }
    }
    return overlaps;
  }

  /**
   * تداخلات صريحة (Explicit Overlaps) — امتداد لـ`findOverlaps()`، اتضاف عشان يحل مشكلة موثّقة:
   * `findOverlaps()` بتقارن مدى `storyPeriod` رقميًا، وده بيفشل (أو بيدّي false positives) لما
   * العقدتين المتزامنتين فعليًا مالهمش storyOrder متجاور (زي Daredevil #15 و Luke Cage #19 — بينهم
   * Avengers: Age of Ultron #17 وAnt-Man #18 اللي مالهمش أي علاقة، فأي مدى رقمي بين 15 و19 هيلمسهم
   * غلط). **قرار موثّق (MIGRATION_REPORT.md، SESSION 3 تابع 7)**: الحل هو حقل مستقل `overlapsWith`
   * (Array<nodeId>) على العقدة — قائمة صريحة، مش مدى رقمي — للتداخلات الموثّقة اللي معرفتش تتمثّل
   * بمقياس storyOrder الخطي من غير ما تلمس عناصر تانية غلط.
   * @param {Array} allNodes كل العقد (مش بس اللي عندها storyOrder — overlapsWith مستقل عن الترتيب)
   * @returns {Array<{a: object, b: object}>} كل زوج عقد بتداخل صريح موثّق، بدون تكرار
   */
  function findExplicitOverlaps(allNodes){
    const byId = new Map(allNodes.map(n=> [n.id, n]));
    const seen = new Set();
    const overlaps = [];
    allNodes.forEach(n=>{
      if(!Array.isArray(n.overlapsWith)) return;
      n.overlapsWith.forEach(otherId=>{
        const other = byId.get(otherId);
        if(!other || other.id === n.id) return;
        const key = [n.id, other.id].sort().join('|');
        if(seen.has(key)) return;
        seen.add(key);
        overlaps.push({ a: n, b: other });
      });
    });
    return overlaps;
  }

  /**
   * كل التداخلات المعروفة (range-based + explicit) مجمّعة في قائمة واحدة بدون تكرار — الدالة اللي
   * المفروض الواجهة (renderLayer.js) تستخدمها لما تيجي تعرض التداخلات، بدل ما تنادي الاتنين لوحدهم.
   */
  function findAllOverlaps(orderedNodes, allNodes){
    const rangeBased = findOverlaps(orderedNodes);
    const explicit = findExplicitOverlaps(allNodes);
    const seen = new Set();
    const merged = [];
    [...rangeBased, ...explicit].forEach(pair=>{
      const key = [pair.a.id, pair.b.id].sort().join('|');
      if(seen.has(key)) return;
      seen.add(key);
      merged.push(pair);
    });
    return merged;
  }

  return { buildTimelineData, arcsForNode, buildStoryOrderTimeline, findOverlaps, findExplicitOverlaps, findAllOverlaps };
}
