import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  // Only seed if no users exist — keeps the app clean on restarts
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("Users already exist — skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 12);

  await prisma.user.create({
    data: {
      email: "admin@tessera.app",
      name: "Admin",
      passwordHash,
      isAdmin: true,
      mustChangePassword: false,
    },
  });

  console.log("Seed completed.");
  console.log("  admin / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
