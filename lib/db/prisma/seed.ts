import { prisma } from '../src/index';
import { products as catalogProducts } from '../../../artifacts/poster-studio/src/lib/catalog';

async function main() {
  console.log('🌱 Starting database seed into Prisma PostgreSQL...');

  // 1. Seed Coupons
  const coupons = [
    {
      code: 'STUDIO10',
      description: 'Extra 10% OFF on All Posters',
      discountType: 'percentage',
      discountValue: 10,
      minSpend: 0,
      minQty: 1,
      isActive: true,
    },
    {
      code: 'FIRST10',
      description: 'Welcome 10% Discount for New Art Lovers',
      discountType: 'percentage',
      discountValue: 10,
      minSpend: 0,
      minQty: 1,
      isActive: true,
    },
    {
      code: 'DUNGEONS3',
      description: 'Buy 2 Get 1 FREE (Special Offer)',
      discountType: 'percentage',
      discountValue: 33.33,
      minSpend: 200,
      minQty: 3,
      isActive: true,
    },
    {
      code: 'POSTER5',
      description: 'Buy 3 Get 2 FREE (Mega Bundle)',
      discountType: 'percentage',
      discountValue: 40,
      minSpend: 350,
      minQty: 5,
      isActive: true,
    },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
  }
  console.log(`✅ Seeded ${coupons.length} coupons`);

  // 2. Addresses - left blank for actual customer self-registration

  // 3. Seed All Catalog Products (30 Products)
  console.log(`📦 Seeding ${catalogProducts.length} full catalog posters...`);
  for (const prod of catalogProducts) {
    const category = prod.collection || prod.category.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-');
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        title: prod.title,
        description: prod.description,
        category,
        orientation: prod.orientation || 'portrait',
        price: prod.price,
        compareAtPrice: prod.compareAtPrice,
        images: prod.images,
        tags: prod.tags || [],
        isBestSeller: Boolean(prod.bestseller),
        isNewRelease: Boolean(prod.newArrival),
        stock: prod.stock || 50,
        isActive: true,
      },
      create: {
        title: prod.title,
        slug: prod.slug,
        description: prod.description,
        category,
        orientation: prod.orientation || 'portrait',
        price: prod.price,
        compareAtPrice: prod.compareAtPrice,
        images: prod.images,
        tags: prod.tags || [],
        isBestSeller: Boolean(prod.bestseller),
        isNewRelease: Boolean(prod.newArrival),
        stock: prod.stock || 50,
        isActive: true,
      },
    });
  }
  console.log(`✅ Successfully seeded all ${catalogProducts.length} posters into PostgreSQL!`);

  console.log('🎉 Database seeding completely finished!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
