// ============================================================
// BackgroundService (src/services)
// بيغلّف StorageLayer.loadBackground/saveBackground/clearBackground
// (بيعتمد عليها بالحقن — مش بيكرر منطقها) وبيبث حدث BACKGROUND_CHANGED
// عبر EventBus كل ما الخلفية تتغيّر. تصحيح لمخالفة قاعدة الطبقات:
// كان renderLayer.js بينادي StorageLayer.*Background* مباشرة.
// ============================================================

import { SYSTEM_EVENTS } from '../core/EventBus.js';

export class BackgroundService {
  /**
   * @param {object} deps
   * @param {typeof import('../../js/storageLayer.js').StorageLayer} deps.storageLayer
   * @param {import('../core/EventBus.js').EventBus} deps.eventBus
   */
  constructor({ storageLayer, eventBus }){
    if(!storageLayer) throw new Error('BackgroundService: محتاج storageLayer بالحقن');
    if(!eventBus) throw new Error('BackgroundService: محتاج eventBus بالحقن');
    this._storageLayer = storageLayer;
    this._eventBus = eventBus;
  }

  getBackground(){
    return this._storageLayer.loadBackground();
  }

  setBackground(dataUrl){
    this._storageLayer.saveBackground(dataUrl);
    this._eventBus.emit(SYSTEM_EVENTS.BACKGROUND_CHANGED, { dataUrl });
  }

  clearBackground(){
    this._storageLayer.clearBackground();
    this._eventBus.emit(SYSTEM_EVENTS.BACKGROUND_CHANGED, { dataUrl: null });
  }
}
