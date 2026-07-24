// ============================================================
// InferenceEngine (src/services)
// غلاف رفيع (thin wrapper) حول GraphLayer.suggestMissingEdges + إدارة
// حالة "الاقتراحات المتجاهَلة" عبر StorageLayer (نفس نمط bookmarks/viewHistory).
// **قرار نطاق موثّق**: مفيش أي كتابة تلقائية للبيانات هنا — كل ما تعمله
// الخدمة دي هو الاقتراح والتجاهل. الإضافة الفعلية لعلاقة مقترحة بتحصل فقط
// لو المستخدم ضغط "قبول" في الواجهة، واللي بينادي businessLayer.addManualEdge
// الموجودة بالفعل (نفس المسار اللي بيستخدمه أي رابط يدوي تاني في المشروع).
// ============================================================

export class InferenceEngine {
  /**
   * @param {object} deps
   * @param {object} deps.knowledgeLayer instance
   * @param {object} deps.graphLayer instance
   * @param {object} deps.storageLayer StorageLayer (classic script global)
   */
  constructor({ knowledgeLayer, graphLayer, storageLayer }){
    if(!knowledgeLayer) throw new Error('InferenceEngine: محتاج knowledgeLayer بالحقن');
    if(!graphLayer) throw new Error('InferenceEngine: محتاج graphLayer بالحقن');
    if(!storageLayer) throw new Error('InferenceEngine: محتاج storageLayer بالحقن');
    this._knowledgeLayer = knowledgeLayer;
    this._graphLayer = graphLayer;
    this._storageLayer = storageLayer;
  }

  /**
   * الاقتراحات الحالية، مستبعد منها أي اقتراح اتجاهل قبل كده.
   */
  getSuggestions({ minCommonNeighbors = 2 } = {}){
    const dismissed = new Set(this._storageLayer.loadDismissedSuggestions());
    return this._graphLayer
      .suggestMissingEdges({ minCommonNeighbors })
      .filter(s=> !dismissed.has(s.id));
  }

  /**
   * تجاهل اقتراح معيّن — بيتخزّن الـ id بتاعه عشان ميظهرش تاني، من غير أي
   * تعديل على بيانات nodes/edges نفسها.
   */
  dismissSuggestion(suggestionId){
    const dismissed = this._storageLayer.loadDismissedSuggestions();
    if(!dismissed.includes(suggestionId)){
      dismissed.push(suggestionId);
      this._storageLayer.saveDismissedSuggestions(dismissed);
    }
  }

  clearDismissed(){
    this._storageLayer.saveDismissedSuggestions([]);
  }
}
