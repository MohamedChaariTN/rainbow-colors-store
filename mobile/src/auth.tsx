import * as SecureStore from 'expo-secure-store';
import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {api,User} from './api';

type AuthContextValue={user:User|null;token:string|null;loading:boolean;signIn:(email:string,password:string)=>Promise<void>;signUp:(body:{email:string;password:string;firstName:string;lastName:string;phone?:string})=>Promise<void>;signOut:()=>Promise<void>;refreshUser:()=>Promise<void>};
const AuthContext=createContext<AuthContextValue|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<User|null>(null);
  const [token,setToken]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    try{
      const saved=await SecureStore.getItemAsync('rc_token');
      if(saved){const result=await api.me(saved);setToken(saved);setUser(result.user);}
    }catch{await SecureStore.deleteItemAsync('rc_token').catch(()=>{});}
    finally{setLoading(false);}
  })();},[]);

  const value=useMemo<AuthContextValue>(()=>({
    user,token,loading,
    signIn:async(email,password)=>{
      const result=await api.login({email:email.trim().toLowerCase(),password});
      await SecureStore.setItemAsync('rc_token',result.token,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
      setToken(result.token);setUser(result.user);
    },
    signUp:async(body)=>{
      const result=await api.register({...body,email:body.email.trim().toLowerCase()});
      await SecureStore.setItemAsync('rc_token',result.token,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
      setToken(result.token);setUser(result.user);
    },
    signOut:async()=>{await SecureStore.deleteItemAsync('rc_token').catch(()=>{});setToken(null);setUser(null);},
    refreshUser:async()=>{if(!token)return;const result=await api.me(token);setUser(result.user);}
  }),[user,token,loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth must be used inside AuthProvider');return value;}
