# Развёртывание 1:1 (для друга)

Репозиторий содержит **весь проект целиком**: код, `node_modules`, `dist`, `.venv`, данные JSON.

## Быстрый старт (Mac, как у автора)

```bash
git clone https://github.com/anthonygreendit-ship-it/Artemchik.git
cd Artemchik
npm run dev
```

Открой в браузере адрес из терминала (обычно http://localhost:5173 или 5174).

**`npm install` не нужен** — зависимости уже в папке `node_modules`.

## Что уже внутри

| Папка | Зачем |
|-------|--------|
| `src/` | Код dashboard |
| `src/data/dashboard.json` | Данные из Excel (уже выгружены) |
| `node_modules/` | npm-зависимости |
| `dist/` | Готовая production-сборка |
| `.venv/` | Python для скриптов extract |
| `scripts/` | Обновление данных из Excel |

## Production (без dev-сервера)

```bash
npm run preview
# или открыть dist/index.html через любой static server
```

## Обновить данные из Excel (опционально)

Положи файлы в `~/Downloads/`:
- `Управленка на 29.05.2026.xlsx`
- `выход конфеты заморозка-2.xlsx` (шоколад)

```bash
.venv/bin/python scripts/extract_data.py
.venv/bin/python scripts/extract_chocolate.py
npm run dev
```

Если `.venv` не завелся — пересоздай:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Windows / Linux

`node_modules` и `.venv` из репозитория собраны **под macOS**. На другой ОС надёжнее:

```bash
rm -rf node_modules .venv
npm install
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
npm run dev
```

Данные и код будут те же — только зависимости пересоберутся под систему друга.

## Настройки в браузере

После первого запуска в **Настройках** можно указать:
- URL Google Таблиц
- URL CRM (`https://crm.../deals/{id}`)

Они хранятся в localStorage браузера, не в git.
