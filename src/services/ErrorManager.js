// ============================================================
// ErrorManager (src/services)
// نقطة تجميع مركزية للأخطاء اللي المستخدم لازم ياخد باله منها: بتسجّل
// عبر Logger، وبتبث APP_ERROR عبر EventBus مع رسالة عربية واضحة —
// عشان renderLayer.js يعرضها كـ toast من غير ما ErrorManager نفسه
// يلمس DOM (نفس قاعدة الطبقات المتبعة في BackgroundService/ExportImportService:
// الخدمة تبث حدث بس، والواجهة هي اللي بتقرر تعرضه إزاي).
//
// ملاحظة مهمة: مش كل catch في المشروع المفروض يعدّي من هنا. الأخطاء
// القابلة للتعافي التلقائي وغير المؤثرة فعليًا على المستخدم (زي فشل
// قراءة كاش تالف في StorageLayer، أو فشل جلب TMDB لعنصر واحد وسط عشرات
// العناصر على الشاشة) بتتسجّل بـ Logger بس من غير toast — عشان نتجنب
// إزعاج المستخدم بإشعارات كتير لأخطاء مش فعليًا كاسرة لحاجة. report()
// هنا مخصّصة للأخطاء اللي فعلاً بتوقف أو تفشّل حاجة كان المستخدم منتظر
// نتيجتها (فشل حفظ، فشل استيراد، فشل تحميل أساسي).
// ============================================================

import { SYSTEM_EVENTS } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

export class ErrorManager {
  /**
   * @param {object} deps
   * @param {import('../core/EventBus.js').EventBus} deps.eventBus
   */
  constructor({ eventBus }){
    if(!eventBus) throw new Error('ErrorManager: محتاج eventBus بالحقن');
    this._eventBus = eventBus;
  }

  /**
   * @param {Error|unknown} error الخطأ الفعلي (بيتسجّل كامل في الـ console عبر Logger)
   * @param {object} [opts]
   * @param {string} [opts.scope] نطاق/مصدر الخطأ، بيتحط كتاج في اللوج (مثال: 'businessLayer:save')
   * @param {string} [opts.userMessage] رسالة عربية مبسّطة تتعرض للمستخدم كـ toast.
   *   لو مش موجودة، بتترجع رسالة عامة بدل ما الـ toast يفضل فاضي.
   */
  report(error, { scope = 'app', userMessage } = {}){
    Logger.error(scope, error);
    this._eventBus.emit(SYSTEM_EVENTS.APP_ERROR, {
      error,
      scope,
      userMessage: userMessage || 'حصل خطأ غير متوقع. جرّب تاني.'
    });
  }
}
