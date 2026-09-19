import { useEffect,useState } from 'react';
import { ActivityIndicator,FlatList,Image,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { api,assetUrl,Category,Product } from '../../src/api';
import { colors,radius,shadow } from '../../src/theme';

export default function Home(){
  const router=useRouter();
  const [products,setProducts]=useState<Product[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{Promise.all([api.products({limit:8}),api.categories()])
    .then(([p,c])=>{setProducts(p.products);setCategories(c);})
    .catch(e=>setError(e.message))
    .finally(()=>setLoading(false));},[]);

  return <View style={s.container}>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <View style={s.badge}><Text style={s.badgeText}>RAINBOW COLORS</Text></View>
        <Text style={s.title}>Des couleurs pour{'
'}tous vos projets.</Text>
        <Text style={s.subtitle}>Peintures & revêtements professionnels, directement en Tunisie.</Text>
        <Pressable style={s.primary} onPress={()=>router.push('/products')}><Text style={s.primaryText}>Découvrir les produits  →</Text></Pressable>
      </View>

      <View style={s.sectionHead}><Text style={s.sectionTitle}>Catégories</Text><Pressable onPress={()=>router.push('/products')}><Text style={s.link}>Voir tout</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingBottom:4}}>
        {categories.map(c=><Pressable key={c.id} style={s.cat} onPress={()=>router.push({pathname:'/products',params:{category:c.slug}})}>
          <Text style={s.catIcon}>{c.icon || '🎨'}</Text><Text style={s.catName} numberOfLines={1}>{c.name}</Text>
        </Pressable>)}
      </ScrollView>

      <View style={[s.sectionHead,{marginTop:24}]}><Text style={s.sectionTitle}>Nos produits</Text><Pressable onPress={()=>router.push('/products')}><Text style={s.link}>Tout voir</Text></Pressable></View>
      {loading?<ActivityIndicator size="small" color={colors.blue}/>:error?<Text style={s.error}>{error}</Text>:
      <FlatList horizontal data={products} keyExtractor={x=>String(x.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:14}}
        renderItem={({item})=><Pressable style={s.card} onPress={()=>router.push({pathname:'/product/[slug]',params:{slug:item.slug}})}>
          {item.image?<Image source={{uri:assetUrl(item.image)!}} style={s.image}/>:<View style={[s.image,{backgroundColor:'#eef2f7'}]}/>}
          <Text style={s.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={s.price}>{item.price.toFixed(2)} TND</Text>
          {item.oldPrice?<Text style={s.oldPrice}>{item.oldPrice.toFixed(2)} TND</Text>:null}
        </Pressable>}
      />}
    </ScrollView>
  </View>;
}

const s=StyleSheet.create({
  container:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:30},
  hero:{backgroundColor:colors.navy,borderRadius:radius.lg,padding:24,overflow:'hidden',...shadow},
  badge:{alignSelf:'flex-start',paddingHorizontal:10,paddingVertical:5,borderRadius:radius.pill,backgroundColor:'rgba(255,255,255,.12)'},
  badgeText:{color:colors.yellow,fontSize:10,fontWeight:'900',letterSpacing:1.2},title:{color:'#fff',fontSize:30,fontWeight:'900',lineHeight:34,marginTop:14},
  subtitle:{color:'#D7DEEF',fontSize:14,lineHeight:21,marginTop:12,maxWidth:300},primary:{alignSelf:'flex-start',backgroundColor:colors.yellow,paddingHorizontal:18,paddingVertical:13,borderRadius:13,marginTop:20},
  primaryText:{color:colors.navy,fontWeight:'900'},sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:24,marginBottom:12},
  sectionTitle:{fontSize:20,fontWeight:'900',color:colors.text},link:{color:colors.blue,fontWeight:'800'},cat:{width:105,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:13,alignItems:'center'},
  catIcon:{fontSize:24},catName:{fontSize:12,fontWeight:'800',color:colors.text,marginTop:7},card:{width:190,backgroundColor:colors.card,borderRadius:18,padding:11,borderWidth:1,borderColor:colors.border,...shadow},
  image:{width:'100%',height:145,borderRadius:13,backgroundColor:'#f0f3f8'},productName:{fontSize:14,fontWeight:'800',color:colors.text,marginTop:10,lineHeight:18},price:{fontSize:16,fontWeight:'900',color:colors.blue,marginTop:8},oldPrice:{fontSize:12,color:colors.muted,textDecorationLine:'line-through',marginTop:2},error:{color:colors.red,fontWeight:'700'}
});
