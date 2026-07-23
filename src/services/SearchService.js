// ============================================================
// SearchService (src/services)
// محرك بحث محلي: مطابقة مرنة (fuzzy) + ترتيب النتائج بالصلة + سجل بحث
// سابق. الأصل هنا كان نقل حرفي لمنطق filterState/nodeMatchesFilter من
// renderLayer.js — اتطوّر دلوقتي زي ما هو موضّح في MIGRATION_REPORT.md
// (بند "Search Engine متقدم").
//
// درجات المطابقة (scoreMatch) بترتيب تنازلي:
//   100  تطابق تام (بعد تجاهل حالة الأحرف)
//    90  العنوان بيبدأ بالاستعلام
//    70  العنوان بيحتوي الاستعلام (substring)
//  10-45 تطابق مرن (fuzzy) — مسافة تحرير (Levenshtein) قريبة، بيلقط أخطاء
//        إملائية بسيطة (حرف زيادة/ناقص/غلط) في العنوان الكامل أو في أي
//        كلمة منه بمفردها
//     0  مفيش تطابق خالص
// ============================================================

/** مسافة Levenshtein بسيطة (بدون مكتبة خارجية) — عدد التعديلات (إضافة/حذف/استبدال) لتحويل a لـ b. */
function levenshtein(a, b){
  const m = a.length, n = b.length;
  if(m === 0) return n;
  if(n === 0) return m;
  const dp = Array.from({ length: m + 1 }, ()=> new Array(n + 1).fill(0));
  for(let i = 0; i <= m; i++) dp[i][0] = i;
  for(let j = 0; j <= n; j++) dp[0][j] = j;
  for(let i = 1; i <= m; i++){
    for(let j = 1; j <= n; j++){
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,     // حذف
        dp[i][j - 1] + 1,     // إضافة
        dp[i - 1][j - 1] + cost // استبدال
      );
    }
  }
  return dp[m][n];
}

/** حد أقصى لمسافة التحرير المقبولة كـ "خطأ إملائي بسيط"، بيكبر مع طول الاستعلام. */
function fuzzyThreshold(queryLength){
  if(queryLength <= 3) return 1;
  if(queryLength <= 6) return 2;
  return 3;
}

/**
 * درجة تطابق العنوان مع الاستعلام (0 لو مفيش تطابق خالص).
 * @param {string} title
 * @param {string} query الاستعلام متوقّع يكون lowercase ومقطوع من قبل (trim) بالفعل
 */
function scoreMatch(title, query){
  if(!query) return 0;
  const t = title.toLowerCase();
  if(t === query) return 100;
  if(t.startsWith(query)) return 90;
  if(t.includes(query)) return 70;

  const threshold = fuzzyThreshold(query.length);
  let bestDist = levenshtein(query, t);
  for(const word of t.split(/\s+/)){
    if(word.length === 0) continue;
    const d = levenshtein(query, word);
    if(d < bestDist) bestDist = d;
  }
  if(bestDist <= threshold){
    return Math.max(10, 45 - bestDist * 10);
  }
  return 0;
}

const MAX_HISTORY = 8;

export class SearchService {
  /**
   * @param {object} deps
   * @param {typeof import('../../js/knowledgeLayer.js').createKnowledgeLayer} deps.knowledgeLayer instance مش factory
   * @param {typeof import('../../js/storageLayer.js').StorageLayer} [deps.storageLayer] اختياري —
   *   لو مش محقون، سجل البحث بيفضل في الذاكرة بس (مفيد للاختبارات المعزولة) من غير ما يتخزّن.
   */
  constructor({ knowledgeLayer, storageLayer }){
    if(!knowledgeLayer) throw new Error('SearchService: محتاج knowledgeLayer بالحقن');
    this._knowledgeLayer = knowledgeLayer;
    this._storageLayer = storageLayer || null;
    this._query = '';
    this._activeTypes = null; // null = لسه initTypes ما اتنادتش، كل الأنواع فعّالة
    this._activeGroups = null; // null = لسه initGroups ما اتنادتش، كل المجموعات فعّالة (بما فيها بدون مجموعة)
    this._minConnections = 0;
    this._history = this._storageLayer ? this._storageLayer.loadSearchHistory() : [];
  }

  /** بتتنادى مرة عند بناء شريط الفلاتر — بتفعّل كل الأنواع الموجودة فعليًا. */
  initTypes(typesPresent){
    this._activeTypes = new Set(typesPresent);
  }

  /**
   * بتتنادى مرة عند بناء الفلاتر المتقدمة — بتفعّل كل المجموعات الزمنية
   * الموجودة فعليًا، زائد المفتاح الخاص '__none__' اللي بيمثّل "بدون مجموعة
   * زمنية" (شخصيات/منظمات/إلخ).
   */
  initGroups(groupIds){
    this._activeGroups = new Set(groupIds);
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

  toggleGroup(groupKey){
    if(this._activeGroups === null) return;
    if(this._activeGroups.has(groupKey)){
      this._activeGroups.delete(groupKey);
    } else {
      this._activeGroups.add(groupKey);
    }
  }

  isGroupActive(groupKey){
    return this._activeGroups === null || this._activeGroups.has(groupKey);
  }

  /** حد أدنى لعدد العلاقات (degree) عشان العقدة تظهر — 0 = من غير فلترة. */
  setMinConnections(count){
    this._minConnections = Math.max(0, Number(count) || 0);
  }

  getMinConnections(){
    return this._minConnections;
  }

  /**
   * تطابق "شبه دلالي": بيدوّر مش بس في عنوان العقدة، لكن كمان في وصف
   * (description) أي علاقة متصلة بيها — يعني بحث زي "نيك فيوري" أو "حجر
   * الزمن" ممكن يلاقي عقدة عنوانها مش فيه الكلمة دي أصلًا، لو العلاقة اللي
   * بتوصلها بعقدة تانية بتوصف الحدث ده. ده مش NLP حقيقي (مفيش استنتاج علاقات
   * أو فهم سياق)، لكنه فعليًا بيوسّع نطاق البحث لمحتوى العلاقات مش العناوين بس.
   */
  _matchesSemantically(node, query){
    if(scoreMatch(node.title, query) > 0) return true;
    const edges = this._knowledgeLayer.getEdgesForNode(node.id);
    return edges.some(({ edge })=> edge.description && edge.description.toLowerCase().includes(query));
  }

  /** بتستخدم نفس محرك الدرجات (scoreMatch) — أي تطابق fuzzy بقى بيعتبر matches() = true. */
  matches(node){
    const matchesQuery = this._query === '' || this._matchesSemantically(node, this._query);
    const matchesType = this._activeTypes === null || this._activeTypes.has(node.type);
    const groupKey = node.group || '__none__';
    const matchesGroup = this._activeGroups === null || this._activeGroups.has(groupKey);
    const matchesConnections = this._minConnections === 0
      || this._knowledgeLayer.getEdgesForNode(node.id).length >= this._minConnections;
    return matchesQuery && matchesType && matchesGroup && matchesConnections;
  }

  /** بيرجّع true لو فيه فلترة فعليًا شغّالة (بحث نصي، نوع مستبعد، مجموعة مستبعدة، أو حد أدنى علاقات). */
  isFilterActive(){
    if(this._query) return true;
    if(this._minConnections > 0) return true;
    if(this._activeTypes !== null){
      const allTypes = new Set(this._knowledgeLayer.getAllNodes().map(n=> n.type));
      if(this._activeTypes.size < allTypes.size) return true;
    }
    if(this._activeGroups !== null){
      const allGroups = new Set(this._knowledgeLayer.getAllNodes().map(n=> n.group || '__none__'));
      if(this._activeGroups.size < allGroups.size) return true;
    }
    return false;
  }

  /**
   * بحث نصي محلي مرتّب بالصلة (تطابق تام > بداية > احتواء > fuzzy)، مع دعم
   * أخطاء إملائية بسيطة. بديل موحّد لـ businessLayer.searchLocalNodes
   * (مستخدمة كمان في شريط الفلترة الرئيسي لعرض اقتراحات autocomplete).
   * @param {string} query
   * @param {{excludeTitle?: string|null, limit?: number}} [options]
   * @returns {Array} عقد مرتّبة تنازليًا حسب درجة التطابق (نفس شكل العقدة الأصلي، بدون إضافة حقول)
   */
  searchByTitle(query, { excludeTitle = null, limit = Infinity } = {}){
    const q = (query || '').trim().toLowerCase();
    if(q.length < 1) return [];
    let scored = this._knowledgeLayer.getAllNodes()
      .map(n=> ({ node: n, score: scoreMatch(n.title, q) }))
      .filter(x=> x.score > 0);
    if(excludeTitle){
      scored = scored.filter(x=> x.node.title !== excludeTitle);
    }
    scored.sort((a, b)=> b.score - a.score || a.node.title.localeCompare(b.node.title, 'ar'));
    return scored.slice(0, limit).map(x=> x.node);
  }

  // ---------------- سجل البحث ----------------

  /** بتسجّل استعلام كامل في السجل (بعد trim)، وبتتجاهل الفاضي/المكرر فورًا. أحدث استعلام بيتحط الأول. */
  recordSearch(query){
    const q = (query || '').trim();
    if(!q) return;
    this._history = [q, ...this._history.filter(h=> h.toLowerCase() !== q.toLowerCase())].slice(0, MAX_HISTORY);
    if(this._storageLayer) this._storageLayer.saveSearchHistory(this._history);
  }

  getHistory(){
    return this._history.slice();
  }

  clearHistory(){
    this._history = [];
    if(this._storageLayer) this._storageLayer.saveSearchHistory(this._history);
  }
}
