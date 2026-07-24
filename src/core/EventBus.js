// ============================================================
// EventBus (src/core)
// Pub/Sub بسيط: on/once/off/emit/clear. عزل أخطاء أي مشترك (handler)
// عن الباقي — لو مشترك واحد رمى استثناء، الباقي لازم يكملوا يشتغلوا.
//
// ملاحظة: بتستخدم Logger مباشرة (مش ErrorManager) لتسجيل أخطاء
// المشتركين، عشان نتجنب اعتمادية دائرية (ErrorManager.report بيبث عبر
// نفس الـ EventBus؛ لو مشترك فاشل هو نفسه اللي بيسمع APP_ERROR ممكن
// نلف في حلقة). EventBus هو أساس النظام، فمينفعش يعتمد على خدمة فوقه.
// ============================================================

import { Logger } from './Logger.js';

export const SYSTEM_EVENTS = Object.freeze({
  BACKGROUND_CHANGED: 'background:changed',
  APP_ERROR: 'app:error',
  DATA_IMPORTED: 'data:imported',
  DATA_EXPORTED: 'data:exported',
  CACHE_CLEARED: 'cache:cleared',
  APP_READY: 'app:ready',
  NODE_ADDED: 'node:added',
  EDGE_ADDED: 'edge:added',
  EDGE_UPDATED: 'edge:updated'
});

export class EventBus {
  constructor(){
    // eventName -> Set<{ handler, once }>
    this._listeners = new Map();
  }

  on(eventName, handler){
    if(typeof handler !== 'function'){
      throw new TypeError('EventBus.on: handler لازم يكون دالة');
    }
    if(!this._listeners.has(eventName)){
      this._listeners.set(eventName, new Set());
    }
    const entry = { handler, once: false };
    this._listeners.get(eventName).add(entry);
    return () => this._removeEntry(eventName, entry);
  }

  once(eventName, handler){
    if(typeof handler !== 'function'){
      throw new TypeError('EventBus.once: handler لازم يكون دالة');
    }
    if(!this._listeners.has(eventName)){
      this._listeners.set(eventName, new Set());
    }
    const entry = { handler, once: true };
    this._listeners.get(eventName).add(entry);
    return () => this._removeEntry(eventName, entry);
  }

  off(eventName, handler){
    const set = this._listeners.get(eventName);
    if(!set) return;
    if(handler === undefined){
      set.clear();
      return;
    }
    for(const entry of set){
      if(entry.handler === handler) set.delete(entry);
    }
  }

  /**
   * بيبعت الحدث لكل المشتركين. لو مشترك رمى استثناء، بيتسجّل في console.error
   * وبيكمل للباقي — استثناء واحد ميوقفش بقية النظام.
   */
  emit(eventName, payload){
    const set = this._listeners.get(eventName);
    if(!set || set.size === 0) return;
    // ننسخ المجموعة قبل التكرار عشان لو handler عمل off/once هيشيل نفسه أثناء emit
    const entries = [...set];
    for(const entry of entries){
      try{
        entry.handler(payload);
      }catch(err){
        Logger.error('EventBus', `خطأ في مشترك للحدث "${eventName}":`, err);
      }finally{
        if(entry.once) set.delete(entry);
      }
    }
  }

  clear(eventName){
    if(eventName === undefined){
      this._listeners.clear();
    } else {
      this._listeners.delete(eventName);
    }
  }

  _removeEntry(eventName, entry){
    const set = this._listeners.get(eventName);
    if(set) set.delete(entry);
  }
}
