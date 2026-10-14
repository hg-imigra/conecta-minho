import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { supabase } from '../supabase';

type Anuncio = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  localidade: string | null;
  preco: number | null;
  preco_negociavel: boolean | null;
  tipo_anuncio: string | null;
  latitude: number | null;
  longitude: number | null;
};

type AnuncioProximo = Anuncio & {
  distancia: number;
};

export default function PertoScreen() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [localizacaoEncontrada, setLocalizacaoEncontrada] =
    useState(false);

  const [cidade, setCidade] = useState('');
  const [regiao, setRegiao] = useState('');

  const [erro, setErro] = useState('');

  const [anuncios, setAnuncios] = useState<AnuncioProximo[]>(
    []
  );

  const [carregandoAnuncios, setCarregandoAnuncios] =
    useState(false);

  const calcularDistancia = (
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number
  ) => {
    const raioTerra = 6371;

    const diferencaLatitude =
      ((latitude2 - latitude1) * Math.PI) / 180;

    const diferencaLongitude =
      ((longitude2 - longitude1) * Math.PI) / 180;

    const a =
      Math.sin(diferencaLatitude / 2) *
        Math.sin(diferencaLatitude / 2) +
      Math.cos((latitude1 * Math.PI) / 180) *
        Math.cos((latitude2 * Math.PI) / 180) *
        Math.sin(diferencaLongitude / 2) *
        Math.sin(diferencaLongitude / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return raioTerra * c;
  };

  const formatarDistancia = (
    distancia: number
  ) => {
    if (distancia < 1) {
      return `${Math.round(distancia * 1000)} m`;
    }

    return `${distancia.toFixed(1).replace('.', ',')} km`;
  };

  const abrirAnuncio = (id: string) => {
    router.push({
      pathname: '/anuncio',
      params: {
        id,
      },
    } as any);
  };

  const buscarAnunciosProximos = async (
    latitudeUtilizador: number,
    longitudeUtilizador: number
  ) => {
    try {
      setCarregandoAnuncios(true);

      const { data, error } = await supabase
        .from('anuncios')
        .select(
          `
          id,
          titulo,
          descricao,
          categoria,
          localidade,
          preco,
          preco_negociavel,
          tipo_anuncio,
          latitude,
          longitude
          `
        )
        .eq('estado', 'publicado')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        throw error;
      }

      const anunciosComDistancia: AnuncioProximo[] = (
        data || []
      )
        .filter(
          (anuncio) =>
            anuncio.latitude !== null &&
            anuncio.longitude !== null
        )
        .map((anuncio) => {
          const distancia = calcularDistancia(
            latitudeUtilizador,
            longitudeUtilizador,
            Number(anuncio.latitude),
            Number(anuncio.longitude)
          );

          return {
            ...anuncio,
            distancia,
          };
        })
        .filter(
          (anuncio) => anuncio.distancia <= 50
        )
        .sort(
          (a, b) =>
            a.distancia - b.distancia
        );

      setAnuncios(anunciosComDistancia);
    } catch (error) {
      console.log(
        'Erro ao buscar anúncios próximos:',
        error
      );

      setErro(
        'Não foi possível carregar os anúncios próximos. Tente novamente.'
      );
    } finally {
      setCarregandoAnuncios(false);
    }
  };

  const obterLocalizacao = async () => {
    try {
      setCarregando(true);
      setErro('');
      setAnuncios([]);

      const servicosAtivos =
        await Location.hasServicesEnabledAsync();

      if (!servicosAtivos) {
        setErro(
          'A localização do telemóvel está desativada. Ative a localização e tente novamente.'
        );

        setCarregando(false);
        return;
      }

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErro(
          'O acesso à localização foi recusado. É necessário permitir a localização para encontrar serviços próximos.'
        );

        setCarregando(false);
        return;
      }

      const localizacao =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      const latitudeUtilizador =
        localizacao.coords.latitude;

      const longitudeUtilizador =
        localizacao.coords.longitude;

      const endereco =
        await Location.reverseGeocodeAsync({
          latitude: latitudeUtilizador,
          longitude: longitudeUtilizador,
        });

      if (endereco.length > 0) {
        const primeiro = endereco[0];

        setCidade(
          primeiro.city ||
            primeiro.district ||
            primeiro.subregion ||
            'Localização atual'
        );

        setRegiao(
          primeiro.region ||
            primeiro.subregion ||
            primeiro.district ||
            'Portugal'
        );
      } else {
        setCidade('Localização encontrada');
        setRegiao('Portugal');
      }

      setLocalizacaoEncontrada(true);

      await buscarAnunciosProximos(
        latitudeUtilizador,
        longitudeUtilizador
      );
    } catch (error) {
      console.log(
        'Erro ao obter localização:',
        error
      );

      setErro(
        'Não foi possível obter a sua localização. Tente novamente.'
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    obterLocalizacao();
  }, []);

  const tentarNovamente = async () => {
    await obterLocalizacao();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              Perto de si
            </Text>

            <Text style={styles.subtitle}>
              Serviços e anúncios próximos
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>
              ×
            </Text>
          </TouchableOpacity>
        </View>

        {/* LOCALIZAÇÃO */}
        <View style={styles.locationCard}>
          <View
            style={styles.locationIconContainer}
          >
            <Text style={styles.locationIcon}>
              📍
            </Text>
          </View>

          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>
              A sua localização
            </Text>

            {carregando ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" />

                <Text style={styles.loadingText}>
                  A obter localização...
                </Text>
              </View>
            ) : localizacaoEncontrada ? (
              <>
                <Text style={styles.cityText}>
                  {cidade}
                </Text>

                <Text style={styles.regionText}>
                  {regiao}
                </Text>
              </>
            ) : (
              <Text style={styles.errorText}>
                Localização não disponível
              </Text>
            )}
          </View>
        </View>

        {/* ERRO */}
        {!carregando && erro ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>
              ⚠️
            </Text>

            <Text style={styles.errorTitle}>
              Não foi possível obter a localização
            </Text>

            <Text
              style={styles.errorDescription}
            >
              {erro}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.retryButton}
              onPress={tentarNovamente}
            >
              <Text
                style={styles.retryButtonText}
              >
                Tentar novamente
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* CARREGANDO ANÚNCIOS */}
        {!carregando &&
        localizacaoEncontrada &&
        carregandoAnuncios ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" />

            <Text style={styles.loadingCardText}>
              A procurar anúncios próximos...
            </Text>
          </View>
        ) : null}

        {/* ANÚNCIOS ENCONTRADOS */}
        {!carregando &&
        localizacaoEncontrada &&
        !carregandoAnuncios &&
        anuncios.length > 0 ? (
          <View>
            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.resultsTitle}>
                  Perto de si
                </Text>

                <Text style={styles.resultsSubtitle}>
                  {anuncios.length === 1
                    ? '1 anúncio encontrado'
                    : `${anuncios.length} anúncios encontrados`}
                </Text>
              </View>

              <View style={styles.radiusBadge}>
                <Text style={styles.radiusBadgeText}>
                  Até 50 km
                </Text>
              </View>
            </View>

            {anuncios.map((anuncio) => (
              <TouchableOpacity
                key={anuncio.id}
                activeOpacity={0.85}
                style={styles.anuncioCard}
                onPress={() =>
                  abrirAnuncio(anuncio.id)
                }
              >
                <View
                  style={styles.anuncioIconContainer}
                >
                  <Text style={styles.anuncioIcon}>
                    {anuncio.tipo_anuncio ===
                    'Automóvel'
                      ? '🚗'
                      : anuncio.tipo_anuncio ===
                        'Imóvel'
                      ? '🏠'
                      : anuncio.tipo_anuncio ===
                        'Emprego / vaga'
                      ? '💼'
                      : anuncio.tipo_anuncio ===
                        'Evento'
                      ? '📅'
                      : anuncio.tipo_anuncio ===
                        'Produto para venda'
                      ? '🛍️'
                      : '🔧'}
                  </Text>
                </View>

                <View
                  style={styles.anuncioInfo}
                >
                  <Text
                    style={styles.anuncioTitulo}
                    numberOfLines={2}
                  >
                    {anuncio.titulo}
                  </Text>

                  {anuncio.categoria ? (
                    <Text
                      style={
                        styles.anuncioCategoria
                      }
                      numberOfLines={1}
                    >
                      {anuncio.categoria}
                    </Text>
                  ) : null}

                  {anuncio.localidade ? (
                    <Text
                      style={
                        styles.anuncioLocalidade
                      }
                      numberOfLines={1}
                    >
                      📍 {anuncio.localidade}
                    </Text>
                  ) : null}

                  {anuncio.preco !== null ? (
                    <Text
                      style={styles.anuncioPreco}
                    >
                      {Number(
                        anuncio.preco
                      )
                        .toFixed(2)
                        .replace('.', ',')}{' '}
                      €
                      {anuncio.preco_negociavel
                        ? ' • Negociável'
                        : ''}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={styles.distanciaContainer}
                >
                  <Text
                    style={styles.distanciaIcon}
                  >
                    📍
                  </Text>

                  <Text
                    style={styles.distanciaText}
                  >
                    {formatarDistancia(
                      anuncio.distancia
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* NENHUM ANÚNCIO */}
        {!carregando &&
        localizacaoEncontrada &&
        !carregandoAnuncios &&
        anuncios.length === 0 &&
        !erro ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📍
            </Text>

            <Text style={styles.emptyTitle}>
              Ainda não existem anúncios próximos
            </Text>

            <Text style={styles.emptyDescription}>
              Quando novos serviços, profissionais
              e anúncios forem publicados na sua
              região, eles aparecerão automaticamente
              aqui.
            </Text>

            <View style={styles.emptyInfo}>
              <Text style={styles.emptyInfoIcon}>
                💡
              </Text>

              <Text
                style={styles.emptyInfoText}
              >
                O Conecta está preparado para mostrar
                primeiro os anúncios mais próximos de
                si.
              </Text>
            </View>
          </View>
        ) : null}

        {/* RODAPÉ */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Conecta Guimarães
          </Text>

          <Text style={styles.footerSubtext}>
            Guimarães • Vizela • Fafe
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  logo: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1677B8',
  },

  subtitle: {
    fontSize: 14,
    color: '#68727E',
    marginTop: 3,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    fontSize: 30,
    color: '#59636F',
    lineHeight: 32,
    marginTop: -2,
  },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6E9ED',
    marginBottom: 16,
  },

  locationIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  locationIcon: {
    fontSize: 28,
  },

  locationInfo: {
    flex: 1,
  },

  locationTitle: {
    fontSize: 14,
    color: '#68727E',
    marginBottom: 4,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 15,
    color: '#27313D',
    marginLeft: 9,
  },

  cityText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#27313D',
  },

  regionText: {
    fontSize: 13,
    color: '#68727E',
    marginTop: 2,
  },

  errorText: {
    fontSize: 14,
    color: '#B42318',
  },

  errorCard: {
    backgroundColor: '#FFF7F5',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F2D2CC',
    marginBottom: 16,
    alignItems: 'center',
  },

  errorIcon: {
    fontSize: 30,
    marginBottom: 10,
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#7A271A',
    textAlign: 'center',
  },

  errorDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8A3A2B',
    textAlign: 'center',
    marginTop: 8,
  },

  retryButton: {
    marginTop: 16,
    backgroundColor: '#1677B8',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E6E9ED',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingCardText: {
    fontSize: 14,
    color: '#68727E',
    marginTop: 10,
  },

  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },

  resultsTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#27313D',
  },

  resultsSubtitle: {
    fontSize: 13,
    color: '#68727E',
    marginTop: 3,
  },

  radiusBadge: {
    backgroundColor: '#EAF4FB',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  radiusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1677B8',
  },

  anuncioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6E9ED',
    marginBottom: 11,
  },

  anuncioIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  anuncioIcon: {
    fontSize: 25,
  },

  anuncioInfo: {
    flex: 1,
    paddingRight: 8,
  },

  anuncioTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#27313D',
  },

  anuncioCategoria: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1677B8',
    marginTop: 4,
  },

  anuncioLocalidade: {
    fontSize: 12,
    color: '#68727E',
    marginTop: 4,
  },

  anuncioPreco: {
    fontSize: 13,
    fontWeight: '800',
    color: '#27313D',
    marginTop: 5,
  },

  distanciaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
  },

  distanciaIcon: {
    fontSize: 16,
    marginBottom: 2,
  },

  distanciaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1677B8',
    textAlign: 'center',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E6E9ED',
    alignItems: 'center',
    marginTop: 4,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#27313D',
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#68727E',
    textAlign: 'center',
    marginTop: 9,
  },

  emptyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4FB',
    borderRadius: 14,
    padding: 13,
    marginTop: 18,
    width: '100%',
  },

  emptyInfoIcon: {
    fontSize: 21,
    marginRight: 9,
  },

  emptyInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#36566A',
  },

  footer: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 10,
  },

  footerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#68727E',
  },

  footerSubtext: {
    fontSize: 12,
    color: '#9AA2AA',
    marginTop: 4,
  },
});