import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../supabase';

type Profissional = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  categoria: string | null;
  localidade: string | null;
  preco: number | string | null;
  preco_negociavel: boolean | null;
};

const CHAVE_REGIAO = '@conecta_regiao';

function normalizarTexto(valor: string | null | undefined) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function ProfissionaisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [pesquisa, setPesquisa] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [regiaoSelecionada, setRegiaoSelecionada] = useState('Guimarães');

  useEffect(() => {
    carregarRegiaoEProfissionais();
  }, []);

  async function carregarRegiaoEProfissionais() {
    setCarregando(true);
    setErro('');

    try {
      const regiaoSalva = await AsyncStorage.getItem(CHAVE_REGIAO);

      const regiao =
        regiaoSalva === 'Guimarães' ||
        regiaoSalva === 'Vizela' ||
        regiaoSalva === 'Fafe'
          ? regiaoSalva
          : 'Guimarães';

      setRegiaoSelecionada(regiao);

      await carregarProfissionais(regiao);
    } catch (error) {
      console.error('Erro ao carregar região:', error);
      setErro(
        'Não foi possível carregar os profissionais neste momento.'
      );
      setProfissionais([]);
      setCarregando(false);
    }
  }

  async function carregarProfissionais(regiao?: string) {
    setCarregando(true);
    setErro('');

    const regiaoAtual = regiao || regiaoSelecionada || 'Guimarães';

    const { data, error } = await supabase
      .from('anuncios')
      .select(
        'id, titulo, descricao, categoria, localidade, preco, preco_negociavel'
      )
      .eq('estado', 'publicado')
      .eq('tipo_anuncio', 'Serviço profissional')
      .order('publicado_em', { ascending: false });

    if (error) {
      console.error('Erro ao carregar profissionais:', error);
      setErro(
        'Não foi possível carregar os profissionais neste momento.'
      );
      setProfissionais([]);
    } else {
      const regiaoNormalizada = normalizarTexto(regiaoAtual);

      const profissionaisDaRegiao = ((data as Profissional[]) || []).filter(
        (profissional) => {
          const localidade = normalizarTexto(
            profissional.localidade
          );

          if (!localidade) {
            return false;
          }

          return (
            localidade === regiaoNormalizada ||
            localidade.includes(regiaoNormalizada) ||
            regiaoNormalizada.includes(localidade)
          );
        }
      );

      setProfissionais(profissionaisDaRegiao);
    }

    setCarregando(false);
  }

  const profissionaisFiltrados = profissionais.filter((profissional) => {
    const termo = pesquisa.trim().toLowerCase();

    if (!termo) {
      return true;
    }

    const texto = [
      profissional.titulo,
      profissional.descricao,
      profissional.categoria,
      profissional.localidade,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return texto.includes(termo);
  });

  function abrirAnuncio(id: string) {
    router.push({
      pathname: '/profissional' as any,
      params: { id },
    });
  }

  function voltarInicio() {
    router.replace('/');
  }

  function formatarPreco(preco: number | string | null) {
    if (preco === null || preco === undefined || preco === '') {
      return 'Preço sob consulta';
    }

    const numero = Number(preco);

    if (Number.isNaN(numero)) {
      return String(preco);
    }

    return `${numero.toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.contentArea,
          {
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={voltarInicio}
            activeOpacity={0.8}
          >
            <Text style={styles.backText}>‹ Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            Encontrar profissionais
          </Text>

          <Text style={styles.subtitle}>
            Encontre profissionais e serviços disponíveis no Conecta
            Guimarães.
          </Text>

          <View style={styles.regionBadge}>
            <Text style={styles.regionBadgeIcon}>📍</Text>

            <Text style={styles.regionBadgeText}>
              Região: {regiaoSelecionada}
            </Text>
          </View>

          <View style={styles.searchBox}>
            <TextInput
              value={pesquisa}
              onChangeText={setPesquisa}
              placeholder="Procurar profissional ou serviço..."
              placeholderTextColor="#8A8A8A"
              style={styles.input}
              returnKeyType="search"
            />
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={carregarRegiaoEProfissionais}
            activeOpacity={0.8}
          >
            <Text style={styles.refreshText}>
              Atualizar profissionais
            </Text>
          </TouchableOpacity>

          {carregando ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" />

              <Text style={styles.loadingText}>
                A carregar profissionais...
              </Text>
            </View>
          ) : erro ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>
                Não foi possível carregar
              </Text>

              <Text style={styles.messageText}>
                {erro}
              </Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={carregarRegiaoEProfissionais}
                activeOpacity={0.8}
              >
                <Text style={styles.retryText}>
                  Tentar novamente
                </Text>
              </TouchableOpacity>
            </View>
          ) : profissionaisFiltrados.length === 0 ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>
                {pesquisa.trim()
                  ? 'Nenhum profissional encontrado'
                  : `Ainda não existem profissionais publicados em ${regiaoSelecionada}`}
              </Text>

              <Text style={styles.messageText}>
                {pesquisa.trim()
                  ? `Não encontramos profissionais para "${pesquisa}" em ${regiaoSelecionada}.`
                  : `Os profissionais de ${regiaoSelecionada} aparecerão aqui depois de serem publicados.`}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultsTitle}>
                {profissionaisFiltrados.length === 1
                  ? '1 profissional encontrado'
                  : `${profissionaisFiltrados.length} profissionais encontrados`}
              </Text>

              {profissionaisFiltrados.map((profissional) => (
                <View
                  key={profissional.id}
                  style={styles.card}
                >
                  <Text style={styles.cardTitle}>
                    {profissional.titulo || 'Profissional'}
                  </Text>

                  <Text style={styles.category}>
                    {profissional.categoria ||
                      'Serviço profissional'}
                  </Text>

                  {profissional.localidade ? (
                    <Text style={styles.location}>
                      📍 {profissional.localidade}
                    </Text>
                  ) : null}

                  <Text style={styles.price}>
                    {formatarPreco(profissional.preco)}
                    {profissional.preco_negociavel
                      ? ' · Negociável'
                      : ''}
                  </Text>

                  {profissional.descricao ? (
                    <Text
                      style={styles.description}
                      numberOfLines={3}
                    >
                      {profissional.descricao}
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() =>
                      abrirAnuncio(profissional.id)
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewButtonText}>
                      Ver profissional
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>

      <View
        style={[
          styles.bottomSafeArea,
          {
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomItem}
            activeOpacity={0.7}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.bottomIcon}>⌂</Text>
            <Text style={styles.bottomTextActive}>
              Início
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomItem}
            activeOpacity={0.7}
            onPress={() => router.push('/pesquisar')}
          >
            <Text style={styles.bottomIcon}>🔎</Text>
            <Text style={styles.bottomText}>
              Pesquisar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomItem}
            activeOpacity={0.7}
            onPress={() => router.push('/publicar')}
          >
            <Text style={styles.bottomIcon}>＋</Text>
            <Text style={styles.bottomText}>
              Publicar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomItem}
            activeOpacity={0.7}
            onPress={() => router.push('/mensagens')}
          >
            <Text style={styles.bottomIcon}>💬</Text>
            <Text style={styles.bottomText}>
              Mensagens
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomItem}
            activeOpacity={0.7}
            onPress={() => router.push('/conta')}
          >
            <Text style={styles.bottomIcon}>👤</Text>
            <Text style={styles.bottomText}>
              Conta
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },

  contentArea: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },

  scroll: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 18,
  },

  backText: {
    color: '#7A2E78',
    fontSize: 18,
    fontWeight: '800',
  },

  title: {
    color: '#172033',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    marginBottom: 10,
  },

  subtitle: {
    color: '#626B78',
    fontSize: 17,
    lineHeight: 25,
    marginBottom: 16,
  },

  regionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EAF3',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
  },

  regionBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },

  regionBadgeText: {
    color: '#7A2E78',
    fontSize: 13,
    fontWeight: '800',
  },

  searchBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DDE3',
    borderRadius: 18,
    minHeight: 60,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  input: {
    color: '#172033',
    fontSize: 17,
    minHeight: 58,
  },

  refreshButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 18,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  refreshText: {
    color: '#7A2E78',
    fontSize: 15,
    fontWeight: '800',
  },

  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },

  loadingText: {
    color: '#626B78',
    fontSize: 16,
    marginTop: 14,
  },

  resultsTitle: {
    color: '#172033',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E0E3E8',
    padding: 20,
    marginBottom: 16,
  },

  cardTitle: {
    color: '#172033',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginBottom: 6,
  },

  category: {
    color: '#177DBA',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },

  location: {
    color: '#626B78',
    fontSize: 16,
    marginBottom: 10,
  },

  price: {
    color: '#172033',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },

  description: {
    color: '#626B78',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 16,
  },

  viewButton: {
    backgroundColor: '#177DBA',
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E3E8',
    padding: 22,
    marginTop: 10,
  },

  messageTitle: {
    color: '#172033',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },

  messageText: {
    color: '#626B78',
    fontSize: 16,
    lineHeight: 24,
  },

  retryButton: {
    marginTop: 18,
    backgroundColor: '#177DBA',
    borderRadius: 14,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 25,
  },

  bottomSafeArea: {
    backgroundColor: '#FFFFFF',
  },

  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E4E8',
    minHeight: 68,
    paddingHorizontal: 4,
    paddingTop: 6,
  },

  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomIcon: {
    fontSize: 20,
    lineHeight: 24,
  },

  bottomText: {
    color: '#626B78',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  bottomTextActive: {
    color: '#7A2E78',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
});