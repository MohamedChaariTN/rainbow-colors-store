import { useEffect,useMemo,useState } from 'react';
import { ActivityIndicator,Alert,Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import { useRouter } from 'expo-router';
import { api,Cart,PaymentMethod } from '../src/api';
import { useAuth } from '../src/auth';
import { colors,radius } from '../src/theme';

export default function Checkout(){
  const router=useRouter();
  const {user,token}=useAuth();
  const [cart,setCart]=useState<Cart>({items:[]});
  const [methods,setMethods]=useState<PaymentMethod[]>([]);
  const [method,setMethod]=useState('cod');
  const [firstName,setFirstName]=useState(user?.firstName||'');
  const [lastName,setLastName]=useState(user?.lastName||'');
  const [email,setEmail]=useState(user?.email||'');
  const [phone,setPhone]=useState(user?.phone||'');
  const [address,setAddress]=useState(user?.address||'');
  const [city,setCity]=useState(user?.city||'');
  const [governorate,setGovernorate]=useState('');
  const [postalCode,setPostalCode]=useState('');
  const [notes,setNotes]=useState('');
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);

  useEffect(()=>{if(!token){router.replace('/login');return;}Promise.all([api.cart(token),api.paymentMethods()]).then(([c,m])=>{setCart(c);setMethods(m.methods)}).catch(e=>Alert.alert('Erreur',e.message)).finally(()=>setLoading(false));},[token]);

  const subtotal=useMemo(()=>cart.items.reduce((sum,i)=>sum+Number(i.price)*i.quantity,0),[cart]);
  const shipping=subtotal>200?0:7;
  const tax=subtotal*.19;
  const total=subtotal+shipping+tax;

  const submit=async()=>{
    if(!token)return;
    if(!firstName||!lastName||!email||!phone||!address||!city||!governorate){Alert.alert('Informations manquantes','Veuillez remplir les champs obligatoires.');return;}
    if(cart.items.length===0){Alert.alert('Panier vide','Ajoutez un produit avant de commander.');return;}
    setSending(true);
    try{
      const created=await api.createOrder({
        items:cart.items.map(i=>({productId:i.productId,quantity:i.quantity,name:i.product.name,price:i.price})),
        shipping,paymentMethod:method,firstName,lastName,email,phone,address,city,governorate,postalCode,notes
      },token);
      const payment=await api.processPayment({method,orderId:created.order.id},token);
      if(method==='cod'){
        Alert.alert('Commande confirmée','Votre commande '+created.order.orderNumber+' a été enregistrée.');
        router.replace('/(tabs)/orders');
      }else if(payment.paymentUrl){
        await Linking.openURL(payment.paymentUrl);
        router.replace({pathname:'/payment',params:{orderId:String(created.order.id),paymentRef:payment.paymentRef||''}});
      }else{
        router.replace({pathname:'/payment',params:{orderId:String(created.order.id)}});
      }
    }catch(e:any){Alert.alert('Erreur de commande',e.message);}
    finally{setSending(false);}
  };

  if(!user)return null;
  if(loading)return <View style={s.loader}><ActivityIndicator color={colors.blue}/></View>;

  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <View style={s.top}><Pressable onPress={()=>router.back()}><Text style={s.back}>‹ Retour</Text></Pressable><Text style={s.title}>Checkout</Text></View>
    <Text style={s.section}>Livraison</Text>
    <Input value={firstName} onChangeText={setFirstName} placeholder="Prénom *"/><Input value={lastName} onChangeText={setLastName} placeholder="Nom *"/><Input value={email} onChangeText={setEmail} placeholder="Email *" keyboard="email-address"/><Input value={phone} onChangeText={setPhone} placeholder="Téléphone *" keyboard="phone-pad"/><Input value={address} onChangeText={setAddress} placeholder="Adresse *"/><Input value={city} onChangeText={setCity} placeholder="Ville *"/><Input value={governorate} onChangeText={setGovernorate} placeholder="Gouvernorat *"/><Input value={postalCode} onChangeText={setPostalCode} placeholder="Code postal"/><Input value={notes} onChangeText={setNotes} placeholder="Note de livraison"/>

    <Text style={s.section}>Mode de paiement</Text>
    {methods.map(m=><Pressable key={m.id} onPress={()=>setMethod(m.id)} style={[s.method,method===m.id&&s.methodActive]}><Text style={s.methodIcon}>{m.icon}</Text><View style={{flex:1}}><Text style={s.methodName}>{m.name}</Text><Text style={s.methodDesc}>{m.description}</Text></View><Text style={s.radio}>{method===m.id?'●':'○'}</Text></Pressable>)}

    <View style={s.summary}><Row label="Sous-total" value={subtotal}/><Row label="TVA (19%)" value={tax}/><Row label="Livraison" value={shipping}/><View style={s.sep}/><Row label="Total" value={total} strong/></View>
    <Pressable style={s.primary} onPress={submit} disabled={sending}><Text style={s.primaryText}>{sending?'Traitement...':'Confirmer la commande'}</Text></Pressable>
    <Text style={s.security}>🔒 Les paiements électroniques passent par la page sécurisée Konnect. Les données de carte ne sont pas stockées dans l’application.</Text>
  </ScrollView>;
}
function Input({value,onChangeText,placeholder,keyboard}:{value:string;onChangeText:(v:string)=>void;placeholder:string;keyboard?:'email-address'|'phone-pad'}){return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboard} autoCapitalize={keyboard==='email-address'?'none':'sentences'} style={s.input}/>;}
function Row({label,value,strong=false}:{label:string;value:number;strong?:boolean}){return <View style={s.row}><Text style={[s.label,strong&&s.strong]}>{label}</Text><Text style={[s.value,strong&&s.strong]}>{value.toFixed(2)} TND</Text></View>;}
const s=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:35},loader:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.bg},top:{flexDirection:'row',alignItems:'center',gap:16},back:{color:colors.blue,fontWeight:'800'},title:{fontSize:27,fontWeight:'900',color:colors.text},section:{fontSize:19,fontWeight:'900',color:colors.text,marginTop:22,marginBottom:10},input:{height:50,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:'#fff',paddingHorizontal:14,color:colors.text,marginBottom:9},method:{flexDirection:'row',alignItems:'center',gap:11,padding:14,borderRadius:15,borderWidth:1,borderColor:colors.border,backgroundColor:'#fff',marginBottom:9},methodActive:{borderColor:colors.blue,backgroundColor:'#F4F7FF'},methodIcon:{fontSize:22},methodName:{fontWeight:'900',color:colors.text},methodDesc:{color:colors.muted,fontSize:11,marginTop:2},radio:{color:colors.blue,fontSize:20},summary:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:colors.border,padding:16,marginTop:8},row:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},label:{color:colors.muted},value:{color:colors.text,fontWeight:'700'},strong:{fontWeight:'900',fontSize:17,color:colors.text},sep:{height:1,backgroundColor:colors.border,marginVertical:3},primary:{height:54,borderRadius:15,backgroundColor:colors.blue,alignItems:'center',justifyContent:'center',marginTop:15},primaryText:{color:'#fff',fontSize:16,fontWeight:'900'},security:{color:colors.muted,fontSize:11,textAlign:'center',lineHeight:17,marginTop:11}
});
