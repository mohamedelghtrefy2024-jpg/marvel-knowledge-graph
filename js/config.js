// ============================================================
// Configuration Layer — SHIM للتوافق الخلفي
// القيم الفعلية بقت في config/api.json + config/storage.json +
// config/graph.json، وبتتحمّل عبر src/core/ConfigService.js.
//
// السبب: باقي ملفات js/ لسه classic scripts (مش ES Modules)، فمينفعش
// نعمل static import هنا. الحل: CONFIG بيتعرّف هنا كـ object فاضي
// (نفس اسم المتغيّر العام القديم عشان مفيش ملف تاني يتغيّر)، وبيتملى
// فعليًا بالقيم لما window.CONFIG_READY يخلص (عبر dynamic import()).
//
// أي كود بيستخدم CONFIG.* لازم يستنى window.CONFIG_READY الأول —
// ده بيحصل مركزيًا في js/app.js قبل أي استخدام تاني.
// ============================================================

const CONFIG = {};

window.CONFIG_READY = (async function loadConfig(){
  const { ConfigService } = await import('../src/core/ConfigService.js');
  const configService = new ConfigService();
  const loaded = await configService.load();
  Object.assign(CONFIG, loaded);
  return CONFIG;
})();
