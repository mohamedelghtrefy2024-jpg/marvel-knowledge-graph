// ============================================================
// PluginManager (src/core)
// أساس بسيط لنظام plugins — تسجيل + دورة حياة init فقط، بدون أي plugin
// فعلي. الهدف: أي كود مستقبلي (أو تجربة من حد تاني) يقدر "يوصل" لأحداث
// دورة حياة التطبيق (APP_READY, NODE_ADDED, EDGE_ADDED, DATA_IMPORTED...
// إلخ من SYSTEM_EVENTS في EventBus.js) من غير ما يعدّل كود التطبيق
// الأساسي خالص.
//
// شكل الـ plugin المتوقع (object عادي، مفيش class مطلوبة):
//   {
//     name: 'my-plugin',        // إلزامي، فريد
//     version: '1.0.0',         // اختياري، للعرض بس
//     init(context){ ... }      // اختياري، بتتنادى مرة واحدة بعد APP_READY
//   }
//
// context اللي بيوصل لـ init() بيحتوي على:
//   eventBus         — للاشتراك في أحداث دورة الحياة (bus.on(SYSTEM_EVENTS.NODE_ADDED, ...))
//   knowledgeService  — قراءة العقد/العلاقات (بدون تعديل مباشر — العدّل بيحصل عبر الأحداث/الواجهة)
//   graphService      — خوارزميات الشبكة (shortestPath/connectedComponents/hasCycle)
//   searchService     — البحث المحلي
//
// طريقة تسجيل plugin (قبل ما app.js يخلص bootstrap):
//   <script>
//     window.MarvelMapPlugins = window.MarvelMapPlugins || [];
//     window.MarvelMapPlugins.push({
//       name: 'console-logger-example',
//       init({ eventBus }){
//         eventBus.on('node:added', ({ node })=> console.log('عقدة جديدة اتضافت:', node.title));
//       }
//     });
//   </script>
// (لازم يتحط الـ <script> ده قبل <script src="js/app.js"> في index.html)
// ============================================================

import { Logger } from './Logger.js';

export class PluginManager {
  /**
   * @param {object} deps
   * @param {import('./EventBus.js').EventBus} deps.eventBus
   */
  constructor({ eventBus }){
    if(!eventBus) throw new Error('PluginManager: محتاج eventBus بالحقن');
    this._eventBus = eventBus;
    this._plugins = new Map();
  }

  /**
   * تسجيل plugin. بيرمي استثناء لو الاسم ناقص أو مكرر — عشان نمسك أخطاء
   * التسجيل بدري بدل ما تفضل صامتة.
   */
  register(plugin){
    if(!plugin || typeof plugin.name !== 'string' || !plugin.name.trim()){
      throw new Error('PluginManager: كل plugin لازم يكون عنده "name" نصي غير فاضي');
    }
    if(this._plugins.has(plugin.name)){
      throw new Error(`PluginManager: فيه plugin مسجّل بالفعل بنفس الاسم "${plugin.name}"`);
    }
    this._plugins.set(plugin.name, plugin);
    return plugin;
  }

  /**
   * بتنادي init() لكل plugin مسجّل (لو موجودة)، بترتيب التسجيل. فشل plugin
   * واحد في init() بيتسجّل عبر Logger بس مش بيوقف تشغيل الباقي — نفس
   * فلسفة عزل الأخطاء المتبعة في EventBus.emit.
   * @param {object} [baseContext] بيتحط جواه eventBus تلقائيًا؛ الباقي (knowledgeService، إلخ) بيوصل من app.js
   */
  async initAll(baseContext = {}){
    const context = { ...baseContext, eventBus: this._eventBus };
    for(const plugin of this._plugins.values()){
      if(typeof plugin.init !== 'function') continue;
      try{
        await plugin.init(context);
      }catch(e){
        Logger.error(`plugin:${plugin.name}`, 'فشل تشغيل init() بتاعة الـ plugin', e);
      }
    }
  }

  /** قائمة بأسماء ونسخ الـ plugins المسجّلة — مفيدة لواجهة تشخيصية مستقبلية. */
  list(){
    return [...this._plugins.values()].map(p=> ({ name: p.name, version: p.version || null }));
  }

  get(name){
    return this._plugins.get(name) || null;
  }
}
