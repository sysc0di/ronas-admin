import "dotenv/config";

import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma/client";
import { Role } from "../lib/generated/prisma/enums";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set. Add it to your .env file.`);
  }

  return value;
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = requireEnv("ADMIN_PASSWORD");
const DATABASE_URL = requireEnv("DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

/**
 * Demo catalog pricing, keyed by subcategory slug. Values are used only to
 * fill products that do not have that currency's price yet, so the admin stays
 * in control. USD values are derived from the TRY value for convenience.
 */
const DEMO_PRICING: Record<
  string,
  { priceTry: number; discountPercent?: number }
> = {
  "intake-manifolds": { priceTry: 18500, discountPercent: 15 },
  "cold-air-intakes": { priceTry: 12500 },
  "carbon-airboxes": { priceTry: 24000, discountPercent: 10 },
  "air-intake-piping": { priceTry: 9500 },
  "exhaust-manifolds": { priceTry: 32000, discountPercent: 20 },
  "headlight-intakes": { priceTry: 14000 },
  "brake-cooling-ducts": { priceTry: 7800 },
  "carbon-fiber-steering-wheels": { priceTry: 45000, discountPercent: 12 },
  "racing-seats": { priceTry: 38000 },
  "shift-knobs": { priceTry: 2400, discountPercent: 25 },
  "carbon-fiber-interior-trims": { priceTry: 16500 },
  "carbon-fiber-hoods": { priceTry: 42000, discountPercent: 18 },
  "trunks-tailgates": { priceTry: 35000 },
  "lightweight-doors": { priceTry: 52000, discountPercent: 15 },
  "spoilers-wings": { priceTry: 27500 },
};

/* Rough exchange rate used only to give the demo data realistic USD values. */
const TRY_PER_USD = 40;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function seedDemoPricing() {
  const products = await prisma.product.findMany({
    where: { OR: [{ priceTry: null }, { priceUsd: null }] },
    select: { id: true, category: true, priceTry: true, priceUsd: true },
  });

  let updated = 0;

  for (const product of products) {
    const demo = DEMO_PRICING[product.category];

    if (!demo) continue;

    const percent = demo.discountPercent ?? 0;
    const data: {
      priceTry?: number;
      discountedPriceTry?: number;
      discountPercentTry?: number;
      priceUsd?: number;
      discountedPriceUsd?: number;
      discountPercentUsd?: number;
    } = {};

    if (product.priceTry === null) {
      data.priceTry = demo.priceTry;

      if (percent > 0) {
        data.discountedPriceTry = round2(
          demo.priceTry * (1 - percent / 100),
        );
        data.discountPercentTry = percent;
      }
    }

    if (product.priceUsd === null) {
      const priceUsd = round2(demo.priceTry / TRY_PER_USD);
      data.priceUsd = priceUsd;

      if (percent > 0) {
        data.discountedPriceUsd = round2(
          priceUsd * (1 - percent / 100),
        );
        data.discountPercentUsd = percent;
      }
    }

    if (Object.keys(data).length === 0) continue;

    await prisma.product.update({ where: { id: product.id }, data });

    updated += 1;
  }

  console.log(`Seeded demo pricing on ${updated} product(s).`);
}

async function main() {
  const passwordHash = await argon2.hash(ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: { passwordHash, role: Role.ADMIN },
    create: { username: ADMIN_USERNAME, passwordHash, role: Role.ADMIN },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  console.log("Seeded admin user:", admin);

  /*
   * Products are authored in the admin panel and their text lives in
   * "product_translations" (one row per language). The seed only prepares the
   * admin account and fills demo prices for products that have none yet.
   */
  await seedDemoPricing();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
