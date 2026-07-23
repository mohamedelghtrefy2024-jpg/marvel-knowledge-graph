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
  },

  /**
   * بيملأ container بنص text، مع تظليل أول ظهور لـ query جواه (case-insensitive)
   * داخل <mark> — بأمان (بدون innerHTML، نفس قاعدة منع الـ XSS). لو query مش
   * موجودة فعليًا كـ substring في text (حالة تطابق fuzzy بحت)، بيتحط النص عادي
   * من غير تظليل، لأنه مفيش جزء واضح نظلّله.
   */
  renderHighlighted(container, text, query){
    container.textContent = '';
    const q = (query || '').trim();
    if(!q){ container.appendChild(document.createTextNode(text)); return; }
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if(idx === -1){ container.appendChild(document.createTextNode(text)); return; }
    if(idx > 0) container.appendChild(document.createTextNode(text.slice(0, idx)));
    const mark = document.createElement('mark');
    mark.className = 'search-highlight';
    mark.textContent = text.slice(idx, idx + q.length);
    container.appendChild(mark);
    if(idx + q.length < text.length) container.appendChild(document.createTextNode(text.slice(idx + q.length)));
  }
};
