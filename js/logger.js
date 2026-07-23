// ============================================================
// Logger — أداة تسجيل بسيطة: console.* موحّد ومُصنّف بنطاق (scope)،
// بدل console.* مبعثر بلا سياق في كل ملف.
//
// نسخة classic-script للطبقات القديمة (storageLayer/businessLayer/
// graphLayer/knowledgeLayer/renderLayer/app) اللي مش ES modules. النسخة
// المكافئة للـ ES modules (src/) موجودة في src/core/Logger.js — نفس
// الشكل بالظبط، بس منسوخة تانية عمدًا: classic scripts وES modules
// معزولين عن بعض في نفس منطق عزل CONFIG/Utils/StorageLayer عن src/
// (محتاجين حقن صريح بدل وصول مباشر لمتغيرات top-level بتاعة سكريبت تاني).
//
// لازم يتحمّل الأول قبل أي سكريبت تاني في index.html.
// ============================================================

const Logger = {
  debug(scope, ...args){ console.debug(`[${scope}]`, ...args); },
  info(scope, ...args){ console.info(`[${scope}]`, ...args); },
  warn(scope, ...args){ console.warn(`[${scope}]`, ...args); },
  error(scope, ...args){ console.error(`[${scope}]`, ...args); }
};
