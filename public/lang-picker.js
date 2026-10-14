/* Wazeef shared language picker
   - Full world language list (ISO 639-1, all codes)
   - Searchable combobox replacing plain <select> language dropdowns
   - Unified styling for level (A1-C2) selects
   Auto-initializes on DOMContentLoaded for known ids. */
(function () {
  'use strict';

  // [code, arabic name, native name, english name]
  var LANGS = [
    ['ar', 'العربية', 'العربية', 'Arabic'],
    ['en', 'الإنجليزية', 'English', 'English'],
    ['de', 'الألمانية', 'Deutsch', 'German'],
    ['ja', 'اليابانية', '日本語', 'Japanese'],
    ['pt', 'البرتغالية', 'Português', 'Portuguese'],
    ['fr', 'الفرنسية', 'Français', 'French'],
    ['es', 'الإسبانية', 'Español', 'Spanish'],
    ['tr', 'التركية', 'Türkçe', 'Turkish'],
    ['ko', 'الكورية', '한국어', 'Korean'],
    ['zh', 'الصينية', '中文', 'Chinese'],
    ['ru', 'الروسية', 'Русский', 'Russian'],
    ['it', 'الإيطالية', 'Italiano', 'Italian'],
    ['hi', 'الهندية', 'हिन्दी', 'Hindi'],
    ['nl', 'الهولندية', 'Nederlands', 'Dutch'],
    ['sv', 'السويدية', 'Svenska', 'Swedish'],
    ['aa', 'العفارية', 'Afar', 'Afar'],
    ['ab', 'الأبخازية', 'Аҧсуа', 'Abkhazian'],
    ['ae', 'الأفستية', 'Avesta', 'Avestan'],
    ['af', 'الأفريقانية', 'Afrikaans', 'Afrikaans'],
    ['ak', 'الأكانية', 'Akana', 'Akan'],
    ['am', 'الأمهرية', 'አማርኛ', 'Amharic'],
    ['an', 'الأراغونية', 'Aragonés', 'Aragonese'],
    ['as', 'الآسامية', 'অসমীয়া', 'Assamese'],
    ['av', 'الأفارية', 'Магӏарул', 'Avaric'],
    ['ay', 'الأيمارا', 'Aymar', 'Aymara'],
    ['az', 'الأذربيجانية', 'Azərbaycan', 'Azerbaijani'],
    ['ba', 'الباشكيرия', 'Башҡорт', 'Bashkir'],
    ['be', 'البيلاروسية', 'Беларуская', 'Belarusian'],
    ['bg', 'البلغارية', 'Български', 'Bulgarian'],
    ['bh', 'البيهارية', 'भोजपुरी', 'Bihari'],
    ['bi', 'البيسما', 'Bislama', 'Bislama'],
    ['bm', 'البامبارا', 'Bamanankan', 'Bambara'],
    ['bn', 'البنغالية', 'বাংলা', 'Bengali'],
    ['bo', 'التبتية', 'བོད་ཡིག', 'Tibetan'],
    ['br', 'البريتونية', 'Brezhoneg', 'Breton'],
    ['bs', 'البوسنية', 'Bosanski', 'Bosnian'],
    ['ca', 'الكتالونية', 'Català', 'Catalan'],
    ['ce', 'الشيشانية', 'Нохчийн', 'Chechen'],
    ['ch', 'التشامورو', 'Chamoru', 'Chamorro'],
    ['co', 'الكورسيكية', 'Corsu', 'Corsican'],
    ['cr', 'الكري', 'Nehiyaw', 'Cree'],
    ['cs', 'التشيكية', 'Čeština', 'Czech'],
    ['cu', 'السلافية الكنسية', 'Славѣнскъ', 'Church Slavic'],
    ['cv', 'الشوشوية', 'Чӑваш', 'Chuvash'],
    ['cy', 'الويلزية', 'Cymraeg', 'Welsh'],
    ['da', 'الدنماركية', 'Dansk', 'Danish'],
    ['dv', 'الديفيهية', 'ދިވެހި', 'Divehi'],
    ['dz', 'الدزونغخا', 'རྫོང་ཁ', 'Dzongkha'],
    ['ee', 'الإوية', 'Eʋegbe', 'Ewe'],
    ['el', 'اليونانية', 'Ελληνικά', 'Greek'],
    ['eo', 'الإسبرانتو', 'Esperanto', 'Esperanto'],
    ['et', 'الإستونية', 'Eesti', 'Estonian'],
    ['eu', 'الباسكية', 'Euskara', 'Basque'],
    ['fa', 'الفارسية', 'فارسی', 'Persian'],
    ['ff', 'الفولانية', 'Fulfulde', 'Fulah'],
    ['fi', 'الفنلندية', 'Suomi', 'Finnish'],
    ['fj', 'الفيجية', 'Vosa Vakaviti', 'Fijian'],
    ['fo', 'الفاروية', 'Føroyskt', 'Faroese'],
    ['fy', 'الفريزية', 'Frysk', 'Frisian'],
    ['ga', 'الأيرلندية', 'Gaeilge', 'Irish'],
    ['gd', 'الغيلية الاسكتلندية', 'Gàidhlig', 'Gaelic'],
    ['gl', 'الجاليكية', 'Galego', 'Galician'],
    ['gn', 'الغوارانية', 'Avañeẽ', 'Guarani'],
    ['gu', 'الغوجاراتية', 'ગુજરાતી', 'Gujarati'],
    ['gv', 'المانكسية', 'Gaelg', 'Manx'],
    ['ha', 'الهوسا', 'Hausa', 'Hausa'],
    ['he', 'العبرية', 'עברית', 'Hebrew'],
    ['ho', 'الهيري موتو', 'Hiri Motu', 'Hiri Motu'],
    ['hr', 'الكرواتية', 'Hrvatski', 'Croatian'],
    ['ht', 'الكريولية الهايتية', 'Kreyòl', 'Haitian Creole'],
    ['hz', 'الهيرو', 'Oshiherero', 'Herero'],
    ['hu', 'المجرية', 'Magyar', 'Hungarian'],
    ['hy', 'الأرمينية', 'Հայերեն', 'Armenian'],
    ['ia', 'اللغة الوسيطة', 'Interlingua', 'Interlingua'],
    ['id', 'الإندونيسية', 'Bahasa Indonesia', 'Indonesian'],
    ['ie', 'الإنترلينغ', 'Interlingue', 'Interlingue'],
    ['ig', 'الإيغبو', 'Igbo', 'Igbo'],
    ['ii', 'الني', 'ꆈꌠ', 'Yi'],
    ['ik', 'الإنوبياك', 'Iñupiaq', 'Inupiaq'],
    ['io', 'الإيدو', 'Ido', 'Ido'],
    ['is', 'الآيسلندية', 'Íslenska', 'Icelandic'],
    ['iu', 'الإينكتيتوت', 'ᐃᓄᒃᑎᑐᑦ', 'Inuktitut'],
    ['jv', 'الجاوية', 'Basa Jawa', 'Javanese'],
    ['ka', 'الجورجية', 'ქართული', 'Georgian'],
    ['kg', 'الكونغولية', 'Kikongo', 'Kongo'],
    ['ki', 'الكيكويو', 'Gĩkũyũ', 'Kikuyu'],
    ['kj', 'الكوانما', 'Kuanyama', 'Kuanyama'],
    ['kk', 'الكازاخية', 'Қазақ тілі', 'Kazakh'],
    ['kl', 'القرينلاندية', 'Kalaallisut', 'Greenlandic'],
    ['km', 'الخميرية', 'ខ្មែរ', 'Khmer'],
    ['kn', 'الكانادية', 'ಕನ್ನಡ', 'Kannada'],
    ['kr', 'الكانورية', 'Kanuri', 'Kanuri'],
    ['ks', 'الكشميرية', 'كٲشُر', 'Kashmiri'],
    ['ku', 'الكردية', 'Kurdî', 'Kurdish'],
    ['kv', 'الكومية', 'Коми', 'Komi'],
    ['kw', 'الكورنية', 'Kernewek', 'Cornish'],
    ['ky', 'القيرغيزية', 'Кыргызча', 'Kyrgyz'],
    ['la', 'اللاتينية', 'Latina', 'Latin'],
    ['lb', 'اللوكسمبورغية', 'Lëtzebuergesch', 'Luxembourgish'],
    ['lg', 'اللوغاندا', 'Luganda', 'Ganda'],
    ['li', 'الليمبورغية', 'Limburgs', 'Limburgish'],
    ['ln', 'اللينغالا', 'Lingála', 'Lingala'],
    ['lo', 'اللاوية', 'ລາວ', 'Lao'],
    ['lt', 'الليتوانية', 'Lietuvių', 'Lithuanian'],
    ['lu', 'اللوبية', 'Luba-Kasai', 'Luba'],
    ['lv', 'اللاتفية', 'Latviešu', 'Latvian'],
    ['mg', 'الملغاشية', 'Malagasy', 'Malagasy'],
    ['mh', 'المارشالية', 'Kajin M̧ajeļ', 'Marshallese'],
    ['mi', 'الماورية', 'Te Reo Māori', 'Maori'],
    ['mk', 'المقدونية', 'Македонски', 'Macedonian'],
    ['ml', 'المالايالامية', 'മലയാളം', 'Malayalam'],
    ['mn', 'المنغولية', 'Монгол', 'Mongolian'],
    ['mr', 'المراثية', 'मराठी', 'Marathi'],
    ['ms', 'الملايو', 'Bahasa Melayu', 'Malay'],
    ['mt', 'المالطية', 'Malti', 'Maltese'],
    ['my', 'البورمية', 'မြန်မာ', 'Burmese'],
    ['na', 'الناورية', 'Dorerin Naoero', 'Nauru'],
    ['nb', 'النرويجية (بوكمال)', 'Norsk bokmål', 'Norwegian Bokmal'],
    ['nd', 'النديبلي الشمالي', 'IsiNdebele', 'Northern Ndebele'],
    ['ne', 'النيبالية', 'नेपाली', 'Nepali'],
    ['ng', 'الندونغا', 'Ndonga', 'Ndonga'],
    ['nn', 'النرويجية (نينورسك)', 'Norsk nynorsk', 'Norwegian Nynorsk'],
    ['no', 'النرويجية', 'Norsk', 'Norwegian'],
    ['nr', 'النديبلي الجنوبي', 'IsiNdebele', 'Southern Ndebele'],
    ['nv', 'النافاجو', 'Diné bizaad', 'Navajo'],
    ['ny', 'التشيوانجا', 'Chichewa', 'Chichewa'],
    ['oc', 'الأوكسيتانية', 'Occitan', 'Occitan'],
    ['oj', 'الأوجيبوا', 'Anishinaabemowin', 'Ojibwe'],
    ['om', 'الأورومية', 'Afaan Oromoo', 'Oromo'],
    ['or', 'الأورية', 'ଓଡ଼ିଆ', 'Odia'],
    ['os', 'الأوسيتية', 'Ирон', 'Ossetian'],
    ['pa', 'البنجابية', 'ਪੰਜਾਬੀ', 'Punjabi'],
    ['pi', 'الباليية', 'पाऴि', 'Pali'],
    ['pl', 'البولندية', 'Polski', 'Polish'],
    ['ps', 'البشتو', 'پښتو', 'Pashto'],
    ['qu', 'الكيتشوا', 'Runa Simi', 'Quechua'],
    ['rm', 'الرومانشية', 'Rumantsch', 'Romansh'],
    ['rn', 'الكيروندية', 'Kirundi', 'Kirundi'],
    ['ro', 'الرومانية', 'Română', 'Romanian'],
    ['rw', 'الكينيارواندية', 'Kinyarwanda', 'Kinyarwanda'],
    ['sa', 'السنسكريتية', 'संस्कृतम्', 'Sanskrit'],
    ['sd', 'السندية', 'سنڌي', 'Sindhi'],
    ['se', 'السامي الشمالي', 'Sámegiella', 'Northern Sami'],
    ['sg', 'السانغوية', 'Sängö', 'Sango'],
    ['si', 'السنهالية', 'සිංහල', 'Sinhala'],
    ['sk', 'السلوفاكية', 'Slovenčina', 'Slovak'],
    ['sl', 'السلوفينية', 'Slovenščina', 'Slovenian'],
    ['sm', 'الساموية', 'Gagana Sāmoa', 'Samoan'],
    ['sn', 'الشونا', 'ChiShona', 'Shona'],
    ['so', 'الصومالية', 'Soomaali', 'Somali'],
    ['sq', 'الألبانية', 'Shqip', 'Albanian'],
    ['sr', 'الصربية', 'Српски', 'Serbian'],
    ['ss', 'السيتوانا', 'SiSwati', 'Swati'],
    ['st', 'السوتو', 'Sesotho', 'Southern Sotho'],
    ['su', 'السوندانية', 'Basa Sunda', 'Sundanese'],
    ['sw', 'السواحيلية', 'Kiswahili', 'Swahili'],
    ['ta', 'التاميلية', 'தமிழ்', 'Tamil'],
    ['te', 'التيلوغوية', 'తెలుగు', 'Telugu'],
    ['tg', 'الطاجيكية', 'Тоҷикӣ', 'Tajik'],
    ['th', 'التايلاندية', 'ไทย', 'Thai'],
    ['tk', 'التوركمانية', 'Türkmen', 'Turkmen'],
    ['ti', 'التغرينية', 'ትግርኛ', 'Tigrinya'],
    ['tl', 'التاغالوغية', 'Tagalog', 'Tagalog'],
    ['tn', 'التسوانا', 'Setswana', 'Tswana'],
    ['to', 'التونغية', 'Lea Faka-Tonga', 'Tongan'],
    ['ts', 'التسونغا', 'Xitsonga', 'Tsonga'],
    ['tt', 'التترية', 'Татарча', 'Tatar'],
    ['tw', 'التوي', 'Twi', 'Twi'],
    ['ty', 'التاهيتية', 'Reo Tahiti', 'Tahitian'],
    ['ug', 'الأويغورية', 'ئۇيغۇرچە', 'Uyghur'],
    ['uk', 'الأوكرانية', 'Українська', 'Ukrainian'],
    ['ur', 'الأردية', 'اردو', 'Urdu'],
    ['uz', 'الأوزبكية', 'Oʻzbekcha', 'Uzbek'],
    ['ve', 'الفيندا', 'Tshivenḓa', 'Venda'],
    ['vi', 'الفيتنامية', 'Tiếng Việt', 'Vietnamese'],
    ['vo', 'فولابوك', 'Volapük', 'Volapük'],
    ['wa', 'الونلوا', 'Walon', 'Walloon'],
    ['wo', 'الولوف', 'Wolof', 'Wolof'],
    ['xh', 'الخوسا', 'isiXhosa', 'Xhosa'],
    ['yi', 'اليديشية', 'ייִדיש', 'Yiddish'],
    ['yo', 'اليوروبا', 'Yorùbá', 'Yoruba'],
    ['za', 'الزوانغ', 'Vahcuengh', 'Zhuang'],
    ['zu', 'الزولو', 'isiZulu', 'Zulu']
  ];

  // Exact labels already used on the recording page (kept untouched)
  var PREF = {
    ar: 'العربية', en: 'English', de: 'Deutsch - ألماني', ja: '日本語 - ياباني',
    pt: 'Português - برتغالي', fr: 'Français - فرنسي', es: 'Español - إسباني',
    tr: 'Türkçe - تركي', ko: '한국어 - كوري', zh: '中文 - صيني', ru: 'Русский - روسي',
    it: 'Italiano - إيطالي', hi: 'हिन्दी - هندي', nl: 'Nederlands - هولندي', sv: 'Svenska - سويدى'
  };

  var byCode = {}, byAr = {}, byOther = {};
  LANGS.forEach(function (l) {
    byCode[l[0]] = l;
    byAr[l[1]] = l;
    [l[2], l[3]].forEach(function (n) { if (n && !byOther[n]) byOther[n] = l; });
  });

  function clean(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
  function find(v) {
    v = clean(v);
    if (!v) return null;
    return byCode[v] || byAr[v] || byOther[v] || null;
  }

  var LP = {
    LANGS: LANGS,
    // Arabic display name for any representation (code / english / native / arabic)
    display: function (v) { var l = find(v); return l ? l[1] : clean(v); },
    arOf: function (v) { return LP.display(v); },
    // ISO code for any representation (null when unknown)
    codeOf: function (v) { var l = find(v); return l ? l[0] : null; },
    labelFor: function (l) { return PREF[l[0]] || (l[2] + ' - ' + l[1]); },
    isCodeList: function (sel) {
      var vals = optionValues(sel);
      return vals.length >= 3 && vals.every(function (v) { return /^[a-z]{2,3}$/.test(v); });
    },
    isArabicList: function (sel) {
      var vals = optionValues(sel);
      return vals.length >= 3 && vals.every(function (v) { return /[\u0600-\u06FF]/.test(v); });
    },
    // Rebuild options of a language select using full world list
    fill: function (sel, mode) {
      if (!sel) return;
      var placeholder = '';
      var keep = [];
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!o.value) { if (!placeholder) placeholder = o.textContent; }
        else if (!byCode[o.value] && !byAr[o.value]) keep.push({ v: o.value, t: o.textContent });
      });
      sel.innerHTML = '';
      var ph = document.createElement('option');
      ph.value = '';
      ph.textContent = placeholder || 'اختر اللغة';
      sel.appendChild(ph);
      LANGS.forEach(function (l) {
        var o = document.createElement('option');
        if (mode === 'code') { o.value = l[0]; o.textContent = LP.labelFor(l); }
        else if (mode === 'code-en') { o.value = l[0]; o.textContent = l[3]; }
        else { o.value = l[1]; o.textContent = l[1]; }
        sel.appendChild(o);
      });
      keep.forEach(function (k) {
        var o = document.createElement('option');
        o.value = k.v; o.textContent = k.t;
        sel.appendChild(o);
      });
    },
    // Make a <select> searchable (custom combobox backed by the native select)
    enhance: function (sel, opts) {
      if (!sel || sel._lp) { if (sel) LP.sync(sel); return sel && sel._lp; }
      opts = opts || {};
      ensureCss();

      var wrap = document.createElement('div');
      wrap.className = 'lp-wrap' + (opts.en ? ' lp-en' : '');
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'lp-input';
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('spellcheck', 'false');
      input.placeholder = opts.placeholder || 'اكتب للبحث في اللغات...';
      if (opts.en) input.setAttribute('dir', 'ltr');
      var caret = document.createElement('span');
      caret.className = 'lp-caret';
      caret.textContent = '▾';
      wrap.appendChild(input);
      wrap.appendChild(caret);

      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);
      sel.classList.add('lp-native');

      var menu = document.createElement('div');
      menu.className = 'lp-menu';
      var list = document.createElement('div');
      list.className = 'lp-list';
      menu.appendChild(list);
      document.body.appendChild(menu);

      var st = { open: false, items: [], active: -1, last: undefined };

      function opts() {
        return Array.prototype.filter.call(sel.options, function (o) { return o.value !== ''; });
      }
      function labelOf(v) {
        var o = Array.prototype.find.call(sel.options, function (x) { return x.value === v; });
        return o ? o.textContent : '';
      }
      function sync() {
        if (sel.value !== st.last) { st.last = sel.value; }
        if (!st.open) input.value = labelOf(sel.value);
      }
      function pos() {
        var r = input.getBoundingClientRect();
        var mh = menu.offsetHeight || 300;
        var mw = Math.max(r.width, 190);
        menu.style.width = mw + 'px';
        var left = r.left;
        if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
        if (left < 8) left = 8;
        menu.style.left = left + 'px';
        var top;
        if (r.bottom + mh + 12 > window.innerHeight && r.top > mh + 12) top = r.top - mh - 6;
        else top = r.bottom + 6;
        if (top < 8) top = 8;
        if (top + mh > window.innerHeight - 8) top = Math.max(8, window.innerHeight - mh - 8);
        menu.style.top = top + 'px';
      }
      function render() {
        var q = clean(input.value).toLowerCase();
        var cur = labelOf(sel.value);
        if (q && q === cur.toLowerCase()) q = '';
        list.innerHTML = '';
        st.items = [];
        st.active = -1;
        var arr = opts().filter(function (o) {
          if (!q) return true;
          var l = find(o.value);
          var hay = (o.textContent + ' ' + o.value + ' ' + (l ? l[2] + ' ' + l[3] + ' ' + l[1] : '')).toLowerCase();
          return hay.indexOf(q) !== -1;
        });
        if (!arr.length) {
          var e = document.createElement('div');
          e.className = 'lp-empty';
          e.textContent = opts.empty || 'لا توجد نتائج مطابقة';
          list.appendChild(e);
          pos();
          return;
        }
        arr.forEach(function (o, i) {
          var it = document.createElement('div');
          it.className = 'lp-item' + (o.value === sel.value ? ' sel' : '');
          var l = find(o.value);
          var main = document.createElement('span');
          main.textContent = l ? l[1] : o.textContent;
          var sub = document.createElement('span');
          sub.className = 'lp-code';
          sub.textContent = l ? (l[2] !== l[1] ? l[2] : l[0]).toUpperCase() : '';
          it.appendChild(main);
          if (sub.textContent) it.appendChild(sub);
          it.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
          it.addEventListener('click', function () {
            sel.value = o.value;
            st.last = o.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            input.value = labelOf(sel.value);
            close();
            try { sel.focus(); } catch (e) {}
          });
          list.appendChild(it);
          st.items.push(it);
        });
        pos();
      }
      function open() {
        if (st.open) return;
        st.open = true;
        menu.classList.add('open');
        input.select();
        render();
        document.addEventListener('mousedown', outside, true);
        window.addEventListener('scroll', pos, true);
        window.addEventListener('resize', pos);
      }
      function close() {
        if (!st.open) return;
        st.open = false;
        menu.classList.remove('open');
        input.value = labelOf(sel.value);
        document.removeEventListener('mousedown', outside, true);
        window.removeEventListener('scroll', pos, true);
        window.removeEventListener('resize', pos);
      }
      function outside(ev) {
        if (!wrap.contains(ev.target) && !menu.contains(ev.target)) close();
      }
      function move(step) {
        if (!st.open) open();
        if (!st.items.length) return;
        st.active = (st.active + step + st.items.length) % st.items.length;
        st.items.forEach(function (it, i) { it.classList.toggle('active', i === st.active); });
        var el = st.items[st.active];
        if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
        }
      }
      function pick() {
        if (st.open && st.active >= 0 && st.items[st.active]) st.items[st.active].click();
        else if (!st.open) open();
      }

      input.addEventListener('focus', open);
      input.addEventListener('click', open);
      input.addEventListener('input', function () { if (!st.open) open(); else render(); });
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
        else if (ev.key === 'Enter') { if (st.open) { ev.preventDefault(); pick(); } }
        else if (ev.key === 'Escape') { close(); }
        else if (ev.key === 'Tab') { close(); }
      });
      input.addEventListener('blur', function () { setTimeout(close, 120); });
      sel.addEventListener('change', sync);

      st.sync = sync;
      st.close = close;
      sel._lp = { sync: sync, input: input };
      sync();
      return sel._lp;
    },
    sync: function (sel) {
      sel = typeof sel === 'string' ? document.getElementById(sel) : sel;
      if (sel && sel._lp) sel._lp.sync();
    },
    // Unified look for level selects (A1..C2) matching the language combobox
    styleLevel: function (sel) {
      sel = typeof sel === 'string' ? document.getElementById(sel) : sel;
      if (!sel || sel._lpLevel) return;
      sel._lpLevel = true;
      ensureCss();
      var keep = [];
      var inline = sel.getAttribute('style') || '';
      ['flex', 'width', 'min-width', 'max-width', 'margin', 'margin-left', 'margin-right'].forEach(function (p) {
        var m = inline.match(new RegExp('(?:^|;)\\s*' + p + '\\s*:\\s*([^;]+)', 'i'));
        if (m) keep.push(p + ':' + m[1]);
      });
      sel.setAttribute('style', keep.join(';'));
      sel.classList.add('lp-level');
    },
    init: function () {
      var LANG_IDS = ['lang-select', 'reg-language-applied', 'cjob-lang', 'job-lang-select',
        'new-lang', 'lang-lang-filter', 'cand-lang-filter'];
      var LEVEL_IDS = ['cjob-level', 'new-level', 'lang-level', 'level-from', 'level-to'];
      LANG_IDS.forEach(function (id) {
        var sel = document.getElementById(id);
        if (!sel) return;
        // Registration form: keep the full list but English labels only
        if (id === 'reg-language-applied') {
          if (LP.isCodeList(sel)) LP.fill(sel, 'code-en');
          else if (LP.isArabicList(sel)) LP.fill(sel, 'ar');
          LP.enhance(sel, { en: true, placeholder: 'Type to search languages...', empty: 'No matches' });
          return;
        }
        if (LP.isCodeList(sel)) LP.fill(sel, 'code');
        else if (LP.isArabicList(sel)) LP.fill(sel, 'ar');
        LP.enhance(sel);
      });
      LEVEL_IDS.forEach(function (id) { LP.styleLevel(id); });
    }
  };

  function optionValues(sel) {
    return Array.prototype.map.call(sel.options || [], function (o) { return o.value; })
      .filter(function (v) { return v !== ''; });
  }

  function ensureCss() {
    if (document.getElementById('lp-style')) return;
    var css = document.createElement('style');
    css.id = 'lp-style';
    css.textContent = [
      '.lp-wrap{position:relative;width:100%}',
      'body .lp-wrap>.lp-input{width:100%!important;box-sizing:border-box!important;padding:12px 40px 12px 16px!important;background:#1a1a1a!important;border:1.5px solid rgba(212,168,83,.12)!important;border-radius:12px!important;color:#e2e8f0!important;font-family:Tajawal,sans-serif!important;font-size:14px!important;outline:none!important;direction:rtl!important;text-align:right!important;cursor:text!important}',
      'body .lp-wrap>.lp-input::placeholder{color:#64748b!important}',
      'body .lp-wrap>.lp-input:focus{border-color:rgba(212,168,83,.45)!important;box-shadow:0 0 0 3px rgba(212,168,83,.08)!important}',
      '.lp-caret{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#d4a853;font-size:12px;pointer-events:none}',
      '.lp-menu{position:fixed;z-index:2147483646;background:#141414;border:1.5px solid rgba(212,168,83,.18);border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.55);overflow:hidden;display:none;direction:rtl}',
      '.lp-menu.open{display:block}',
      '.lp-list{max-height:280px;overflow-y:auto;padding:6px}',
      '.lp-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:14px;color:#e2e8f0;white-space:nowrap;overflow:hidden}',
      '.lp-item .lp-code{color:#d4a853;font-size:11px;opacity:.7;flex:0 0 auto;direction:ltr}',
      '.lp-item:hover,.lp-item.active{background:rgba(212,168,83,.12)}',
      '.lp-wrap.lp-en>.lp-input{direction:ltr!important;text-align:left!important}',
      '.lp-item.sel{background:rgba(212,168,83,.16);color:#f5d78c}',
      '.lp-empty{padding:14px 10px;color:#94a3b8;text-align:center;font-size:13px}',
      'select.lp-native{position:absolute!important;top:0;right:auto;left:0;width:1px!important;min-width:0!important;max-width:1px!important;height:1px!important;padding:0!important;margin:0!important;border:0!important;opacity:0!important;clip:rect(0 0 0 0)!important;overflow:hidden!important;pointer-events:none!important}',
      'body .modal .lp-wrap>.lp-input{padding:14px 40px 14px 18px!important;font-size:15px!important;border-radius:14px!important;background:rgba(212,168,83,0.04)!important}',
      'body select.lp-level,body .modal select.lp-level{appearance:auto!important;-webkit-appearance:auto!important;width:100%!important;box-sizing:border-box!important;padding:12px 16px!important;background:#1a1a1a!important;border:1.5px solid rgba(212,168,83,.12)!important;border-radius:12px!important;color:#e2e8f0!important;font-family:Tajawal,sans-serif!important;font-size:14px!important;outline:none!important}',
      'body .modal select.lp-level{padding:14px 18px!important;font-size:15px!important;border-radius:14px!important;background:rgba(212,168,83,0.04)!important}',
      'body select.lp-level:focus,body .modal select.lp-level:focus{border-color:rgba(212,168,83,.45)!important;box-shadow:0 0 0 3px rgba(212,168,83,.08)!important}',
      'select.lp-level option{background:#1a1a1a;color:#e2e8f0}'
    ].join('');
    document.head.appendChild(css);
  }

  window.LangPicker = LP;

  // Keep displayed values in sync even when code sets select.value directly
  setInterval(function () {
    var all = document.querySelectorAll('select.lp-native');
    Array.prototype.forEach.call(all, function (s) { if (s._lp) s._lp.sync(); });
  }, 400);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', LP.init);
  else LP.init();
})();
