# Portfolio leads Telegram API
Этот API пересылает сообщения с портфолио в личный Telegram владельца. Никаких токенов в GitHub или HTML.

## Render
- Node.js runtime, repository `https://github.com/aderpil21-source/portfolio`, branch `main`.
- Build command: `npm install --omit=dev`
- Start command: `npm start`
- Environment:
  - `TELEGRAM_BOT_TOKEN` — значение, которое выдаст @BotFather (секрет, никогда не коммитить).
  - `TELEGRAM_CHAT_ID` — числовой Telegram Chat ID владельца; предварительно отправить новому боту /start.
  - `ALLOWED_ORIGIN` — `https://aderpil21-source.github.io`.
- Endpoint `POST /api/leads`, health `GET /health`.
- После запуска в HTML сайта надо записать API URL в meta `portfolio-leads-api` (полный URL с /api/leads), например `https://your-service.onrender.com/api/leads`.

## Security
- Strict allowed Origin, JSON content type, input lengths, 8 predefined categories (+ custom task), explicit consent, honeypot and per-IP + global in-memory rate limits.
- Data is sent directly to Telegram, with no server-side persistence or request-body logs. Render / Telegram infrastructure may still process message data.
- This is a notification backend, not an autonomous LLM chat. Assistant uses fast prewritten answers; it does not hallucinate prices or deadlines.
- Before accepting real client data publicly, publish privacy information and verify applicable personal-data laws, including cross-border transmission where relevant.
- Render free services may sleep, increasing first-request latency; use a paid always-on tier or existing always-on service if immediate delivery is essential.
