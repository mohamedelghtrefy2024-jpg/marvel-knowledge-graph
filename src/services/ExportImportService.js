// ============================================================
// ExportImportService (src/services)
// تصدير كل بيانات المستخدم المخصّصة (custom nodes/edges + الخلفية) كملف
// JSON واحد قابل للاستيراد لاحقًا (على نفس الجهاز أو جهاز تاني). بيبث
// DATA_EXPORTED/DATA_IMPORTED عبر EventBus (نفس أسلوب BackgroundService).
//
// ما يتم تصديره عمدًا: فقط البيانات اللي المستخدم أضافها بنفسه
// (customNodes/customEdges/background). البيانات الأساسية (nodes.json/
// edges.json الأصليين) مش جزء من التصدير لأنها ثابتة وموجودة بالفعل
// في المشروع نفسه — تصديرها هيضخّم الملف من غير داعي.
// ============================================================

import { SYSTEM_EVENTS } from '../core/EventBus.js';

const EXPORT_FORMAT_VERSION = 1;

export class ExportImportService {
  /**
   * @param {object} deps
   * @param {typeof import('../../js/knowledgeLayer.js').createKnowledgeLayer} deps.knowledgeLayer instance
   * @param {typeof import('../../js/storageLayer.js').StorageLayer} deps.storageLayer
   * @param {import('../core/EventBus.js').EventBus} deps.eventBus
   */
  constructor({ knowledgeLayer, storageLayer, eventBus }){
    if(!knowledgeLayer) throw new Error('ExportImportService: محتاج knowledgeLayer بالحقن');
    if(!storageLayer) throw new Error('ExportImportService: محتاج storageLayer بالحقن');
    if(!eventBus) throw new Error('ExportImportService: محتاج eventBus بالحقن');
    this._knowledgeLayer = knowledgeLayer;
    this._storageLayer = storageLayer;
    this._eventBus = eventBus;
  }

  /**
   * بيبني object الـ export الكامل (بدون تحويله لـ string) — مفيد للاختبار
   * المباشر من غير الحاجة لـ JSON.parse/stringify.
   */
  buildExportPayload(){
    return {
      formatVersion: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      customNodes: this._storageLayer.loadCustomNodes(),
      customEdges: this._storageLayer.loadCustomEdges(),
      background: this._storageLayer.loadBackground() || null
    };
  }

  /** نفس buildExportPayload لكن كـ JSON string جاهز للتنزيل. */
  exportAsJsonString(){
    const payload = this.buildExportPayload();
    this._eventBus.emit(SYSTEM_EVENTS.DATA_EXPORTED, {
      nodesCount: payload.customNodes.length,
      edgesCount: payload.customEdges.length
    });
    return JSON.stringify(payload, null, 2);
  }

  /**
   * فحص سلامة بنية ملف الاستيراد قبل أي كتابة فعلية. بيرجّع array فاضية
   * لو البنية سليمة، أو رسائل توضح المشكلة لو لأ.
   */
  validateImportPayload(payload){
    const issues = [];
    if(!payload || typeof payload !== 'object'){
      issues.push('الملف مش JSON صالح أو فاضي.');
      return issues;
    }
    if(!Array.isArray(payload.customNodes)){
      issues.push('حقل customNodes مفقود أو مش array.');
    }
    if(!Array.isArray(payload.customEdges)){
      issues.push('حقل customEdges مفقود أو مش array.');
    }
    if(Array.isArray(payload.customNodes)){
      payload.customNodes.forEach((n, i)=>{
        if(!n || !n.id || !n.title || !n.type){
          issues.push(`عقدة رقم ${i} ناقصة id/title/type.`);
        }
      });
    }
    if(Array.isArray(payload.customEdges)){
      payload.customEdges.forEach((e, i)=>{
        if(!e || !e.id || !e.from || !e.to || !e.type){
          issues.push(`علاقة رقم ${i} ناقصة id/from/to/type.`);
        }
      });
    }
    return issues;
  }

  /**
   * يستورد payload فعليًا: يضيف كل عقدة/علاقة لطبقة المعرفة (idempotent —
   * addCustomNode/addCustomEdge بيتجاهلوا أي id موجود بالفعل)، يحفظهم في
   * التخزين، ويستعيد الخلفية لو موجودة. بيرمي خطأ لو البنية غير صالحة —
   * المفروض تتنادى validateImportPayload الأول والتأكد من نتيجتها.
   *
   * @returns {{ importedNodes: number, importedEdges: number, backgroundRestored: boolean }}
   */
  importData(payload){
    const issues = this.validateImportPayload(payload);
    if(issues.length){
      throw new Error('ملف الاستيراد غير صالح: ' + issues.join(' | '));
    }

    let importedNodes = 0, importedEdges = 0;

    const existingNodes = this._storageLayer.loadCustomNodes();
    payload.customNodes.forEach(node=>{
      if(this._knowledgeLayer.findNodeById(node.id)) return; // موجودة بالفعل (idempotent)
      this._knowledgeLayer.addCustomNode(node);
      existingNodes.push(node);
      importedNodes++;
    });
    this._storageLayer.saveCustomNodes(existingNodes);

    const existingEdges = this._storageLayer.loadCustomEdges();
    const existingEdgeIds = new Set(existingEdges.map(e=> e.id));
    payload.customEdges.forEach(edge=>{
      if(existingEdgeIds.has(edge.id)) return; // موجودة بالفعل (idempotent)
      this._knowledgeLayer.addCustomEdge(edge);
      existingEdges.push(edge);
      existingEdgeIds.add(edge.id);
      importedEdges++;
    });
    this._storageLayer.saveCustomEdges(existingEdges);

    let backgroundRestored = false;
    if(payload.background){
      this._storageLayer.saveBackground(payload.background);
      backgroundRestored = true;
    }

    this._eventBus.emit(SYSTEM_EVENTS.DATA_IMPORTED, { importedNodes, importedEdges, backgroundRestored });

    return { importedNodes, importedEdges, backgroundRestored };
  }
}
