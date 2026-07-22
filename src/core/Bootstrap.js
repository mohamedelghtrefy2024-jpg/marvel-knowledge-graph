// ============================================================
// Bootstrap (src/core)
// DI Container بسيط: register/resolve، مع اكتشاف اعتماديات دائرية
// (circular dependency) ورمي خطأ واضح بدل ما يعلّق التطبيق (stack overflow صامت).
// ============================================================

import { EventBus } from './EventBus.js';
import { ConfigService } from './ConfigService.js';

export class Container {
  constructor(){
    // name -> { factory, deps, singleton }
    this._registrations = new Map();
    // name -> instance (للـ singletons اللي اتعملهم resolve بالفعل)
    this._instances = new Map();
    // أثناء resolve نشيط، عشان نكتشف الدورات
    this._resolving = new Set();
  }

  /**
   * تسجيل خدمة. factory دالة بتاخد كائن الاعتماديات المحلولة وترجّع الـ instance.
   * deps: أسماء الخدمات اللي محتاجها الـ factory (بترسل كـ object بنفس الأسماء).
   */
  register(name, factory, deps = []){
    if(typeof factory !== 'function'){
      throw new TypeError(`Bootstrap.register("${name}"): factory لازم يكون دالة`);
    }
    this._registrations.set(name, { factory, deps, singleton: true });
    this._instances.delete(name); // إعادة تسجيل بتلغي أي instance قديم
    return this;
  }

  /**
   * تسجيل قيمة/instance جاهز مباشرة، من غير factory.
   */
  registerValue(name, value){
    this._registrations.set(name, { factory: () => value, deps: [], singleton: true });
    this._instances.delete(name);
    return this;
  }

  has(name){
    return this._registrations.has(name);
  }

  resolve(name){
    if(this._instances.has(name)){
      return this._instances.get(name);
    }

    const reg = this._registrations.get(name);
    if(!reg){
      throw new Error(`Bootstrap.resolve: مفيش تسجيل باسم "${name}"`);
    }

    if(this._resolving.has(name)){
      const chain = [...this._resolving, name].join(' → ');
      throw new Error(`Bootstrap: اعتمادية دائرية (circular dependency) مكتشفة: ${chain}`);
    }

    this._resolving.add(name);
    let instance;
    try{
      const resolvedDeps = {};
      for(const depName of reg.deps){
        resolvedDeps[depName] = this.resolve(depName);
      }
      instance = reg.factory(resolvedDeps);
    } finally {
      this._resolving.delete(name);
    }

    if(reg.singleton){
      this._instances.set(name, instance);
    }
    return instance;
  }
}

/**
 * يسجّل الخدمات الأساسية (EventBus + ConfigService) في الـ container.
 * بيرجّع نفس الـ container عشان تكمل تسجيل باقي الخدمات عليه.
 */
export function bootstrapCore(container = new Container()){
  container.registerValue('eventBus', new EventBus());
  container.register('configService', () => new ConfigService(), []);
  return container;
}
