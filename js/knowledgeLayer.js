// ============================================================
// Knowledge Layer
// المصدر الوحيد للحقيقة عن العقد والعلاقات: تجميعها، البحث فيها،
// التحقق من سلامتها. لا فetch هنا ولا DOM — بيانات فقط.
// ============================================================

function createKnowledgeLayer(){
  let nodes = [];
  let edges = [];
  let groups = [];
  let nodesById = new Map();
  let nodesByTitle = new Map();

  function setData({ nodes: n, edges: e, groups: g }){
    nodes = n;
    edges = e;
    groups = g;
    rebuildIndexes();
  }

  function rebuildIndexes(){
    nodesById = new Map(nodes.map(n=> [n.id, n]));
    nodesByTitle = new Map(nodes.map(n=> [n.title, n]));
  }

  function addCustomNode(node){
    if(nodesById.has(node.id)) return; // idempotent: تجنّب التكرار لو العقدة اتضافت بالفعل (مثلاً أثناء الهجرة)
    nodes.push(node);
    nodesById.set(node.id, node);
    nodesByTitle.set(node.title, node);
  }

  function addCustomEdge(edge){
    if(edges.some(e=> e.id === edge.id)) return; // idempotent لنفس السبب
    edges.push(edge);
  }

  /**
   * تعديل مصدر (source) علاقة موجودة فعليًا (in-memory) — مستخدمة من
   * businessLayer.updateEdgeSource وبعملية تطبيق الـ overrides في app.js
   * وقت الإقلاع. بترجع العلاقة المعدَّلة، أو null لو مش موجودة.
   */
  function setEdgeSource(edgeId, source){
    const edge = edges.find(e=> e.id === edgeId);
    if(!edge) return null;
    edge.source = source;
    edge.updatedAt = Date.now();
    return edge;
  }

  function findNodeById(id){
    return nodesById.get(id) || null;
  }

  function findNodeByTitle(title){
    return nodesByTitle.get(title) || null;
  }

  function getAllNodes(){
    return nodes;
  }

  function getAllEdges(){
    return edges;
  }

  function getGroups(){
    return groups;
  }

  function getNodesByGroup(groupId){
    return nodes.filter(n=> n.group === groupId);
  }

  /**
   * كل العلاقات (بالاتجاهين) الخاصة بعقدة معيّنة، مع تفاصيل العقدة الأخرى.
   */
  function getEdgesForNode(nodeId){
    const result = [];
    edges.forEach(e=>{
      if(e.from === nodeId){
        result.push({ edge: e, otherNode: findNodeById(e.to), direction: 'outgoing' });
      } else if(e.to === nodeId && e.direction !== 'directed'){
        // العلاقات غير الموجّهة تظهر في الاتجاهين
        result.push({ edge: e, otherNode: findNodeById(e.from), direction: 'incoming' });
      } else if(e.to === nodeId && e.direction === 'directed'){
        // علاقة موجّهة تجاه هذه العقدة — نعرضها أيضًا كسياق (من X إلى هذه العقدة)
        result.push({ edge: e, otherNode: findNodeById(e.from), direction: 'incoming' });
      }
    });
    return result;
  }

  /** إيجاد علاقة بمعرّفها — مستخدمة في Relationship Inspector (PART 04 Phase D) */
  function findEdgeById(id){
    return edges.find(e=> e.id === id) || null;
  }

  /** عدد العلاقات الحقيقية (بالاتجاهين) الخاصة بعقدة — تفويض على getEdgesForNode. */
  function getNodeDegree(nodeId){
    return getEdgesForNode(nodeId).length;
  }

  /**
   * أول علاقة حقيقية مباشرة بين عقدتين (بغض النظر عن الاتجاه) — مستخدمة
   * في وضع الحكاية (Story Mode — PART 04 Phase E) عشان نحوّل كل خطوة في
   * أقصر مسار لجملة سرد حقيقية بدل مجرد سهم بين اسمين.
   */
  function findEdgeBetween(idA, idB){
    return edges.find(e=> (e.from === idA && e.to === idB) || (e.from === idB && e.to === idA)) || null;
  }

  /**
   * وضع المحقق (Detective Mode — PART 04 Phase E): يختار عقدة عشوائية
   * "غامضة" بدرجة ارتباط كافية عشان يبقى فيه أدلة حقيقية تكفي. لو مفيش
   * عقد بالحد الأدنى المطلوب، بيقلل الحد تدريجيًا (منين مفيش عقد أصلًا
   * بالصدفة) بدل ما يرجّع null من غير داعي.
   */
  function pickMysteryNode(minDegree = 2){
    for(let threshold = minDegree; threshold >= 0; threshold--){
      const candidates = nodes.filter(n=> getNodeDegree(n.id) >= threshold);
      if(candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return null;
  }

  /**
   * أدلة عقدة غامضة (Detective Mode): وصف كل علاقة حقيقية ليها، بعد إخفاء
   * عنوان العقدة نفسها من نص الوصف (لو ظهر فيه) عشان الدليل ميكشفش
   * الإجابة مباشرة. علاقات من غير وصف مسجّل بتتجاهل (مفيش دليل نص فيها).
   */
  function getClues(nodeId){
    const node = findNodeById(nodeId);
    if(!node) return [];
    return getEdgesForNode(nodeId)
      .filter(({ edge })=> edge.description)
      .map(({ edge, otherNode })=> ({
        edgeId: edge.id,
        text: Utils.maskTitle(edge.description, node.title),
        otherType: otherNode ? otherNode.type : null
      }));
  }

  /**
   * كل العقد اللي مالهاش أي علاقة حقيقية مسجّلة (لا واردة ولا صادرة) —
   * "فجوات" في شبكة المعرفة. مستخدمة في Knowledge Health Monitor الموسّع
   * (PART 04 Phase D).
   */
  function findOrphanNodes(){
    const connectedIds = new Set();
    edges.forEach(e=>{
      if(e.from) connectedIds.add(e.from);
      if(e.to) connectedIds.add(e.to);
    });
    return nodes.filter(n=> !connectedIds.has(n.id));
  }

  /**
   * فحص سلامة البيانات: IDs فريدة، لا توجد علاقة تشاور على عقدة غير موجودة،
   * كل عقدة من نوع معتمد في CONFIG.NODE_TYPES.
   */
  function validateIntegrity(){
    const issues = [];
    const idCounts = new Map();
    const titleCounts = new Map();
    nodes.forEach(n=>{
      idCounts.set(n.id, (idCounts.get(n.id)||0)+1);
      titleCounts.set(n.title, (titleCounts.get(n.title)||0)+1);
      if(!CONFIG.NODE_TYPES.includes(n.type)){
        issues.push(`نوع عقدة غير معتمد: "${n.type}" في العقدة "${n.title}"`);
      }
    });
    idCounts.forEach((count, id)=>{
      if(count > 1) issues.push(`معرّف (id) مكرر: ${id}`);
    });
    titleCounts.forEach((count, title)=>{
      if(count > 1) issues.push(`عنوان مكرر بين أكثر من عقدة: "${title}" — ده بيسبب لبس في findNodeByTitle (المستخدمة فقط للهجرة القديمة)، لازم يتغيّر أحدهما`);
    });
    edges.forEach(e=>{
      if(e.from && !nodesById.has(e.from)){
        issues.push(`علاقة (${e.id}) تشاور على عقدة مصدر غير موجودة: ${e.from}`);
      }
      if(e.to && !nodesById.has(e.to)){
        issues.push(`علاقة (${e.id}) تشاور على عقدة هدف غير موجودة (ربما محذوفة أو لم تُضف بعد): ${e.to}`);
      }
      if(!CONFIG.EDGE_TYPES.includes(e.type)){
        issues.push(`نوع علاقة غير معتمد: "${e.type}" في العلاقة (${e.id})`);
      }
    });
    return issues;
  }

  /**
   * إحصائيات أساسية على الشبكة: توزيع الأنواع، توزيع أنواع العلاقات،
   * وأكثر العقد ارتباطًا (degree centrality بسيط).
   */
  function computeMetrics(){
    const nodesByType = {};
    nodes.forEach(n=>{
      nodesByType[n.type] = (nodesByType[n.type] || 0) + 1;
    });

    const edgesByType = {};
    const degreeCount = new Map();
    edges.forEach(e=>{
      edgesByType[e.type] = (edgesByType[e.type] || 0) + 1;
      if(e.from) degreeCount.set(e.from, (degreeCount.get(e.from) || 0) + 1);
      if(e.to) degreeCount.set(e.to, (degreeCount.get(e.to) || 0) + 1);
    });

    const topConnected = [...degreeCount.entries()]
      .map(([id, degree])=> ({ node: findNodeById(id), degree }))
      .filter(entry=> entry.node)
      .sort((a,b)=> b.degree - a.degree)
      .slice(0, 10);

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      totalGroups: groups.length,
      nodesByType,
      edgesByType,
      topConnected
    };
  }

  /**
   * تحليلات المعرفة (Knowledge Analytics — PART 04 Phase D): كثافة الشبكة،
   * متوسط الارتباط، الكثافة الزمنية (توزيع العناصر عبر المجموعات)، أكثر
   * أعضاء الطاقم الحقيقي ارتباطًا بأفلام/مسلسلات، ونسبة المحتوى المُضاف يدويًا.
   * مختلفة عمدًا عن computeMetrics (توزيع أنواع + أكثر العقد ارتباطًا بشكل عام)
   * وعن تحليل الشبكة الحالي (مكوّنات متصلة + دورات) — تركّز هنا على مضمون
   * المعرفة نفسها مش بنية الشبكة الخام.
   */
  function computeAnalytics(){
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    const maxPossibleEdges = totalNodes > 1 ? (totalNodes * (totalNodes - 1)) / 2 : 0;
    const density = maxPossibleEdges ? (totalEdges / maxPossibleEdges) * 100 : 0;
    const avgDegree = totalNodes ? (totalEdges * 2) / totalNodes : 0;

    const temporalDensity = groups.map(group=>{
      const count = getNodesByGroup(group.id).length;
      return { group, count, pct: totalNodes ? (count / totalNodes) * 100 : 0 };
    });

    const CREW_TYPES = ['actor', 'director', 'writer', 'composer'];
    const MEDIA_TYPES = ['movie', 'tv'];
    const topByRole = {};
    CREW_TYPES.forEach(role=>{
      topByRole[role] = nodes.filter(n=> n.type === role)
        .map(n=> ({ node: n, mediaCount: getEdgesForNode(n.id).filter(({ otherNode })=> otherNode && MEDIA_TYPES.includes(otherNode.type)).length }))
        .filter(c=> c.mediaCount > 0)
        .sort((a,b)=> b.mediaCount - a.mediaCount)
        .slice(0, 3);
    });

    return {
      density,
      avgDegree,
      temporalDensity,
      topByRole,
      customRatio: {
        nodes: { custom: nodes.filter(n=> n.createdAt).length, total: totalNodes },
        edges: { custom: edges.filter(e=> e.createdAt).length, total: totalEdges }
      }
    };
  }

  /**
   * تقرير سلامة موسّع (Knowledge Health Monitor — PART 04 Phase D): بدل
   * عدّاد المشاكل الخام (validateIntegrity)، بيصنّف المشاكل حسب النوع،
   * وبيضيف كشف "العقد المعزولة" (orphan nodes) ونسبة تغطية الشبكة (%
   * العقد اللي ليها علاقة حقيقية واحدة على الأقل).
   */
  function computeHealthReport(){
    const issues = validateIntegrity();
    const issuesByCategory = { 'نوع عقدة غير معتمد': 0, 'معرّف مكرر': 0, 'عنوان مكرر': 0, 'علاقة تشاور على عقدة مفقودة': 0, 'نوع علاقة غير معتمد': 0 };
    issues.forEach(issue=>{
      if(issue.includes('نوع عقدة غير معتمد')) issuesByCategory['نوع عقدة غير معتمد']++;
      else if(issue.includes('معرّف (id) مكرر')) issuesByCategory['معرّف مكرر']++;
      else if(issue.includes('عنوان مكرر')) issuesByCategory['عنوان مكرر']++;
      else if(issue.includes('تشاور على عقدة')) issuesByCategory['علاقة تشاور على عقدة مفقودة']++;
      else if(issue.includes('نوع علاقة غير معتمد')) issuesByCategory['نوع علاقة غير معتمد']++;
    });
    const orphanNodes = findOrphanNodes();
    const coveragePct = nodes.length ? ((nodes.length - orphanNodes.length) / nodes.length) * 100 : 100;
    // علاقات ضعيفة (weight <= 2) — يعتمد على حقل weight اللي اتضاف في ترحيل PART03 Schema Migration.
    // العلاقات القديمة من غير weight (لو وُجدت) بتتجاهل هنا (undefined <= 2 غلط)، مش بتتحسب ضعيفة غلط.
    const weakRelations = edges.filter(e=> typeof e.weight === 'number' && e.weight <= 2);
    // تغطية الأدلة (Evidence Coverage) — MARVEL-FIX-MASTER-PROMPT.md بند 1.1: "كام %
    // من العلاقات ليها مصدر مسجّل فعليًا". مختلفة تمامًا عن coveragePct (تغطية العقد
    // غير المعزولة) — دي بتحسب العلاقات نفسها بغض النظر عن حالة العقد.
    const edgesWithSource = edges.filter(e=> !!e.source);
    const evidenceCoveragePct = edges.length ? (edgesWithSource.length / edges.length) * 100 : 100;
    return { issues, issuesByCategory, orphanNodes, coveragePct, weakRelations, evidenceCoveragePct };
  }

  return {
    setData,
    addCustomNode,
    addCustomEdge,
    setEdgeSource,
    findNodeById,
    findNodeByTitle,
    findEdgeById,
    getNodeDegree,
    findEdgeBetween,
    pickMysteryNode,
    getClues,
    getAllNodes,
    getAllEdges,
    getGroups,
    getNodesByGroup,
    getEdgesForNode,
    findOrphanNodes,
    validateIntegrity,
    computeMetrics,
    computeAnalytics,
    computeHealthReport
  };
}
