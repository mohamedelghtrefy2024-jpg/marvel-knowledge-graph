// ============================================================
// CacheManager (src/services)
// كاش عام (key/value) فوق StorageLayer — بيستبدل منطق كاش TMDB اليدوي
// اللي كان جوه businessLayer.js (tmdbCache object + نداء StorageLayer
// مباشرة). لا يوجد TTL تلقائي: أي قيمة تتخزن تفضل صالحة إلى أن يتم
// مسحها يدويًا عبر clearCache() — قرار متعمّد بدل تعقيد النظام بانتهاء
// صلاحية تلقائي مش هيفرق كتير في حالة الاستخدام دي (بيانات أفلام/مسلسلات
// شبه ثابتة). لو احتجنا لاحقًا تحديث بيانات TMDB، الحل المتاح دلوقتي هو
// نداء clearCache() (مثلاً من زرار "تحديث بيانات TMDB" في الواجهة).
// ============================================================

import { SYSTEM_EVENTS } from '../core/EventBus.js';

export class CacheManager {
  /**
   * @param {object} deps
   * @param {typeof import('../../js/storageLayer.js').StorageLayer} deps.storageLayer
   * @param {import('../core/EventBus.js').EventBus} [deps.eventBus] اختياري —
   *   لو موجود، بيبث CACHE_CLEARED عند كل clearCache() (مفيد لتحديث الواجهة
   *   أو تسجيل log لحظة المسح، من غير ما CacheManager يعرف حاجة عن الواجهة).
   */
  constructor({ storageLayer, eventBus } = {}){
    if(!storageLayer) throw new Error('CacheManager: محتاج storageLayer بالحقن');
    this._storageLayer = storageLayer;
    this._eventBus = eventBus || null;
    this._store = storageLayer.loadTmdbCache();
  }

  has(key){
    return Object.prototype.hasOwnProperty.call(this._store, key);
  }

  get(key){
    return this._store[key];
  }

  set(key, value){
    this._store[key] = value;
    this._storageLayer.saveTmdbCache(this._store);
  }

  /**
   * مسح الكاش بالكامل يدويًا (الطريقة الوحيدة دلوقتي لإجبار تحديث
   * البيانات — مفيش انتهاء صلاحية تلقائي).
   */
  clearCache(){
    this._store = {};
    this._storageLayer.saveTmdbCache(this._store);
    if(this._eventBus){
      this._eventBus.emit(SYSTEM_EVENTS.CACHE_CLEARED, {});
    }
  }
}
