# تقرير المرحلة الأولى — إعادة تأسيس خريطة مارفل

## ما تم تنفيذه

1. **تقسيم الملف الواحد لبنية طبقات**: `index.html` (shell) + `css/styles.css` + 8 ملفات JS في `js/` (config, utils, storageLayer, knowledgeLayer, businessLayer, graphLayer, renderLayer, app) + بيانات JSON منفصلة في `data/`.
2. **UUID لكل عقدة**: كل الـ 62 عقدة الأصلية (أفلام/مسلسلات) اتحولت من الاعتماد على `title` كمفتاح لمعرّف `id` ثابت (UUID v4). الـ `title` بقى مجرد خاصية عرض.
3. **فصل البيانات بالكامل**: `nodes.json`, `edges.json`, `groups.json`, `settings.json`, `metadata.json` — مفيش بيانات مكتوبة جوه JS خالص.
4. **علاقات موجّهة ومصنّفة**: كل الروابط القديمة (`{to, reason}`) اتحولت لـ edges بنوع `connected_to`، مع اتجاه (`direction`) ووصف (`description`). النظام دلوقتي بيدعم 33 نوع علاقة (`CONFIG.EDGE_TYPES`) جاهزة للاستخدام.
5. **أنواع عقد جديدة كأمثلة فعلية شغالة** (مش بس نظرية): 4 شخصيات (Tony Stark, Steve Rogers, Thor, Thanos)، فريق (Avengers)، منظمة (S.H.I.E.L.D.)، مكانين (Avengers Tower, Asgard)، قطعتين أثريتين (Mjolnir, Infinity Gauntlet)، وحدث واحد (Battle of New York) — مربوطين بعلاقات حقيقية موثّقة (`member_of`, `owns`, `uses`, `located_in`, `originated_from`, `enemy_of`, `first_appeared`).
6. **هجرة تلقائية لبيانات المستخدم القديمة**: أي عقد أو روابط كانت مخزّنة بالنسخة القديمة في localStorage (`marvelmap_custom_v1`, `marvelmap_links_v1`) هتتحول تلقائيًا لنفس الـ schema الجديد أول ما المستخدم يفتح النسخة الجديدة — مرة واحدة فقط، مع حماية من التكرار عند إعادة التحميل.
7. **أمان أساسي**: كل نص جاي من بيانات ديناميكية (عناوين، أسباب روابط) بيتحط بـ `textContent` مش `innerHTML` في `renderLayer.js`، لمنع XSS.
8. **اختبار سلامة بيانات مستقل**: `tests/data-integrity.html` — بيفحص IDs مكررة، علاقات بتشاور على عقد مش موجودة، وأنواع غير معتمدة.

## نتائج الاختبار

- **62 عقدة أصلية + 11 عقدة نموذجية جديدة = 73 عقدة إجمالاً**، صفر IDs مكررة.
- **59 علاقة إجمالاً**، صفر مشاكل سلامة بيانات (`validateIntegrity()` رجّعت 0 issues).
- **اختبار الهجرة التلقائية**: اتعمل محاكاة كاملة لبيانات مستخدم قديمة (عقدة + رابط + خلفية)، ونجحت الهجرة بدون فقد بيانات وبدون تكرار عند إعادة التحميل.
- **كل الملفات اتفحصت بـ `node --check`** (لا أخطاء صياغة) وباختبار تشغيلي فعلي عبر خادم محلي (كل المسارات رجّعت 200، وكل ملفات JSON صالحة).

## ملاحظة عن بيانات موجودة أصلاً (مش خطأ جديد)

فيه رابط واحد في البيانات الأصلية بيشاور على "Spider-Man: Homecoming" وهو عنوان مش موجود فعليًا كعقدة في `SEED_NODES` (الموجود بدل منه هو "Far From Home" و"No Way Home" و"Brand New Day"). ده كان موجود بنفس الشكل في النسخة القديمة (الكود الأصلي كان بيعرض "(مش موجودة في الخريطة)" في زي الحالة دي). محافظ عليه كما هو (`to: null` مع الاحتفاظ بالوصف) بدل ما يتحذف تلقائيًا، لحد ما تقرر: تضيف عقدة "Spider-Man: Homecoming" فعليًا، ولا تحذف الرابط.

## ما لم يتم تنفيذه (خارج نطاق المرحلة الأولى)

- تعبئة محتوى كامل لكل الشخصيات/المنظمات/الأماكن... إلخ (اللي تم هو إثبات إن البنية شغالة بأمثلة حقيقية فقط).
- واجهة بحث/فلترة مستقلة داخل الخريطة (موجودة حاليًا بس في مودال "إضافة" و"ربط").
- إخفاء مفتاح TMDB (قرار مسبق: يفضل زي ما هو).
- Metrics/تحليلات الشبكة (أكثر العقد ارتباطًا، أقصر مسار بين عقدتين... إلخ).

## الخطوة التالية المقترحة

توسيع محتوى نوع واحد أو اتنين من الأنواع الجديدة (مثلاً كل شخصيات الأفنجرز الأساسية) بشكل كامل، قبل ما نفتح كل الأنواع التانية دفعة واحدة — بنفس فلسفة "التوسع بدون إعادة كتابة" اللي البرومبت بيطلبها.

---

# تحديث الجلسة الثانية

## ما تم تنفيذه (بالترتيب المتفق عليه: 4 → 3 → 1 → 2)

**1. حل مشكلة Spider-Man: Homecoming المعلّقة** — العنوان اتضاف كعقدة فيلم فعلية (كان مرتبط بحدث حقيقي موثّق: توني ستارك بيجنّد بيتر باركر في Civil War)، والرابط المعلّق اتصلح تلقائيًا ليشاور عليها.

**2. تمييز بصري للأنواع في عرض الشبكة** — كل نوع عقدة بقى له لون ونصف قطر مختلف (`CONFIG.NODE_TYPE_VISUALS`)، مع legend تفاعلي بيظهر تلقائيًا فوق الشبكة.

**3. توسيع شخصيات الأفنجرز الأساسية** — إضافة Bruce Banner/Hulk، Natasha Romanoff/Black Widow، Clint Barton/Hawkeye، ونيك فيوري، كلهم بعلاقات حقيقية موثقة فقط (member_of، first_appeared، cameo، created).

**4. بحث وفلترة داخل الخريطة الرئيسية** — شريط بحث فوري (debounced) + chips لفلترة حسب النوع، شغّالين في عرض الصفوف (إخفاء فعلي) وعرض الشبكة (تعتيم العناصر الغير مطابقة). كمان اتضافت "صف" جديد في عرض الصفوف للعناصر اللي مالهاش مجموعة زمنية (character, team...) عشان تظهر برضه في العرض العادي مش بس في الشبكة.

## مشكلتين حقيقيتين اتكشفوا واتصلحوا أثناء التنفيذ

- **تصادم عناوين**: عقدة الفريق "Avengers (Team)" كانت باسم "The Avengers" نفسه زي عقدة الفيلم بالظبط — بالظبط نوع المشاكل اللي البرومبت بيحذّر منها (`ممنوع الاعتماد على Titles`). اتصلحت بتغيير اسم عقدة الفريق، واتضاف فحص تلقائي جديد في `validateIntegrity()` بيكتشف أي تصادم عناوين مستقبلي.
- **باگ في الهجرة التلقائية** (من الجلسة الأولى، اتصلح هنا): لو عقدة وعلاقة اتهاجروا من النسخة القديمة في نفس اللحظة، العلاقة كانت بتفشل تلاقي العقدة (لأنها لسه ملحقتش تتسجل في طبقة المعرفة وقت معالجة الروابط). اتصلح بتسجيل العقدة فورًا في `knowledgeLayer` وقت هجرتها.

## الاختبار

اتعمل اختبار كامل end-to-end بمحاكاة متصفح حقيقي (jsdom + d3 الفعلي، مش mocks)، غطّى: الرندر الأساسي، البحث، الفلترة حسب النوع، فتح التفاصيل، وعرض الشبكة D3 الفعلي (88 دائرة SVG اتحسبت رياضيًا وطابقت العدد الفعلي بالظبط). كل الاختبارات نجحت بدون استثناء.

## الحالة الحالية

- **78 عقدة، 67 علاقة، صفر مشاكل سلامة بيانات**
- كل الأنواع الثمانية (movie, tv, character, team, organization, location, artifact, event) شغالة في: عرض الصفوف، عرض الشبكة، البحث، الفلترة، صفحة التفاصيل

## الخطوة التالية

بند 2 من الأولويات الأصلية اتغطى. المتبقي: تحليلات/metrics أساسية على الشبكة، وتوسيع محتوى بقية الأنواع (organization, location, artifact...) بنفس أسلوب "أمثلة حقيقية موثقة" اللي اتبع مع الشخصيات.

---

# تحديث الجلسة الثالثة

## ما تم تنفيذه

**1. توسيع محتوى organization / location / artifact بأمثلة حقيقية موثّقة:**
- **منظمات**: Hydra (اخترقت شيلد، `enemy_of` + `connected_to` فيلم Winter Soldier)، Stark Industries (يملكها توني ستارك، مرتبطة بـ First Avenger).
- **أماكن**: Wakanda (`introduced_in` Civil War، `connected_to` فيلم Black Panther)، Sokovia (`introduced_in` Age of Ultron).
- **قطع أثرية**: درع كابتن أمريكا (يملكه ستيف روجرز، `first_appeared` في First Avenger)، Tesseract (`first_appeared` في First Avenger، `connected_to` The Avengers).

كل رابط اتأكد إنه حقيقة موثّقة من أحداث الأفلام الفعلية، مش استنتاج موضوعي.

**2. لوحة إحصائيات أساسية على الشبكة** (`📊 إحصائيات` في الشريط العلوي):
- إجمالي العقد/العلاقات/المجموعات الزمنية.
- توزيع بصري (bar chart بسيط) لعدد العقد حسب النوع، وعدد العلاقات حسب النوع.
- أكثر 10 عناصر ارتباطًا في الشبكة كلها (degree centrality)، وكل عنصر قابل للنقر يوديك لتفاصيله مباشرة.

`computeMetrics()` اتضافت في `knowledgeLayer.js` كدالة بيانات بحتة (من غير أي DOM)، والعرض في `renderLayer.js` — نفس فصل الطبقات المتبع من البداية.

## الحالة النهائية

**84 عقدة، 78 علاقة، صفر مشاكل سلامة بيانات.** توزيع الأنواع: 42 فيلم، 21 مسلسل، 8 شخصيات، فريق واحد، منظمتين، مكانين، قطعتين أثريتين، حدث واحد.

## الاختبار

نفس منهجية jsdom + d3 الفعلي من الجلسة اللي فاتت، بالإضافة لاختبار لوحة الإحصائيات: فتح اللوحة، التحقق من ظهور الملخص والـ top-connected، والتأكد إن الأرقام المعروضة في الواجهة مطابقة تمامًا لناتج `computeMetrics()` البرمجي. كل الاختبارات نجحت.

## اللي لسه ممكن يتعمل بعدين

- توسيع بقية الأنواع (species, vehicle, comic, game...) بنفس المنهج.
- Metrics أعمق (أقصر مسار بين عقدتين، اكتشاف مجتمعات/clusters).
- تصدير/استيراد بيانات (JSON export للنسخة الاحتياطية).

---

# تحديث الجلسة الرابعة والأخيرة — تغطية كل الأنواع المتبقية

## ما تم تنفيذه

توسيع البيانات لتغطية **كل الأنواع العشرين المتبقية** من رؤية البرومبت الأصلي (ماعدا 3 أنواع محتفظ بيها في الـ schema بس من غير محتوى فعلي — التفاصيل تحت)، كل واحد بأمثلة حقيقية موثّقة من أحداث الأفلام/المسلسلات الفعلية:

| النوع | الأمثلة المضافة |
|---|---|
| Weapon | Stormbreaker، قوس هوكآي |
| Planet | Xandar، Sakaar |
| Dimension | Quantum Realm، Mirror Dimension |
| Universe | Earth-199999 (التصنيف الرسمي للكون السينمائي، مرتبط بـ multiverse_link بفيلم No Way Home) |
| Timeline | Sacred Timeline (من مسلسل Loki) |
| Species | Frost Giants، Skrulls |
| Battle | Battle of Sokovia، Battle of Wakanda |
| Technology | Iron Man Mark I Armor، B.A.R.F. |
| Vehicle | Quinjet |
| Comic | The Infinity Gauntlet (1991) — المصدر الأصلي لأحداث Infinity War/Endgame |
| Actor | Robert Downey Jr.، Chris Evans |
| Director | Anthony Russo، Joe Russo |
| Composer | Alan Silvestri |
| Writer | Christopher Markus، Stephen McFeely |
| Post Credit Scene | مشهد نيك فيوري في نهاية Iron Man (2008)، مربوط بـ `post_credit_to` بفيلم The Avengers |

كل الأنواع دي بقت متاحة في: عرض الصفوف (كصف "شخصيات ومنظمات وعناصر أخرى")، عرض الشبكة (بلون مخصص لكل نوع)، البحث والفلترة، ولوحة الإحصائيات.

## 3 أنواع اتضافوا في الـ schema بس من غير محتوى فعلي (قرار متعمّد)

- **Quote**: تجنّبت إضافة نصوص حوار حرفية من الأفلام — اقتباس حوار طويل نسبيًا بيعتبر نسخ لمحتوى محمي بحقوق نشر، فمش هعمله من غير طلب صريح منك مع وعيك بالحدود دي.
- **Deleted Scene / Concept Art**: مفيش مصدر موثوق بنفس درجة الثقة اللي اتبعتها في باقي الأنواع (غالبًا محتاجة صور فعلية أو مصادر production معينة)، فمفضّلت اسيبهم فاضيين بدل ما أخترع تفاصيل.

النوع نفسه (type string) موجود في `CONFIG.NODE_TYPES` لكل التلاتة دول، يعني البنية جاهزة تستوعبهم لحظة ما يكون عندك محتوى موثوق تحب تضيفه.

## الحالة النهائية الشاملة

**108 عقدة، 106 علاقة، صفر مشاكل سلامة بيانات، 23 نوع عقدة مختلف مُمثّل فعليًا بمحتوى حقيقي.**

أكثر عنصر ارتباطًا في الشبكة كلها دلوقتي: **Avengers: Infinity War** (11 علاقة) — منطقي جدًا لأنه نقطة تجمّع لمعظم الشخصيات والأسلحة والمعارك المضافة.

## الاختبار

نفس منهجية jsdom + d3 الفعلي، مطبّقة على كل التوسعة الجديدة:
- 108 بطاقة في عرض الصفوف، 23 فلتر نوع، صفر مشاكل سلامة بيانات
- 118 دائرة SVG في عرض الشبكة (10 hubs + 63 عنصر بمجموعة زمنية + 45 عنصر بدون مجموعة = 118، مطابق رياضيًا)
- لوحة الإحصائيات بتعرض بالظبط نفس أرقام `computeMetrics()` البرمجية (108/106/10)

كل الاختبارات نجحت بدون استثناء.



---

# تحديث الجلسة الخامسة — بداية PART 02 (إعادة الهيكلة المعمارية)

## القرارات المتفق عليها قبل البدء

- **نطاق التنفيذ**: PART 02 بالكامل حرفيًا زي ما هو مكتوب في البرومبت (مش نسخة مصغّرة)، رغم إن المشروع حاليًا 108 عقدة بس (أصغر بكتير من الحجم اللي PART 02 مصمم له).
- **تكرار منطق الـ card** (بين عرض المجموعات وعرض بدون مجموعات في `renderLayer.js`): هيتوحّد لسلوك واحد ثابت عند نقله لطبقة الخدمات (لسه معلّق، مش اتنفذ في الجلسة دي).

## ما تم تنفيذه واختباره فعليًا

### Phase 1 — Core Layer + Config Split
- `config/api.json`, `config/storage.json`, `config/graph.json` — قيم `CONFIG` القديمة اتقسّمت حرفيًا (بدون تغيير قيم) لـ 3 ملفات حسب الموضوع. اتأكد إن دمجهم الثلاثة بيرجّع نفس شكل `CONFIG` الأصلي بالظبط.
- `src/core/EventBus.js` — Pub/Sub كامل (on/once/off/emit/clear)، عزل أخطاء المشتركين، `SYSTEM_EVENTS` (بما فيها `BACKGROUND_CHANGED` من البند اللي بعده).
- `src/core/ConfigService.js` — تحميل متوازي + دمج + `Object.freeze` + idempotent فعليًا (3 نداءات fetch بس مهما تكرر `load()`).
- `src/core/Bootstrap.js` — DI container (`register`/`registerValue`/`resolve`) مع اكتشاف اعتماديات دائرية ورمي خطأ واضح، و`bootstrapCore()`.

### Phase 2 — Shim للتوافق الخلفي
- `js/config.js` بقى shim: نفس اسم `CONFIG`، بيتملى عبر `dynamic import()` لـ `ConfigService`، مع `window.CONFIG_READY`.
- `js/app.js` — أضيفت `await window.CONFIG_READY;` كأول خطوة في bootstrap.
- كل استخدام لـ `CONFIG.` في باقي الملفات اتفحص (grep شامل) وأُكّد إنه جوه دوال (runtime)، مش top-level.

### Item — BackgroundService
- `src/services/BackgroundService.js` — بيغلّف `StorageLayer.loadBackground/saveBackground/clearBackground` بالحقن، وبيبث `BACKGROUND_CHANGED` عبر `EventBus`.
- `js/renderLayer.js` — كل نداء مباشر لـ `StorageLayer.*Background*` اتشال، `applyBackground` بقت `async` وبتستخدم الخدمة عبر dynamic import (lazy + cached).
- `js/app.js` — `renderLayer.applyBackground()` بقت `await`.

## باگ حقيقي اتكشف واتصلح أثناء التنفيذ

**مسار استيراد غلط في `js/config.js`**: كتبت أول مرة `import('./src/core/ConfigService.js')` بافتراض إن المسار بيتحل نسبة لجذر المستند. اتأكد (بالبحث في المواصفة الرسمية) إن `import()` جوه سكريبت خارجي (`<script src="js/config.js">`) بيتحل نسبة لمكان الملف نفسه (`js/`)، مش المستند — يعني المسار الصح `../src/core/ConfigService.js`. اتصلح في كل من `config.js` و`renderLayer.js` (اللي كان محتاج نفس المسار لـ `BackgroundService`/`EventBus`).

## الاختبار

منهجية jsdom + d3 الفعلي (زي الجلسات اللي فاتت)، مع تطوير إضافي بسبب قيد في نسخة jsdom الحالية (29.1.1): **مفيش دعم لـ `dynamic import()` جوه VM context بتاعتها** (خطأ `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`) — قيد في الأداة نفسها، مش في الكود (المتصفحات الحقيقية بتدعم `import()` في classic scripts بشكل قياسي من زمان). التعامل معاه:
1. **اختبار منفصل حقيقي في Node** لكل موديول بيستخدم `import()` فعليًا (`ConfigService`, `BackgroundService`) — نجح 100%، بما فيه قراءة `config/*.json` الحقيقية من القرص.
2. **اختبار end-to-end كامل** لكل باقي الملفات (utils/storageLayer/knowledgeLayer/businessLayer/graphLayer/renderLayer/app — بدون أي تعديل) عبر `jsdom` الحقيقي + `d3` الحقيقي + `index.html`/`css` الحقيقيين، مع استبدال الجزء الوحيد اللي فيه `import()` (سطرين بس، جوه `config.js` و`renderLayer.js`) ببديل متزامن *لغرض الاختبار فقط* بنفس النتيجة المُثبتة من الاختبار في (1).

النتائج: **108 كارت مرسومة (مطابق `nodes.json`)، 23 فلتر نوع، 118 دائرة SVG في عرض الشبكة، رفع/إزالة الخلفية شغّالين فعليًا (class `has-bg` بيتغيّر صح)، صفر أخطاء console**.

## الحالة الحالية

- **108 عقدة، 106 علاقة** — زي ما هي، مفيش تغيير في البيانات.
- بنية `src/{core, services}` بدأت فعليًا وشغالة، مع الحفاظ الكامل على كل الملفات القديمة تعمل (backward compatible، shim pattern).

## المتبقي من PART 02 (لسه ماتنفذش)

- SearchService (نقل `filterState`/`nodeMatchesFilter` من `renderLayer.js` + توحيد تكرار الـ card المعلّق)
- KnowledgeService / GraphService (thin wrappers)
- Export/Import Service (+ زرارين في الواجهة)
- CacheManager (يستبدل كاش TMDB اليدوي في `businessLayer.js`)
- Logger + ErrorManager (تدريجي، ملف بملف)
- Search Engine متقدم (fuzzy/ranking/autocomplete/history) — يحتاج موافقة على تصميم UI الأول
- Graph Algorithms (shortestPath/connectedComponents/hasCycle) — يحتاج موافقة على مكان العرض الأول
- Plugin System (الأساس بس، بدون plugins فعلية)

## نقطة الاستئناف بالظبط

الخطوة الجاية: **SearchService** — نقل `filterState`/`nodeMatchesFilter` حرفيًا من `renderLayer.js`، إضافة `searchByTitle` (بديل لـ `businessLayer.searchLocalNodes` المعلّمة `@deprecated`)، واستخدامها في مودال الربط اليدوي، **مع توحيد سلوك تكرار الـ card** (القرار المتفق عليه). كل التغييرات هتتاختبر بنفس منهجية jsdom+d3 الفعلية قبل الانتقال للبند اللي بعده.

---

# تحديث: بند SearchService (استكمال الجلسة الخامسة)

## اللي اتنفذ

- `src/services/SearchService.js` — نقل حرفي لـ `filterState`/`nodeMatchesFilter` من `renderLayer.js` (`initTypes`, `setQuery`, `toggleType`, `isTypeActive`, `matches`, `isFilterActive`)، بالإضافة لـ `searchByTitle(query, {excludeTitle, limit})`.
- `js/businessLayer.js` — `searchLocalNodes` اتعلّمت `@deprecated` (لسه شغالة، مجرد تحذير في التعليق).
- `js/renderLayer.js`:
  - `nodeMatchesFilter`/`filterState` اتشالوا بالكامل، واستُبدلوا بـ `getSearchService()` (lazy + cached عبر dynamic import، بنفس أسلوب `BackgroundService`).
  - `initFilterBar` بقت `async`، وشيلة الفلتر (chips) بقت بتنادي `svc.toggleType`/`svc.isTypeActive`.
  - `renderRows` و`renderGraph` بقوا بيستخدموا `searchService.matches(node)` بدل `nodeMatchesFilter(node)`. `renderGraph` بقت `async`.
  - مودال الربط اليدوي (`linkTargetSearch`) بقى بيستخدم `searchService.searchByTitle(q, {excludeTitle, limit:15})` بدل `businessLayer.searchLocalNodes`.
  - **توحيد تكرار الـ card** (القرار المتفق عليه): اتعمل `buildCard(node)` مشترك يُستخدم لكل الحالات (جوه مجموعة أو من غيرها)، وبقى كل كارت — بدون استثناء — بيحاول يجيب بوستر TMDB فعليًا (قبل كده العناصر اللي من غير مجموعة زمنية كانت بتاخد بس نص ثابت من غير أي محاولة تحميل).
- `js/app.js` — `renderLayer.initFilterBar()` بقت `await`.

## باگ في أداة الاختبار (مش في المشروع) اتصلح أثناء التحقق

أثناء بناء اختبار end-to-end للبند ده، الـ stub الاختباري (بديل sync لـ dynamic import، بسبب قيد jsdom المعروف من قبل) كان بيعمل `Promise.resolve({...})` جديد في كل نداء لـ `getSearchService()`، فكانت كل حالة (بحث/فلتر) بتتصفّر لحالها. اتصلح بتخزين instance واحد مُخزّن (بنفس نمط الكاش الحقيقي في الكود نفسه). ده باگ في هارنس الاختبار فقط، مفيهوش أي تعديل على كود المشروع.

## الاختبار الفعلي (jsdom + d3 حقيقي)

- الإقلاع الأساسي: 108 كارت، 23 فلتر نوع، 118 دائرة في الشبكة، صفر أخطاء console (زي قبل كده بالظبط).
- **بحث نصي** ("iron"): رجّع 8 عناصر مطابقة، والحالة (status) اتغيّرت لـ "8 من 108 عنصر مطابق للفلترة" — وبعد مسح البحث رجعت 108 تاني.
- **فلتر نوع** (توگل chip لنوع "movie"): الكروت نزلت من 108 لـ 66 (استبعاد كل الأفلام)، والـ class `inactive` اتطبّق صح على الـ chip.
- عرض الشبكة وتفاصيل العنصر لسه شغالين زي ما هما.

## الحالة الحالية

108 عقدة، 106 علاقة — زي ما هي. `src/services/` دلوقتي فيها `BackgroundService.js` و`SearchService.js`.

## المتبقي من PART 02

KnowledgeService/GraphService (thin wrappers)، Export/Import Service، CacheManager (TMDB)، Logger + ErrorManager، Search Engine متقدم (fuzzy/autocomplete/history — يحتاج موافقة على UI أولًا)، Graph Algorithms (يحتاج موافقة على مكان العرض أولًا)، Plugin System.

## نقطة الاستئناف بالظبط

الخطوة الجاية: **KnowledgeService / GraphService** (thin wrappers حول `knowledgeLayer`/`graphLayer`)، وترحيل كل استخدام مباشر لـ `knowledgeLayer`/`graphLayer` جوه `renderLayer.js` (renderRows, renderGraph, openDetail, renderMetrics, populateGroupSelect) لاستخدام الخدمتين الجديدتين — مع ترك نداءات الكتابة (`businessLayer.addMovieOrTvNode`/`addManualEdge`) زي ما هي.

---

# تحديث: بند KnowledgeService / GraphService (استكمال الجلسة الخامسة)

## اللي اتنفذ

- **`src/services/KnowledgeService.js`** — غلاف رفيع (thin wrapper) حول `knowledgeLayer`: `getAllNodes`, `getGroups`, `getNodesByGroup`, `getEdgesForNode`, `findNodeById`, `findNodeByTitle`, `computeMetrics`, `validateIntegrity`. لا منطق جديد — تفويض بحت، نفس نمط `SearchService`/`BackgroundService` بالظبط (بما فيه رمي خطأ واضح لو اتعملله construct من غير `knowledgeLayer` بالحقن).
- **`src/services/GraphService.js`** — نفس الفكرة حول `graphLayer`: `buildGraphData` بس.
- **`js/renderLayer.js`**:
  - `getKnowledgeService()`/`getGraphService()` — lazy + cached عبر dynamic import، نفس أسلوب `getSearchService`/`getBackgroundService`.
  - **الخمس دوال المتفق عليها** بقت بتستخدم الخدمتين بدل `knowledgeLayer`/`graphLayer` المباشرة:
    - `renderRows` (`getGroups`, `getNodesByGroup`, `getAllNodes`)
    - `openDetail` (`getEdgesForNode`)
    - `renderGraph` (`buildGraphData`)
    - `renderMetrics` — بقت `async` (`computeMetrics`)
    - `populateGroupSelect` — بقت `async` (`getGroups`)
  - `metricsBtn.onclick` بقى `async` وبينتظر `renderMetrics()` قبل ما يفتح المودال.
- **`js/app.js`** — `renderLayer.populateGroupSelect()` بقت `await renderLayer.populateGroupSelect()`.
- **خارج النطاق عمدًا**: `initFilterBar` لسه بينادي `knowledgeLayer.getAllNodes()` مباشرة (مش من ضمن الخمس دوال المتفق عليها في نقطة الاستئناف)، و`businessLayer.addMovieOrTvNode`/`addManualEdge` (نداءات الكتابة) اتسابت زي ما هي زي ما اتفقنا.

## الاختبار الفعلي (jsdom + d3 حقيقي، سيرفر محلي حقيقي)

نفس منهجية الجلسات اللي فاتت، مع نفس القيد المعروف (jsdom 29.1.1 من غير دعم `dynamic import()` جوه الـ VM context، وكمان من غير `fetch` مدمج). التعامل معاه بنفس الأسلوب:

1. **Unit test حقيقي في Node** لـ `KnowledgeService`/`GraphService` بـ dynamic import فعلي (مش stub): كل الدوال اتأكدت تفويضها صح لـ stub يمثّل `knowledgeLayer`/`graphLayer`، وكمان اتأكد إنهم بيرموا خطأ واضح لو الـ dependency ناقصة. نجح 100%.
2. **اختبار end-to-end كامل** لباقي الملفات (بدون أي تعديل على الكود الحقيقي) عبر جسدom حقيقي + d3 حقيقي + سيرفر HTTP محلي حقيقي يخدّم index.html/css/data الحقيقيين، مع استبدال الجزء الوحيد اللي فيه `import()` (جوه `config.js` و`renderLayer.js`) ببديل متزامن *لغرض الاختبار فقط* بنفس النتيجة المُثبتة من (1) — الملفات المعدّلة دي في نسخة مؤقتة منفصلة تمامًا عن المشروع الحقيقي.

النتائج:
- **108 كارت، 23 فلتر نوع، صفر أخطاء console** (زي قبل كده بالظبط — مفيش تغيير في البيانات).
- **بحث نصي** ("iron"): 8 نتائج، الحالة اتغيّرت صح ورجعت لـ 108 بعد المسح.
- **فتح تفاصيل عنصر**: overlay ظهر، قائمة الروابط (`linksList`) ظهرت بمحتوى صحيح (عبر `knowledgeService.getEdgesForNode`).
- **عرض الشبكة**: 118 دائرة SVG (عبر `graphService.buildGraphData`) — مطابق تمامًا للرقم المعروف من قبل.
- **لوحة الإحصائيات**: ظهرت بعد `await renderMetrics()`، والأرقام (108/106/10) مطابقة تمامًا لناتج `knowledgeService.computeMetrics()`.

كل الاختبارات نجحت بدون استثناء.

## الحالة الحالية

**108 عقدة، 106 علاقة** — زي ما هي، مفيش تغيير في البيانات. `src/services/` دلوقتي فيها 4 خدمات: `BackgroundService.js`, `SearchService.js`, `KnowledgeService.js`, `GraphService.js`.

## المتبقي من PART 02

Export/Import Service، CacheManager (يستبدل كاش TMDB اليدوي في `businessLayer.js`)، Logger + ErrorManager (تدريجي، ملف بملف)، Search Engine متقدم (fuzzy/ranking/autocomplete/history — يحتاج موافقة على تصميم UI الأول)، Graph Algorithms (shortestPath/connectedComponents/hasCycle — يحتاج موافقة على مكان العرض الأول)، Plugin System (الأساس بس، بدون plugins فعلية).

## نقطة الاستئناف بالظبط

الخطوة الجاية: **Export/Import Service** — تصدير كل بيانات المستخدم الحالية (nodes/edges المخصّصة، الخلفية، إعدادات) كملف JSON واحد قابل للاستيراد، مع زرارين في الواجهة (تصدير/استيراد) في نفس مكان زرار الإحصائيات، وبث حدثي `DATA_EXPORTED`/`DATA_IMPORTED` عبر `EventBus` (الأحداث دي معرّفة بالفعل في `SYSTEM_EVENTS` من الجلسة اللي فاتت بس مش متستخدمة لسه).

---

# تحديث: بند Export/Import Service (استكمال الجلسة الخامسة)

## اللي اتنفذ

- **`src/services/ExportImportService.js`** — خدمة جديدة بحقن `knowledgeLayer` + `storageLayer` + `eventBus`:
  - `buildExportPayload()` / `exportAsJsonString()` — بيصدّر **فقط بيانات المستخدم المخصّصة** (customNodes, customEdges, background) + `formatVersion` + `exportedAt`. البيانات الأساسية (nodes.json/edges.json الأصليين) عمدًا مش جزء من التصدير لأنها ثابتة وموجودة بالفعل في المشروع.
  - `validateImportPayload(payload)` — فحص بنية كامل قبل أي كتابة (arrays موجودة، كل عقدة/علاقة فيها الحقول الأساسية).
  - `importData(payload)` — بيرمي خطأ واضح لو البنية غير صالحة (**من غير أي كتابة جزئية** — الفحص قبل أي `save`)، وإلا بيضيف العقد/العلاقات الجديدة بس (idempotent بالكامل: id موجود = تجاهل)، ويستعيد الخلفية لو موجودة، وبيرجّع `{ importedNodes, importedEdges, backgroundRestored }`.
  - بيبث `DATA_EXPORTED`/`DATA_IMPORTED` عبر `EventBus` (الأحداث دي كانت معرّفة من الجلسة اللي فاتت في `SYSTEM_EVENTS` بس مش مستخدمة — دلوقتي بقت مستخدمة فعليًا).
- **`js/renderLayer.js`**:
  - `getEventBus()` — instance مشترك واحد (lazy + cached) بقى مستخدم من `BackgroundService` و`ExportImportService` معًا (كان كل واحدة بتعمل `EventBus` لوحدها قبل كده — اتوحّد).
  - `getExportImportService()` — نفس نمط باقي الخدمات.
  - زرار **⬇️ تصدير بياناتي**: بيبني `Blob` من `exportAsJsonString()` وبينزّل ملف `marvel-map-backup-YYYY-MM-DD.json` عبر `<a download>` مؤقت.
  - زرار **⬆️ استيراد بيانات**: بيفتح `input[type=file]` مخفي، بيقرأ الملف بـ `FileReader`، `JSON.parse`، وبعدين `importData()`. لو نجح بيعرض `alert` بعدد العناصر المستوردة فعليًا، وبيعمل `renderRows()`/`renderGraph()` (لو الشبكة ظاهرة) و`applyBackground()` (لو الخلفية اتحدّثت). لو فشل (JSON تالف أو بنية غلط) بيعرض `alert` بالخطأ من غير ما يكسر التطبيق.
- **`index.html`** — زرارين جداد (`exportDataBtn`, `importDataBtn`) + `input[hidden]` (`importDataFileInput`) في نفس مكان زراير الخلفية بالـ toolbar.

## الاختبار الفعلي

### 1) Unit test حقيقي في Node لـ `ExportImportService` (dynamic import فعلي، مش stub)
غطّى: throw عند نقص dependency، export فاضي في البداية، export بعد إضافة بيانات، `validateImportPayload` لحالات سليمة وتالفة (بنية فاضية، عقدة ناقصة حقول، `null`)، استيراد فعلي على state فاضي (محاكاة جهاز جديد)، **استيراد idempotent** (نفس الملف مرتين = صفر تكرار)، و**رفض استيراد بيانات تالفة بدون أي كتابة جزئية** (تأكدت إن `storedCustomNodes` فضلت زي ما هي بعد محاولة استيراد فاشلة). كل الحالات نجحت.

### 2) اختبار end-to-end كامل (jsdom + d3 حقيقي + سيرفر HTTP محلي حقيقي)
نفس منهجية الجلسات اللي فاتت (بديل متزامن *لغرض الاختبار فقط* لكل نداءات `import()` الستة الموجودة في `renderLayer.js` — الملف الحقيقي لم يُلمس). سيناريو كامل من مسار المستخدم الحقيقي بالكامل (زي مستخدم حقيقي بالظبط، مش نداء دوال داخلية):
1. فتح الصفحة، تأكيد **صفر regression**: 108 كارت، 23 فلتر، بحث ("thor" → 4 نتائج)، فتح تفاصيل عنصر، عرض الشبكة (118 دائرة)، لوحة الإحصائيات (108/106/10) — كل ده لسه شغال بعد كل التعديلات.
2. فتح تفاصيل عنصر → ضغط "اربط بعقدة تانية" → البحث عن "Hulk" ولقيها فعليًا → تأكيد الربط بسبب اختباري.
3. ضغط "تصدير بياناتي" → قراءة الملف اللي اتصدّر فعليًا (عبر stub لـ `URL.createObjectURL` بيحتفظ بالـ Blob) → تأكيد `formatVersion: 1` و`customEdges.length === 1`.
4. **`window.localStorage.clear()`** (محاكاة كاملة لجهاز جديد فاضي تمامًا).
5. رفع نفس الملف المُصدَّر عبر `importDataFileInput` (بمحاكاة حقيقية لـ File API، مش نداء داخلي).
6. تأكيد رسالة النجاح: *"تم الاستيراد: 0 عقدة جديدة، 1 علاقة جديدة."* (منطقي: العقدتين المرتبطتين أصليتين في `nodes.json`، فمفيش عقد جديدة تتضاف — بس الرابط اتسجّل).
7. فتح تفاصيل نفس العنصر تاني بعد الاستيراد → **الرابط المخصّص ظاهر فعليًا** في `linksList`، يعني الاستيراد فعليًا رجّع البيانات واشتغلت مع باقي النظام (`knowledgeService.getEdgesForNode`) من غير أي تدخل يدوي زيادة.

**صفر أخطاء console طول السيناريو بالكامل.**

## الحالة الحالية

**108 عقدة، 106 علاقة** من البيانات الأساسية — زي ما هي، مفيش تغيير. `src/services/` دلوقتي فيها 5 خدمات: `BackgroundService.js`, `SearchService.js`, `KnowledgeService.js`, `GraphService.js`, `ExportImportService.js`.

## المتبقي من PART 02

CacheManager (يستبدل كاش TMDB اليدوي في `businessLayer.js`)، Logger + ErrorManager (تدريجي، ملف بملف)، Search Engine متقدم (fuzzy/ranking/autocomplete/history — يحتاج موافقة على تصميم UI الأول)، Graph Algorithms (shortestPath/connectedComponents/hasCycle — يحتاج موافقة على مكان العرض الأول)، Plugin System (الأساس بس، بدون plugins فعلية).

## نقطة الاستئناف بالظبط

الخطوة الجاية: **CacheManager** — استبدال منطق كاش TMDB اليدوي الموجود حاليًا في `businessLayer.js` (`tmdbCache` object + `StorageLayer.loadTmdbCache/saveTmdbCache` مباشرة) بخدمة `CacheManager` عامة (get/set/has/clear + TTL اختياري)، بحيث `businessLayer.fetchTmdbData`/`searchTmdbMulti` تستخدمها بدل التعامل المباشر مع الكاش. القرار المطلوب اتخاذه الأول: هل الكاش الحالي (من غير TTL — بيفضل صالح للأبد) يفضل كده، ولا نضيف انتهاء صلاحية (TTL) دلوقتي؟
