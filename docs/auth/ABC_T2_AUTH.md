# Авторизация через портал ABC T2

Продавец входит в личный кабинет под корпоративной учётной записью
ABC T2. Пароль приложению не передаётся: пользователь входит на портал,
портал возвращает приложению подтверждение, приложение заводит сессию.

## Схема

```
браузер                          сервер                         портал ABC T2
   │                               │                                 │
   │ GET /api/auth/abc-t2/login    │                                 │
   │──────────────────────────────►│  создаёт state + PKCE           │
   │ 302 Location: /oauth/authorize│────────────────────────────────►│
   │◄──────────────────────────────│                                 │
   │                                                               │  пользователь
   │                                                               │  подтверждает
   │ 302 Location: /callback?code=…&state=…                         │
   │◄──────────────────────────────────────────────────────────────│
   │                               │                                 │
   │                               │ POST /oauth/token (code+PKCE)  │
   │                               │────────────────────────────────►│
   │                               │◄────────────────────────────────│ access_token
   │                               │                                 │
   │                               │ GET /api/v1/me (Bearer)         │
   │                               │────────────────────────────────►│
   │                               │◄────────────────────────────────│ профиль
   │                               │                                 │
   │                               │ создаёт сессию, подписывает      │
   │ Set-Cookie: t2_session=…       │ cookie HMAC-SHA256              │
   │◄──────────────────────────────│                                 │
```

## Что где лежит

| Слой            | Файл                                   | Ответственность                            |
| --------------- | -------------------------------------- | ------------------------------------------ |
| `packages/core` | `src/domain/auth.ts`                   | модель пользователя, роли, помощники ролей |
| `packages/core` | `src/auth/AbcT2Client.ts`              | OAuth 2.0 + PKCE, обмен кода, профиль      |
| `packages/core` | `src/auth/AuthService.ts`              | попытки входа, callback, сессия            |
| `packages/core` | `src/auth/SessionStore.ts`             | контракт хранилища сессий                  |
| `apps/api`      | `src/modules/auth/router.ts`           | эндпоинты `/api/auth/*`                    |
| `apps/api`      | `src/modules/auth/cookie.ts`           | подпись и проверка cookie                  |
| `apps/api`      | `src/modules/auth/context.ts`          | `req.user` из сессии                       |
| `apps/api`      | `src/modules/auth/guards.ts`           | проверка ролей                             |
| `apps/api`      | `src/modules/auth/roles.ts`            | назначение ролей по корпоративному логину  |
| `apps/api`      | `src/modules/auth/FileSessionStore.ts` | сессии на диске, шифрование                |
| `apps/web`      | `src/features/auth/`                   | экран входа, гард, контекст сессии         |

## Безопасность

- **Пароль не покидает портал.** Приложение работает по OAuth 2.0
  (Authorization Code + PKCE) и никогда не получает пароль.
- **Клиентский секрет и токены — только на сервере.** Браузер получает
  одну подписанную cookie `t2_session` с идентификатором сессии.
- **Cookie подписана HMAC-SHA256** (`v1.<sessionId>.<signature>`).
  Подделать её нельзя: проверка сравнивает подписи за постоянное время.
- **Cookie — `httpOnly`, `sameSite=lax`, `secure` в production.**
  JavaScript её не видит, поэтому XSS её не украдёт.
- **Токены провайдера шифруются на диске** (AES-256-GCM, ключ из
  `AUTH_COOKIE_SECRET`).
- **Роль приходит из сессии.** Клиент не может объявить себя
  администратором: роль назначает сервер, а проверяет — тоже сервер.
- **Проверка `state`** защищает от подделки callback; **PKCE** — от
  перехвата кода.

## Роли

| Роль      | Что может                                                |
| --------- | -------------------------------------------------------- |
| `seller`  | личный кабинет, свои данные, прохождение тестов          |
| `curator` | `seller` + создание, публикация и статистика тестов      |
| `manager` | `seller` + просмотр показателей команды                  |
| `admin`   | все роли + ручное обновление данных, раздел «Управление» |

Роль выдаёт портал ABC T2. Дополнительно роль можно назначить по
корпоративному логину через окружение — это нужно, пока доступ к порталу
ещё не выдан:

```env
AUTH_ADMIN_LOGINS=i.petrova,team.lead@t2.ru
AUTH_CURATOR_LOGINS=curator.one
```

Правило: роль порнала **не отнимается**, окружение может только добавить.

## Сессия живёт дольше браузера

`FileSessionStore` хранит сессии в `.data/sessions.json` (шифрованном).
Продавец входит один раз и не входит заново:

- после закрытия браузера;
- после перезагрузки страницы;
- **после перезапуска API**.

Если секрет сменился и файл больше не расшифровывается, сервис не
падает: файл откладывается в сторону, сессии начинаются заново, в лог
пишется предупреждение.

## Что нужно от ABC T2

### Провайдер найден

Корпоративный вход — это **T2 ID** на `auth.t2.ru` (IdentityServer).
Его конфигурация опубликована и доступна без входа:

```
https://auth.t2.ru/.well-known/openid-configuration
```

| Что                    | Значение                                                       |
| ---------------------- | -------------------------------------------------------------- |
| issuer                 | `https://auth.t2.ru`                                           |
| authorization_endpoint | `https://auth.t2.ru/connect/authorize`                         |
| token_endpoint         | `https://auth.t2.ru/connect/token`                             |
| userinfo_endpoint      | `https://auth.t2.ru/connect/userinfo`                          |
| end_session_endpoint   | `https://auth.t2.ru/connect/endsession`                        |
| jwks_uri               | `https://auth.t2.ru/.well-known/openid-configuration/jwks`     |
| code_challenge_methods | `plain`, `S256`                                                |
| grant_types            | `authorization_code`, `refresh_token`, `client_credentials`, … |
| token auth methods     | `client_secret_basic`, `client_secret_post`                    |

Портал ABC T2 сам ходит в этот провайдер так:

```
https://abc.t2.ru/custom_web_template.html?object_code=tele2_auth_token_test&action=login
  → https://auth.t2.ru/connect/authorize
      ?client_id=abc
      &redirect_uri=https://abc.t2.ru/signin-oidc
      &response_type=code
      &scope=profile openid offline_access abc
      &code_challenge=…&code_challenge_method=S256
      &response_mode=query
```

Схема совпадает с реализованной — Authorization Code + PKCE (S256).
Отличается только клиент: у портала он свой (`abc`), нам нужен свой.

### Что нужно получить

Наш клиент в `auth.t2.ru` — с ним придут **client ID**, **client secret**
и разрешённый **redirect URI**:

```env
ABC_T2_AUTHORIZATION_URL=https://auth.t2.ru/connect/authorize
ABC_T2_TOKEN_URL=https://auth.t2.ru/connect/token
ABC_T2_USER_INFO_URL=https://auth.t2.ru/connect/userinfo
ABC_T2_CLIENT_ID=...
ABC_T2_CLIENT_SECRET=...
ABC_T2_REDIRECT_URI=https://<ваш домен>/api/auth/abc-t2/callback
ABC_T2_SCOPES=openid profile offline_access abc
```

### Уровни доступа провайдера

Доступность определяется scope'ами:

| Scope                                           | Что открывает                                 |
| ----------------------------------------------- | --------------------------------------------- |
| `openid`                                        | идентификация                                 |
| `profile`                                       | базовые данные пользователя                   |
| `offline_access`                                | refresh-токен — сессия продлевается без входа |
| `abc`                                           | данные ABC T2                                 |
| `wfm`                                           | данные WorkForce Manager                      |
| `appseller`                                     | приложения продавца                           |
| `ft`, `prmt`, `crmcc`, `ares`, `crm_cc_service` | другие системы T2                             |

### Claims профиля

Провайдер объявляет: `sub`, `name`, `given_name`, `family_name`,
`preferred_username`, `email`, `role`, `PersonID`, `OfficesIDs`,
`MainOfficeID`, `permissions`, `picture`, `locale`, `zoneinfo`,
`userId`, `sysId`, `partnerId`, `contactCenter`, `RM.DealerIds`,
`ActiveOfficesIDs`, `PIDs`, `DIDs`, `PersonalDataId`, `clientType`.

Нормализатор (`normalizeAbcT2User`) берёт `sub`/`PersonID` как
идентификатор, `name` как имя, `preferred_username` как логин,
`role` как роль, `MainOfficeID`/`OfficesIDs` как офис.

### Ограничение портала

На странице входа ABC T2 есть предупреждение: **«Недоступно для
продавцов салонов t2 и сотрудников T2»** — вход через T2 ID доступен не
всем. Учётные записи продавцов салонов работают через обычную форму
входа. Это нужно учесть при выдаче доступов: часть сотрудников
пойдёт в кабинет по логину-паролю, а не по T2 ID.

### Что делает портал с паролем

Форма входа ABC T2 — это обычный POST на
`/custom_web_template.html?object_code=tele2p_post_auth` с полями
`set_auth=1`, `user_login`, `user_password`. То есть **это не OAuth**:
пароль уходит на сам портал, а не в провайдер. Наш сценарий
(Authorization Code + PKCE против `auth.t2.ru`) к нему не относится и
остаётся корректным.

## Проверка

Скрипты проверяют поток целиком, без настоящего портала:

```bash
# фейковый портал ABC T2
node scripts/fake-abc-t2-portal.mjs 4010

# API с авторизацией
cd apps/api && AUTH_REQUIRED=true \
  ABC_T2_AUTHORIZATION_URL=http://localhost:4010/oauth/authorize \
  ABC_T2_TOKEN_URL=http://localhost:4010/oauth/token \
  ABC_T2_USER_INFO_URL=http://localhost:4010/api/v1/me \
  ABC_T2_CLIENT_ID=demo ABC_T2_CLIENT_SECRET=demo \
  ABC_T2_REDIRECT_URI=http://localhost:3005/api/auth/abc-t2/callback \
  AUTH_COOKIE_SECRET=e2e-cookie-secret-0123456789abcdef \
  PORT=3005 ./node_modules/.bin/tsx src/main.ts

# полный цикл входа
node scripts/t2-auth-flow-check.mjs 3005 4010

# сессия переживает перезапуск API
node scripts/t2-auth-restart-check.mjs signin 3005 4010
# … перезапустить API …
node scripts/t2-auth-restart-check.mjs verify 3005 4010
```

Проверка в браузере: `node scripts/t2-auth-browser-check.mjs <cdpPort> <url>`.

## Запасной способ: вход по ПИН

Если клиент в `auth.t2.ru` не выдадут, вход всё равно остаётся
закрытым для посторонних: человек называет своё имя из справочника
сотрудников и вводит персональный ПИН, выданный администратором.

Сессия — та же самая (подписанная cookie, шифрованное хранилище), так
что повторно входить не нужно. Способы включаются независимо:

```env
AUTH_METHODS=abc-t2,pin
```

Подробно — `docs/auth/PIN_AUTH.md`.
