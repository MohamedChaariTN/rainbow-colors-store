import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Image,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { api,assetUrl,Cart } from '../../src/api';
import { useAuth } from '../../src/auth';
import { colors,radius } from '../../src/theme';

export default function CartScreen(){
  const router=useRouter();
  const {token,user}=useAuth();
  const [cart,setCart]=useState<Cart>({items:[]});
  const [loading,setLoading]=useState(true);

  const load=async()=>{if(!token){setLoading(false);return;}setLoading(true);try{setCart(await api.cart(token));}catch(e:any){Alert.alert('Erreur',e.message);}finally{setLoading(false);}};
  useEffect(()=>{load();},[token]);

  if(!user)return <View style={s.guest}><Text style={s.title}>Votre panier</Text><Text style={s.muted}>Connectez-vous pour utiliser votre panier sur tous vos appareils.</Text><Pressable style={s.primary} onPress={()=>router.push('/login')}><Text style={s.primaryText}>Se connecter</Text></Pressable></View>;
  if(loading)return <View style={s.loader}><ActivityIndicator color={colors.blue}/></View>;
  if(cart.items.length===0)return <View style={s.empty}><Text style={s.emptyIcon}>🛒</Text><Text style={s.emptyTitle}>Votre panier est vide</Text><Text style={s.muted}>Ajoutez vos produits préférés pour commencer.</Text><Pressable style={s.primary} onPress={()=>router.push('/products')}><Text style={s.primaryText}>Voir les produits</Text></Pressable></View>;

  const subtotal=cart.items.reduce((sum,i)=>sum+Number(i.price)*i.quantity,0);
  const tax=subtotal*0.19;
  const shipping=subtotal>200?0:7;
  const total=subtotal+tax+shipping;

  const change=async(id:number,q:number)=>{if(!token)return;try{setCart(await api.updateCartItem(id,q,token));}catch(e:any){Alert.alert('Erreur',e.message);}};
  const remove=async(id:number)=>{if(!token)return;try{setCart(await api.removeCartItem(id,token));}catch(e:any){Alert.alert('Erreur',e.message);}};

  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <View style={s.head}><Text style={s.title}>Mon panier</Text><Text style={s.count}>{cart.items.length} article(s)</Text></View>
    {cart.items.map(item=><View key={item.id} style={s.item}>
      <Image source={{uri:assetUrl(item.product.image)!}} style={s.image}/>
      <View style={{flex:1}}>
        <Text style={s.name} numberOfLines={2}>{item.product.name}</Text>
        <Text style={s.price}>{Number(item.price).toFixed(2)} TND</Text>
        <View style={s.controls}><Pressable onPress={()=>change(item.id,Math.max(1,item.quantity-1))} style={s.qty}><Text>−</Text></Pressable><Text style={s.qtyText}>{item.quantity}</Text><Pressable onPress={()=>change(item.id,item.quantity+1)} style={s.qty}><Text>+</Text></Pressable><Pressable onPress={()=>remove(item.id)} style={s.remove}><Text>Supprimer</Text></Pressable></View>
      </View>
    </View>)}
    <View style={s.summary}><Row label="Sous-total" value={subtotal}/><Row label="TVA (19%)" value={tax}/><Row label="Livraison" value={shipping}/><View style={s.sep}/><Row label="Total" value={total} strong/></View>
    <Pressable style={s.primary} onPress={()=>router.push('/checkout')}><Text style={s.primaryText}>Passer la commande</Text></Pressable>
  </ScrollView>;
}
function Row({label,value,strong=false}:{label:string;value:number;strong?:boolean}){return <View style={s.row}><Text style={[s.label,strong&&s.strong]}>{label}</Text><Text style={[s.value,strong&&s.strong]}>{value.toFixed(2)} TND</Text></View>;}
const s=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:35},loader:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.bg},guest:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center',padding:25},title:{fontSize:28,fontWeight:'900',color:colors.text},muted:{color:colors.muted,textAlign:'center',marginTop:8},primary:{backgroundColor:colors.blue,padding:15,borderRadius:15,alignItems:'center',marginTop:18},primaryText:{color:'#fff',fontWeight:'900'},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:25},emptyIcon:{fontSize:46},emptyTitle:{fontSize:23,fontWeight:'900',color:colors.text,marginTop:10},head:{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline'},count:{color:colors.muted},item:{flexDirection:'row',gap:12,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:18,padding:10,marginTop:12},image:{width:85,height:85,borderRadius:12,backgroundColor:'#eef2f7'},name:{fontSize:14,fontWeight:'800',color:colors.text},price:{color:colors.blue,fontWeight:'900',marginTop:4},controls:{flexDirection:'row',alignItems:'center',marginTop:8,gap:8},qty:{width:30,height:30,borderRadius:9,backgroundColor:'#EEF3FF',alignItems:'center',justifyContent:'center'},qtyText:{fontWeight:'900',minWidth:16,textAlign:'center'},remove:{marginLeft:5},removeText:{color:colors.red,fontSize:11,fontWeight:'800'},summary:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:colors.border,padding:16,marginTop:16},row:{flexDirection:'row',justifyContent:'space-between',marginBottom:9},label:{color:colors.muted},value:{color:colors.text,fontWeight:'700'},strong:{color:colors.text,fontWeight:'900',fontSize:17},sep:{height:1,backgroundColor:colors.border,marginVertical:4}
});
