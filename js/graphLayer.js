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
        linksData.push({ source: a, target: b, isCross: true, edgeType: edge.type });
      });
    });

    return { nodesData, linksData };
  }

  return { buildGraphData };
}
