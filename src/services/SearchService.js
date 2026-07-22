// ============================================================
// SearchService (src/services)
// نقل حرفي (بدون تغيير في السلوك) لمنطق الفلترة اللي كان في renderLayer.js
// (filterState + nodeMatchesFilter)، بالإضافة لـ searchByTitle كبديل موحّد
// لـ businessLayer.searchLocalNodes (المعلّمة الآن @deprecated).
// ============================================================

export class SearchService {
  /**
   * @param {object} deps
   * @param {typeof import('../../js/knowledgeLayer.js').createKnowledgeLayer} deps.knowledgeLayer instance مش factory
   */
  constructor({ knowledgeLayer }){
    if(!knowledgeLayer) throw new Error('SearchService: محتاج knowledgeLayer بالحقن');
    this._knowledgeLayer = knowledgeLayer;
    this._query = '';
    this._activeTypes = null; // null = لسه initTypes ما اتنادتش، كل الأنواع فعّالة
  }

  /** بتتنادى مرة عند بناء شريط الفلاتر — بتفعّل كل الأنواع الموجودة فعليًا. */
  initTypes(typesPresent){
    this._activeTypes = new Set(typesPresent);
  }

  setQuery(rawQuery){
    this._query = (rawQuery || '').trim().toLowerCase();
  }

  toggleType(type){
    if(this._activeTypes === null) return;
    if(this._activeTypes.has(type)){
      this._activeTypes.delete(type);
    } else {
      this._activeTypes.add(type);
    }
  }

  isTypeActive(type){
    return this._activeTypes === null || this._activeTypes.has(type);
  }

  /** نفس منطق nodeMatchesFilter الأصلي حرفيًا. */
  matches(node){
    const matchesQuery = this._query === '' || node.title.toLowerCase().includes(this._query);
    const matchesType = this._activeTypes === null || this._activeTypes.has(node.type);
    return matchesQuery && matchesType;
  }

  /** بيرجّع true لو فيه فلترة فعليًا شغّالة (بحث نصي أو نوع مستبعد). */
  isFilterActive(){
    if(this._query) return true;
    if(this._activeTypes === null) return false;
    const allTypes = new Set(this._knowledgeLayer.getAllNodes().map(n=> n.type));
    return this._activeTypes.size < allTypes.size;
  }

  /**
   * بحث نصي محلي بالعنوان — بديل موحّد لـ businessLayer.searchLocalNodes.
   * @param {string} query
   * @param {{excludeTitle?: string|null, limit?: number}} [options]
   */
  searchByTitle(query, { excludeTitle = null, limit = Infinity } = {}){
    const q = (query || '').trim().toLowerCase();
    if(q.length < 1) return [];
    let results = this._knowledgeLayer.getAllNodes().filter(n=> n.title.toLowerCase().includes(q));
    if(excludeTitle){
      results = results.filter(n=> n.title !== excludeTitle);
    }
    return results.slice(0, limit);
  }
}
