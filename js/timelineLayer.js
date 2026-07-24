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

  return { buildTimelineData, arcsForNode };
}
