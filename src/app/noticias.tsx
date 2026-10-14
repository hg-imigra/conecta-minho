import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type Noticia = {
  titulo: string;
  descricao: string;
  link: string;
  data: string;
  fonte: string;
};

type Categoria = {
  nome: string;
  busca: string;
};

const CATEGORIAS: Categoria[] = [
  {
    nome: 'Guimarães',
    busca: 'Guimarães',
  },
  {
    nome: 'Vizela',
    busca: 'Vizela',
  },
  {
    nome: 'Fafe',
    busca: 'Fafe',
  },
  {
    nome: 'Região',
    busca: 'Guimarães OR Vizela OR Fafe',
  },
];

const RSS_BASE =
  'https://news.google.com/rss/search';

function limparHtml(texto: string) {
  return texto
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extrairTag(
  bloco: string,
  tag: string
) {
  const regex = new RegExp(
    `<${tag}[^>]*>([\\s\\S]*?)</${tag}>`,
    'i'
  );

  const resultado = bloco.match(regex);

  if (!resultado) {
    return '';
  }

  return limparHtml(resultado[1]);
}

function extrairNoticias(xml: string): Noticia[] {
  const blocos = xml.match(
    /<item>[\s\S]*?<\/item>/gi
  );

  if (!blocos) {
    return [];
  }

  return blocos
    .map((bloco) => {
      const titulo = extrairTag(bloco, 'title');
      const descricao = extrairTag(bloco, 'description');
      const link = extrairTag(bloco, 'link');
      const data = extrairTag(bloco, 'pubDate');
      const fonte = extrairTag(bloco, 'source');

      return {
        titulo,
        descricao,
        link,
        data,
        fonte: fonte || 'Google Notícias',
      };
    })
    .filter(
      (noticia) =>
        noticia.titulo &&
        noticia.link
    );
}

function formatarData(data: string) {
  if (!data) {
    return '';
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return data;
  }

  return dataObj.toLocaleDateString(
    'pt-PT',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  );
}

async function abrirNoticia(link: string) {
  try {
    await Linking.openURL(link);
  } catch (error) {
    console.log(
      'Não foi possível abrir a notícia:',
      error
    );
  }
}

export default function NoticiasScreen() {
  const [categoria, setCategoria] =
    useState('Guimarães');

  const [noticias, setNoticias] =
    useState<Noticia[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [atualizando, setAtualizando] =
    useState(false);

  const [erro, setErro] =
    useState('');

  const carregarNoticias = useCallback(
    async (
      categoriaSelecionada = categoria,
      mostrarAtualizacao = false
    ) => {
      if (mostrarAtualizacao) {
        setAtualizando(true);
      } else {
        setCarregando(true);
      }

      setErro('');

      try {
        const categoriaAtual =
          CATEGORIAS.find(
            (item) =>
              item.nome === categoriaSelecionada
          );

        const busca =
          categoriaAtual?.busca ||
          'Guimarães';

        const url =
          `${RSS_BASE}?q=${encodeURIComponent(
            busca
          )}` +
          `&hl=pt-PT&gl=PT&ceid=PT:pt-150`;

        const resposta =
          await fetch(url);

        if (!resposta.ok) {
          throw new Error(
            `Erro HTTP ${resposta.status}`
          );
        }

        const xml =
          await resposta.text();

        const lista =
          extrairNoticias(xml);

        if (lista.length === 0) {
          throw new Error(
            'Nenhuma notícia encontrada.'
          );
        }

        setNoticias(lista);
      } catch (error) {
        console.log(
          'Erro ao carregar notícias:',
          error
        );

        setNoticias([]);

        setErro(
          'Não foi possível carregar as notícias agora. Tente novamente.'
        );
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [categoria]
  );

  React.useEffect(() => {
    carregarNoticias();
  }, [carregarNoticias]);

  const selecionarCategoria = (
    novaCategoria: string
  ) => {
    setCategoria(novaCategoria);
    carregarNoticias(novaCategoria);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* CABEÇALHO */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              Notícias
            </Text>

            <Text style={styles.headerSubtitle}>
              Guimarães e região
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() =>
              carregarNoticias(
                categoria,
                true
              )
            }
          >
            <Text style={styles.refreshIcon}>
              ↻
            </Text>
          </Pressable>
        </View>

        {/* CATEGORIAS */}
        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.categories
            }
          >
            {CATEGORIAS.map((item) => {
              const ativo =
                categoria === item.nome;

              return (
                <Pressable
                  key={item.nome}
                  style={[
                    styles.categoryButton,
                    ativo &&
                      styles.categoryButtonActive,
                  ]}
                  onPress={() =>
                    selecionarCategoria(
                      item.nome
                    )
                  }
                >
                  <Text
                    style={[
                      styles.categoryText,
                      ativo &&
                        styles.categoryTextActive,
                    ]}
                  >
                    {item.nome}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* CONTEÚDO */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.content
          }
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={() =>
                carregarNoticias(
                  categoria,
                  true
                )
              }
            />
          }
        >
          {/* DESTAQUE */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>
                📰
              </Text>
            </View>

            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>
                Notícias da região
              </Text>

              <Text
                style={
                  styles.infoDescription
                }
              >
                Acompanhe as notícias mais recentes
                de Guimarães, Vizela e Fafe.
              </Text>
            </View>
          </View>

          {/* CARREGANDO */}
          {carregando && (
            <View style={styles.loading}>
              <ActivityIndicator
                size="large"
              />

              <Text
                style={styles.loadingText}
              >
                A carregar notícias...
              </Text>
            </View>
          )}

          {/* ERRO */}
          {!carregando && erro !== '' && (
            <View style={styles.errorCard}>
              <Text
                style={styles.errorIcon}
              >
                ⚠️
              </Text>

              <Text
                style={styles.errorTitle}
              >
                Não foi possível carregar
              </Text>

              <Text
                style={styles.errorText}
              >
                {erro}
              </Text>

              <Pressable
                style={styles.retryButton}
                onPress={() =>
                  carregarNoticias(
                    categoria
                  )
                }
              >
                <Text
                  style={
                    styles.retryButtonText
                  }
                >
                  Tentar novamente
                </Text>
              </Pressable>
            </View>
          )}

          {/* NOTÍCIAS */}
          {!carregando &&
            erro === '' &&
            noticias.map(
              (noticia, index) => (
                <Pressable
                  key={`${noticia.link}-${index}`}
                  style={styles.newsCard}
                  onPress={() =>
                    abrirNoticia(
                      noticia.link
                    )
                  }
                >
                  <View
                    style={styles.newsTop}
                  >
                    <View
                      style={
                        styles.newsBadge
                      }
                    >
                      <Text
                        style={
                          styles.newsBadgeText
                        }
                      >
                        NOTÍCIA
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.newsDate
                      }
                    >
                      {formatarData(
                        noticia.data
                      )}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.newsTitle
                    }
                  >
                    {noticia.titulo}
                  </Text>

                  {noticia.descricao ? (
                    <Text
                      style={
                        styles.newsDescription
                      }
                      numberOfLines={3}
                    >
                      {noticia.descricao}
                    </Text>
                  ) : null}

                  <View
                    style={
                      styles.newsFooter
                    }
                  >
                    <Text
                      style={
                        styles.newsSource
                      }
                    >
                      {noticia.fonte}
                    </Text>

                    <Text
                      style={
                        styles.newsArrow
                      }
                    >
                      Ler notícia ›
                    </Text>
                  </View>
                </Pressable>
              )
            )}

          {/* VAZIO */}
          {!carregando &&
            erro === '' &&
            noticias.length === 0 && (
              <View
                style={
                  styles.emptyCard
                }
              >
                <Text
                  style={
                    styles.emptyIcon
                  }
                >
                  📰
                </Text>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Sem notícias
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Não foram encontradas
                  notícias para esta categoria.
                </Text>
              </View>
            )}

          {/* FONTE */}
          {!carregando &&
            noticias.length > 0 && (
              <View
                style={
                  styles.sourceCard
                }
              >
                <Text
                  style={
                    styles.sourceText
                  }
                >
                  Notícias agregadas através de
                  um feed público. Ao tocar numa
                  notícia, será aberta a publicação
                  original.
                </Text>
              </View>
            )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  backButtonText: {
    fontSize: 34,
    lineHeight: 38,
    color: '#111827',
    marginTop: -4,
  },

  headerInfo: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
  },

  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshIcon: {
    fontSize: 25,
    color: '#2563EB',
    fontWeight: '700',
  },

  /* ÁREA DOS FILTROS */

  categoriesWrapper: {
    height: 68,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    justifyContent: 'center',
  },

  categories: {
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 68,
  },

  categoryButton: {
    minWidth: 92,
    height: 44,
    paddingHorizontal: 17,
    paddingVertical: 0,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryButtonActive: {
    backgroundColor: '#1677B8',
  },

  categoryText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#59636F',
    textAlign: 'center',
  },

  categoryTextActive: {
    color: '#FFFFFF',
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoIconText: {
    fontSize: 23,
  },

  infoText: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D2733',
  },

  infoDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68727E',
    marginTop: 3,
  },

  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#68727E',
  },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1D4D4',
  },

  errorIcon: {
    fontSize: 32,
    marginBottom: 10,
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#27313D',
  },

  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#68727E',
    textAlign: 'center',
    marginTop: 6,
  },

  retryButton: {
    backgroundColor: '#1677B8',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 16,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  newsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },

  newsBadge: {
    backgroundColor: '#EAF4FB',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },

  newsBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1677B8',
  },

  newsDate: {
    fontSize: 11,
    color: '#8A939D',
  },

  newsTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    color: '#1D2733',
  },

  newsDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#68727E',
    marginTop: 7,
  },

  newsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F2',
  },

  newsSource: {
    flex: 1,
    fontSize: 11,
    color: '#8A939D',
    marginRight: 10,
  },

  newsArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1677B8',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 30,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 35,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#27313D',
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#68727E',
    textAlign: 'center',
    marginTop: 5,
  },

  sourceCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 13,
    padding: 13,
    marginTop: 4,
  },

  sourceText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#7A838D',
    textAlign: 'center',
  },
});