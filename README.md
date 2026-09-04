# Binotel TZ Helper DEV

Тестовий Tampermonkey-помічник для читання технічного завдання, побудови плану та
виконання перевірених операцій у панелі Binotel.

Це лише DEV-версія для розробки й тестування. Вона не призначена для інженерів або
роботи з виробничими компаніями.

## Структура розробки

Вихідний код розділений за функціональними модулями в `src/`. Файл для
Tampermonkey автоматично збирається командою:

```powershell
node tools/build-userscript.mjs
```

`tampermonkey/binotel-tz-helper-safe-dev.user.js` є готовою збіркою. Його не
потрібно редагувати вручну.

## Локальний Python-парсер

Python читає знімок відкритого листа, перевіряє зв’язки між блоками й повертає
структуровані дані у той самий конструктор Tampermonkey. Перед читанням ТЗ запусти:

```powershell
.\start-python-parser.ps1
```

Сервіс працює лише локально на `127.0.0.1:8765`. Tampermonkey не переходить до
старого парсера непомітно: якщо сервіс не запущено, інженер отримає явну помилку.

Перевірка парсера Feedback:

```powershell
node tests/feedback-parser.test.mjs
node tests/build-integrity.test.mjs
python -m unittest tests/test_python_parser.py
```

## Встановлення

Відкрити [актуальний userscript](https://raw.githubusercontent.com/Vispiris/binotel-tz-helper-dev/main/tampermonkey/binotel-tz-helper-safe-dev.user.js)
і підтвердити встановлення в Tampermonkey.

Після першого встановлення Tampermonkey перевірятиме оновлення за адресами
`@updateURL` і `@downloadURL` у заголовку скрипта.

## Безпека

Репозиторій не повинен містити облікові паролі, SIP-дані, токени або персональні дані клієнтів. Фіксована службова фраза розблокування панелі не є обліковими даними й може зберігатися в DEV-коді.
або експорти реальних ТЗ.
