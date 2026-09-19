import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { colors,radius } from '../../src/theme';

export default function Account(){
  const router=useRouter();
  const {user,token,loading,signOut,refreshUser}=useAuth();
  const [firstName,setFirstName]=useState('');
  const [lastName,setLastName]=useState('');
  const [phone,setPhone]=useState('');
  const [address,setAddress]=useState('');
  const [city,setCity]=useState('');
  const [saving,setSaving]=useState(false);

  useEffect(()=>{if(user){setFirstName(user.firstName);setLastName(user.lastName);setPhone(user.phone||'');setAddress(user.address||'');setCity(user.city||'');}},[user]);

  if(loading)return <View style={s.loader}><ActivityIndicator color={colors.blue}/></View>;
  if(!user)return <View style={s.guest}><Text style={s.guestTitle}>Bienvenue sur Rainbow Colors</Text><Text style={s.guestText}>Connectez-vous pour gérer votre panier, vos commandes et vos favoris.</Text><Pressable style={s.primary} onPress={()=>router.push('/login')}><Text style={s.primaryText}>Se connecter</Text></Pressable></View>;

  const save=async()=>{
    if(!token)return;
    setSaving(true);
    try{await api.updateProfile({firstName,lastName,phone,address,city},token);await refreshUser();Alert.alert('Profil','Vos informations ont été enregistrées.');}
    catch(e:any){Alert.alert('Erreur',e.message);}
    finally{setSaving(false);}
  };

  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <Text style={s.title}>Mon compte</Text>
    <Text style={s.email}>{user.email}</Text>
    <Pressable style={s.secondary} onPress={()=>router.push('/wishlist')}><Text style={s.secondaryText}>♥  Mes favoris</Text></Pressable>
    <Text style={s.section}>Informations personnelles</Text>
    <TextInput value={firstName} onChangeText={setFirstName} placeholder="Prénom" style={s.input}/>
    <TextInput value={lastName} onChangeText={setLastName} placeholder="Nom" style={s.input}/>
    <TextInput value={phone} onChangeText={setPhone} placeholder="Téléphone" keyboardType="phone-pad" style={s.input}/>
    <TextInput value={address} onChangeText={setAddress} placeholder="Adresse" style={s.input}/>
    <TextInput value={city} onChangeText={setCity} placeholder="Ville" style={s.input}/>
    <Pressable style={s.primary} onPress={save} disabled={saving}><Text style={s.primaryText}>{saving?'Enregistrement...':'Enregistrer'}</Text></Pressable>
    <Pressable style={s.deleteLink} onPress={()=>router.push('/delete-account')}><Text style={s.deleteText}>Supprimer mon compte</Text></Pressable>
    <Pressable style={s.logout} onPress={()=>signOut()}><Text style={s.logoutText}>Se déconnecter</Text></Pressable>
    <Text style={s.version}>Rainbow Colors · application officielle</Text>
  </ScrollView>;
}

const s=StyleSheet.create({
  container:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:30},loader:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.bg},
  guest:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center',padding:25},guestTitle:{fontSize:26,fontWeight:'900',color:colors.text,textAlign:'center'},guestText:{color:colors.muted,textAlign:'center',lineHeight:21,marginTop:10},
  primary:{backgroundColor:colors.blue,padding:15,borderRadius:15,alignItems:'center',marginTop:18,width:'100%'},primaryText:{color:'#fff',fontWeight:'900'},title:{fontSize:28,fontWeight:'900',color:colors.text},email:{color:colors.muted,marginTop:4},
  secondary:{marginTop:16,padding:13,borderRadius:14,backgroundColor:'#FFF1F2',alignItems:'center'},secondaryText:{color:colors.red,fontWeight:'900'},
  section:{fontSize:19,fontWeight:'900',color:colors.text,marginTop:24,marginBottom:10},input:{height:50,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:'#fff',paddingHorizontal:14,marginBottom:10,color:colors.text},
  deleteLink:{padding:12,alignItems:'center',marginTop:8},deleteText:{color:colors.red,fontWeight:'900'},logout:{padding:14,alignItems:'center',marginTop:2},logoutText:{color:colors.red,fontWeight:'900'},version:{textAlign:'center',color:'#9CA3AF',fontSize:11,marginTop:18}
});
