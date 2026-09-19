import { useState } from 'react';
import { ActivityIndicator,Alert,Pressable,StyleSheet,Text,TextInput,View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { colors } from '../src/theme';

export default function DeleteAccount(){
  const router=useRouter();
  const {token,signOut}=useAuth();
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);

  const remove=async()=>{
    if(!token)return;
    if(!password){Alert.alert('Confirmation','Entrez votre mot de passe pour confirmer la suppression.');return;}
    Alert.alert('Supprimer le compte ?','Cette action supprime définitivement votre compte et les données associées.',[
      {text:'Annuler',style:'cancel'},
      {text:'Supprimer',style:'destructive',onPress:async()=>{
        setBusy(true);
        try{await api.deleteAccount(password,token);await signOut();Alert.alert('Compte supprimé','Votre compte et les données associées ont été supprimés.');router.replace('/login');}
        catch(e:any){Alert.alert('Erreur',e.message);}
        finally{setBusy(false);}
      }}
    ]);
  };

  return <View style={s.container}>
    <Pressable onPress={()=>router.back()}><Text style={s.back}>‹ Retour</Text></Pressable>
    <Text style={s.title}>Supprimer mon compte</Text>
    <Text style={s.text}>La suppression est définitive. Votre profil, panier, favoris et historique de commandes associés à ce compte seront supprimés.</Text>
    <Text style={s.label}>Mot de passe</Text>
    <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Votre mot de passe" style={s.input}/>
    <Pressable style={s.danger} onPress={remove} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.dangerText}>Supprimer définitivement</Text>}</Pressable>
    <Text style={s.note}>Vous pouvez annuler maintenant en revenant à votre compte.</Text>
  </View>;
}

const s=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.bg,padding:20,paddingTop:55},back:{color:colors.blue,fontWeight:'800'},title:{fontSize:28,fontWeight:'900',color:colors.text,marginTop:28},text:{color:colors.muted,lineHeight:22,marginTop:10},label:{fontWeight:'900',color:colors.text,marginTop:24,marginBottom:8},input:{height:52,borderRadius:15,borderWidth:1,borderColor:colors.border,backgroundColor:'#fff',paddingHorizontal:15,color:colors.text},danger:{height:52,borderRadius:15,backgroundColor:colors.red,alignItems:'center',justifyContent:'center',marginTop:16},dangerText:{color:'#fff',fontWeight:'900'},note:{color:'#9CA3AF',fontSize:11,textAlign:'center',marginTop:12}
});
