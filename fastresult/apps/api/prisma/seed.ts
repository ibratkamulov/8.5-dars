import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("FastResult123", 12);

  const club = await prisma.fitnessClub.upsert({
    where: { id: "demo-club" },
    update: {},
    create: {
      id: "demo-club",
      name: "FastResult Premium Gym",
      description: "Flagship smart fitness club with trainers, analytics, and AI recommendations.",
      address: "Tashkent City, Amir Temur Avenue",
      latitude: 41.3111,
      longitude: 69.2797,
      phone: "+998 90 000 00 00",
      rating: 4.9
    }
  });

  await prisma.membershipPlan.createMany({
    data: [
      { clubId: club.id, name: "Daily Pass", period: "DAILY", price: 12, benefits: ["QR access", "Locker"] },
      { clubId: club.id, name: "Monthly Pro", period: "MONTHLY", price: 89, benefits: ["Trainer check-in", "AI reports", "Nutrition plan"] },
      { clubId: club.id, name: "Yearly Elite", period: "YEARLY", price: 799, benefits: ["Priority classes", "Body analytics", "Telegram coach"] }
    ],
    skipDuplicates: true
  });

  for (const [email, fullName, role] of [
    ["admin@fastresult.uz", "FastResult Admin", Role.SUPER_ADMIN],
    ["owner@fastresult.uz", "Premium Gym Owner", Role.GYM_OWNER],
    ["trainer@fastresult.uz", "Aziz Trainer", Role.TRAINER],
    ["member@fastresult.uz", "Dilshod Member", Role.MEMBER]
  ] as const) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, fullName, role, clubId: role === Role.SUPER_ADMIN ? null : club.id, passwordHash }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
