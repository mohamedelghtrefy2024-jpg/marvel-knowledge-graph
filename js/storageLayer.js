// ============================================================
// Storage Layer
// المسؤول الوحيد عن القراءة/الكتابة: fetch لملفات JSON، وlocalStorage.
// لا يوجد هنا أي منطق معرفي (مين مرتبط بمين) ولا أي عرض DOM.
// ============================================================

const StorageLayer = {

  async fetchJson(path){
    const res = await fetch(path);
    if(!res.ok) throw new Error(`فشل تحميل ${path}: ${res.status}`);
    return res.json();
  },

  async loadBaseData(){
    const [nodes, edges, groups, settings, metadata] = await Promise.all([
      this.fetchJson(CONFIG.DATA_PATHS.nodes),
      this.fetchJson(CONFIG.DATA_PATHS.edges),
      this.fetchJson(CONFIG.DATA_PATHS.groups),
      this.fetchJson(CONFIG.DATA_PATHS.settings),
      this.fetchJson(CONFIG.DATA_PATHS.metadata)
    ]);
    return { nodes, edges, groups, settings, metadata };
  },

  // ---- TMDB cache ----
  loadTmdbCache(){
    try{ return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.tmdbCache)) || {}; }
    catch(e){ return {}; }
  },
  saveTmdbCache(cache){
    localStorage.setItem(CONFIG.STORAGE_KEYS.tmdbCache, JSON.stringify(cache));
  },

  // ---- Custom nodes/edges المضافة من المستخدم ----
  loadCustomNodes(){
    try{ return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.customNodes)) || []; }
    catch(e){ return []; }
  },
  saveCustomNodes(nodes){
    localStorage.setItem(CONFIG.STORAGE_KEYS.customNodes, JSON.stringify(nodes));
  },
  loadCustomEdges(){
    try{ return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.customEdges)) || []; }
    catch(e){ return []; }
  },
  saveCustomEdges(edges){
    localStorage.setItem(CONFIG.STORAGE_KEYS.customEdges, JSON.stringify(edges));
  },

  // ---- الخلفية ----
  loadBackground(){
    return localStorage.getItem(CONFIG.STORAGE_KEYS.background);
  },
  saveBackground(dataUrl){
    localStorage.setItem(CONFIG.STORAGE_KEYS.background, dataUrl);
  },
  clearBackground(){
    localStorage.removeItem(CONFIG.STORAGE_KEYS.background);
  },

  /**
   * هجرة تلقائية لمرة واحدة: أي بيانات كان المستخدم أضافها في النسخة القديمة
   * (v1 — معتمدة على title كمفتاح) بتتحول لنفس شكل البيانات الجديد (معتمد على id).
   * تُستدعى مرة واحدة عند أول تحميل للنسخة الجديدة فقط.
   */
  migrateLegacyDataIfNeeded(knowledgeLayer){
    const alreadyMigrated = localStorage.getItem('marvelmap_migrated_v2');
    if(alreadyMigrated) return { migratedNodes: 0, migratedEdges: 0 };

    let migratedNodes = 0, migratedEdges = 0;

    // عقد مخصصة قديمة (title/type/group فقط، بدون id)
    try{
      const legacyNodesRaw = localStorage.getItem(CONFIG.LEGACY_STORAGE_KEYS.customNodes);
      if(legacyNodesRaw){
        const legacyNodes = JSON.parse(legacyNodesRaw) || [];
        const newCustomNodes = this.loadCustomNodes();
        legacyNodes.forEach(ln=>{
          if(knowledgeLayer.findNodeByTitle(ln.title)) return; // موجودة بالفعل
          const migratedNode = {
            id: Utils.generateId(),
            type: ln.type,
            title: ln.title,
            group: ln.group,
            tmdbId: null,
            attributes: {}
          };
          newCustomNodes.push(migratedNode);
          // نضيفها فورًا لطبقة المعرفة عشان أي رابط قديم بيشاور عليها (هيتعالج تحت) يلاقيها
          knowledgeLayer.addCustomNode(migratedNode);
          migratedNodes++;
        });
        this.saveCustomNodes(newCustomNodes);
      }
    }catch(e){ /* تجاهل بيانات قديمة تالفة */ }

    // روابط مخصصة قديمة (from/to/reason بالـ title)
    try{
      const legacyLinksRaw = localStorage.getItem(CONFIG.LEGACY_STORAGE_KEYS.customLinks);
      if(legacyLinksRaw){
        const legacyLinks = JSON.parse(legacyLinksRaw) || [];
        const newCustomEdges = this.loadCustomEdges();
        legacyLinks.forEach(ll=>{
          const fromNode = knowledgeLayer.findNodeByTitle(ll.from);
          const toNode = knowledgeLayer.findNodeByTitle(ll.to);
          if(!fromNode || !toNode) return;
          newCustomEdges.push({
            id: Utils.generateId(),
            from: fromNode.id,
            to: toNode.id,
            type: 'connected_to',
            direction: 'directed',
            description: ll.reason || '',
            source: null
          });
          migratedEdges++;
        });
        this.saveCustomEdges(newCustomEdges);
      }
    }catch(e){ /* تجاهل بيانات قديمة تالفة */ }

    // خلفية قديمة
    try{
      const legacyBg = localStorage.getItem(CONFIG.LEGACY_STORAGE_KEYS.background);
      if(legacyBg && !this.loadBackground()){
        this.saveBackground(legacyBg);
      }
    }catch(e){ /* تجاهل */ }

    localStorage.setItem('marvelmap_migrated_v2', '1');
    return { migratedNodes, migratedEdges };
  }
};
