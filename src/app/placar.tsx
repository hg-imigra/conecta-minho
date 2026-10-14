import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Team = {
  id?: string;
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  logo?: string;
};

type Competitor = {
  id?: string;
  team?: Team;
  score?: string;
  winner?: boolean;
  homeAway?: 'home' | 'away';
};

type EventStatus = {
  type?: {
    id?: string;
    name?: string;
    state?: 'pre' | 'in' | 'post';
    completed?: boolean;
    description?: string;
    shortDetail?: string;
  };
  displayClock?: string;
  period?: number;
};

type Competition = {
  id?: string;
  competitors?: Competitor[];
};

type SportEvent = {
  id: string;
  name?: string;
  date?: string;
  competitions?: Competition[];
  status?: EventStatus;
  season?: {
    displayName?: string;
  };
};

type ScoreboardResponse = {
  events?: SportEvent[];
  leagues?: {
    name?: string;
    abbreviation?: string;
  }[];
};

type MatchItem = SportEvent & {
  leagueName: string;
};

const LEAGUES = [
  {
    id: 'por.1',
    name: 'Liga Portugal',
  },
  {
    id: 'uefa.champions',
    name: 'Liga dos Campeões',
  },
  {
    id: 'eng.1',
    name: 'Premier League',
  },
  {
    id: 'esp.1',
    name: 'La Liga',
  },
];

const ESPN_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer';

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

function getDateLabel() {
  return new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function getTime(date?: string) {
  if (!date) return '--:--';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return '--:--';
  }

  return new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function normalizeText(value?: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isVitoria(team?: Team) {
  const value = normalizeText(
    `${team?.displayName || ''} ${team?.shortDisplayName || ''} ${
      team?.abbreviation || ''
    }`
  );

  return (
    value.includes('vitoria sport clube') ||
    value.includes('vitoria sc') ||
    value.includes('vitoria guimaraes') ||
    value.includes('vitoria') ||
    value.includes('vsc')
  );
}

function getStatus(event: SportEvent) {
  const state = event.status?.type?.state;

  if (state === 'in') {
    return 'AO VIVO';
  }

  if (state === 'post' || event.status?.type?.completed) {
    return 'FINAL';
  }

  return 'AGENDADO';
}

function getStatusDescription(event: SportEvent) {
  const state = event.status?.type?.state;

  if (state === 'in') {
    if (event.status?.displayClock) {
      return event.status.displayClock;
    }

    if (event.status?.period) {
      return `${event.status.period}ª parte`;
    }

    return 'Em jogo';
  }

  if (state === 'post' || event.status?.type?.completed) {
    return event.status?.type?.shortDetail || 'Terminado';
  }

  return event.status?.type?.shortDetail || getTime(event.date);
}

function getCompetitors(event: SportEvent) {
  return event.competitions?.[0]?.competitors || [];
}

function getHomeTeam(event: SportEvent) {
  return getCompetitors(event).find(
    (competitor) => competitor.homeAway === 'home'
  );
}

function getAwayTeam(event: SportEvent) {
  return getCompetitors(event).find(
    (competitor) => competitor.homeAway === 'away'
  );
}

function getTeamName(team?: Team) {
  return (
    team?.shortDisplayName ||
    team?.displayName ||
    team?.abbreviation ||
    'Equipa'
  );
}

function getLeagueIcon(name: string) {
  const normalized = normalizeText(name);

  if (normalized.includes('portugal')) return '🇵🇹';
  if (normalized.includes('champions')) return '🏆';
  if (normalized.includes('premier')) return '🏴';
  if (normalized.includes('la liga')) return '🇪🇸';

  return '⚽';
}

export default function PlacarScreen() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const carregarPlacar = useCallback(async () => {
    try {
      setError('');

      const date = getTodayString();

      const responses = await Promise.all(
        LEAGUES.map(async (league) => {
          const url =
            `${ESPN_BASE}/${league.id}/scoreboard` +
            `?dates=${date}&limit=100`;

          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(
              `Não foi possível consultar ${league.name}.`
            );
          }

          const data: ScoreboardResponse = await response.json();

          return (data.events || []).map((event) => ({
            ...event,
            leagueName: league.name,
          }));
        })
      );

      const allMatches = responses
        .flat()
        .filter((event) => event.id);

      allMatches.sort((a, b) => {
        const aVitoria =
          isVitoria(getHomeTeam(a)?.team) ||
          isVitoria(getAwayTeam(a)?.team);

        const bVitoria =
          isVitoria(getHomeTeam(b)?.team) ||
          isVitoria(getAwayTeam(b)?.team);

        if (aVitoria && !bVitoria) return -1;
        if (!aVitoria && bVitoria) return 1;

        const aDate = a.date ? new Date(a.date).getTime() : 0;
        const bDate = b.date ? new Date(b.date).getTime() : 0;

        return aDate - bDate;
      });

      setMatches(allMatches);
    } catch (err) {
      console.log('Erro ao carregar placar:', err);

      setError(
        'Não foi possível atualizar os jogos neste momento. Verifique a ligação à internet e tente novamente.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarPlacar();
  }, [carregarPlacar]);

  const atualizar = async () => {
    setRefreshing(true);
    await carregarPlacar();
  };

  const liveMatches = useMemo(
    () =>
      matches.filter(
        (match) => match.status?.type?.state === 'in'
      ),
    [matches]
  );

  const finishedMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.status?.type?.state === 'post' ||
          match.status?.type?.completed
      ),
    [matches]
  );

  const scheduledMatches = useMemo(
    () =>
      matches.filter(
        (match) => match.status?.type?.state === 'pre'
      ),
    [matches]
  );

  const renderMatch = (match: MatchItem) => {
    const home = getHomeTeam(match);
    const away = getAwayTeam(match);

    const homeIsVitoria = isVitoria(home?.team);
    const awayIsVitoria = isVitoria(away?.team);
    const isVitoriaMatch = homeIsVitoria || awayIsVitoria;

    const status = getStatus(match);
    const statusDescription = getStatusDescription(match);

    return (
      <View
        key={`${match.leagueName}-${match.id}`}
        style={[
          styles.matchCard,
          isVitoriaMatch && styles.vitoriaCard,
        ]}
      >
        <View style={styles.matchTop}>
          <View style={styles.leagueBadge}>
            <Text style={styles.leagueIcon}>
              {getLeagueIcon(match.leagueName)}
            </Text>

            <Text style={styles.leagueText}>
              {match.leagueName}
            </Text>
          </View>

          {isVitoriaMatch && (
            <View style={styles.vitoriaBadge}>
              <Text style={styles.vitoriaBadgeText}>
                VITÓRIA SC
              </Text>
            </View>
          )}
        </View>

        <View style={styles.matchBody}>
          <View style={styles.teamColumn}>
            <Text
              style={[
                styles.teamName,
                homeIsVitoria && styles.vitoriaTeam,
              ]}
              numberOfLines={2}
            >
              {getTeamName(home?.team)}
            </Text>

            {home?.team?.abbreviation && (
              <Text style={styles.teamAbbreviation}>
                {home.team.abbreviation}
              </Text>
            )}
          </View>

          <View style={styles.scoreColumn}>
            {status === 'AGENDADO' ? (
              <>
                <Text style={styles.matchTime}>
                  {getTime(match.date)}
                </Text>

                <Text style={styles.statusText}>
                  {statusDescription}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.scoreRow}>
                  <Text style={styles.score}>
                    {home?.score ?? '-'}
                  </Text>

                  <Text style={styles.scoreSeparator}>-</Text>

                  <Text style={styles.score}>
                    {away?.score ?? '-'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    status === 'AO VIVO'
                      ? styles.livePill
                      : styles.finalPill,
                  ]}
                >
                  {status === 'AO VIVO' && (
                    <View style={styles.liveDot} />
                  )}

                  <Text
                    style={[
                      styles.statusPillText,
                      status === 'AO VIVO'
                        ? styles.liveText
                        : styles.finalText,
                    ]}
                  >
                    {status === 'AO VIVO'
                      ? statusDescription
                      : 'FINAL'}
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.teamColumn}>
            <Text
              style={[
                styles.teamName,
                awayIsVitoria && styles.vitoriaTeam,
              ]}
              numberOfLines={2}
            >
              {getTeamName(away?.team)}
            </Text>

            {away?.team?.abbreviation && (
              <Text style={styles.teamAbbreviation}>
                {away.team.abbreviation}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSection = (
    title: string,
    icon: string,
    items: MatchItem[]
  ) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{icon}</Text>

          <Text style={styles.sectionTitle}>{title}</Text>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {items.length}
            </Text>
          </View>
        </View>

        {items.map(renderMatch)}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={atualizar}
            tintColor="#1677B8"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>Placar</Text>

            <Text style={styles.subtitle}>
              Futebol em tempo real
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.refreshButton}
            onPress={atualizar}
          >
            <Text style={styles.refreshIcon}>↻</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateCard}>
          <View style={styles.dateIconContainer}>
            <Text style={styles.dateIcon}>📅</Text>
          </View>

          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>JOGOS DE HOJE</Text>

            <Text style={styles.dateText}>
              {getDateLabel()}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color="#1677B8"
            />

            <Text style={styles.loadingTitle}>
              A carregar jogos...
            </Text>

            <Text style={styles.loadingText}>
              Estamos a consultar os resultados.
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>

            <Text style={styles.errorTitle}>
              Não foi possível carregar
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.tryAgainButton}
              onPress={atualizar}
            >
              <Text style={styles.tryAgainText}>
                Tentar novamente
              </Text>
            </TouchableOpacity>
          </View>
        ) : matches.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>⚽</Text>

            <Text style={styles.emptyTitle}>
              Sem jogos para hoje
            </Text>

            <Text style={styles.emptyText}>
              Não encontrámos partidas nas competições
              acompanhadas para esta data.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.tryAgainButton}
              onPress={atualizar}
            >
              <Text style={styles.tryAgainText}>
                Atualizar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {liveMatches.length > 0 && (
              <View style={styles.liveBanner}>
                <View style={styles.liveBannerDot} />

                <View style={styles.liveBannerInfo}>
                  <Text style={styles.liveBannerTitle}>
                    {liveMatches.length === 1
                      ? 'Jogo a decorrer'
                      : `${liveMatches.length} jogos a decorrer`}
                  </Text>

                  <Text style={styles.liveBannerText}>
                    Resultados atualizados pela fonte
                  </Text>
                </View>
              </View>
            )}

            {renderSection(
              'AO VIVO',
              '🔴',
              liveMatches
            )}

            {renderSection(
              'RESULTADOS',
              '✅',
              finishedMatches
            )}

            {renderSection(
              'PRÓXIMOS JOGOS',
              '🕐',
              scheduledMatches
            )}
          </>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            ℹ️ Sobre o placar
          </Text>

          <Text style={styles.infoText}>
            Os jogos e resultados são consultados
            diretamente através da fonte de dados
            desportivos no momento da atualização.
          </Text>

          <Text style={styles.infoText}>
            Competições acompanhadas: Liga Portugal,
            Liga dos Campeões, Premier League e La Liga.
          </Text>

          <Text style={styles.updateText}>
            Toque em ↻ ou deslize a tela para atualizar.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Conecta Guimarães
          </Text>

          <Text style={styles.footerSubtext}>
            Guimarães • Vizela • Fafe
          </Text>
        </View>
      </ScrollView>
    </View>
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
    marginBottom: 22,
  },

  headerLeft: {
    flex: 1,
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

  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE2E7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshIcon: {
    fontSize: 28,
    color: '#1677B8',
    lineHeight: 30,
  },

  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E6E9ED',
    padding: 15,
    marginBottom: 20,
  },

  dateIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  dateIcon: {
    fontSize: 25,
  },

  dateInfo: {
    flex: 1,
  },

  dateLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1677B8',
    letterSpacing: 0.5,
  },

  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#27313D',
    marginTop: 3,
    textTransform: 'capitalize',
  },

  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4F4',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F1D5D5',
    padding: 14,
    marginBottom: 20,
  },

  liveBannerDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#D92727',
    marginRight: 12,
  },

  liveBannerInfo: {
    flex: 1,
  },

  liveBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#A51F1F',
  },

  liveBannerText: {
    fontSize: 12,
    color: '#7E5555',
    marginTop: 2,
  },

  section: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1D2733',
  },

  countBadge: {
    minWidth: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 7,
  },

  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1677B8',
  },

  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E6E9ED',
    padding: 14,
    marginBottom: 10,
  },

  vitoriaCard: {
    borderColor: '#BFDDEF',
    borderWidth: 1.5,
  },

  matchTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  leagueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  leagueIcon: {
    fontSize: 15,
    marginRight: 6,
  },

  leagueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#77818C',
    textTransform: 'uppercase',
  },

  vitoriaBadge: {
    backgroundColor: '#EAF4FB',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 8,
  },

  vitoriaBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1677B8',
  },

  matchBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  teamColumn: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },

  teamName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#27313D',
    textAlign: 'center',
    lineHeight: 18,
  },

  vitoriaTeam: {
    color: '#1677B8',
  },

  teamAbbreviation: {
    fontSize: 10,
    color: '#9299A1',
    marginTop: 3,
    fontWeight: '700',
  },

  scoreColumn: {
    width: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 7,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  score: {
    fontSize: 25,
    fontWeight: '900',
    color: '#1D2733',
    minWidth: 28,
    textAlign: 'center',
  },

  scoreSeparator: {
    fontSize: 19,
    fontWeight: '700',
    color: '#8A939D',
    marginHorizontal: 3,
  },

  matchTime: {
    fontSize: 21,
    fontWeight: '900',
    color: '#1D2733',
  },

  statusText: {
    fontSize: 10,
    color: '#8A939D',
    textAlign: 'center',
    marginTop: 3,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },

  livePill: {
    backgroundColor: '#FFF0F0',
  },

  finalPill: {
    backgroundColor: '#F1F3F5',
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D92727',
    marginRight: 5,
  },

  statusPillText: {
    fontSize: 9,
    fontWeight: '900',
  },

  liveText: {
    color: '#C02020',
  },

  finalText: {
    color: '#68727E',
  },

  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E9ED',
    paddingVertical: 45,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  loadingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#27313D',
    marginTop: 15,
  },

  loadingText: {
    fontSize: 13,
    color: '#78818B',
    marginTop: 5,
    textAlign: 'center',
  },

  errorBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E9ED',
    padding: 24,
    alignItems: 'center',
  },

  errorIcon: {
    fontSize: 34,
    marginBottom: 10,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#27313D',
    textAlign: 'center',
  },

  errorText: {
    fontSize: 13,
    color: '#68727E',
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },

  tryAgainButton: {
    backgroundColor: '#1677B8',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 17,
  },

  tryAgainText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E9ED',
    padding: 28,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#27313D',
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 13,
    color: '#68727E',
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },

  infoCard: {
    backgroundColor: '#F0F7FC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8EAF6',
    padding: 15,
    marginTop: 4,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1677B8',
    marginBottom: 7,
  },

  infoText: {
    fontSize: 12,
    color: '#61707D',
    lineHeight: 18,
    marginBottom: 7,
  },

  updateText: {
    fontSize: 11,
    color: '#7B8994',
    marginTop: 2,
  },

  footer: {
    alignItems: 'center',
    paddingTop: 24,
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