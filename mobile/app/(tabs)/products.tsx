import { useEffect,useState } from 'react';
import { ActivityIndicator,FlatList,Image,Pressable,StyleSheet,Text,TextInput,View } from 'react-native';
import { useLocalSearchParams,useRouter } from 'expo-router';
import { api,assetUrl,Category,Product } from '../../src/api';
import { colors,radius,shadow } from '../../src/theme';

export default function Products(){
  const router=useRouter();
  const params=useLocalSearchParams<{category?:string}>();
  const [products,setProducts]=useState<Product[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [search,setSearch]=useState('');
  const [category,setCategory]=useState(params.category || '');
  const [loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);
    try{
      const result=await api.products({search:search.trim()||undefined,category:category||undefined,limit:40});
      setProducts(result.products);
    }finally{setLoading(false);}
  };
  useEffect(()=>{api.categories().then(setCategories).catch(()=>{});},[]);
  useEffect(()=>{load().catch(()=>{});},[category]);

  return <View style={s.container}>
    <View style={s.header}><Text style={s.title}>Produits</Text><Text style={s.subtitle}>Trouvez la peinture adaptée à votre projet.</Text></View>
    <View style={s.searchRow}><TextInput value={search} onChangeText={setSearch} onSubmitEditing={load} placeholder="Rechercher un produit..." placeholderTextColor={colors.muted} style={s.input}/><Pressable onPress={load} style={s.searchBtn}><Text>⌕</Text></Pressable></View>
    <FlatList horizontal data={[{id:0,name:'Tous',slug:''} as Category,...categories]} keyExtractor={x=>String(x.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingHorizontal:18,paddingBottom:10}} renderItem={({item})=>
      <Pressable onPress={()=>setCategory(item.slug)} style={[s.chip,category===item.slug&&s.chipActive]}><Text style={[s.chipText,category===item.slug&&s.chipTextActive]}>{item.name}</Text></Pressable>
    }/>
    {loading?<View style={s.loader}><ActivityIndicator color={colors.blue}/></View>:
    <FlatList data={products} numColumns={2} keyExtractor={x=>String(x.id)} columnWrapperStyle={{gap:12,paddingHorizontal:18}} contentContainerStyle={{gap:12,paddingBottom:30}}
      renderItem={({item})=><Pressable style={s.card} onPress={()=>router.push({pathname:'/product/[slug]',params:{slug:item.slug}})}>
        <Image source={{uri:assetUrl(item.image)!}} style={s.image}/>
        <Text style={s.name} numberOfLines={2}>{item.name}</Text>
        <Text style={s.price}>{item.price.toFixed(2)} TND</Text>
      </Pressable>}
      ListEmptyComponent={<View style={s.empty}><Text style={s.emptyTitle}>Aucun produit trouvé</Text><Text style={s.emptyText}>Essayez une autre recherche ou catégorie.</Text></View>}
    />}
  </View>;
}

const s=StyleSheet.create({
  container:{flex:1,backgroundColor:colors.bg},header:{paddingHorizontal:18,paddingTop:18,paddingBottom:12},title:{fontSize:28,fontWeight:'900',color:colors.text},subtitle:{color:colors.muted,marginTop:5},
  searchRow:{flexDirection:'row',paddingHorizontal:18,gap:8,marginBottom:7},input:{flex:1,height:48,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:'#fff',paddingHorizontal:14,color:colors.text},searchBtn:{width:48,height:48,borderRadius:14,backgroundColor:colors.blue,alignItems:'center',justifyContent:'center'},searchBtnText:{color:'#fff',fontSize:22},
  chip:{paddingHorizontal:14,paddingVertical:9,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:'#fff'},chipActive:{backgroundColor:colors.blue,borderColor:colors.blue},chipText:{fontSize:12,fontWeight:'800',color:colors.text},chipTextActive:{color:'#fff'},
  loader:{flex:1,alignItems:'center',justifyContent:'center'},card:{flex:1,backgroundColor:'#fff',borderRadius:18,padding:10,borderWidth:1,borderColor:colors.border,...shadow},image:{width:'100%',height:155,borderRadius:13,backgroundColor:'#eef2f7'},name:{fontSize:14,fontWeight:'800',color:colors.text,lineHeight:18,marginTop:8},price:{color:colors.blue,fontWeight:'900',fontSize:16,marginTop:7},empty:{padding:30,alignItems:'center',width:'100%'},emptyTitle:{fontSize:18,fontWeight:'900',color:colors.text},emptyText:{marginTop:6,color:colors.muted}
});
