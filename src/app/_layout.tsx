import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../supabase';

const MASTER_EMAIL = 'hgimigra@gmail.com';

export default function AppTabs() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let ativo = true;

    async function verificarAcessoMaster() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!ativo || !session?.user?.email) return;

        const email = session.user.email.trim().toLowerCase();

        // Apenas a conta MASTER fica limitada à área administrativa.
        if (email === MASTER_EMAIL && pathname !== '/admin') {
          router.replace('/admin');
        }
      } catch (error) {
        console.log('Não foi possível verificar a sessão MASTER:', error);
      }
    }

    verificarAcessoMaster();

    return () => {
      ativo = false;
    };
  }, [pathname, router]);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}