// ============================================================
// GraphService (src/services)
// غلاف رفيع (thin wrapper) حول GraphLayer — نقطة الوصول الموحّدة لتجهيز
// بيانات الشبكة (D3) عبر باقي النظام (بدل ما renderLayer.js ينادي
// graphLayer مباشرة). لا منطق جديد هنا، فقط تفويض — المنطق الفعلي
// (بناء nodesData/linksData) لسه موجود في graphLayer.js نفسه.
// ============================================================

export class GraphService {
  /**
   * @param {object} deps
   * @param {typeof import('../../js/graphLayer.js').createGraphLayer} deps.graphLayer instance مش factory
   */
  constructor({ graphLayer }){
    if(!graphLayer) throw new Error('GraphService: محتاج graphLayer بالحقن');
    this._graphLayer = graphLayer;
  }

  buildGraphData(){
    return this._graphLayer.buildGraphData();
  }
}
