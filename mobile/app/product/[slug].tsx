import { useEffect,useState } from 'react';
import { ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useLocalSearchParams,useRouter } from 'expo-router';
import { api,assetUrl,parseJsonArray,Product } from '../../src/api';
import { useAuth } from '../../src/auth';
import { colors,radius,shadow } from '../../src/theme';

export default function ProductDetails(){
  const {slug}=useLocalSearchParams<{slug:string}>();
  const router=useRouter();
  const {token,user}=useAuth();
  const [product,setProduct]=useState<Product|null>(null);
  const [loading,setLoading]=useState(true);
  const [liked,setLiked]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{if(slug)api.product(slug).then(setProduct).catch(e=>setMessage(e.message)).finally(()=>setLoading(false));},[slug]);

  if(loading)return <View style={s.loader}><ActivityIndicator color={colors.blue}/></View>;
  if(!product)return <View style={s.loader}><Text>{message||'Produit introuvable'}</Text></View>;

  const gallery=parseJsonArray<string>(product.images);
  const features=parseJsonArray<string>(product.features);
  const add=async()=>{if(!token){router.push('/login');return;}try{await api.addToCart(product.id,1,token);setMessage('Produit ajouté au panier.');}catch(e:any){setMessage(e.message);}};
  const toggle=async()=>{if(!token){router.push('/login');return;}try{const r=await api.toggleWishlist(product.id,token);setLiked(r.wishlisted);}catch(e:any){setMessage(e.message);}};

  return <View style={s.container}><ScrollView contentContainerStyle={s.content}>
    <View style={s.topRow}><Pressable onPress={()=>router.back()}><Text style={s.back}>‹ Retour</Text></Pressable><Pressable onPress={toggle}><Text style={s.heart}>{liked?'♥':'♡'}</Text></Pressable></View>
    <Image source={{uri:assetUrl(gallery[0]||product.image)!}} style={s.heroImage}/>
    <View style={s.info}>
      {product.badge?<View style={s.badge}><Text style={s.badgeText}>{product.badge}</Text></View>:null}
      <Text style={s.title}>{product.name}</Text>
      <Text style={s.price}>{product.price.toFixed(2)} TND</Text>
      {product.oldPrice?<Text style={s.oldPrice}>{product.oldPrice.toFixed(2)} TND</Text>:null}
      <Text style={s.description}>{product.description}</Text>
      {features.length>0?<><Text style={s.section}>Caractéristiques</Text>{features.map((f,i)=><Text key={i} style={s.feature}>✓ {f}</Text>)}</>:null}
      <View style={s.stock}><View style={[s.dot,{backgroundColor:product.stock>0?colors.green:colors.red}]}/><Text style={s.stockText}>{product.stock>0?String(product.stock)+' en stock':'Rupture de stock'}</Text></View>
      {message?<Text style={s.message}>{message}</Text>:null}
      <Pressable disabled={product.stock<=0} onPress={add} style={[s.primary,product.stock<=0&&{opacity:.45}]}><Text style={s.primaryText}>{product.stock>0?'Ajouter au panier':'Indisponible'}</Text></Pressable>
      {!user?<Text style={s.note}>Connectez-vous pour synchroniser votre panier et vos favoris.</Text>:null}
    </View>
  </ScrollView></View>;
}

const s=StyleSheet.create({
  container:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:35},loader:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.bg},
  topRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},back:{color:colors.blue,fontWeight:'800',fontSize:15},heart:{fontSize:30,color:colors.red},
  heroImage:{width:'100%',height:320,borderRadius:22,backgroundColor:'#eef2f7',...shadow},info:{paddingTop:18},badge:{alignSelf:'flex-start',backgroundColor:'#fff7cc',paddingHorizontal:9,paddingVertical:5,borderRadius:999},badgeText:{color:'#8A6A00',fontSize:11,fontWeight:'900'},title:{fontSize:27,fontWeight:'900',color:colors.text,marginTop:10},price:{fontSize:23,fontWeight:'900',color:colors.blue,marginTop:9},oldPrice:{fontSize:13,color:colors.muted,textDecorationLine:'line-through',marginTop:2},description:{fontSize:15,color:'#4B5563',lineHeight:23,marginTop:15},section:{fontSize:18,fontWeight:'900',color:colors.text,marginTop:22,marginBottom:8},feature:{fontSize:14,color:colors.text,marginBottom:7},stock:{flexDirection:'row',alignItems:'center',gap:7,marginTop:16},dot:{width:9,height:9,borderRadius:9},stockText:{color:colors.muted,fontWeight:'700'},message:{marginTop:12,color:colors.green,fontWeight:'800'},primary:{backgroundColor:colors.blue,padding:15,borderRadius:15,alignItems:'center',marginTop:16},primaryText:{color:'#fff',fontWeight:'900',fontSize:16},note:{color:colors.muted,fontSize:12,textAlign:'center',marginTop:10}
});
