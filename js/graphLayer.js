// ============================================================
// Graph Layer
// تحويل بيانات المعرفة (عقد + علاقات) لشكل جاهز لـ D3 force-directed graph.
// لا يوجد هنا رسم فعلي (ده مسؤولية Rendering Layer) — فقط تجهيز البيانات.
// ============================================================

function createGraphLayer(knowledgeLayer){

  function buildGraphData(){
    const nodesData = [];
    const linksData = [];
    const nodeGraphIdByRealId = new Map();

    knowledgeLayer.getGroups().forEach(group=>{
      const items = knowledgeLayer.getNodesByGroup(group.id);
      if(!items.length) return;
      const hubId = 'hub:' + group.id;
      nodesData.push({ id: hubId, label: group.name, isHub: true });
      items.forEach(node=>{
        const gId = 'n:' + node.id;
        nodesData.push({ id: gId, label: node.title, isHub: false, node });
        nodeGraphIdByRealId.set(node.id, gId);
        linksData.push({ source: hubId, target: gId, isCross: false });
      });
    });

    // عقد بدون مجموعة (مثل character/team/organization/artifact/location/event) تُضاف كعقد مستقلة بدون hub
    knowledgeLayer.getAllNodes().forEach(node=>{
      if(node.group) return; // اتضافت بالفعل تحت hub المجموعة
      if(nodeGraphIdByRealId.has(node.id)) return;
      const gId = 'n:' + node.id;
      nodesData.push({ id: gId, label: node.title, isHub: false, node });
      nodeGraphIdByRealId.set(node.id, gId);
    });

    const seenPairs = new Set();
    knowledgeLayer.getAllNodes().forEach(node=>{
      knowledgeLayer.getEdgesForNode(node.id).forEach(({ edge, otherNode })=>{
        if(!otherNode) return;
        const a = nodeGraphIdByRealId.get(node.id);
        const b = nodeGraphIdByRealId.get(otherNode.id);
        if(!a || !b || a === b) return;
        const pairKey = [a,b].sort().join('|') + '|' + edge.id;
        if(seenPairs.has(pairKey)) return;
        seenPairs.add(pairKey);
        linksData.push({ source: a, target: b, isCross: true, edgeType: edge.type, edgeId: edge.id, edgeWeight: typeof edge.weight === 'number' ? edge.weight : null });
      });
    });

    return { nodesData, linksData };
  }

  /**
   * كل جيران عقدة (بعقدها الحقيقية، مش عُقد hub الوهمية بتاعة D3) — دالة
   * مساعدة داخلية مشتركة بين الخوارزميات التلاتة تحت.
   */
  function realNeighbors(nodeId){
    return knowledgeLayer.getEdgesForNode(nodeId).map(e=> e.otherNode).filter(Boolean);
  }

  /**
   * الجيران المشتركين بين عقدتين (Comparison Engine — PART 04 Phase D).
   * @returns {Array} عُقد مرتبطة حقيقيًا بالعقدتين الاتنين معًا
   */
  function commonNeighbors(idA, idB){
    const neighborsA = new Set(realNeighbors(idA).map(n=> n.id));
    return realNeighbors(idB).filter(n=> neighborsA.has(n.id));
  }

  /**
   * أقصر مسار بين عقدتين (BFS، شبكة غير موزونة). بيمشي على العلاقات
   * الحقيقية فقط (بيتجاهل تجميع hub الخاص بعرض D3).
   * @returns {Array|null} مصفوفة عقد بترتيب المسار (من fromId لـ toId)، أو null لو مفيش مسار
   */
  function shortestPath(fromId, toId){
    if(fromId === toId){
      const n = knowledgeLayer.findNodeById(fromId);
      return n ? [n] : null;
    }
    const visited = new Set([fromId]);
    const parent = new Map();
    const queue = [fromId];
    let qi = 0;
    while(qi < queue.length){
      const current = queue[qi++];
      if(current === toId) break;
      for(const neighbor of realNeighbors(current)){
        if(visited.has(neighbor.id)) continue;
        visited.add(neighbor.id);
        parent.set(neighbor.id, current);
        queue.push(neighbor.id);
      }
    }
    if(!visited.has(toId)) return null;
    const pathIds = [toId];
    let cur = toId;
    while(cur !== fromId){
      cur = parent.get(cur);
      pathIds.push(cur);
    }
    pathIds.reverse();
    return pathIds.map(id=> knowledgeLayer.findNodeById(id));
  }

  /**
   * كل المكوّنات المتصلة في الشبكة (العلاقات بتتعامل كغير موجّهة لغرض
   * الاتصال بس). مفيد لاكتشاف عُقد أو مجموعات معزولة عن باقي الشبكة.
   * @returns {Array<Array>} مصفوفات عقد، كل مصفوفة داخلية = مكوّن متصل واحد، مرتّبة من الأكبر للأصغر
   */
  function connectedComponents(){
    const visited = new Set();
    const components = [];
    for(const startNode of knowledgeLayer.getAllNodes()){
      if(visited.has(startNode.id)) continue;
      const component = [];
      const stack = [startNode.id];
      visited.add(startNode.id);
      while(stack.length){
        const currentId = stack.pop();
        const node = knowledgeLayer.findNodeById(currentId);
        if(node) component.push(node);
        for(const neighbor of realNeighbors(currentId)){
          if(visited.has(neighbor.id)) continue;
          visited.add(neighbor.id);
          stack.push(neighbor.id);
        }
      }
      components.push(component);
    }
    return components.sort((a, b)=> b.length - a.length);
  }

  /**
   * هل فيه دورة (cycle) في الشبكة؟ DFS مع تتبّع العقدة الأب (parent) عشان
   * تجاهل رجوعنا لنفس العلاقة اللي جينا منها (ده مش cycle). لو رجعنا لعقدة
   * زرناها قبل كده من مسار مختلف تمامًا، فدي دورة فعلية.
   * @returns {boolean}
   */
  function hasCycle(){
    const visited = new Set();

    function dfs(nodeId, parentId){
      visited.add(nodeId);
      for(const neighbor of realNeighbors(nodeId)){
        if(neighbor.id === parentId) continue;
        if(visited.has(neighbor.id)) return true;
        if(dfs(neighbor.id, nodeId)) return true;
      }
      return false;
    }

    for(const node of knowledgeLayer.getAllNodes()){
      if(visited.has(node.id)) continue;
      if(dfs(node.id, null)) return true;
    }
    return false;
  }

  /**
   * كل العقد اللي على بعد <= maxDistance علاقة حقيقية من عقدة البداية،
   * مجمّعة حسب المسافة (BFS طبقة بطبقة) — وضع البحث المتعمق (Research Mode
   * — PART 04 Phase E). عقدة البداية نفسها مش متضمّنة في النتيجة.
   * @returns {Array<{node:object, distance:number}>}
   */
  function nodesWithinDistance(nodeId, maxDistance = 2){
    const visited = new Set([nodeId]);
    let frontier = [nodeId];
    const result = [];
    for(let d = 1; d <= maxDistance && frontier.length; d++){
      const nextFrontier = [];
      for(const currentId of frontier){
        for(const neighbor of realNeighbors(currentId)){
          if(visited.has(neighbor.id)) continue;
          visited.add(neighbor.id);
          nextFrontier.push(neighbor.id);
          result.push({ node: neighbor, distance: d });
        }
      }
      frontier = nextFrontier;
    }
    return result;
  }

  /**
   * محرك استنتاج بسيط وقابل للتفسير (Inference Engine — MARVEL-FIX-MASTER-PROMPT Stage 1):
   * بيقترح علاقات محتملة (لسه مش موجودة) بين زوجين من العقد ليهم عدد كافٍ من
   * الجيران الحقيقيين المشتركين. **قرار نطاق موثّق**: مفيش أي اقتراح بيتضاف
   * تلقائيًا للبيانات — الدالة دي بترجع اقتراحات بس، والإضافة الفعلية بتحصل
   * فقط لو المستخدم وافق صراحة (عبر addManualEdge الموجودة بالفعل، من واجهة
   * منفصلة). مفيش ML حقيقي هنا — قاعدة واحدة عالية الدقة (جيران مشتركين) بدل
   * قواعد متعددة ممكن تولّد ضوضاء كتير على شبكة بحجم 108 عقدة.
   * @returns {Array} مصفوفة اقتراحات {id, fromId, fromTitle, toId, toTitle, commonNeighborTitles, count}
   *          مرتّبة تنازليًا حسب عدد الجيران المشتركين
   */
  function suggestMissingEdges({ minCommonNeighbors = 2 } = {}){
    const allNodes = knowledgeLayer.getAllNodes();
    const suggestions = [];
    for(let i = 0; i < allNodes.length; i++){
      for(let j = i + 1; j < allNodes.length; j++){
        const a = allNodes[i], b = allNodes[j];
        if(knowledgeLayer.findEdgeBetween(a.id, b.id)) continue; // موجودة بالفعل
        const common = commonNeighbors(a.id, b.id);
        if(common.length >= minCommonNeighbors){
          const [firstId, secondId] = [a.id, b.id].sort();
          suggestions.push({
            id: `sug_${firstId}_${secondId}`,
            fromId: a.id,
            fromTitle: a.title,
            toId: b.id,
            toTitle: b.title,
            commonNeighborTitles: common.map(n=> n.title),
            count: common.length
          });
        }
      }
    }
    suggestions.sort((x, y)=> y.count - x.count);
    return suggestions;
  }

  return { buildGraphData, shortestPath, connectedComponents, hasCycle, commonNeighbors, nodesWithinDistance, suggestMissingEdges };
}
