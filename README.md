# SageNotes

A minimal self-hosted notes app — left sidebar, right editor, dark UI, search, tabs, recycle bin, login.

Uses about 30MB of memory.

## Stack

- **SvelteKit** — frontend + server routes
- **SQLite** (via Prisma) — single-file database, backed to `./data/`
- **Argon2** — password hashing
- **JWT** — session cookies
- **Docker** — single-container deployment

## Quick start

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="file:/data/sagenotes.db"
JWT_SECRET="<at-least-32-random-chars>"
DEFAULT_ADMIN_USERNAME="sage"
DEFAULT_ADMIN_PASSWORD="<your-secure-password>"
ORIGIN="http://YOUR-IP:3000"
```

> Set `ORIGIN` to the URL you'll access from (e.g. `https://notes.yourdomain.com`).

### 2. Build and start

```bash
docker compose up -d --build
```

On first boot, the app will:
1. Run `prisma db push` to create the database schema
2. Run `prisma/seed.js` to create your admin account

### 3. Open

Navigate to `http://YOUR-IP:3000` — sign in with the username and password from `.env`.

## HTTPS / Nginx Proxy Manager

For HTTPS (recommended for PWA install on Android):

1. Add a Proxy Host in NPM pointing to `YOUR-IP:3000`
2. Enable Let's Encrypt SSL
3. Update `ORIGIN` in `.env` to your HTTPS URL and restart:
   ```bash
   docker compose restart
   ```

## PWA (Android)

Once running over HTTPS, open in Chrome on Android and tap **Add to Home Screen**.

## Backup

Your database lives in `./data/sagenotes.db`. Back this up or mount it to a persistent path.

```bash
cp ./data/sagenotes.db ./backups/sagenotes-$(date +%F).db
```

## Development (local without Docker)

```bash
cp .env.example .env
# Edit DATABASE_URL to: file:./prisma/dev.db
npm install
npx prisma db push
node prisma/seed.js
npm run dev
```

## Adding users

Currently single-user via seed. To add more users, connect to the running container:

```bash
docker exec -it sagenotes node -e "
import('@prisma/client').then(async ({PrismaClient}) => {
  const prisma = new PrismaClient();
  const argon2 = (await import('argon2'));
  await prisma.user.create({ data: { username: 'newuser', passwordHash: await argon2.hash('password') } });
  await prisma.\$disconnect();
});
"
```
