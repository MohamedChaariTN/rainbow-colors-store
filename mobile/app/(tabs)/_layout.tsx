import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/theme';

function Icon({children,active}:{children:string;active:boolean}){
  return <Text style={{fontSize:20,opacity:active?1:0.55}}>{children}</Text>;
}

export default function TabsLayout(){
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:colors.blue,
    tabBarInactiveTintColor:colors.muted,
    tabBarStyle:{height:70,paddingTop:7,paddingBottom:8,backgroundColor:colors.white,borderTopColor:colors.border},
    tabBarLabelStyle:{fontSize:11,fontWeight:'700'}
  }}>
    <Tabs.Screen name="index" options={{title:'Accueil',tabBarIcon:({focused})=><Icon active={focused}>⌂</Icon>}}/>
    <Tabs.Screen name="products" options={{title:'Produits',tabBarIcon:({focused})=><Icon active={focused}>◫</Icon>}}/>
    <Tabs.Screen name="cart" options={{title:'Panier',tabBarIcon:({focused})=><Icon active={focused}>🛒</Icon>}}/>
    <Tabs.Screen name="orders" options={{title:'Commandes',tabBarIcon:({focused})=><Icon active={focused}>▣</Icon>}}/>
    <Tabs.Screen name="account" options={{title:'Compte',tabBarIcon:({focused})=><Icon active={focused}>●</Icon>}}/>
  </Tabs>;
}
