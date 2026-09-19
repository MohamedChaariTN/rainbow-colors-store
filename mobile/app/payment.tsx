import { useEffect,useState } from 'react';
import { ActivityIndicator,Pressable,StyleSheet,Text,View } from 'react-native';
import { useLocalSearchParams,useRouter } from 'expo-router';
import { api,Order } from '../src/api';
import { useAuth } from '../src/auth';
import { colors } from '../src/theme';

export default function PaymentStatus(){
  const {orderId,paymentRef}=useLocalSearchParams<{orderId:string;paymentRef?:string}>();
  const router=useRouter();
  const {token}=useAuth();
  const [order,setOrder]=useState<Order|null>(null);
  const [checking,setChecking]=useState(true);

  const check=async()=>{if(!token||!orderId)return;try{const r=await api.paymentStatus(Number(orderId),token);setOrder(r.order);}catch{}finally{setChecking(false);}};
  useEffect(()=>{check();const timer=setInterval(check,5000);return()=>clearInterval(timer);},[token,orderId]);

  const paid=order?.paymentStatus==='PAID' || (order?.paymentMethod==='cod' && order?.status==='CONFIRMED');
  return <View style={s.container}>
    <View style={[s.icon,{backgroundColor:paid?'#DCFCE7':'#FFF7CC'}]}><Text style={{fontSize:42}}>{paid?'✓':'⌛'}</Text></View>
    <Text style={s.title}>{paid?'Paiement confirmé':'Paiement en attente'}</Text>
    <Text style={s.text}>{paid?'Votre commande est confirmée et sera traitée par Rainbow Colors.':order?.paymentMethod==='cod'?'Votre commande à paiement à la livraison est confirmée.':'Terminez le paiement sur la page Konnect. Cette page vérifie automatiquement la confirmation.'}</Text>
    {order?<><Text style={s.order}>Commande {order.orderNumber}</Text><Text style={s.total}>{Number(order.total).toFixed(2)} TND</Text></>:null}
    {paymentRef?<Text style={s.ref}>Référence : {paymentRef}</Text>:null}
    {checking&&!paid?<ActivityIndicator color={colors.blue} style={{marginTop:18}}/>:null}
    <Pressable style={s.primary} onPress={()=>router.replace('/(tabs)/orders')}><Text style={s.primaryText}>Voir mes commandes</Text></Pressable>
    <Pressable style={s.secondary} onPress={check}><Text style={s.secondaryText}>Vérifier maintenant</Text></Pressable>
  </View>;
}
const s=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center',padding:26},icon:{width:86,height:86,borderRadius:43,alignItems:'center',justifyContent:'center'},title:{fontSize:27,fontWeight:'900',color:colors.text,marginTop:18,textAlign:'center'},text:{color:colors.muted,textAlign:'center',lineHeight:21,marginTop:9},order:{color:colors.text,fontWeight:'900',marginTop:16},total:{fontSize:24,fontWeight:'900',color:colors.blue,marginTop:4},ref:{color:colors.muted,fontSize:11,marginTop:5},primary:{width:'100%',backgroundColor:colors.blue,height:52,borderRadius:15,alignItems:'center',justifyContent:'center',marginTop:23},primaryText:{color:'#fff',fontWeight:'900',fontSize:16},secondary:{width:'100%',height:48,alignItems:'center',justifyContent:'center'},secondaryText:{color:colors.blue,fontWeight:'900'}
});
