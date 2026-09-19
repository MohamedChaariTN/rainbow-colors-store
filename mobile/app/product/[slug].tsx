import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, assetUrl, parseJsonArray, Product } from '../../src/api';
import { useAuth } from '../../src/auth';
import { colors, rainbow, radius, shadow } from '../../src/theme';

export default function ProductDetails() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (slug) {
      api.product(slug).then(setProduct).catch((e) => setMessage(e.message)).finally(() => setLoading(false));
    }
  }, [slug]);

  if (loading) return <View style={s.loader}><ActivityIndicator color={colors.blue} /></View>;
  if (!product) return <View style={s.loader}><Text>{message || 'Produit introuvable'}</Text></View>;

  const gallery = parseJsonArray<string>(product.images);
  const features = parseJsonArray<string>(product.features);

  const add = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      await api.addToCart(product.id, 1, token);
      setMessage('Produit ajouté au panier.');
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  const toggle = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const r = await api.toggleWishlist(product.id, token);
      setLiked(r.wishlisted);
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.topRow}>
          <Pressable style={s.backButton} onPress={() => router.back()}>
            <Text style={s.back}>‹  Retour</Text>
          </Pressable>
          <Pressable style={s.heartButton} onPress={toggle}>
            <Text style={s.heart}>{liked ? '♥' : '♡'}</Text>
          </Pressable>
        </View>

        <View style={s.gallery}>
          <Image source={{ uri: assetUrl(gallery[0] || product.image)! }} style={s.heroImage} />
          <View style={s.galleryAccent}>
            {rainbow.map((color) => <View key={color} style={[s.accentDot, { backgroundColor: color }]} />)}
          </View>
          {product.badge ? <View style={s.floatingBadge}><Text style={s.floatingBadgeText}>{product.badge}</Text></View> : null}
        </View>

        <View style={s.info}>
          <Text style={s.kicker}>RAINBOW COLORS</Text>
          <Text style={s.title}>{product.name}</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>{product.price.toFixed(2)} TND</Text>
            {product.oldPrice ? <Text style={s.oldPrice}>{product.oldPrice.toFixed(2)} TND</Text> : null}
          </View>

          <View style={s.stock}>
            <View style={[s.dot, { backgroundColor: product.stock > 0 ? colors.green : colors.red }]} />
            <Text style={s.stockText}>{product.stock > 0 ? String(product.stock) + ' en stock' : 'Rupture de stock'}</Text>
          </View>

          <View style={s.colorNote}>
            <View style={s.colorDots}>{rainbow.slice(0, 4).map((color) => <View key={color} style={[s.colorDot, { backgroundColor: color }]} />)}</View>
            <Text style={s.colorNoteText}>Une gamme pensée pour créer votre ambiance.</Text>
          </View>

          <Text style={s.description}>{product.description}</Text>

          {features.length > 0 ? (
            <>
              <Text style={s.section}>Caractéristiques</Text>
              {features.map((feature, index) => (
                <View key={index} style={s.featureRow}>
                  <Text style={s.featureCheck}>✓</Text>
                  <Text style={s.feature}>{feature}</Text>
                </View>
              ))}
            </>
          ) : null}

          {message ? <Text style={s.message}>{message}</Text> : null}

          <Pressable disabled={product.stock <= 0} onPress={add} style={[s.primary, product.stock <= 0 && { opacity: 0.45 }]}>
            <Text style={s.primaryText}>{product.stock > 0 ? 'Ajouter au panier  →' : 'Indisponible'}</Text>
          </Pressable>

          {!user ? <Text style={s.note}>Connectez-vous pour synchroniser votre panier et vos favoris.</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingBottom: 36 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backButton: { paddingVertical: 7, paddingRight: 10 },
  back: { color: colors.blue, fontWeight: '900', fontSize: 14 },
  heartButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', ...shadow },
  heart: { fontSize: 24, color: colors.red },
  gallery: { height: 340, borderRadius: 26, backgroundColor: '#EEF2F7', overflow: 'hidden', position: 'relative', ...shadow },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  galleryAccent: { position: 'absolute', left: 14, bottom: 13, flexDirection: 'row', gap: 4, paddingHorizontal: 7, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,.88)' },
  accentDot: { width: 8, height: 8, borderRadius: 8 },
  floatingBadge: { position: 'absolute', top: 14, left: 14, backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  floatingBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  info: { paddingTop: 19 },
  kicker: { color: colors.purple, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text, marginTop: 5, lineHeight: 33 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 },
  price: { fontSize: 24, fontWeight: '900', color: colors.blue },
  oldPrice: { fontSize: 13, color: colors.muted, textDecorationLine: 'line-through' },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  dot: { width: 9, height: 9, borderRadius: 9 },
  stockText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  colorNote: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginTop: 16 },
  colorDots: { flexDirection: 'row', gap: 3 },
  colorDot: { width: 13, height: 13, borderRadius: 13 },
  colorNoteText: { flex: 1, color: colors.muted, fontSize: 11, fontWeight: '700' },
  description: { fontSize: 15, color: '#4B5563', lineHeight: 23, marginTop: 16 },
  section: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 22, marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 8 },
  featureCheck: { color: colors.green, fontSize: 14, fontWeight: '900' },
  feature: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  message: { marginTop: 12, color: colors.green, fontWeight: '800' },
  primary: { backgroundColor: colors.blue, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 18, ...shadow },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  note: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 10 },
});
