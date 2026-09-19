import { useState } from 'react';
import { ActivityIndicator,Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { colors } from '../src/theme';

export default function Login(){
  const router=useRouter();
  const {signIn,signUp}=useAuth();
  const [mode,setMode]=useState<'login'|'register'>('login');
  const [forgot,setForgot]=useState(false);
  const [resetStep,setResetStep]=useState(false);
  const [busy,setBusy]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [firstName,setFirstName]=useState('');
  const [lastName,setLastName]=useState('');
  const [phone,setPhone]=useState('');
  const [code,setCode]=useState('');

  const submit=async()=>{
    setBusy(true);
    try{
      if(mode==='login')await signIn(email,password);
      else await signUp({email,password,firstName,lastName,phone});
      router.replace('/(tabs)');
    }catch(e:any){Alert.alert('Erreur',e.message);}
    finally{setBusy(false);}
  };
  const requestReset=async()=>{
    setBusy(true);
    try{await api.requestPasswordReset(email);setResetStep(true);Alert.alert('Code envoyé','Si ce compte existe, un code de réinitialisation a été envoyé.');}
    catch(e:any){Alert.alert('Erreur',e.message);}finally{setBusy(false);}
  };
  const reset=async()=>{
    setBusy(true);
    try{
      const r=await api.resetPassword({email,code,password});
      await signIn(email,password);
      router.replace('/(tabs)');
    }catch(e:any){Alert.alert('Erreur',e.message);}finally{setBusy(false);}
  };

  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={s.container}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={()=>router.back()}><Text style={s.back}>‹ Retour</Text></Pressable>
      <Text style={s.logo}>Rainbow <Text style={{color:colors.yellow}}>Colors</Text></Text>
      {!forgot?<><Text style={s.title}>{mode==='login'?'Connexion':'Créer un compte'}</Text>
        <Text style={s.subtitle}>{mode==='login'?'Accédez à votre panier et vos commandes.':'Créez votre compte Rainbow Colors en quelques secondes.'}</Text>
        {mode==='register'?<>
          <TextInput value={firstName} onChangeText={setFirstName} placeholder="Prénom" style={s.input}/>
          <TextInput value={lastName} onChangeText={setLastName} placeholder="Nom" style={s.input}/>
          <TextInput value={phone} onChangeText={setPhone} placeholder="Téléphone" keyboardType="phone-pad" style={s.input}/>
        </>:null}
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={s.input}/>
        <TextInput value={password} onChangeText={setPassword} placeholder="Mot de passe" secureTextEntry style={s.input}/>
        <Pressable style={s.primary} onPress={submit} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.primaryText}>{mode==='login'?'Se connecter':'Créer mon compte'}</Text>}</Pressable>
        {mode==='login'?<Pressable onPress={()=>{setForgot(true);setResetStep(false)}}><Text style={s.link}>Mot de passe oublié ?</Text></Pressable>:null}
        <Pressable onPress={()=>setMode(mode==='login'?'register':'login')}><Text style={s.switch}>{mode==='login'?'Créer un nouveau compte':'J’ai déjà un compte'}</Text></Pressable>
      </>:<><Text style={s.title}>Réinitialiser le mot de passe</Text><Text style={s.subtitle}>Entrez votre email puis le code reçu.</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={s.input}/>
        {!resetStep?<Pressable style={s.primary} onPress={requestReset} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.primaryText}>Envoyer le code</Text>}</Pressable>:
        <><TextInput value={code} onChangeText={setCode} placeholder="Code à 6 chiffres" keyboardType="number-pad" style={s.input}/><TextInput value={password} onChangeText={setPassword} placeholder="Nouveau mot de passe" secureTextEntry style={s.input}/><Pressable style={s.primary} onPress={reset} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.primaryText}>Changer le mot de passe</Text>}</Pressable></>}
        <Pressable onPress={()=>setForgot(false)}><Text style={s.switch}>Retour à la connexion</Text></Pressable>
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const s=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.bg},content:{padding:20,paddingTop:55,paddingBottom:40},back:{color:colors.blue,fontWeight:'800',fontSize:15},logo:{fontSize:25,fontWeight:'900',color:colors.navy,marginTop:35},title:{fontSize:30,fontWeight:'900',color:colors.text,marginTop:18},subtitle:{color:colors.muted,lineHeight:21,marginTop:7,marginBottom:20},input:{height:52,borderRadius:15,borderWidth:1,borderColor:colors.border,backgroundColor:'#fff',paddingHorizontal:15,color:colors.text,marginBottom:11},primary:{height:52,borderRadius:15,backgroundColor:colors.blue,alignItems:'center',justifyContent:'center',marginTop:4},primaryText:{color:'#fff',fontWeight:'900',fontSize:16},link:{textAlign:'center',color:colors.blue,fontWeight:'800',marginTop:16},switch:{textAlign:'center',color:colors.text,fontWeight:'800',marginTop:22}
});
