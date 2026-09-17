import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Hash passwords
  const adminHash = await bcrypt.hash('admin123', 12);
  const clientHash = await bcrypt.hash('client123', 12);

  // Create admin user
  await prisma.user.upsert({
    where: { email: 'admin@rainbow-colors.tn' },
    update: {},
    create: {
      email: 'admin@rainbow-colors.tn',
      password: adminHash,
      firstName: 'Admin',
      lastName: 'Rainbow',
      role: 'ADMIN',
    },
  });

  // Create demo customer
  await prisma.user.upsert({
    where: { email: 'client@demo.tn' },
    update: {},
    create: {
      email: 'client@demo.tn',
      password: clientHash,
      firstName: 'Client',
      lastName: 'Demo',
      phone: '+216 29 253 908',
      address: 'Route de Gabès Km 4,5',
      city: 'Sfax',
      role: 'CUSTOMER',
    },
  });

  // Seed categories
  const categoriesData = [
    { name: 'Peintures Sols', slug: 'peintures-sols', description: 'Peintures pour sols et parkings', icon: '🏭', color: '#7c3aed' },
    { name: 'Peintures Bois', slug: 'peintures-bois', description: 'Laqués et peintures pour bois', icon: '🚪', color: '#f97316' },
    { name: 'Enduits', slug: 'enduits', description: 'Enduits et mortiers', icon: '🧱', color: '#16a34a' },
    { name: 'Enduits Traditionnels', slug: 'enduits-traditionnels', description: 'Enduits traditionnels à la chaux', icon: '🏛️', color: '#d97706' },
    { name: 'Vernis', slug: 'vernis', description: 'Vernis et protections', icon: '✨', color: '#0d9488' },
    { name: 'Traitements Métal', slug: 'traitements-metal', description: 'Anti-rouille et traitements', icon: '🔩', color: '#dc2626' },
    { name: 'Étanchéité', slug: 'etancheite', description: "Produits d'étanchéité", icon: '☔', color: '#06b6d4' },
    { name: 'Enduits de Finition', slug: 'enduits-finition', description: 'Enduits de lissage et garnissage', icon: '🪒', color: '#8b5cf6' },
    { name: 'Colles', slug: 'colles', description: 'Ciments colle et colles à carrelage', icon: '🔧', color: '#eab308' },
    { name: 'Enduits de Façade', slug: 'enduits-facade', description: 'Enduits de façade tyrolienne', icon: '🏠', color: '#f59e0b' },
    { name: 'Peintures Murales', slug: 'peintures-murales', description: 'Peintures acryliques intérieur/extérieur', icon: '🎨', color: '#2563eb' },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // Fetch categories to get IDs
  const cats = await prisma.category.findMany();
  const getCatId = (name: string) => cats.find((c) => c.name === name)?.id ?? 1;

  // Seed products
  const productsData = [
    {
      name: 'Peinture Époxy',
      slug: 'peinture-epoxy',
      description: 'Peinture pour sols, grandes surfaces, usines et parkings. Résine époxy haute résistance avec durcisseur.',
      price: 89.0,
      oldPrice: 120.0,
      stock: 25,
      stockStatus: 'IN_STOCK',
      badge: 'sale',
      image: 'images/mta3 el 9e3a 2.jpg',
      features: JSON.stringify(["Haute résistance à l'usure", 'Résistant aux produits chimiques', 'Fini brillant', 'Intérieur & Extérieur']),
      categoryId: getCatId('Peintures Sols'),
    },
    {
      name: 'Laqué Brillant',
      slug: 'laque-brillant',
      description: 'Peinture onctueuse pour boiseries, portes et meubles. Laqué brillant disponible en blanc ou autres couleurs.',
      price: 35.0,
      oldPrice: 45.0,
      stock: 40,
      stockStatus: 'IN_STOCK',
      badge: 'premium',
      image: 'images/biben lo7.jpg',
      features: JSON.stringify(['Fini brillant', 'Intérieur & Extérieur', 'Application facile', 'Séchage rapide']),
      categoryId: getCatId('Peintures Bois'),
    },
    {
      name: 'Durajir Monocomposant',
      slug: 'durajir-monocomposant',
      description: 'Mortier monocomposant en poudre à base de chaux naturelles. Idéal pour les finitions écologiques.',
      price: 42.0,
      oldPrice: null,
      stock: 60,
      stockStatus: 'IN_STOCK',
      badge: 'eco',
      image: 'images/djur.jpg',
      features: JSON.stringify(['100% Éco-produit', 'À base de chaux naturelles', 'Intérieur & Extérieur', '20kg']),
      categoryId: getCatId('Enduits'),
    },
    {
      name: 'Durajir Arabi',
      slug: 'durajir-arabi',
      description: 'Enduit traditionnel à la chaux. Mortiers de chaux, bâtards de ciment chaux, plâtre chaux.',
      price: 38.0,
      oldPrice: null,
      stock: 45,
      stockStatus: 'IN_STOCK',
      badge: 'eco',
      image: 'images/djur arbi.jpg',
      features: JSON.stringify(['Traditionnel à la chaux', 'Mortiers de chaux', 'Bâtards de ciment chaux', '20kg']),
      categoryId: getCatId('Enduits Traditionnels'),
    },
    {
      name: 'Vernis Marin',
      slug: 'vernis-marin',
      description: 'Vernis marin polyvalent transparent brillant. Protection et décoration du bois pour extérieur.',
      price: 55.0,
      oldPrice: 70.0,
      stock: 30,
      stockStatus: 'IN_STOCK',
      badge: 'premium',
      image: 'images/batou.jpg',
      features: JSON.stringify(['Transparent brillant', 'Résistance UV', 'Extérieur', 'Facile à appliquer']),
      categoryId: getCatId('Vernis'),
    },
    {
      name: 'Anti-Rouille',
      slug: 'anti-rouille',
      description: 'Peinture anti-rouille intérieur & extérieur. Conditionnement de 0.1 à 5kg. Séchage rapide.',
      price: 28.0,
      oldPrice: 35.0,
      stock: 50,
      stockStatus: 'IN_STOCK',
      badge: 'sale',
      image: 'images/proudddd.jpg',
      features: JSON.stringify(['Anti-corrosion', 'Intérieur & Extérieur', 'Séchage 4h', 'Plusieurs conditionnements']),
      categoryId: getCatId('Traitements Métal'),
    },
    {
      name: 'Durajir Étanche',
      slug: 'durajir-etanche',
      description: 'Enduit étanche à base de chaux naturelles. Protection des toitures, terrasses et surfaces horizontales.',
      price: 48.0,
      oldPrice: null,
      stock: 8,
      stockStatus: 'LOW_STOCK',
      badge: 'eco',
      image: 'images/djur 2.jpg',
      features: JSON.stringify(['100% Éco-produit', 'Étanchéité optimale', 'Toitures & Terrasses', '20kg']),
      categoryId: getCatId('Étanchéité'),
    },
    {
      name: 'Durajir Arabi Étanche',
      slug: 'durajir-arabi-etanche',
      description: 'Enduit étanche traditionnel à base de chaux naturelles. Protection élégante pour façades et surfaces.',
      price: 46.0,
      oldPrice: null,
      stock: 35,
      stockStatus: 'IN_STOCK',
      badge: 'eco',
      image: 'images/djur 1.jpg',
      features: JSON.stringify(['Base de chaux naturelle', 'Étanche', 'Façades', '20kg']),
      categoryId: getCatId('Étanchéité'),
    },
    {
      name: 'Spatulina 1',
      slug: 'spatulina-1',
      description: 'Enduit de garnissage et de rebouchage à base de chaux naturelle. Intérieur & extérieur, anti-humidité.',
      price: 32.0,
      oldPrice: null,
      stock: 55,
      stockStatus: 'IN_STOCK',
      badge: 'eco',
      image: 'images/megma 6.jpg',
      features: JSON.stringify(['Garnissage & Rebouchage', 'Anti-humidité', 'Adhérence optimale', '20kg']),
      categoryId: getCatId('Enduits de Finition'),
    },
    {
      name: 'MAG-ECO700 Ciment Colle',
      slug: 'mag-eco700-ciment-colle',
      description: 'Ciment colle prêt à gâcher. Facile à appliquer avec adhérence optimale pour carrelage.',
      price: 25.0,
      oldPrice: null,
      stock: 80,
      stockStatus: 'IN_STOCK',
      badge: 'new',
      image: 'images/megma 5.jpg',
      features: JSON.stringify(['Prêt à gâcher', 'Facile à appliquer', 'Adhérence optimale', '25kg']),
      categoryId: getCatId('Colles'),
    },
    {
      name: 'Tyrolien',
      slug: 'tyrolien',
      description: 'Enduit de façade appliqué à la tyrolienne. Prêt à gâcher, facile à appliquer. Blanc, gris, beige.',
      price: 38.0,
      oldPrice: null,
      stock: 42,
      stockStatus: 'IN_STOCK',
      badge: 'premium',
      image: 'images/megma 4.jpg',
      features: JSON.stringify(['Façade tyrolienne', 'Prêt à gâcher', '3 coloris', '25kg']),
      categoryId: getCatId('Enduits de Façade'),
    },
    {
      name: 'MAG-1000 Ciment Colle',
      slug: 'mag-1000-ciment-colle',
      description: 'Colle à carrelage haute performance. Pour carreaux de parterre et céramique.',
      price: 28.0,
      oldPrice: null,
      stock: 65,
      stockStatus: 'IN_STOCK',
      badge: 'new',
      image: 'images/megma 3.jpg',
      features: JSON.stringify(['Colle à carrelage', 'Haute adhérence', 'Intérieur & Extérieur', '25kg']),
      categoryId: getCatId('Colles'),
    },
    {
      name: 'Spatulina 2',
      slug: 'spatulina-2',
      description: 'Enduit de lissage pour intérieur et extérieur. À base de chaux naturelle, anti-humidité.',
      price: 34.0,
      oldPrice: null,
      stock: 48,
      stockStatus: 'IN_STOCK',
      badge: 'eco',
      image: 'images/megma 2.jpg',
      features: JSON.stringify(['Enduit de lissage', 'Anti-humidité', 'Base chaux naturelle', '20kg']),
      categoryId: getCatId('Enduits de Finition'),
    },
    {
      name: 'Peinture Acrylique Basique',
      slug: 'peinture-acrylique-basique',
      description: 'Peinture acrylique de qualité basique. Solutions de peinture pour chaque coin de votre maison.',
      price: 45.0,
      oldPrice: 55.0,
      stock: 100,
      stockStatus: 'IN_STOCK',
      badge: 'sale',
      image: 'images/produit 6.jpg',
      features: JSON.stringify(['Qualité premium', 'Intérieur & Extérieur', 'Couvrant', "Facile d'entretien"]),
      categoryId: getCatId('Peintures Murales'),
    },
    {
      name: 'Peinture Acrylique Extra',
      slug: 'peinture-acrylique-extra',
      description: 'Peinture acrylique qualité extra. Couleurs vives et durables pour un intérieur moderne.',
      price: 58.0,
      oldPrice: 72.0,
      stock: 75,
      stockStatus: 'IN_STOCK',
      badge: 'premium',
      image: 'images/produit 5.jpg',
      features: JSON.stringify(['Qualité extra', 'Couleurs vives', 'Lavable', 'Intérieur & Extérieur']),
      categoryId: getCatId('Peintures Murales'),
    },
    {
      name: 'Peinture Acrylique Super',
      slug: 'peinture-acrylique-super',
      description: 'Peinture acrylique qualité super. La meilleure finition pour vos murs intérieurs et extérieurs.',
      price: 72.0,
      oldPrice: 90.0,
      stock: 5,
      stockStatus: 'LOW_STOCK',
      badge: 'premium',
      image: 'images/produit 4.jpg',
      features: JSON.stringify(['Qualité super', 'Finition parfaite', 'Haute durabilité', 'Intérieur & Extérieur']),
      categoryId: getCatId('Peintures Murales'),
    },
    {
      name: 'Etanche Eco',
      slug: 'etanche-eco',
      description: "Système d'étanchéité écologique. Protection complète contre l'eau pour toitures et terrasses.",
      price: 65.0,
      oldPrice: null,
      stock: 20,
      stockStatus: 'IN_STOCK',
      badge: 'eco',
      image: 'images/produit 3.jpg',
      features: JSON.stringify(['Étanchéité complète', 'Écologique', 'Toitures & Terrasses', 'Facile à appliquer']),
      categoryId: getCatId('Étanchéité'),
    },
  ];

  for (const p of productsData) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('👤 Admin: admin@rainbow-colors.tn / admin123');
  console.log('👤 Customer: client@demo.tn / client123');
  console.log(`📦 ${productsData.length} products seeded`);
  console.log(`📁 ${categoriesData.length} categories seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
