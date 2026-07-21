// ============================================================
// Configuration Layer
// إعدادات ثابتة للمشروع كله. لا يوجد منطق هنا، فقط قيم.
// ============================================================

const CONFIG = {
  TMDB_KEY: 'b20fc3fcea82ebacc9ec743cd6eb8f98',
  TMDB_IMG: 'https://image.tmdb.org/t/p/w500',
  TMDB_IMG_SMALL: 'https://image.tmdb.org/t/p/w92',
  TMDB_API_BASE: 'https://api.themoviedb.org/3',

  DATA_PATHS: {
    nodes: './data/nodes.json',
    edges: './data/edges.json',
    groups: './data/groups.json',
    settings: './data/settings.json',
    metadata: './data/metadata.json'
  },

  STORAGE_KEYS: {
    tmdbCache: 'marvelmap_cache_v2',
    customNodes: 'marvelmap_custom_nodes_v2',
    customEdges: 'marvelmap_custom_edges_v2',
    background: 'marvelmap_bg_v2'
  },

  // مفاتيح التخزين القديمة (v1) — لازمة فقط لدالة الهجرة التلقائية لبيانات المستخدم السابقة
  LEGACY_STORAGE_KEYS: {
    tmdbCache: 'marvelmap_cache_v1',
    customNodes: 'marvelmap_custom_v1',
    background: 'marvelmap_bg_v1',
    customLinks: 'marvelmap_links_v1'
  },

  NODE_TYPES: [
    'movie', 'tv', 'character', 'organization', 'team', 'location', 'planet',
    'artifact', 'weapon', 'technology', 'timeline', 'universe', 'dimension', 'species',
    'vehicle', 'battle', 'event', 'comic', 'game', 'book', 'actor', 'director',
    'writer', 'composer', 'quote', 'post_credit_scene', 'deleted_scene', 'concept_art'
  ],

  EDGE_TYPES: [
    'appears_in', 'member_of', 'enemy_of', 'ally_of', 'variant_of', 'parent_of',
    'child_of', 'mentor_of', 'student_of', 'owns', 'uses', 'created', 'destroyed',
    'introduced_in', 'first_appeared', 'last_appeared', 'post_credit_to',
    'references', 'cameo', 'originated_from', 'located_in', 'travels_to',
    'time_travel', 'multiverse_link', 'causes', 'caused_by', 'before', 'after',
    'parallel_to', 'same_time', 'future_of', 'past_of', 'connected_to'
  ],

  // تسميات عرض عربية للأنواع المدعومة حاليًا في الواجهة
  NODE_TYPE_LABELS: {
    movie: '🎬 فيلم',
    tv: '📺 مسلسل',
    character: '🦸 شخصية',
    organization: '🏢 منظمة',
    team: '🛡️ فريق',
    location: '📍 مكان',
    artifact: '💠 قطعة أثرية',
    event: '⚡ حدث',
    weapon: '⚔️ سلاح',
    planet: '🪐 كوكب',
    dimension: '🌀 بُعد',
    universe: '🌌 كون',
    timeline: '⏳ خط زمني',
    species: '🧬 كائنات',
    battle: '💥 معركة',
    technology: '🔧 تقنية',
    vehicle: '🚀 مركبة',
    comic: '📖 كوميكس',
    actor: '🎭 ممثل',
    director: '🎬 مخرج',
    composer: '🎼 ملحّن',
    writer: '✍️ كاتب',
    post_credit_scene: '🎞️ مشهد ما بعد التتر'
  },

  // لون ونصف قطر كل نوع في عرض الشبكة (D3). أي نوع مش موجود هنا بياخد NODE_TYPE_VISUALS.default
  NODE_TYPE_VISUALS: {
    movie:        { color: '#d6252c', radius: 14 },
    tv:           { color: '#e6975c', radius: 14 },
    character:    { color: '#4d9de6', radius: 12 },
    team:         { color: '#8a5ce6', radius: 18 },
    organization: { color: '#5ce6b8', radius: 16 },
    location:     { color: '#5ce65c', radius: 12 },
    artifact:     { color: '#e6c165', radius: 10 },
    event:        { color: '#e64d9e', radius: 15 },
    weapon:       { color: '#c2c2c2', radius: 9  },
    planet:       { color: '#7ec4e6', radius: 13 },
    dimension:    { color: '#b06fe6', radius: 13 },
    universe:     { color: '#f2f2f2', radius: 17 },
    timeline:     { color: '#e6e05c', radius: 13 },
    species:      { color: '#6fe693', radius: 11 },
    battle:       { color: '#e65c5c', radius: 14 },
    technology:   { color: '#5c9ee6', radius: 10 },
    vehicle:      { color: '#e6a95c', radius: 12 },
    comic:        { color: '#e65cc6', radius: 10 },
    actor:        { color: '#5cd6e6', radius: 11 },
    director:     { color: '#3aa7c9', radius: 11 },
    composer:     { color: '#9ee65c', radius: 10 },
    writer:       { color: '#e6c15c', radius: 10 },
    post_credit_scene: { color: '#8f8f8f', radius: 9 },
    default:      { color: '#8a8f9e', radius: 12 }
  }
};
