// ============================================================
// Utilities Layer
// دوال عامة مشتركة، بدون أي منطق خاص بمجال المعرفة أو العرض.
// ============================================================

const Utils = {
  /**
   * توليد UUID v4. تُستخدم كمعرّف ثابت لأي عقدة أو علاقة جديدة.
   */
  generateId(){
    if(typeof crypto !== 'undefined' && crypto.randomUUID){
      return crypto.randomUUID();
    }
    // fallback بسيط لو crypto.randomUUID مش متاحة
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{
      const r = Math.random()*16|0;
      const v = c==='x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  },

  debounce(fn, wait){
    let timer = null;
    return (...args)=>{
      clearTimeout(timer);
      timer = setTimeout(()=> fn(...args), wait);
    };
  },

  /**
   * إنشاء عنصر DOM نصي بأمان (بدون innerHTML) لمنع XSS عند إدراج نصوص من مصادر خارجية أو من المستخدم.
   */
  createTextEl(tag, text, className){
    const el = document.createElement(tag);
    if(className) el.className = className;
    el.textContent = text;
    return el;
  },

  escapeAttr(str){
    return String(str).replace(/"/g, '&quot;');
  },

  cacheKey(title, type){
    return type + ':' + String(title).toLowerCase();
  }
};
