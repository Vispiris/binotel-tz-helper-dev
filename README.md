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

Перевірка парсера Feedback:

```powershell
node tests/feedback-parser.test.mjs
node tests/build-integrity.test.mjs
```

## Встановлення

Відкрити [актуальний userscript](https://raw.githubusercontent.com/Vispiris/binotel-tz-helper-dev/main/tampermonkey/binotel-tz-helper-safe-dev.user.js)
і підтвердити встановлення в Tampermonkey.

Після першого встановлення Tampermonkey перевірятиме оновлення за адресами
`@updateURL` і `@downloadURL` у заголовку скрипта.

## Безпека

Репозиторій не повинен містити облікові паролі, SIP-дані, токени або персональні дані клієнтів. Фіксована службова фраза розблокування панелі не є обліковими даними й може зберігатися в DEV-коді.
або експорти реальних ТЗ.
