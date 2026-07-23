// ============================================================
// Business Layer
// منطق التطبيق: التعامل مع TMDB، البحث والفلترة، إضافة عقد/علاقات جديدة.
// يعتمد على StorageLayer وKnowledgeLayer، ولا يلمس DOM إطلاقًا.
// ============================================================

function createBusinessLayer(knowledgeLayer, cacheManager, errorManager, eventBus){
  async function fetchTmdbData(title, type){
    // النوع الوحيد المدعوم من TMDB هو movie/tv؛ أي نوع تاني (character, artifact...) مفيش له بيانات TMDB
    if(type !== 'movie' && type !== 'tv'){
      return { title, poster: null, overview: '', date: '', id: null };
    }
    const key = Utils.cacheKey(title, type);
    if(cacheManager.has(key)) return cacheManager.get(key);

    const endpoint = type === 'tv' ? 'search/tv' : 'search/movie';
    try{
      let res = await fetch(`${CONFIG.TMDB_API_BASE}/${endpoint}?api_key=${CONFIG.TMDB_KEY}&language=ar&query=${encodeURIComponent(title)}`);
      let data = await res.json();
      let item = data.results && data.results[0];
      if(item && (!item.overview || item.overview.trim()==='')){
        const resEn = await fetch(`${CONFIG.TMDB_API_BASE}/${endpoint}?api_key=${CONFIG.TMDB_KEY}&language=en-US&query=${encodeURIComponent(title)}`);
        const dataEn = await resEn.json();
        const itemEn = dataEn.results && dataEn.results[0];
        if(itemEn) item.overview = itemEn.overview;
      }
      const result = item ? {
        title: item.title || item.name || title,
        poster: item.poster_path ? CONFIG.TMDB_IMG + item.poster_path : null,
        overview: item.overview || '',
        date: item.release_date || item.first_air_date || '',
        id: item.id
      } : { title, poster: null, overview: 'مفيش بيانات متاحة من TMDB لهذا العنوان.', date: '', id: null };
      cacheManager.set(key, result);
      return result;
    }catch(e){
      Logger.warn('businessLayer', `فشل الاتصال بـ TMDB لعنصر "${title}"`, e);
      return { title, poster: null, overview: 'تعذّر الاتصال بـ TMDB.', date: '', id: null };
    }
  }

  async function searchTmdbMulti(query){
    try{
      const res = await fetch(`${CONFIG.TMDB_API_BASE}/search/multi?api_key=${CONFIG.TMDB_KEY}&language=ar&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      return (data.results || [])
        .filter(r=> r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 10)
        .map(r=> ({
          title: r.title || r.name,
          year: (r.release_date || r.first_air_date || '').slice(0,4),
          type: r.media_type === 'tv' ? 'tv' : 'movie',
          poster: r.poster_path ? CONFIG.TMDB_IMG_SMALL + r.poster_path : null
        }));
    }catch(e){
      Logger.warn('businessLayer', `فشل بحث TMDB متعدد بالنص "${query}"`, e);
      return null; // null يعني خطأ اتصال، مختلف عن [] (لا نتائج)
    }
  }

  /**
   * @deprecated استُبدلت بـ SearchService.searchByTitle (src/services/SearchService.js).
   * اتسابت هنا للتوافق الخلفي بس — استخدم SearchService الجديدة في أي كود جديد.
   * بحث نصي محلي داخل كل عقد الخريطة (بالعنوان)، مستقل عن TMDB.
   */
  function searchLocalNodes(query){
    const q = query.trim().toLowerCase();
    if(q.length < 1) return [];
    return knowledgeLayer.getAllNodes().filter(n=> n.title.toLowerCase().includes(q));
  }

  function addMovieOrTvNode({ title, type, group }){
    const node = {
      id: Utils.generateId(),
      type,
      title,
      group,
      tmdbId: null,
      attributes: {},
      createdAt: Date.now()
    };
    knowledgeLayer.addCustomNode(node);
    try{
      const custom = StorageLayer.loadCustomNodes();
      custom.push(node);
      StorageLayer.saveCustomNodes(custom);
    }catch(e){
      errorManager.report(e, {
        scope: 'businessLayer:addMovieOrTvNode',
        userMessage: 'العنصر ظهر على الشاشة بس تعذّر حفظه — لو عملت تحديث للصفحة ممكن يختفي (مساحة التخزين في المتصفح ممتلئة؟).'
      });
    }
    if(eventBus) eventBus.emit('node:added', { node }); // = SYSTEM_EVENTS.NODE_ADDED في src/core/EventBus.js
    return node;
  }

  function addManualEdge({ fromNodeId, toNodeId, description, type }){
    const edge = {
      id: Utils.generateId(),
      from: fromNodeId,
      to: toNodeId,
      type: type || 'connected_to',
      direction: 'directed',
      description,
      source: null,
      createdAt: Date.now()
    };
    knowledgeLayer.addCustomEdge(edge);
    try{
      const custom = StorageLayer.loadCustomEdges();
      custom.push(edge);
      StorageLayer.saveCustomEdges(custom);
    }catch(e){
      errorManager.report(e, {
        scope: 'businessLayer:addManualEdge',
        userMessage: 'الرابط ظهر على الشاشة بس تعذّر حفظه — لو عملت تحديث للصفحة ممكن يختفي (مساحة التخزين في المتصفح ممتلئة؟).'
      });
    }
    if(eventBus) eventBus.emit('edge:added', { edge }); // = SYSTEM_EVENTS.EDGE_ADDED في src/core/EventBus.js
    return edge;
  }

  return {
    fetchTmdbData,
    searchTmdbMulti,
    searchLocalNodes,
    addMovieOrTvNode,
    addManualEdge
  };
}
