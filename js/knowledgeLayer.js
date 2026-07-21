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

  function findNodeById(id){
    return nodesById.get(id) || null;
  }

  function findNodeByTitle(title){
    return nodesByTitle.get(title) || null;
  }

  function getAllNodes(){
    return nodes;
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

  return {
    setData,
    addCustomNode,
    addCustomEdge,
    findNodeById,
    findNodeByTitle,
    getAllNodes,
    getGroups,
    getNodesByGroup,
    getEdgesForNode,
    validateIntegrity,
    computeMetrics
  };
}
