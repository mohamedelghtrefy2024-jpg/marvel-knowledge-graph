// ============================================================
// Logger (src/core)
// أداة تسجيل بسيطة: console.* موحّد ومُصنّف بنطاق (scope). بدون حالة
// (state)، فبيتم استيرادها مباشرة (static import) زي SYSTEM_EVENTS من
// EventBus.js — مش بالحقن، لأنها utility محضة مالهاش اعتماديات.
//
// النسخة المكافئة لطبقات js/ (classic scripts) موجودة في js/logger.js —
// نفس الشكل بالظبط، منسوخة عمدًا لأسباب عزل الـ scope بين classic
// scripts وES modules في المتصفح (نفس سبب عزل CONFIG/Utils/StorageLayer).
// ============================================================

export const Logger = {
  debug(scope, ...args){ console.debug(`[${scope}]`, ...args); },
  info(scope, ...args){ console.info(`[${scope}]`, ...args); },
  warn(scope, ...args){ console.warn(`[${scope}]`, ...args); },
  error(scope, ...args){ console.error(`[${scope}]`, ...args); }
};
