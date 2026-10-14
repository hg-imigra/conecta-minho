import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type WeatherData = {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
    is_day: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
};

const LATITUDE = 41.4425;
const LONGITUDE = -8.2918;

function descricaoTempo(codigo: number) {
  if (codigo === 0) return 'Céu limpo';
  if (codigo === 1) return 'Maioritariamente limpo';
  if (codigo === 2) return 'Parcialmente nublado';
  if (codigo === 3) return 'Nublado';

  if ([45, 48].includes(codigo)) {
    return 'Nevoeiro';
  }

  if ([51, 53, 55].includes(codigo)) {
    return 'Chuvisco';
  }

  if ([56, 57].includes(codigo)) {
    return 'Chuvisco gelado';
  }

  if ([61, 63, 65].includes(codigo)) {
    return 'Chuva';
  }

  if ([66, 67].includes(codigo)) {
    return 'Chuva gelada';
  }

  if ([71, 73, 75, 77].includes(codigo)) {
    return 'Neve';
  }

  if ([80, 81, 82].includes(codigo)) {
    return 'Aguaceiros';
  }

  if ([85, 86].includes(codigo)) {
    return 'Aguaceiros de neve';
  }

  if ([95].includes(codigo)) {
    return 'Trovoada';
  }

  if ([96, 99].includes(codigo)) {
    return 'Trovoada com granizo';
  }

  return 'Condição meteorológica variável';
}

function iconeTempo(codigo: number) {
  if (codigo === 0) return '☀️';
  if (codigo === 1) return '🌤️';
  if (codigo === 2) return '⛅';
  if (codigo === 3) return '☁️';

  if ([45, 48].includes(codigo)) return '🌫️';

  if ([51, 53, 55, 56, 57].includes(codigo)) {
    return '🌦️';
  }

  if ([61, 63, 65, 66, 67].includes(codigo)) {
    return '🌧️';
  }

  if ([71, 73, 75, 77, 85, 86].includes(codigo)) {
    return '🌨️';
  }

  if ([80, 81, 82].includes(codigo)) {
    return '🌦️';
  }

  if ([95, 96, 99].includes(codigo)) {
    return '⛈️';
  }

  return '🌤️';
}

function nomeDia(data: string, indice: number) {
  if (indice === 0) return 'Hoje';

  const dataObj = new Date(`${data}T12:00:00`);

  return dataObj.toLocaleDateString('pt-PT', {
    weekday: 'short',
  });
}

function dataFormatada(data: string) {
  const dataObj = new Date(data);

  return dataObj.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function horaFormatada(data: string) {
  const dataObj = new Date(data);

  return dataObj.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TempoScreen() {
  const router = useRouter();

  const [dados, setDados] = useState<WeatherData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');

  const carregarTempo = useCallback(async () => {
    try {
      setErro('');

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${LATITUDE}` +
        `&longitude=${LONGITUDE}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,is_day` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
        `&timezone=Europe%2FLisbon` +
        `&forecast_days=7` +
        `&temperature_unit=celsius` +
        `&wind_speed_unit=kmh`;

      const resposta = await fetch(url);

      if (!resposta.ok) {
        throw new Error('Erro ao consultar o serviço meteorológico.');
      }

      const json = await resposta.json();

      setDados(json);
    } catch (error) {
      console.error('Erro ao carregar tempo:', error);
      setErro(
        'Não foi possível atualizar o tempo neste momento. Verifique a ligação à internet e tente novamente.'
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregarTempo();
  }, [carregarTempo]);

  function atualizar() {
    setAtualizando(true);
    carregarTempo();
  }

  if (carregando) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          A carregar o tempo em Guimarães...
        </Text>
      </View>
    );
  }

  if (erro && !dados) {
    return (
      <View style={styles.screen}>
        <View style={styles.errorContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹ Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.errorIcon}>🌧️</Text>

          <Text style={styles.errorTitle}>
            Não foi possível carregar o tempo
          </Text>

          <Text style={styles.errorText}>{erro}</Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={atualizar}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!dados) {
    return null;
  }

  const { current, daily } = dados;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizar}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>TEMPO NA REGIÃO</Text>

          <Text style={styles.title}>Guimarães</Text>

          <Text style={styles.subtitle}>
            Condições meteorológicas atuais e previsão.
          </Text>
        </View>

        <View style={styles.currentCard}>
          <View style={styles.currentTop}>
            <View style={styles.currentIconBox}>
              <Text style={styles.currentIcon}>
                {iconeTempo(current.weather_code)}
              </Text>
            </View>

            <View style={styles.currentMain}>
              <Text style={styles.temperature}>
                {Math.round(current.temperature_2m)}°
              </Text>

              <Text style={styles.condition}>
                {descricaoTempo(current.weather_code)}
              </Text>
            </View>
          </View>

          <View style={styles.currentDivider} />

          <Text style={styles.feelsLike}>
            Sensação térmica de{' '}
            <Text style={styles.feelsLikeStrong}>
              {Math.round(current.apparent_temperature)}°C
            </Text>
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>💧</Text>
              <Text style={styles.statLabel}>Humidade</Text>
              <Text style={styles.statValue}>
                {current.relative_humidity_2m}%
              </Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statIcon}>💨</Text>
              <Text style={styles.statLabel}>Vento</Text>
              <Text style={styles.statValue}>
                {Math.round(current.wind_speed_10m)} km/h
              </Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statIcon}>🌧️</Text>
              <Text style={styles.statLabel}>Precipitação</Text>
              <Text style={styles.statValue}>
                {current.precipitation} mm
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.updateCard}>
          <Text style={styles.updateText}>
            Última atualização:{' '}
            <Text style={styles.updateStrong}>
              {dataFormatada(current.time)} às {horaFormatada(current.time)}
            </Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Previsão para os próximos dias</Text>

        <View style={styles.forecastCard}>
          {daily.time.map((dia, index) => (
            <View
              key={dia}
              style={[
                styles.forecastRow,
                index === daily.time.length - 1 &&
                  styles.forecastRowLast,
              ]}
            >
              <View style={styles.forecastDay}>
                <Text style={styles.dayName}>
                  {nomeDia(dia, index)}
                </Text>

                <Text style={styles.dayDate}>
                  {new Date(`${dia}T12:00:00`).toLocaleDateString(
                    'pt-PT',
                    {
                      day: '2-digit',
                      month: '2-digit',
                    }
                  )}
                </Text>
              </View>

              <Text style={styles.forecastIcon}>
                {iconeTempo(daily.weather_code[index])}
              </Text>

              <View style={styles.forecastCondition}>
                <Text style={styles.forecastDescription}>
                  {descricaoTempo(daily.weather_code[index])}
                </Text>

                <Text style={styles.rainProbability}>
                  Chuva: {daily.precipitation_probability_max[index] ?? 0}%
                </Text>
              </View>

              <View style={styles.temperatures}>
                <Text style={styles.maxTemperature}>
                  {Math.round(daily.temperature_2m_max[index])}°
                </Text>

                <Text style={styles.minTemperature}>
                  {Math.round(daily.temperature_2m_min[index])}°
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={atualizar}
          activeOpacity={0.8}
          disabled={atualizando}
        >
          {atualizando ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.refreshButtonText}>
              ↻ Atualizar agora
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.sourceText}>
          Dados meteorológicos atualizados através do Open-Meteo.
        </Text>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },

  scroll: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: '#F5F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    marginTop: 14,
    color: '#626B78',
    fontSize: 16,
    textAlign: 'center',
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

  header: {
    marginBottom: 20,
  },

  eyebrow: {
    color: '#7A2E78',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 6,
  },

  title: {
    color: '#172033',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },

  subtitle: {
    color: '#626B78',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 6,
  },

  currentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E1E5EA',
  },

  currentTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  currentIconBox: {
    width: 82,
    height: 82,
    borderRadius: 22,
    backgroundColor: '#EEF5FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },

  currentIcon: {
    fontSize: 46,
  },

  currentMain: {
    flex: 1,
  },

  temperature: {
    color: '#172033',
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '800',
  },

  condition: {
    color: '#626B78',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 2,
  },

  currentDivider: {
    height: 1,
    backgroundColor: '#E7E9ED',
    marginVertical: 18,
  },

  feelsLike: {
    color: '#626B78',
    fontSize: 15,
  },

  feelsLikeStrong: {
    color: '#172033',
    fontWeight: '800',
  },

  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  statIcon: {
    fontSize: 20,
    marginBottom: 5,
  },

  statLabel: {
    color: '#7B8490',
    fontSize: 12,
    textAlign: 'center',
  },

  statValue: {
    color: '#172033',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
    textAlign: 'center',
  },

  updateCard: {
    backgroundColor: '#EEF5FB',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 12,
  },

  updateText: {
    color: '#626B78',
    fontSize: 13,
    lineHeight: 19,
  },

  updateStrong: {
    color: '#172033',
    fontWeight: '700',
  },

  sectionTitle: {
    color: '#172033',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 26,
    marginBottom: 12,
  },

  forecastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E1E5EA',
    overflow: 'hidden',
  },

  forecastRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF1',
  },

  forecastRowLast: {
    borderBottomWidth: 0,
  },

  forecastDay: {
    width: 56,
  },

  dayName: {
    color: '#172033',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  dayDate: {
    color: '#8A929D',
    fontSize: 11,
    marginTop: 2,
  },

  forecastIcon: {
    fontSize: 26,
    width: 38,
    textAlign: 'center',
  },

  forecastCondition: {
    flex: 1,
    paddingHorizontal: 8,
  },

  forecastDescription: {
    color: '#172033',
    fontSize: 12,
    fontWeight: '700',
  },

  rainProbability: {
    color: '#7B8490',
    fontSize: 11,
    marginTop: 3,
  },

  temperatures: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 52,
    justifyContent: 'flex-end',
  },

  maxTemperature: {
    color: '#172033',
    fontSize: 15,
    fontWeight: '800',
  },

  minTemperature: {
    color: '#9299A3',
    fontSize: 14,
    fontWeight: '600',
  },

  refreshButton: {
    marginTop: 18,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DDE3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshButtonText: {
    color: '#7A2E78',
    fontSize: 15,
    fontWeight: '800',
  },

  sourceText: {
    color: '#8A929D',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
  },

  errorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorIcon: {
    fontSize: 54,
    marginBottom: 18,
  },

  errorTitle: {
    color: '#172033',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },

  errorText: {
    color: '#626B78',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },

  retryButton: {
    backgroundColor: '#7A2E78',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 30,
  },
});