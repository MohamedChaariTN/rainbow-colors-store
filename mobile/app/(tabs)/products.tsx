import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, assetUrl, Category, Product } from '../../src/api';
import { colors, radius, rainbow, shadow } from '../../src/theme';

export default function Products() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(params.category || '');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.products({
        search: search.trim() || undefined,
        category: category || undefined,
        limit: 40,
      });
      setProducts(result.products);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [category]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerCopy}>
          <Text style={s.kicker}>COLLECTION RAINBOW</Text>
          <Text style={s.title}>Produits</Text>
          <Text style={s.subtitle}>Trouvez la finition qui donne vie à votre projet.</Text>
        </View>
        <View style={s.headerArt}>
          {rainbow.map((color, index) => (
            <View key={color} style={[s.headerDot, { backgroundColor: color, transform: [{ translateY: index % 2 ? 10 : 0 }] }]} />
          ))}
        </View>
      </View>

      <View style={s.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          placeholder="Rechercher une peinture, un revêtement…"
          placeholderTextColor={colors.muted}
          style={s.input}
        />
        <Pressable onPress={load} style={s.searchBtn}>
          <Text style={s.searchBtnText}>⌕</Text>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={[{ id: 0, name: 'Tous', slug: '' } as Category, ...categories]}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoryList}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => setCategory(item.slug)}
            style={[
              s.chip,
              { borderColor: rainbow[index % rainbow.length] },
              category === item.slug && {
                backgroundColor: rainbow[index % rainbow.length],
                borderColor: rainbow[index % rainbow.length],
              },
            ]}
          >
            <Text style={[s.chipText, category === item.slug && s.chipTextActive]}>{item.name}</Text>
          </Pressable>
        )}
      />

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.blue} />
          <Text style={s.loaderText}>Nous préparons les produits…</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={s.column}
          contentContainerStyle={s.grid}
          renderItem={({ item, index }) => (
            <Pressable
              style={s.card}
              onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: item.slug } })}
            >
              <View style={s.imageWrap}>
                {item.image ? (
                  <Image source={{ uri: assetUrl(item.image)! }} style={s.image} />
                ) : (
                  <View style={[s.image, s.placeholder]} />
                )}
                <View style={[s.accent, { backgroundColor: rainbow[index % rainbow.length] }]} />
                {item.badge ? <View style={s.badge}><Text style={s.badgeText}>{item.badge}</Text></View> : null}
                {item.oldPrice ? <View style={s.sale}><Text style={s.saleText}>OFFRE</Text></View> : null}
              </View>
              <View style={s.cardBody}>
                <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                <Text style={s.categoryLabel}>{item.category?.name || 'Rainbow Colors'}</Text>
                <View style={s.priceRow}>
                  <Text style={s.price}>{item.price.toFixed(2)} TND</Text>
                  {item.oldPrice ? <Text style={s.oldPrice}>{item.oldPrice.toFixed(2)} TND</Text> : null}
                </View>
                <View style={s.cardFooter}>
                  <Text style={s.viewText}>Voir le produit</Text>
                  <Text style={s.arrow}>↗</Text>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🎨</Text>
              <Text style={s.emptyTitle}>Aucun produit trouvé</Text>
              <Text style={s.emptyText}>Essayez une autre recherche ou catégorie.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerCopy: { flex: 1 },
  kicker: { color: colors.purple, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text, marginTop: 3 },
  subtitle: { color: colors.muted, marginTop: 5, maxWidth: 290, lineHeight: 18 },
  headerArt: { width: 78, height: 58, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 5 },
  headerDot: { width: 15, height: 15, borderRadius: 15 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 18, gap: 8, marginBottom: 7 },
  input: { flex: 1, height: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', paddingHorizontal: 14, color: colors.text },
  searchBtn: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 22 },
  categoryList: { gap: 8, paddingHorizontal: 18, paddingBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1.2, backgroundColor: '#fff' },
  chipText: { fontSize: 12, fontWeight: '900', color: colors.text },
  chipTextActive: { color: '#fff' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderText: { marginTop: 8, color: colors.muted, fontSize: 11 },
  grid: { gap: 12, paddingBottom: 30 },
  column: { gap: 12, paddingHorizontal: 18 },
  card: { flex: 1, maxWidth: '50%', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow },
  imageWrap: { height: 158, backgroundColor: '#F2F5FA', position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: { backgroundColor: '#E9EEF6' },
  accent: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4 },
  badge: { position: 'absolute', top: 9, left: 9, backgroundColor: '#fff', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 8.5, fontWeight: '900', color: colors.text },
  sale: { position: 'absolute', top: 9, right: 9, backgroundColor: colors.red, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 10 },
  saleText: { color: '#fff', fontSize: 8.5, fontWeight: '900' },
  cardBody: { padding: 11 },
  name: { fontSize: 13.5, fontWeight: '900', color: colors.text, lineHeight: 18 },
  categoryLabel: { color: colors.muted, fontSize: 9.5, marginTop: 5, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 7 },
  price: { color: colors.blue, fontWeight: '900', fontSize: 15 },
  oldPrice: { fontSize: 9.5, color: colors.muted, textDecorationLine: 'line-through' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 },
  viewText: { color: colors.muted, fontSize: 9.5, fontWeight: '800' },
  arrow: { color: colors.blue, fontSize: 16, fontWeight: '900' },
  empty: { padding: 38, alignItems: 'center', width: '100%' },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 10 },
  emptyText: { marginTop: 6, color: colors.muted, textAlign: 'center' },
});
