import { useEffect,useState } from 'react';
import { ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { api,Order } from '../../src/api';
import { useAuth } from '../../src/auth';
import { colors,radius } from '../../src/theme';

export default function Orders(){
  const router=useRouter();
  const {user,token}=useAuth();
  const [orders,setOrders]=useState<Order[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{if(!token){setLoading(false);return;}api.orders(token).then(setOrders).catch(()=>setOrders([])).finally(()=>setLoading(false));},[token]);

  if(!user)return <View style={s.guest}><Text style={s.title}>Mes commandes</Text><Text style={s.muted}>Connectez-vous pour consulter votre historique.</Text><Pressable style={s.primary} onPress={()=>router.push('/login')}><Text style={s.primaryText}>Se connecter</Text></Pressable></View>;
  if(loading)return <View style={s.loader}><ActivityIndicator color={colors.blue}/></View>;

  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <Text style={s.title}>Mes commandes</Text>
    {orders.length===0?<View style={s.empty}><Text style={s.emptyTitle}>Aucune commande</Text><Text style={s.muted}>Vos commandes apparaîtront ici.</Text></View>:
      orders.map(o=><Pressable key={o.id} style={s.card} onPress={()=>router.push({pathname:'/payment',params:{orderId:String(o.id),status:o.paymentStatus}})}>
        <View style={s.row}><Text style={s.number}>{o.orderNumber}</Text><Badge text={o.paymentStatus}/></View>
        <Text style={s.date}>{new Date(o.createdAt).toLocaleDateString('fr-FR')}</Text>
        <Text style={s.items}>{o.items.length} produit(s) · {o.paymentMethod}</Text>
        <Text style={s.total}>{Number(o.total).toFixed(2)} TND</Text>
      </Pressable>)
    }
  </ScrollView>;
}
function Badge({text}:{text:string}){const paid=text==='PAID';return <View style={[s.badge,{backgroundColor:paid?'#DCFCE7':'#FFF7CC'}]}><Text style={[s.badgeText,{color:paid?colors.green:'#8A6A00'}]}>{text}</Text></View>}
const s=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:30},loader:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.bg},guest:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center',padding:25},title:{fontSize:28,fontWeight:'900',color:colors.text},muted:{color:colors.muted,textAlign:'center',marginTop:8},primary:{backgroundColor:colors.blue,padding:15,borderRadius:15,alignItems:'center',marginTop:18,paddingHorizontal:25},primaryText:{color:'#fff',fontWeight:'900'},empty:{alignItems:'center',paddingTop:80},emptyTitle:{fontSize:22,fontWeight:'900',color:colors.text},card:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:colors.border,padding:15,marginTop:12},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},number:{fontSize:16,fontWeight:'900',color:colors.text},badge:{paddingHorizontal:9,paddingVertical:5,borderRadius:999},badgeText:{fontSize:10,fontWeight:'900'},date:{color:colors.muted,marginTop:8,fontSize:12},items:{color:colors.text,marginTop:5},total:{color:colors.blue,fontSize:18,fontWeight:'900',marginTop:10}
});
