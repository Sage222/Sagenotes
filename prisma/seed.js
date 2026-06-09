import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();
const username = process.env.DEFAULT_ADMIN_USERNAME || 'sage';
const password = process.env.DEFAULT_ADMIN_PASSWORD || 'change-me-now';

async function run() {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing) {
    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({ data: { username, passwordHash } });
    await prisma.note.create({
      data: {
        userId: user.id,
        title: 'Welcome to SageNotes',
        content: '# Welcome to SageNotes\n\nThis is your first note. Start writing!\n\n## Tips\n\n- Notes autosave as you type\n- Use the search box to find notes\n- Toggle **Preview** to render Markdown\n- Install as a PWA on Android via Chrome menu → Add to Home Screen'
      }
    });
    console.log(`Created user: ${username}`);
  } else {
    console.log(`User ${username} already exists, skipping seed.`);
  }
}

run().finally(() => prisma.$disconnect());
