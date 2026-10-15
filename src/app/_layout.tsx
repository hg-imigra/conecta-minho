
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../supabase';

const MASTER_EMAIL = 'hgimigra@gmail.com';

export default function AppTabs() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let ativo = true;

    async function verificarAutenticacao() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!ativo || error) return;

        const email = session?.user?.email?.trim().toLowerCase();
        const estaNaConta = pathname === '/conta';
        const estaNoAdmin = pathname === '/admin';

        // A conta MASTER só pode entrar na área administrativa.
        if (email === MASTER_EMAIL) {
          if (!estaNoAdmin) {
            router.replace('/admin');
          }
          return;
        }

        // Sem sessão, só é permitido aceder ao ecrã de conta.
        if (!session && !estaNaConta) {
          router.replace('/conta');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      }
    }

    verificarAutenticacao();

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
