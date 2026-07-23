// ============================================================
// DashboardService (src/services)
// خدمة تجميع (aggregation) للوحة الاستكشاف الرئيسية (PART 04 — Phase A:
// Dashboard). زي باقي الخدمات، بتحقن الطبقات مباشرة (knowledgeLayer +
// storageLayer) مش خدمات تانية، بنفس مستوى KnowledgeService/SearchService،
// وبتفوّض للمنطق الموجود بالفعل (computeMetrics/validateIntegrity) من
// غير أي تكرار. المنطق الجديد الوحيد هنا هو اللي محتاج تجميع خاص
// بالـ Dashboard نفسه (آخر إضافات، مفضّلة، سجل مشاهدة، اكتشاف عشوائي).
// ============================================================

const MAX_VIEW_HISTORY = 12;

export class DashboardService {
  /**
   * @param {object} deps
   * @param {typeof import('../../js/knowledgeLayer.js').createKnowledgeLayer} deps.knowledgeLayer instance مش factory
   * @param {typeof import('../../js/storageLayer.js').StorageLayer} deps.storageLayer
   */
  constructor({ knowledgeLayer, storageLayer }){
    if(!knowledgeLayer) throw new Error('DashboardService: محتاج knowledgeLayer بالحقن');
    if(!storageLayer) throw new Error('DashboardService: محتاج storageLayer بالحقن');
    this._knowledgeLayer = knowledgeLayer;
    this._storageLayer = storageLayer;
  }

  /** إحصائيات المعرفة — تفويض مباشر لنفس computeMetrics المستخدمة في مودال الإحصائيات. */
  getKnowledgeStats(){
    return this._knowledgeLayer.computeMetrics();
  }

  /** تقرير سلامة البيانات — تفويض مباشر لنفس validateIntegrity المستخدمة عند الإقلاع. */
  getIntegrityReport(){
    return this._knowledgeLayer.validateIntegrity();
  }

  /**
   * حالة النظام: أعداد أساسية تفيد كنظرة سريعة على صحة/حجم البيانات.
   * (مفيش تتبع فعلي لحجم الكاش أو التخزين — localStorage مفيهوش API
   * لقياس المساحة المُستخدمة فعليًا بدقة، فاتجنّبنا رقم مضلّل).
   */
  getSystemStatus(){
    const customNodes = this._storageLayer.loadCustomNodes();
    const customEdges = this._storageLayer.loadCustomEdges();
    return {
      totalNodes: this._knowledgeLayer.getAllNodes().length,
      totalGroups: this._knowledgeLayer.getGroups().length,
      customNodesCount: customNodes.length,
      customEdgesCount: customEdges.length
    };
  }

  /** عنصر عشوائي (Random Discovery) — null لو مفيش عناصر أصلًا. */
  getRandomNode(){
    const all = this._knowledgeLayer.getAllNodes();
    if(!all.length) return null;
    return all[Math.floor(Math.random() * all.length)];
  }

  /**
   * آخر إضافات المستخدم (Latest Added) — عقد وروابط مخصّصة أضافها المستخدم
   * بنفسه، مرتّبة الأحدث أولًا حسب createdAt. العقد/الروابط الأصلية (108/106)
   * مالهاش تاريخ إضافة أصلًا (بيانات ثابتة من التأسيس)، فمش جزء من الويدجت ده
   * عمدًا — ده معناها الويدجت ده هيفضل فاضي لحد ما المستخدم يضيف حاجة بنفسه،
   * وده سلوك متوقّع ومقصود مش خطأ.
   */
  getRecentAdditions({ limit = 5 } = {}){
    const nodes = [...this._storageLayer.loadCustomNodes()]
      .sort((a, b)=> (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);
    const edges = [...this._storageLayer.loadCustomEdges()]
      .sort((a, b)=> (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);
    return { nodes, edges };
  }

  // ================= المفضّلة (Bookmarks) =================

  isBookmarked(nodeId){
    return this._storageLayer.loadBookmarks().includes(nodeId);
  }

  toggleBookmark(nodeId){
    let bookmarks = this._storageLayer.loadBookmarks();
    const wasBookmarked = bookmarks.includes(nodeId);
    bookmarks = wasBookmarked ? bookmarks.filter(id=> id !== nodeId) : [...bookmarks, nodeId];
    this._storageLayer.saveBookmarks(bookmarks);
    return !wasBookmarked; // بترجّع الحالة الجديدة
  }

  /** عناصر المفضّلة الفعلية (مش مجرّد IDs) — بتتجاهل بهدوء أي id بقى مش موجود. */
  getBookmarkedNodes(){
    return this._storageLayer.loadBookmarks()
      .map(id=> this._knowledgeLayer.findNodeById(id))
      .filter(Boolean);
  }

  // ================= سجل المشاهدة (Continue Exploring / Recent History) =================

  /** تُنادى من openDetail في renderLayer.js في كل مرة يفتح فيها المستخدم تفاصيل عنصر. */
  recordView(nodeId){
    let history = this._storageLayer.loadViewHistory();
    history = history.filter(id=> id !== nodeId);
    history.unshift(nodeId);
    if(history.length > MAX_VIEW_HISTORY) history = history.slice(0, MAX_VIEW_HISTORY);
    this._storageLayer.saveViewHistory(history);
  }

  /** آخر عناصر اتفتحت، الأحدث أولًا — بتتجاهل بهدوء أي id بقى مش موجود. */
  getRecentlyViewed({ limit = MAX_VIEW_HISTORY } = {}){
    return this._storageLayer.loadViewHistory()
      .slice(0, limit)
      .map(id=> this._knowledgeLayer.findNodeById(id))
      .filter(Boolean);
  }
}
