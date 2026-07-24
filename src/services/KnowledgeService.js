// ============================================================
// KnowledgeService (src/services)
// غلاف رفيع (thin wrapper) حول KnowledgeLayer — نقطة الوصول الموحّدة
// للقراءة من طبقة المعرفة عبر باقي النظام (بدل ما renderLayer.js ينادي
// knowledgeLayer مباشرة). لا منطق جديد هنا، فقط تفويض (delegation) —
// أي منطق فعلي (indexes, validation, metrics...) لسه موجود في
// knowledgeLayer.js نفسه ومفيش تكرار له هنا.
// ============================================================

export class KnowledgeService {
  /**
   * @param {object} deps
   * @param {typeof import('../../js/knowledgeLayer.js').createKnowledgeLayer} deps.knowledgeLayer instance مش factory
   */
  constructor({ knowledgeLayer }){
    if(!knowledgeLayer) throw new Error('KnowledgeService: محتاج knowledgeLayer بالحقن');
    this._knowledgeLayer = knowledgeLayer;
  }

  getAllNodes(){
    return this._knowledgeLayer.getAllNodes();
  }

  getGroups(){
    return this._knowledgeLayer.getGroups();
  }

  getNodesByGroup(groupId){
    return this._knowledgeLayer.getNodesByGroup(groupId);
  }

  getEdgesForNode(nodeId){
    return this._knowledgeLayer.getEdgesForNode(nodeId);
  }

  findNodeById(id){
    return this._knowledgeLayer.findNodeById(id);
  }

  findNodeByTitle(title){
    return this._knowledgeLayer.findNodeByTitle(title);
  }

  computeMetrics(){
    return this._knowledgeLayer.computeMetrics();
  }

  validateIntegrity(){
    return this._knowledgeLayer.validateIntegrity();
  }

  findEdgeById(id){
    return this._knowledgeLayer.findEdgeById(id);
  }

  findOrphanNodes(){
    return this._knowledgeLayer.findOrphanNodes();
  }

  computeAnalytics(){
    return this._knowledgeLayer.computeAnalytics();
  }

  computeHealthReport(){
    return this._knowledgeLayer.computeHealthReport();
  }
}
