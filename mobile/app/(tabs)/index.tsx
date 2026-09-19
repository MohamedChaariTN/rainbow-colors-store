import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, assetUrl, Category, Product } from '../../src/api';
import { colors, radius, rainbow, shadow } from '../../src/theme';

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.products({ limit: 8 }), api.categories()])
      .then(([p, c]) => {
        setProducts(p.products);
        setCategories(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.brandRow}>
          <View>
            <Text style={s.eyebrow}>RAINBOW COLORS</Text>
            <Text style={s.welcome}>Votre univers couleur.</Text>
          </View>
          <View style={s.brandDots}>
            {rainbow.map((color) => <View key={color} style={[s.brandDot, { backgroundColor: color }]} />)}
          </View>
        </View>

        <View style={s.hero}>
          <View style={s.blobPink} />
          <View style={s.blobBlue} />
          <View style={s.heroCopy}>
            <View style={s.badge}><Text style={s.badgeText}>PEINTURES • REVÊTEMENTS • CONSEIL</Text></View>
            <Text style={s.title}>Des couleurs pour{'\n'}tous vos projets.</Text>
            <Text style={s.subtitle}>Une sélection professionnelle pensée pour donner du caractère à vos espaces.</Text>
            <Pressable style={s.primary} onPress={() => router.push('/products')}>
              <Text style={s.primaryText}>Explorer la collection  →</Text>
            </Pressable>
          </View>
          <View style={s.colorUniverse}>
            {rainbow.map((color, index) => (
              <View key={color} style={[s.universeDot, {
                backgroundColor: color,
                top: [16, 52, 104, 151, 92][index],
                right: [14, 0, 8, 40, 70][index],
              }]} />
            ))}
            <View style={s.universeCore}>
              <Text style={s.coreText}>COLOR</Text>
              <Text style={s.coreText}>YOUR</Text>
              <Text style={[s.coreText, { color: colors.yellow }]}>WORLD</Text>
            </View>
          </View>
        </View>

        <View style={s.trustRow}>
          <View style={s.trustItem}>
            <Text style={s.trustIcon}>✦</Text>
            <View><Text style={s.trustTitle}>Qualité pro</Text><Text style={s.trustText}>Sélection Rainbow</Text></View>
          </View>
          <View style={s.trustDivider} />
          <View style={s.trustItem}>
            <Text style={s.trustIcon}>↗</Text>
            <View><Text style={s.trustTitle}>Livraison</Text><Text style={s.trustText}>Partout en Tunisie</Text></View>
          </View>
        </View>

        <View style={s.sectionHead}>
          <View><Text style={s.kicker}>CHOISISSEZ VOTRE UNIVERS</Text><Text style={s.sectionTitle}>Catégories</Text></View>
          <Pressable onPress={() => router.push('/products')}><Text style={s.link}>Voir tout  ›</Text></Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowGap}>
          {categories.map((category, index) => (
            <Pressable
              key={category.id}
              style={[s.categoryCard, { borderTopColor: rainbow[index % rainbow.length] }]}
              onPress={() => router.push({ pathname: '/products', params: { category: category.slug } })}
            >
              <View style={s.categoryIconWrap}><Text style={s.categoryIcon}>{category.icon || '🎨'}</Text></View>
              <Text style={s.categoryName} numberOfLines={1}>{category.name}</Text>
              <Text style={s.categoryArrow}>Explorer  →</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[s.sectionHead, { marginTop: 28 }]}>
          <View><Text style={s.kicker}>SÉLECTION RAINBOW</Text><Text style={s.sectionTitle}>Produits vedettes</Text></View>
          <Pressable onPress={() => router.push('/products')}><Text style={s.link}>Tout voir  ›</Text></Pressable>
        </View>

        {loading ? (
          <View style={s.loadingBox}><ActivityIndicator color={colors.blue} /><Text style={s.loadingText}>Préparation de votre sélection…</Text></View>
        ) : error ? <Text style={s.error}>{error}</Text> : (
          <FlatList
            horizontal
            data={products}
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.rowGap}
            renderItem={({ item, index }) => (
              <Pressable style={s.productCard} onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: item.slug } })}>
                <View style={s.productImageWrap}>
                  {item.image ? <Image source={{ uri: assetUrl(item.image)! }} style={s.productImage} /> : <View style={[s.productImage, s.placeholder]} />}
                  <View style={[s.productAccent, { backgroundColor: rainbow[index % rainbow.length] }]} />
                  {item.badge ? <View style={s.productBadge}><Text style={s.productBadgeText}>{item.badge}</Text></View> : null}
                  {item.oldPrice ? <View style={s.saleBadge}><Text style={s.saleBadgeText}>OFFRE</Text></View> : null}
                </View>
                <View style={s.productInfo}>
                  <Text style={s.productName} numberOfLines={2}>{item.name}</Text>
                  <View style={s.priceRow}>
                    <Text style={s.price}>{item.price.toFixed(2)} TND</Text>
                    {item.oldPrice ? <Text style={s.oldPrice}>{item.oldPrice.toFixed(2)} TND</Text> : null}
                  </View>
                  <View style={s.productBottom}><Text style={s.productHint}>Voir le produit</Text><Text style={s.productArrow}>↗</Text></View>
                </View>
              </Pressable>
            )}
          />
        )}

        <View style={s.paletteBanner}>
          <View style={s.paletteHeader}>
            <View><Text style={s.paletteKicker}>INSPIREZ-VOUS</Text><Text style={s.paletteTitle}>Une palette. Mille ambiances.</Text></View>
            <Text style={s.paletteSpark}>✦</Text>
          </View>
          <Text style={s.paletteText}>Découvrez les nuances qui donnent du relief aux murs, façades et espaces de vie.</Text>
          <View style={s.paletteStrip}>{rainbow.map((color, index) => <View key={color} style={[s.paletteBar, { backgroundColor: color, flex: index + 1 }]} />)}</View>
          <Pressable style={s.paletteButton} onPress={() => router.push('/products')}><Text style={s.paletteButtonText}>Voir toute la collection</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingBottom: 34 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  eyebrow: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  welcome: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  brandDots: { flexDirection: 'row', gap: 4 },
  brandDot: { width: 8, height: 8, borderRadius: 8 },
  hero: { minHeight: 365, backgroundColor: colors.navy, borderRadius: radius.xl, padding: 22, overflow: 'hidden', position: 'relative', ...shadow },
  blobPink: { position: 'absolute', width: 190, height: 190, borderRadius: 190, right: -65, top: -48, backgroundColor: 'rgba(255,59,107,.18)' },
  blobBlue: { position: 'absolute', width: 175, height: 175, borderRadius: 175, right: -78, bottom: -58, backgroundColor: 'rgba(0,194,255,.15)' },
  heroCopy: { width: '74%', zIndex: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.12)' },
  badgeText: { color: '#DDE7FF', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.7 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 35, marginTop: 16 },
  subtitle: { color: '#C8D4EA', fontSize: 13.5, lineHeight: 21, marginTop: 12 },
  primary: { alignSelf: 'flex-start', backgroundColor: colors.yellow, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
  primaryText: { color: colors.navy, fontWeight: '900', fontSize: 13 },
  colorUniverse: { position: 'absolute', right: -8, bottom: 2, width: 165, height: 225 },
  universeDot: { position: 'absolute', width: 26, height: 26, borderRadius: 26 },
  universeCore: { position: 'absolute', right: 25, top: 72, width: 92, height: 92, borderRadius: 92, backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  coreText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  trustRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 18, padding: 13, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  trustItem: { flex: 1, flexDirection: 'row', gap: 9, alignItems: 'center' },
  trustDivider: { width: 1, height: 35, backgroundColor: colors.border, marginHorizontal: 8 },
  trustIcon: { fontSize: 18, color: colors.blue },
  trustTitle: { color: colors.text, fontWeight: '900', fontSize: 12 },
  trustText: { color: colors.muted, fontSize: 10, marginTop: 2 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28, marginBottom: 12 },
  kicker: { color: colors.purple, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 3 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  link: { color: colors.blue, fontWeight: '900', fontSize: 12 },
  rowGap: { gap: 12, paddingBottom: 4 },
  categoryCard: { width: 155, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderTopWidth: 3, borderRadius: 18, padding: 13 },
  categoryIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3FF' },
  categoryIcon: { fontSize: 24 },
  categoryName: { fontSize: 13, fontWeight: '900', color: colors.text, marginTop: 11 },
  categoryArrow: { fontSize: 10, fontWeight: '800', color: colors.muted, marginTop: 6 },
  productCard: { width: 220, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow },
  productImageWrap: { height: 168, backgroundColor: '#F2F5FA', position: 'relative' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: { backgroundColor: '#E9EEF6' },
  productAccent: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
  productBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  productBadgeText: { color: colors.text, fontSize: 9, fontWeight: '900' },
  saleBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  saleBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  productInfo: { padding: 13 },
  productName: { fontSize: 14, fontWeight: '900', color: colors.text, lineHeight: 19 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 8 },
  price: { fontSize: 16, fontWeight: '900', color: colors.blue },
  oldPrice: { fontSize: 11, color: colors.muted, textDecorationLine: 'line-through' },
  productBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  productHint: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  productArrow: { color: colors.blue, fontSize: 18, fontWeight: '900' },
  loadingBox: { alignItems: 'center', paddingVertical: 26 },
  loadingText: { color: colors.muted, fontSize: 11, marginTop: 8 },
  error: { color: colors.red, fontWeight: '800' },
  paletteBanner: { marginTop: 28, backgroundColor: colors.navy, borderRadius: 24, padding: 18, overflow: 'hidden' },
  paletteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  paletteKicker: { color: colors.yellow, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  paletteTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4, maxWidth: 260 },
  paletteSpark: { color: colors.yellow, fontSize: 24 },
  paletteText: { color: '#CAD5E8', fontSize: 12, lineHeight: 19, marginTop: 10 },
  paletteStrip: { flexDirection: 'row', gap: 3, height: 9, marginTop: 17 },
  paletteBar: { borderRadius: 9 },
  paletteButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,.18)', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, marginTop: 16 },
  paletteButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});
