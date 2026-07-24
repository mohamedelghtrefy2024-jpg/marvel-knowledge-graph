// ============================================================
// TimelineService (src/services)
// غلاف رفيع (thin wrapper) حول TimelineLayer — نقطة الوصول الموحّدة
// لبيانات "الخط الزمني" عبر باقي النظام (بدل ما renderLayer.js ينادي
// timelineLayer مباشرة). لا منطق جديد هنا، فقط تفويض — نفس أسلوب
// GraphService/KnowledgeService بالظبط.
// ============================================================

export class TimelineService {
  /**
   * @param {object} deps
   * @param {typeof import('../../js/timelineLayer.js').createTimelineLayer} deps.timelineLayer instance مش factory
   */
  constructor({ timelineLayer }){
    if(!timelineLayer) throw new Error('TimelineService: محتاج timelineLayer بالحقن');
    this._timelineLayer = timelineLayer;
  }

  buildTimelineData(){
    return this._timelineLayer.buildTimelineData();
  }

  arcsForNode(nodeId, arcs){
    return this._timelineLayer.arcsForNode(nodeId, arcs);
  }
}
