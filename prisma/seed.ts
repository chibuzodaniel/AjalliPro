import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.incentiveTier.count();
  if (existing === 0) {
    await prisma.incentiveTier.createMany({
      data: [
        { min: 1, max: 49, bonus: 0 },
        { min: 50, max: 99, bonus: 1 },
        { min: 100, max: 199, bonus: 2 },
        { min: 200, max: 499, bonus: 3 },
        { min: 500, max: 999999, bonus: 5 },
      ],
    });
    console.log("Seeded default incentive tiers.");
  } else {
    console.log("Incentive tiers already present, skipping seed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
