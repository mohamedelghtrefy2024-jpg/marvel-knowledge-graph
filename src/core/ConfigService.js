// ============================================================
// ConfigService (src/core)
// بيحمّل config/api.json + config/storage.json + config/graph.json
// بالتوازي، يدمجهم في كائن واحد، ويجمّده (Object.freeze) عشان محدش
// يقدر يعدّل الإعدادات وقت التشغيل بالغلط. التحميل idempotent: أي
// نداء تاني لـ load() بيرجّع نفس النتيجة من غير إعادة fetch.
// ============================================================

const CONFIG_PATHS = {
  api: './config/api.json',
  storage: './config/storage.json',
  graph: './config/graph.json'
};

export class ConfigService {
  constructor(paths = CONFIG_PATHS){
    this._paths = paths;
    this._loadPromise = null;
    this._config = null;
  }

  /**
   * يحمّل الإعدادات لو لسه متحملتش، أو يرجّع نفس الـ promise/نتيجة
   * لو اتنادى قبل كده (idempotent — مفيش إعادة fetch).
   */
  load(){
    if(this._config){
      return Promise.resolve(this._config);
    }
    if(this._loadPromise){
      return this._loadPromise;
    }
    this._loadPromise = this._doLoad();
    return this._loadPromise;
  }

  async _doLoad(){
    const [api, storage, graph] = await Promise.all([
      this._fetchJson(this._paths.api),
      this._fetchJson(this._paths.storage),
      this._fetchJson(this._paths.graph)
    ]);
    const merged = Object.freeze({ ...api, ...storage, ...graph });
    this._config = merged;
    return merged;
  }

  async _fetchJson(path){
    const res = await fetch(path);
    if(!res.ok) throw new Error(`ConfigService: فشل تحميل ${path}: ${res.status}`);
    return res.json();
  }

  /**
   * الوصول المتزامن للإعدادات بعد ما تكون اتحمّلت بالفعل (بعد await load()).
   * بيرمي خطأ واضح لو اتنادت قبل التحميل، عشان نمنع bugs صامتة.
   */
  get(){
    if(!this._config){
      throw new Error('ConfigService.get() اتنادت قبل load() — لازم await configService.load() الأول');
    }
    return this._config;
  }
}
