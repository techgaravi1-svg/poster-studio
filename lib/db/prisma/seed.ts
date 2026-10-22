import { prisma } from '../src/index';

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

  // 2. Seed Default Addresses
  const addresses = [
    {
      name: 'Kaushik Vansh',
      phone: '9265964547',
      pincode: '362560',
      city: 'Una',
      state: 'Gujarat',
      locality: 'Opp bus station, Una',
      flat: 'Natraj hospital',
      landmark: 'Opp bus station',
      type: 'OFFICE' as const,
      isDefault: true,
    },
    {
      name: 'Kaushik Vansh',
      phone: '9265964547',
      pincode: '362560',
      city: 'Gir Somnath',
      state: 'Gujarat',
      locality: 'Dudhala Road, Rohisa',
      flat: 'Kaushik Vansh, Near Mahakali Temple',
      landmark: 'Near Mahakali Temple',
      type: 'HOME' as const,
      isDefault: false,
    },
    {
      name: 'Ayush',
      phone: '9099702068',
      pincode: '380060',
      city: 'Ahmedabad',
      state: 'Gujarat',
      locality: 'Nr shraddha nursery, Opp satyam mandapam',
      flat: 'Success Cricket academy',
      landmark: 'Opp satyam mandapam',
      type: 'OTHER' as const,
      isDefault: false,
    },
    {
      name: 'Rajeshree Vansh',
      phone: '6351082318',
      pincode: '360006',
      city: 'Rajkot',
      state: 'Gujarat',
      locality: 'Gayatridham Society, Jamnagar - Rajkot Highway',
      flat: 'Aashirvad felt 201',
      landmark: 'Jamnagar - Rajkot Highway',
      type: 'HOME' as const,
      isDefault: false,
    },
  ];

  for (const addr of addresses) {
    const existing = await prisma.address.findFirst({
      where: { phone: addr.phone, flat: addr.flat },
    });
    if (!existing) {
      await prisma.address.create({ data: addr });
    }
  }
  console.log(`✅ Seeded ${addresses.length} addresses`);

  // 3. Seed Products
  const products = [
    {
      slug: 'asta-black-clover-anime-poster',
      title: 'ASTA POSTER | BLACK CLOVER ANIME POSTER',
      description: 'Fierce, vibrant yellow background Asta artwork from Black Clover, printed on 350 GSM premium archival matte paper.',
      category: 'anime',
      price: 79.0,
      compareAtPrice: 159.0,
      images: ['/assets/posters/poster-01.jpg'],
      isBestSeller: true,
      tags: ['anime', 'black clover', 'asta', 'action'],
    },
    {
      slug: 'batman-dark-knight-dc-poster',
      title: 'THE DARK KNIGHT | BATMAN DC POSTER',
      description: 'The brooding protector of Gotham in stark contrast noir aesthetic.',
      category: 'marvel-dc',
      price: 79.0,
      compareAtPrice: 159.0,
      images: ['/assets/posters/poster-02.jpg'],
      isBestSeller: true,
      tags: ['dc', 'batman', 'dark knight', 'gotham'],
    },
    {
      slug: 'spider-man-across-spider-verse',
      title: 'MILES MORALES | SPIDER-MAN ACROSS SPIDER-VERSE',
      description: 'Vibrant neon dimensional leap of Miles Morales over Neo-Manhattan.',
      category: 'marvel-dc',
      price: 79.0,
      compareAtPrice: 159.0,
      images: ['/assets/posters/poster-03.jpg'],
      isBestSeller: true,
      tags: ['marvel', 'spider-man', 'miles morales'],
    },
    {
      slug: 'mount-fuji-cherry-blossoms-landscape',
      title: 'MOUNT FUJI & SAKURA | JAPANESE LANDSCAPE POSTER',
      description: 'Serene sunrise over Mount Fuji framed by blooming cherry blossoms in misty spring.',
      category: 'landscapes',
      price: 79.0,
      compareAtPrice: 159.0,
      images: ['/assets/posters/poster-04.jpg'],
      isBestSeller: false,
      tags: ['landscapes', 'japan', 'fuji', 'nature'],
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: prod,
      create: prod,
    });
  }
  console.log(`✅ Seeded ${products.length} products`);

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
