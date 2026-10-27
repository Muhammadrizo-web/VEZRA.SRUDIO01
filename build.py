#!/usr/bin/env python3
"""Vezra Studio — сборка сайта.

Данные: site.json. Шаблоны: templates/. Стили и скрипт: src/.
Выход:
  dist/     — для публикации артефакта (index.html без <!doctype>, остальные страницы — полные документы)
  preview/  — те же страницы полными документами, для локальной проверки
"""
import json, os, re, shutil, hashlib
from urllib.parse import quote
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from markupsafe import Markup, escape

ROOT = os.path.dirname(os.path.abspath(__file__))

# ---------- языки ----------
# ru — исходный язык шаблонов (корень сайта), en/ и uz/ — переводы из i18n/<lang>.json.
# Ключ словаря — русская строка как на странице (пробелы схлопнуты), значение — перевод.
LANGS = [('ru', ''), ('en', 'en/'), ('uz', 'uz/')]
LANG_META = {
    'ru': {'name': 'RU', 'label': 'Русский', 'locale': 'ru_RU'},
    'en': {'name': 'EN', 'label': 'English', 'locale': 'en_US'},
    'uz': {'name': 'UZ', 'label': "O‘zbekcha", 'locale': 'uz_UZ'},
}
CUR = {'lang': 'ru'}


def load_dict(lang):
    p = os.path.join(ROOT, 'i18n', lang + '.json')
    if not os.path.exists(p):
        return {}
    raw = json.load(open(p, encoding='utf-8'))
    return {norm(k): v for k, v in raw.items() if not k.startswith('_')}


def norm(t):
    import html as _h
    return re.sub(r'\s+', ' ', _h.unescape(t).replace('\xa0', ' ')).strip()


DICTS = {}


def tr(text, lang=None):
    """Перевод строки из словаря; если перевода нет — исходный русский текст."""
    lang = lang or CUR['lang']
    if lang == 'ru':
        return text
    return DICTS.get(lang, {}).get(norm(text), text)
D = json.load(open(os.path.join(ROOT, 'site.json'), encoding='utf-8'))

ICONS = {
    'tg': '<path fill="currentColor" stroke="none" d="M21.4 3.6 2.9 10.8c-1.3.5-1.2 1.3-.2 1.6l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.5-1.5Zm-3.5 3.6-8.6 7.8-.3 3.6-1.5-4.7 10-6.3c.5-.3.8 0 .4.4Z"/>',
    'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'ext': '<path d="M7 17 17 7M9 7h8v8"/>',
    'shield': '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.4 7.5 9.5 4.4-1.1 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m8.8 12 2.3 2.3 4.3-4.6"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>',
    'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    'refresh': '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
    'eye': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    'copy': '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    'check': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    'menu': '<path d="M4 8h16M4 16h16"/>',
    'close': '<path d="M6 6l12 12M18 6 6 18"/>',
    'phone': '<path d="M5 4.5h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 6.4 6.4l1.3-2 4 1.6v3.2a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 6.1A1.5 1.5 0 0 1 5 4.5Z"/>',
    'mail': '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    'insta': '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.8v.1"/>',
    'doctor': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.8 2.7 2.5 3 5.2"/>',
    'tag': '<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.5 1.5 0 0 1 0 2.1l-6.9 6.9a1.5 1.5 0 0 1-2.1 0l-8.1-7.9Z"/><circle cx="8.5" cy="8.5" r="1.6"/>',
    'pin': '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    'doc': '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    'chat': '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    'list': '<path d="M5 4h14v16H5z"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>',
    'camera': '<path d="M3 8h4l2-2.5h6L17 8h4v11H3z"/><circle cx="12" cy="13.5" r="3.5"/>',
    'truck': '<path d="M2.5 6h11v10h-11zM13.5 9.5h4l3 3.5V16h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
}


def icon(name, cls='icon'):
    return Markup(f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
                  f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>')


S = D['studio']
G = D['guarantee']

DRAFTS = {
    'default': 'Здравствуйте! Хочу обсудить сайт.',
    'question': 'Здравствуйте! У меня вопрос: ',
    'clinic': 'Здравствуйте! Нужен сайт для клиники.',
    'cafe': 'Здравствуйте! Нужен сайт для кафе.',
    'samarcande': 'Здравствуйте! Нужен сайт, как у Samarcande Voyage.',
    'maxipharm': 'Здравствуйте! Нужен логотип и сайт, как у MaxiPharm Expert.',
    'xizmattop': 'Здравствуйте! Нужен редизайн интерфейса, как у XizmatTop.',
    'cases': 'Здравствуйте! Посмотрел ваши кейсы, хочу обсудить проект.',
    'about': 'Здравствуйте! Хочу обсудить проект.',
}


# Канал связи: Telegram, а пока ник не указан в site.json — Direct в Instagram.
CH = 'Telegram' if S['telegram'] else 'Instagram'
CH_ICON = 'tg' if S['telegram'] else 'insta'


def tg(ctx='default'):
    """Атрибуты ссылки на Telegram c черновиком сообщения (или на Direct Instagram, если Telegram не указан)."""
    if not S['telegram']:
        if S.get('instagram'):
            url = f"https://ig.me/m/{S['instagram'].lstrip('@')}"
            return Markup(f'href="{escape(url)}" target="_blank" rel="noopener" data-tg="ig-{ctx}"')
        return Markup('href="#contact" data-tg="pending"')
    url = f"https://t.me/{S['telegram'].lstrip('@')}?text={quote(tr(DRAFTS.get(ctx, DRAFTS['default'])))}"
    return Markup(f'href="{escape(url)}" target="_blank" rel="noopener" data-tg="{ctx}"')


def tg_handle():
    return '@' + S['telegram'].lstrip('@') if S['telegram'] else None


def money(v):
    """1500000 -> '1 500 000'"""
    if v is None:
        return None
    return f'{int(v):,}'.replace(',', ' ')


def price(key):
    v = D['prices'].get(key)
    return f'от {money(v)} сум' if v else None


def person_name(p):
    parts = [x for x in (p.get('first'), p.get('last')) if x]
    return ' '.join(parts) if parts else None


def g_short():
    return f"−{G['per_day']}% за каждый день"


ver = None


def asset_ver():
    h = hashlib.sha1()
    for f in ('src/base.css', 'src/motion.css', 'src/screens.css', 'src/app.js'):
        h.update(open(os.path.join(ROOT, f), 'rb').read())
    return h.hexdigest()[:8]


PAGES = [
    # slug, template, title, description, nav key, tg context
    ('index', 'index.html', 'Vezra Studio — сайты за 3–6 дней с гарантией срока',
     'Лендинг за 1–3 дня, корпоративный сайт за 3–6 дней. Срок прописываем в договоре: за каждый день просрочки по нашей вине — минус 10%. Брендинг и контент для бизнеса в Узбекистане.',
     'home', 'default'),
    ('keysy', 'keysy.html', 'Работы — Vezra Studio',
     'Сайты и брендинг Vezra Studio: Samarcande Voyage, MaxiPharm Expert, XizmatTop и фирменные знаки. Задача, решение и срок по каждому проекту.',
     'cases', 'cases'),
    ('keys-samarcande', 'case.html', 'Samarcande Voyage — кейс Vezra Studio',
     'Многостраничный сайт тур-агентства на французском: маршрут, программа тура по дням, города и галерея. Сдали за 4–5 дней.',
     'cases', 'samarcande'),
    ('keys-maxipharm', 'case.html', 'MaxiPharm Expert — кейс Vezra Studio',
     'Логотип и сайт для компании-эксперта по регистрации фармацевтической продукции — в одной системе.',
     'cases', 'maxipharm'),
    ('keys-xizmattop', 'case.html', 'XizmatTop — кейс Vezra Studio',
     'Редизайн интерфейса сервиса вызова мастеров: одна палитра, дневная и ночная тема, 4 языка, запись на сайте и в Telegram Mini App.',
     'cases', 'xizmattop'),
    ('kliniki', 'kliniki.html', 'Сайты для клиник — Vezra Studio',
     'Сайт клиники или стоматологии: лендинг за 1–3 дня, сайт за 3–6 дней. Врачи, цены, лицензия и запись в Telegram.',
     'clinics', 'clinic'),
    ('kafe-restorany', 'kafe-restorany.html', 'Сайты для кафе и ресторанов — Vezra Studio',
     'Сайт кафе или ресторана: лендинг за 1–3 дня, сайт для сети за 3–6 дней. Меню с ценами, фото, маршрут и бронь в Telegram.',
     'cafe', 'cafe'),
    ('o-studii', 'o-studii.html', 'О студии — Vezra Studio',
     'Vezra Studio — студия сайтов и брендинга в Ташкенте. Принципы, процесс работы и оплата.',
     'about', 'about'),
    ('404', '404.html', 'Страница не найдена — Vezra Studio', 'Такой страницы нет.', None, 'default'),
]

CASES = {
    'samarcande': {
        'slug': 'keys-samarcande', 'title': 'Samarcande Voyage', 'niche': 'Туризм · рынок Франции',
        'lead': 'Сайт тур-агентства для франкоязычных путешественников: маршрут, программа тура по дням, города и галерея.',
        'scope': 'Многостраничный', 'img': 'samarcande', 'host': 'samarcande-voyage',
        'next': 'xizmattop',
    },
    'xizmattop': {
        'slug': 'keys-xizmattop', 'title': 'XizmatTop', 'niche': 'Сервис вызова мастеров · Ташкент',
        'lead': 'Редизайн интерфейса: одна палитра вместо семи акцентов, дневная и ночная тема, понятная запись к мастеру на сайте и в Telegram Mini App.',
        'scope': 'Редизайн UI', 'img': 'xizmattop', 'host': 'xizmattop',
        'next': 'maxipharm',
    },
    'maxipharm': {
        'slug': 'keys-maxipharm', 'title': 'MaxiPharm Expert', 'niche': 'Фармацевтика',
        'lead': 'Компания-эксперт по регистрации фармацевтической продукции. Сделали логотип и сайт в одной системе: бренд и сайт говорят одним языком.',
        'scope': 'Логотип + сайт', 'img': 'maxipharm', 'host': 'maxipharm.uz',
        'next': 'samarcande',
    },
}
from PIL import Image as _Img
for k, c in CASES.items():
    c.update({kk: vv for kk, vv in D['cases'][k].items()})
    c['key'] = k
    if c['img']:
        _p = os.path.join(ROOT, 'site', 'img', c['img'] + '-long.webp')
        c['long_h'] = _Img.open(_p).size[1] if os.path.exists(_p) else 750
    c['hostname'] = (c.get('url') or c['host']).replace('https://', '').replace('http://', '').replace('www.', '').rstrip('/')


def has_img(name):
    return os.path.exists(os.path.join(ROOT, 'site', 'img', name))


CYR = re.compile('[А-Яа-яЁё]')
ATTR_RE = re.compile(r'\b(alt|aria-label|content|title|data-copy)="([^"]*)"')
TEXT_RE = re.compile(r'>([^<]+)<')
ASSET_RE = re.compile(r'\b(src|href|content)="(img/|fonts/|styles\.css|app\.js)')


def translate_html(html, lang, missing):
    """Переводит текстовые узлы и атрибуты, поправляет пути к общим файлам (../)."""
    import html as _h
    d = DICTS.get(lang, {})

    def tx(raw, is_attr=False):
        if not CYR.search(raw):
            return raw
        key = norm(raw)
        if key not in d:
            missing.add(key)
            return raw
        lead = re.match(r'^\s*', raw).group(0)
        trail = re.search(r'\s*$', raw).group(0)
        val = _h.escape(d[key], quote=is_attr)
        return lead + val + trail

    # не трогаем <script> и <style>
    parts = re.split(r'(<script\b.*?</script>|<style\b.*?</style>)', html, flags=re.S)
    for i in range(0, len(parts), 2):
        seg = parts[i]
        seg = TEXT_RE.sub(lambda m: '>' + tx(m.group(1)) + '<', seg)
        seg = ATTR_RE.sub(lambda m: f'{m.group(1)}="{tx(m.group(2), True)}"', seg)
        parts[i] = seg
    html = ''.join(parts)
    return ASSET_RE.sub(lambda m: f'{m.group(1)}="../{m.group(2)}', html)


def build():
    global ver
    ver = asset_ver()
    env = Environment(loader=FileSystemLoader(os.path.join(ROOT, 'templates')), undefined=StrictUndefined,
                      autoescape=False, trim_blocks=True, lstrip_blocks=True)
    env.globals.update(CH=CH, CH_ICON=CH_ICON, icon=icon, tg=tg, tg_handle=tg_handle, price=price, money=money, S=S, G=G, D=D,
                       person_name=person_name, g_short=g_short, CASES=CASES, has_img=has_img)
    for out in ('dist', 'preview'):
        p = os.path.join(ROOT, out)
        os.makedirs(p, exist_ok=True)  # перезаписываем, не удаляя папку
        shutil.copytree(os.path.join(ROOT, 'site', 'img'), os.path.join(p, 'img'), dirs_exist_ok=True)
        shutil.copytree(os.path.join(ROOT, 'site', 'fonts'), os.path.join(p, 'fonts'), dirs_exist_ok=True)
        css = '\n'.join(open(os.path.join(ROOT, f), encoding='utf-8').read()
                         for f in ('src/base.css', 'src/motion.css', 'src/screens.css'))
        open(os.path.join(p, 'styles.css'), 'w', encoding='utf-8').write(css)
        shutil.copy(os.path.join(ROOT, 'src/app.js'), os.path.join(p, 'app.js'))
    for lang, _ in LANGS:
        DICTS[lang] = load_dict(lang)
    missing = {l: set() for l, _ in LANGS}
    for lang, prefix in LANGS:
        CUR['lang'] = lang
        for out in ('dist', 'preview'):
            os.makedirs(os.path.join(ROOT, out, prefix), exist_ok=True)
        for slug, tpl, title, desc, nav, ctx in PAGES:
            case = None
            if tpl == 'case.html':
                case = CASES[slug.replace('keys-', '')]
            # ссылки на эту же страницу на других языках
            up = '../' if prefix else ''
            alt = {l: up + p + slug + '.html' for l, p in LANGS}
            page = dict(slug=slug, title=title, desc=desc, nav=nav, ctx=ctx, case=case,
                        lang=lang, alt=alt, langs=[(l, LANG_META[l]) for l, _ in LANGS], meta=LANG_META[lang])
            t = env.get_template('pages/' + tpl)
            for out, fragment in (('dist', slug == 'index' and lang == 'ru'), ('preview', False)):
                html = t.render(page=page, fragment=fragment, ver=ver)
                html = re.sub(r'\n{3,}', '\n\n', html)
                if lang != 'ru':
                    html = translate_html(html, lang, missing[lang])
                open(os.path.join(ROOT, out, prefix + slug + '.html'), 'w', encoding='utf-8').write(html)
    CUR['lang'] = 'ru'
    for lang, ms in missing.items():
        mp = os.path.join(ROOT, 'i18n', f'_missing-{lang}.txt')
        if ms:
            os.makedirs(os.path.dirname(mp), exist_ok=True)
            open(mp, 'w', encoding='utf-8').write('\n'.join(sorted(ms)) + '\n')
            print(f'! {lang}: нет перевода для {len(ms)} строк — список в i18n/_missing-{lang}.txt')
        elif os.path.exists(mp):
            open(mp, 'w', encoding='utf-8').write('')
    print('built', ver, [p[0] for p in PAGES])


if __name__ == '__main__':
    build()
