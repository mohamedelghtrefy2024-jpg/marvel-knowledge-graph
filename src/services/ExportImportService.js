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

// ------------------------------------------------------------
// Export Center (PART 04 — Phase F)
// نطاق واقعي (بدل الطموح الحرفي في مارفل_4.md): الصيغ الإضافية اللي
// ممكن تتولّد بأمان بالكامل في المتصفح من غير أي مكتبة/سيرفر خارجي:
// CSV (للجداول/Excel)، Markdown (تقرير قابل للقراءة)، GraphML (لأدوات
// تحليل شبكات زي Gephi/yEd). أما PDF/Neo4j (Cypher)/SQLite: اتقرّر
// استبعادهم من النطاق — PDF محتاج مكتبة رندر مش متاحة هنا (أو
// print-to-PDF من المتصفح نفسه، ده بديل موجود بالفعل)، Neo4j محتاج
// قاعدة بيانات فعلية شغالة مش مجرد ملف، SQLite محتاج مكتبة WASM
// مش من ضمن الاعتماديات المسموحة في المشروع. الصيغ الثلاثة دي بيانات
// خام (raw ids/types) عمدًا — بدون أي label ترجمة عربي، لأن التسميات
// دي مسؤولية طبقة العرض مش طبقة الـ service (فصل الطبقات المتبع).
// ------------------------------------------------------------

/** بيهرب قيمة واحدة لصف CSV (يحيط بيها بعلامات تنصيص لو فيها فاصلة/تنصيص/سطر جديد). */
function csvEscape(value){
  const str = value === null || value === undefined ? '' : String(value);
  if(/[",\n\r]/.test(str)){
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvRow(values){
  return values.map(csvEscape).join(',') + '\r\n';
}

/** بيهرب نص لـ XML (مستخدم في GraphML). */
function xmlEscape(value){
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

  // ---------------- Export Center (Phase F) — full-graph exports ----------------
  // بعكس exportAsJsonString (نسخة احتياطية لإضافات المستخدم بس)، الدوال دي
  // بتصدّر الخريطة كلها (العقد + العلاقات الأصلية والمخصّصة) بصيغ مفيدة
  // لأدوات خارجية أو للقراءة المباشرة.

  /** كل العقد والعلاقات الحالية (أصلية + مخصّصة) — مصدر واحد لكل دوال الـ Export Center. */
  _getFullGraph(){
    return {
      nodes: this._knowledgeLayer.getAllNodes(),
      edges: this._knowledgeLayer.getAllEdges()
    };
  }

  /**
   * تصدير الخريطة كلها كصيغة CSV — بيرجّع ملفين منفصلين (nodes.csv, edges.csv)
   * لأن عقد وعلاقات مالهمش نفس الأعمدة، ومفيش مكتبة zip متاحة عشان نجمعهم
   * في ملف واحد.
   * @returns {{ nodesCsv: string, edgesCsv: string }}
   */
  exportFullGraphAsCsv(){
    const { nodes, edges } = this._getFullGraph();

    let nodesCsv = csvRow(['id', 'title', 'type', 'group']);
    nodes.forEach(n=>{
      nodesCsv += csvRow([n.id, n.title, n.type, n.group ?? '']);
    });

    let edgesCsv = csvRow(['id', 'from', 'to', 'type', 'direction', 'description']);
    edges.forEach(e=>{
      edgesCsv += csvRow([e.id, e.from, e.to, e.type, e.direction ?? '', e.description ?? '']);
    });

    this._eventBus.emit(SYSTEM_EVENTS.DATA_EXPORTED, { format: 'csv', nodesCount: nodes.length, edgesCount: edges.length });
    return { nodesCsv, edgesCsv };
  }

  /**
   * تصدير الخريطة كلها كتقرير Markdown مقروء — العقد مجمّعة حسب النوع،
   * وتحت كل عقدة العلاقات اللي طالعة منها (from === node.id) بس، عشان
   * كل علاقة تظهر مرة واحدة في التقرير مش مرتين.
   */
  exportFullGraphAsMarkdown(){
    const { nodes, edges } = this._getFullGraph();
    const byType = new Map();
    nodes.forEach(n=>{
      if(!byType.has(n.type)) byType.set(n.type, []);
      byType.get(n.type).push(n);
    });

    let md = `# خريطة مارفل المعرفية — تصدير كامل\n\n`;
    md += `تاريخ التصدير: ${new Date().toISOString()}\n\n`;
    md += `إجمالي: ${nodes.length} عقدة، ${edges.length} علاقة.\n\n`;

    Array.from(byType.keys()).sort().forEach(type=>{
      md += `## ${type} (${byType.get(type).length})\n\n`;
      byType.get(type).forEach(n=>{
        md += `### ${n.title}\n\n`;
        const outgoing = edges.filter(e=> e.from === n.id);
        if(outgoing.length){
          outgoing.forEach(e=>{
            const target = nodes.find(x=> x.id === e.to);
            md += `- **${e.type}** ← ${target ? target.title : '(غير موجودة)'}${e.description ? `: ${e.description}` : ''}\n`;
          });
        } else {
          md += `- (مفيش علاقات صادرة من العنصر ده)\n`;
        }
        md += `\n`;
      });
    });

    this._eventBus.emit(SYSTEM_EVENTS.DATA_EXPORTED, { format: 'markdown', nodesCount: nodes.length, edgesCount: edges.length });
    return md;
  }

  /**
   * تصدير الخريطة كلها كـ GraphML صالح (معيار XML مقروء من أدوات زي
   * Gephi/yEd). كل عقدة/علاقة بتاخد خصائصها كـ <data> بمفاتيح معرّفة
   * في الـ <key> elements أول الملف.
   */
  exportFullGraphAsGraphML(){
    const { nodes, edges } = this._getFullGraph();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    xml += '  <key id="title" for="node" attr.name="title" attr.type="string"/>\n';
    xml += '  <key id="type" for="node" attr.name="type" attr.type="string"/>\n';
    xml += '  <key id="edgeType" for="edge" attr.name="type" attr.type="string"/>\n';
    xml += '  <key id="description" for="edge" attr.name="description" attr.type="string"/>\n';
    xml += '  <graph id="MarvelKnowledgeGraph" edgedefault="directed">\n';

    nodes.forEach(n=>{
      xml += `    <node id="${xmlEscape(n.id)}">\n`;
      xml += `      <data key="title">${xmlEscape(n.title)}</data>\n`;
      xml += `      <data key="type">${xmlEscape(n.type)}</data>\n`;
      xml += `    </node>\n`;
    });

    edges.forEach(e=>{
      xml += `    <edge id="${xmlEscape(e.id)}" source="${xmlEscape(e.from)}" target="${xmlEscape(e.to)}">\n`;
      xml += `      <data key="edgeType">${xmlEscape(e.type)}</data>\n`;
      if(e.description) xml += `      <data key="description">${xmlEscape(e.description)}</data>\n`;
      xml += `    </edge>\n`;
    });

    xml += '  </graph>\n</graphml>\n';

    this._eventBus.emit(SYSTEM_EVENTS.DATA_EXPORTED, { format: 'graphml', nodesCount: nodes.length, edgesCount: edges.length });
    return xml;
  }
}
