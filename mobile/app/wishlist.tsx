import { useEffect,useState } from 'react';
import { ActivityIndicator,FlatList,Image,Pressable,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { api,assetUrl,Product } from '../src/api';
import { useAuth } from '../src/auth';
import { colors } from '../src/theme';

export default function Wishlist(){
  const router=useRouter();
  const {token,user}=useAuth();
  const [items,setItems]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{if(token)api.wishlist(token).then(setItems).catch(()=>setItems([])).finally(()=>setLoading(false));else setLoading(false);},[token]);
  if(!user)return <View style={s.center}><Text style={s.title}>Mes favoris</Text><Pressable style={s.primary} onPress={()=>router.push('/login')}><Text style={s.primaryText}>Se connecter</Text></Pressable></View>;
  if(loading)return <View style={s.center}><ActivityIndicator color={colors.blue}/></View>;
  return <View style={s.container}><View style={s.head}><Text style={s.title}>Mes favoris</Text><Pressable onPress={()=>router.back()}><Text style={s.back}>Fermer</Text></Pressable></View>
    <FlatList data={items} numColumns={2} keyExtractor={x=>String(x.id)} columnWrapperStyle={{gap:12,paddingHorizontal:18}} contentContainerStyle={{gap:12,paddingTop:12,paddingBottom:30}} renderItem={({item})=><Pressable style={s.card} onPress={()=>router.push({pathname:'/product/[slug]',params:{slug:item.slug}})}><Image source={{uri:assetUrl(item.image)!}} style={s.image}/><Text style={s.name} numberOfLines={2}>{item.name}</Text><Text style={s.price}>{item.price.toFixed(2)} TND</Text></Pressable>}/>
  </View>;
}
const s=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.bg},center:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center',padding:25},head:{padding:18,paddingTop:48,flexDirection:'row',justifyContent:'space-between'},title:{fontSize:27,fontWeight:'900',color:colors.text},back:{color:colors.blue,fontWeight:'800'},card:{flex:1,backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:colors.border,padding:10},image:{width:'100%',height:160,borderRadius:13,backgroundColor:'#eef2f7'},name:{fontWeight:'800',fontSize:14,color:colors.text,marginTop:8},price:{color:colors.blue,fontWeight:'900',fontSize:16,marginTop:6},primary:{backgroundColor:colors.blue,paddingHorizontal:25,paddingVertical:14,borderRadius:14,marginTop:16},primaryText:{color:'#fff',fontWeight:'900'}
});
