import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supabase';

type Anuncio = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  localidade: string | null;
  preco: number | null;
  preco_negociavel: boolean | null;
  tipo_anuncio: string | null;
  dados_especificos: Record<string, unknown> | null;
};

function obterImagem(anuncio: Anuncio): string | null {
  const imagens = anuncio.dados_especificos?.imagens;

  if (Array.isArray(imagens)) {
    const primeira = imagens.find(
      (valor): valor is string =>
        typeof valor === 'string' &&
        /^https?:\/\//i.test(valor.trim())
    );

    if (primeira) return primeira.trim();
  }

  return null;
}

function formatarPreco(anuncio: Anuncio): string {
  const dados = anuncio.dados_especificos || {};

  const candidatos: unknown[] = [
    anuncio.preco,
    dados.preco,
    dados.preco_valor,
    dados.valor_preco,
    dados.precoAnuncio,
    dados.preco_anuncio,
    dados.valor,
  ];

  const encontrado = candidatos.find(
    (valor) =>
      valor !== null &&
      valor !== undefined &&
      String(valor).trim() !== ''
  );

  if (encontrado !== undefined) {
    const texto = String(encontrado).trim();

    const numero =
      typeof encontrado === 'number'
        ? encontrado
        : Number(
            texto
              .replace(/\s/g, '')
              .replace(/[€]/g, '')
              .replace(/\.(?=\d{3}(?:\D|$))/g, '')
              .replace(',', '.')
              .replace(/[^0-9.-]/g, '')
          );

    if (Number.isFinite(numero) && numero >= 0) {
      const valor = numero.toLocaleString('pt-PT', {
        style: 'currency',
        currency: 'EUR',
      });

      return anuncio.preco_negociavel
        ? `${valor} · Negociável`
        : valor;
    }

    if (texto && !/^sob consulta$/i.test(texto)) {
      return texto;
    }
  }

  return anuncio.preco_negociavel
    ? 'Preço negociável'
    : 'Preço sob consulta';
}

function eAnuncioPrivé(anuncio: Anuncio): boolean {
  const tipo = String(anuncio.tipo_anuncio || '').toLocaleLowerCase('pt-PT');
  const dados = anuncio.dados_especificos || {};

  return (
    Boolean(dados.submissao_prive) ||
    tipo.includes('adulto') ||
    tipo.includes('privé') ||
    tipo.includes('prive')
  );
}

export default function AnunciosAnuncianteScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    userId?: string;
    nome?: string;
  }>();

  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  const nomeParam = Array.isArray(params.nome)
    ? params.nome[0]
    : params.nome;

  const nome = nomeParam?.trim() || 'Anunciante Conecta';

  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [imagensComErro, setImagensComErro] = useState<string[]>([]);

  const carregarAnuncios = useCallback(async () => {
    if (!userId) {
      setErro('Não foi possível identificar o anunciante.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro('');

    try {
      const { data, error } = await supabase
        .from('anuncios')
        .select(
          'id, user_id, titulo, descricao, categoria, localidade, preco, preco_negociavel, tipo_anuncio, dados_especificos'
        )
        .eq('user_id', userId)
        .eq('estado', 'publicado')
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const publicados = ((data || []) as Anuncio[]).filter(
        (anuncio) => !eAnuncioPrivé(anuncio)
      );

      setAnuncios(publicados);
    } catch (error) {
      console.error('Erro ao carregar anúncios do anunciante:', error);
      setErro('Não foi possível carregar os anúncios deste anunciante.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      if (!userId) {
        setErro('Não foi possível identificar o anunciante.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErro('');

      try {
        const { data, error } = await supabase
          .from('anuncios')
          .select(
            'id, user_id, titulo, descricao, categoria, localidade, preco, preco_negociavel, tipo_anuncio, dados_especificos'
          )
          .eq('user_id', userId)
          .eq('estado', 'publicado')
          .order('criado_em', { ascending: false });

        if (error) throw error;

        const publicados = ((data || []) as Anuncio[]).filter(
          (anuncio) => !eAnuncioPrivé(anuncio)
        );

        if (ativo) setAnuncios(publicados);
      } catch (error) {
        console.error('Erro ao carregar anúncios do anunciante:', error);

        if (ativo) {
          setErro('Não foi possível carregar os anúncios deste anunciante.');
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [userId]);

  function abrirAnuncio(id: string) {
    router.push({
      pathname: '/anuncio',
      params: { id },
    });
  }

  function voltar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/pesquisar');
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={voltar}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Text style={styles.backText}>‹</Text>
          <Text style={styles.backLabel}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {nome.charAt(0).toLocaleUpperCase('pt-PT')}
            </Text>
          </View>

          <View style={styles.profileText}>
            <Text style={styles.eyebrow}>MONTRA DO ANUNCIANTE</Text>
            <Text style={styles.profileName}>{nome}</Text>
            <Text style={styles.profileSubtitle}>
              Conhece os anúncios publicados
            </Text>
          </View>
        </View>

        {!loading && !erro && anuncios.length > 0 ? (
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Anúncios publicados</Text>
              <Text style={styles.sectionSubtitle}>
                Descobre o que este anunciante tem para oferecer.
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>{anuncios.length}</Text>
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color="#0879C9" />
            <Text style={styles.stateText}>
              A carregar anúncios...
            </Text>
          </View>
        ) : erro ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateIcon}>!</Text>
            <Text style={styles.emptyTitle}>Não foi possível carregar</Text>
            <Text style={styles.stateText}>{erro}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={carregarAnuncios}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : anuncios.length === 0 ? (
          <View style={styles.stateBox}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>▧</Text>
            </View>

            <Text style={styles.emptyTitle}>
              Ainda não há anúncios publicados
            </Text>

            <Text style={styles.stateText}>
              Este anunciante não tem outros anúncios públicos disponíveis
              neste momento.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {anuncios.map((anuncio) => {
              const foto = obterImagem(anuncio);
              const imagemFalhou = imagensComErro.includes(anuncio.id);

              return (
                <TouchableOpacity
                  key={anuncio.id}
                  style={styles.card}
                  onPress={() => abrirAnuncio(anuncio.id)}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver anúncio ${anuncio.titulo}`}
                >
                  <View style={styles.photoContainer}>
                    {foto && !imagemFalhou ? (
                      <Image
                        source={{ uri: foto }}
                        style={styles.photo}
                        resizeMode="cover"
                        onError={() =>
                          setImagensComErro((atuais) =>
                            atuais.includes(anuncio.id)
                              ? atuais
                              : [...atuais, anuncio.id]
                          )
                        }
                      />
                    ) : (
                      <View style={styles.noPhoto}>
                        <Text style={styles.noPhotoIcon}>▧</Text>
                        <Text style={styles.noPhotoText}>
                          Fotografia indisponível
                        </Text>
                      </View>
                    )}

                    <View style={styles.photoBadge}>
                      <Text style={styles.photoBadgeText}>
                        {anuncio.categoria || anuncio.tipo_anuncio || 'Anúncio'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {anuncio.titulo}
                    </Text>

                    {anuncio.localidade ? (
                      <View style={styles.locationRow}>
                        <Text style={styles.locationIcon}>⌖</Text>
                        <Text style={styles.location} numberOfLines={1}>
                          {anuncio.localidade}
                        </Text>
                      </View>
                    ) : null}

                    {anuncio.descricao ? (
                      <Text style={styles.description} numberOfLines={2}>
                        {anuncio.descricao.trim()}
                      </Text>
                    ) : null}

                    <View style={styles.cardFooter}>
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>PREÇO</Text>
                        <Text style={styles.price} numberOfLines={2}>
                          {formatarPreco(anuncio)}
                        </Text>
                      </View>

                      <View style={styles.viewButton}>
                        <Text style={styles.viewButtonText}>Ver anúncio</Text>
                        <Text style={styles.viewArrow}>›</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Conecta Minho</Text>
          <Text style={styles.footerSubtext}>
            Serviços e oportunidades perto de ti.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7FB',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 14,
    marginBottom: 12,
  },
  backText: {
    color: '#14263D',
    fontSize: 31,
    lineHeight: 34,
    marginRight: 8,
  },
  backLabel: {
    color: '#1677B8',
    fontSize: 15,
    fontWeight: '800',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E3EAF2',
    padding: 18,
    marginBottom: 25,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#E5F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#D6EAFE',
  },
  avatarText: {
    color: '#0879C9',
    fontSize: 28,
    fontWeight: '900',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: '#1677B8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  profileName: {
    color: '#132238',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  profileSubtitle: {
    color: '#718096',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: '#132238',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#718096',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    maxWidth: 300,
  },
  countBadge: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 19,
    backgroundColor: '#E0F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#0879C9',
    fontSize: 15,
    fontWeight: '900',
  },
  list: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E9F1',
    overflow: 'hidden',
  },
  photoContainer: {
    height: 220,
    backgroundColor: '#E8EEF4',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8EEF4',
  },
  noPhoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1F7',
  },
  noPhotoIcon: {
    fontSize: 38,
    color: '#8799AC',
    marginBottom: 5,
  },
  noPhotoText: {
    color: '#718096',
    fontSize: 12,
    fontWeight: '600',
  },
  photoBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    maxWidth: '82%',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  photoBadgeText: {
    color: '#0879C9',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 17,
  },
  cardTitle: {
    color: '#132238',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationIcon: {
    color: '#1677B8',
    fontSize: 20,
    marginRight: 6,
  },
  location: {
    flex: 1,
    color: '#64748B',
    fontSize: 13,
  },
  description: {
    color: '#52647A',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F5',
    marginTop: 16,
    paddingTop: 14,
  },
  priceContainer: {
    flex: 1,
    minWidth: 0,
  },
  priceLabel: {
    color: '#7B8797',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  price: {
    color: '#0879C9',
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0879C9',
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  viewArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 23,
    marginLeft: 7,
  },
  stateBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3EAF2',
  },
  stateIcon: {
    color: '#B42318',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  stateText: {
    color: '#718096',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#E8F3FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emptyIcon: {
    color: '#1677B8',
    fontSize: 30,
  },
  emptyTitle: {
    color: '#132238',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0879C9',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E1E8F0',
  },
  footerText: {
    color: '#1677B8',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  footerSubtext: {
    color: '#8491A1',
    fontSize: 12,
    marginTop: 4,
  },
});