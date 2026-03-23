import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { StandEditorProvider } from '@/src/domains/stand/StandEditorContext';
import { FloatingSidebar } from '@/src/shared/components/FloatingSidebar';
import { useResponsive } from '@/src/shared/hooks/useResponsive';
import { palette } from '@/src/shared/theme/colors';

export default function TabLayout() {
  const { isTablet } = useResponsive();

  return (
    <StandEditorProvider>
    <Tabs
      tabBar={isTablet ? (props) => <FloatingSidebar {...props} /> : undefined}
      screenOptions={{
        sceneStyle: { backgroundColor: palette.background },
        tabBarPosition: isTablet ? 'left' : 'bottom',
        tabBarActiveTintColor: isTablet ? '#FFFDF9' : palette.accent,
        tabBarInactiveTintColor: isTablet ? '#D8C5AB' : palette.mutedText,
        tabBarStyle: isTablet
          ? undefined
          : {
              backgroundColor: palette.surface,
              borderTopColor: palette.border,
              height: 68,
              paddingTop: 8,
            },
        tabBarLabelStyle: isTablet
          ? undefined
          : {
              fontSize: 12,
              fontWeight: '600',
            },
        headerStyle: {
          backgroundColor: palette.background,
        },
        headerShadowVisible: false,
        headerTintColor: palette.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'house.fill', android: 'home', web: 'home' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Voorraad',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabIcon
              name={{ ios: 'square.stack.3d.up.fill', android: 'inventory_2', web: 'inventory_2' }}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="fairs"
        options={{
          title: 'Beurzen',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabIcon
              name={{ ios: 'storefront.fill', android: 'storefront', web: 'storefront' }}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacten',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'person.2.fill', android: 'contacts', web: 'contacts' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Rapporten',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabIcon
              name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stand"
        options={{
          title: 'Stand',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'cube.fill', android: 'view_in_ar', web: 'view_in_ar' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Instellingen',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }} color={color} />
          ),
        }}
      />
    </Tabs>
    </StandEditorProvider>
  );
}

function TabIcon({
  name,
  color,
}: {
  name: {
    ios: 'house.fill' | 'square.stack.3d.up.fill' | 'storefront.fill' | 'person.2.fill' | 'chart.bar.fill' | 'cube.fill' | 'gearshape.fill';
    android: 'home' | 'inventory_2' | 'storefront' | 'contacts' | 'bar_chart' | 'view_in_ar' | 'settings';
    web: 'home' | 'inventory_2' | 'storefront' | 'contacts' | 'bar_chart' | 'view_in_ar' | 'settings';
  };
  color: string;
}) {
  const { isTablet } = useResponsive();
  return <SymbolView name={name} tintColor={color} size={isTablet ? 22 : 18} weight="medium" />;
}
