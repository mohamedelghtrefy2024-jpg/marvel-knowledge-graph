// ============================================================
// ExplorationService (src/services)
// غلاف رفيع (thin wrapper) حول KnowledgeLayer/GraphLayer لثلاثة من أوضاع
// الاستكشاف الأربعة (Detective / Story / Research — PART 04 Phase E).
// لا منطق جديد هنا غير buildStory (تركيب بسيط بين shortestPath الموجودة
// وfindEdgeBetween الجديدة) — الباقي تفويض مباشر لدوال الطبقات.
//
// الوضع الرابع (Knowledge Replay) بيعتمد بالكامل على
// DashboardService.getRecentlyViewed الموجودة بالفعل (سجل مشاهدة حقيقي)،
// فمالوش أي حاجة هنا عمدًا — مفيش داعي لتكرارها في خدمة تانية.
// ============================================================

export class ExplorationService {
  /**
   * @param {object} deps
   * @param {typeof import('../../js/knowledgeLayer.js').createKnowledgeLayer} deps.knowledgeLayer instance مش factory
   * @param {typeof import('../../js/graphLayer.js').createGraphLayer} deps.graphLayer instance مش factory
   */
  constructor({ knowledgeLayer, graphLayer }){
    if(!knowledgeLayer) throw new Error('ExplorationService: محتاج knowledgeLayer بالحقن');
    if(!graphLayer) throw new Error('ExplorationService: محتاج graphLayer بالحقن');
    this._knowledgeLayer = knowledgeLayer;
    this._graphLayer = graphLayer;
  }

  // ================= وضع المحقق (Detective Mode) =================

  pickMysteryNode(minDegree = 2){
    return this._knowledgeLayer.pickMysteryNode(minDegree);
  }

  getClues(nodeId){
    return this._knowledgeLayer.getClues(nodeId);
  }

  // ================= وضع الحكاية (Story Mode) =================

  /**
   * بيحوّل أقصر مسار حقيقي بين عنصرين لسلسلة "خطوات حكاية": كل خطوة فيها
   * عقدتين متتاليتين + العلاقة الحقيقية اللي بتوصل بينهم فعليًا في البيانات
   * (findEdgeBetween). لو مفيش مسار أصلًا، بيرجّع null زي shortestPath
   * تمامًا (نفس تعامل الخطأ المتبع في GraphService).
   */
  buildStory(fromId, toId){
    const path = this._graphLayer.shortestPath(fromId, toId);
    if(!path) return null;
    const steps = [];
    for(let i = 0; i < path.length - 1; i++){
      const edge = this._knowledgeLayer.findEdgeBetween(path[i].id, path[i + 1].id);
      steps.push({ from: path[i], to: path[i + 1], edge });
    }
    return { path, steps };
  }

  // ================= وضع البحث المتعمق (Research Mode) =================

  /**
   * "دوسيه بحث" مُجمَّع عن عنصر واحد: بيانات أساسية + كل علاقاته المباشرة +
   * كل العناصر اللي على بعد <= maxDistance علاقة، مجمّعة حسب المسافة. كله
   * تفويض مباشر — التجميع نفسه هو المنطق الجديد الوحيد.
   */
  researchDossier(nodeId, maxDistance = 2){
    const node = this._knowledgeLayer.findNodeById(nodeId);
    if(!node) return null;
    return {
      node,
      directEdges: this._knowledgeLayer.getEdgesForNode(nodeId),
      reachByDistance: this._graphLayer.nodesWithinDistance(nodeId, maxDistance)
    };
  }
}
