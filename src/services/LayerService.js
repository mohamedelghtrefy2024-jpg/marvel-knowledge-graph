// ============================================================
// LayerService (src/services)  (PART 04 — Phase C: نظام الطبقات Layers System)
// حالة إظهار/إخفاء "طبقات" عرض الشبكة (Graph Explorer) — كل طبقة بتمثّل
// مجموعة أنواع عقد منطقية (CONFIG.LAYER_GROUPS، مُعرّفة في config/graph.json)،
// بالإضافة لطبقة خاصة منفصلة لعُقد الـ hub (تجميع المجموعة الزمنية).
// حالة مؤقتة (in-memory) فقط — بترجع للوضع الافتراضي (الكل ظاهر) عند
// إعادة تحميل الصفحة، بنفس منطق الفلاتر المتقدمة الحالية في الفلترة
// العادية (مش من ضمن البيانات المحفوظة في localStorage).
// ============================================================

export class LayerService {
  /**
   * @param {object} deps
   * @param {object} deps.layerGroups CONFIG.LAYER_GROUPS — { key: { label, types[] } }
   */
  constructor({ layerGroups }){
    if(!layerGroups) throw new Error('LayerService: محتاج layerGroups بالحقن (CONFIG.LAYER_GROUPS)');
    this._layerGroups = layerGroups;
    this._visibility = new Map(Object.keys(layerGroups).map(key=> [key, true]));
    this._hubsVisible = true;

    this._typeToLayer = new Map();
    Object.entries(layerGroups).forEach(([key, def])=>{
      (def.types || []).forEach(type=> this._typeToLayer.set(type, key));
    });
  }

  /** @returns {Array<{key:string,label:string,visible:boolean}>} كل الطبقات بحالتها الحالية، لبناء لوحة التحكم */
  getLayers(){
    return Object.keys(this._layerGroups).map(key=> ({
      key,
      label: this._layerGroups[key].label,
      visible: this.isLayerVisible(key)
    }));
  }

  isLayerVisible(key){
    return this._visibility.get(key) !== false;
  }

  toggleLayer(key){
    if(!this._visibility.has(key)) return;
    this._visibility.set(key, !this.isLayerVisible(key));
  }

  /** هل نوع عقدة معيّن (movie, character...) ظاهر حاليًا حسب طبقته؟ نوع غير مصنّف في أي طبقة = ظاهر دايمًا */
  isTypeVisible(type){
    const key = this._typeToLayer.get(type);
    if(!key) return true;
    return this.isLayerVisible(key);
  }

  isHubsVisible(){
    return this._hubsVisible;
  }

  toggleHubs(){
    this._hubsVisible = !this._hubsVisible;
  }

  resetAll(){
    this._visibility.forEach((_, key)=> this._visibility.set(key, true));
    this._hubsVisible = true;
  }

  isAnyLayerHidden(){
    return [...this._visibility.values()].some(v=> v === false) || !this._hubsVisible;
  }
}
