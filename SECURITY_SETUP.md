# Безопасность портфолио — настройка владельца

Последняя проверка: 2026-10-08.

## Cloudflare Turnstile — подготовлено, требуется активация

Клиентский помощник (`assets/lead-chat.js`) и сервер (`lead-api/server.js` в ветке `portfolio-chat-service`) поддерживают Cloudflare Turnstile. Виджет загружается лениво только после выбора услуги. Сервер проверяет Turnstile через Siteverify, сверяет `hostname` и `action=portfolio_lead`, отклоняет поддельные/истёкшие/повторно использованные токены.

Настройка владельца без передачи секретов в чат или публичный GitHub:

1. В `https://dash.cloudflare.com/?to=/:account/turnstile` нажать **Add widget**. Name: `Kats Portfolio | заявка`; режим **Managed**.
2. В **Hostname management** добавить `aderpil21-source.github.io`. Позже добавить `katsstudio.eu.org` (или сразу, если интерфейс позволяет), пока домен ожидает EU.org. Не добавлять `github.io` как общий домен.
3. Создать виджет и **сохранить Secret key в менеджере паролей**. Не присылать скриншоты с открытым секретом и не помещать его в HTML, GitHub, сообщения Telegram или переписку ChatGPT.
4. Открыть [Render Environment](https://dashboard.render.com/web/srv-db3niad9fdbs73ehn81g/env) и одновременно добавить **две** переменные:
   - `TURNSTILE_SITE_KEY` = публичный Site key Cloudflare.
   - `TURNSTILE_SECRET_KEY` = секретный Secret key Cloudflare.
5. Сохранить обе переменные одним обновлением. Если задан только один ключ, сервер намеренно блокирует новые заявки (защита от тихого обхода).
6. Дождаться deploy Render. Проверить `GET https://denis-kats-portfolio-chat.onrender.com/api/chat/config` из разрешённого origin: `turnstileEnabled=true`, затем **тестовую** заявку из браузера и сообщение в Telegram. Проверить отсутствие кнопки отправки без токена и отбрасывание повторно использованного токена. Не вводить тестовые ключи Cloudflare на production.

До установки обоих ключей код готов, но Turnstile **не активен** и текущая система принятия заявок не меняется. Новое доменное имя ещё не делегировано в EU.org.

## Защита администраторских аккаунтов

Проверку фактического статуса 2FA выполняет владелец в своих аккаунтах. Включать 2FA без сохранения методов восстановления рискованно.

- GitHub: `https://github.com/settings/security` — Password and authentication, TOTP/passkey, recovery codes.
- Render: `https://dashboard.render.com/u/settings` — Account Security, 2FA; проверять фактический путь в интерфейсе.
- Supabase: `https://supabase.com/dashboard/account` — account settings, MFA через TOTP. При активации остальные сессии будут завершены. Supabase не выдаёт recovery codes, рекомендует резервный TOTP-фактор.
- Cloudflare: `https://dash.cloudflare.com/` — My Profile → Authentication → 2FA; резервный метод и резервные коды.
- Mail.ru: Security/Безопасность аккаунта — 2FA; защита почты обязательна, так как она участвует в восстановлении доступов.

Не пересылать QR-коды TOTP, seed, резервные коды и секреты Cloudflare никому. Предпочесть менеджер паролей и второй способ входа.

## Проверки

- `node --check assets/lead-chat.js`
- `node scripts/check-csp.mjs`
- `node --check lead-api/server.js`
- `node --test lead-api/turnstile.test.js`
- `GET /health` должен вернуть `ok=true`, `configured=true`, `webhookReady=true`, `persistenceConfigured=true`, `persistenceReady=true`.

Существующий GitHub Pages и хранилище Supabase остаются независимыми от Cloudflare. Это виджет защиты **формы**, а не перенос DNS и не Cloudflare-проксирование всего сайта.
