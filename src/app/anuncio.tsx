import { useLocalSearchParams, useRouter } from 'expo-router';

import { useEffect, useState } from 'react';

import {
  ActivityIndicator,

  Alert,

  Image,

  KeyboardAvoidingView,

  Modal,

  Platform,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  TouchableOpacity,

  View,

  useWindowDimensions,
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

  contato: string | null;

  dados_especificos: Record<string, unknown> | null;

};

type AvaliacaoPublica = {

  id: string;

  nota: number;

  comentario: string | null;

  criado_em: string;

};

export default function AnuncioScreen() {

  const router = useRouter();

  const { width: larguraEcra } = useWindowDimensions();

  const { id } = useLocalSearchParams<{ id?: string }>();

  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);

  const [loading, setLoading] = useState(true);

  const [erro, setErro] = useState('');

  const [utilizadorId, setUtilizadorId] = useState<string | null>(null);

  const [modalOrcamento, setModalOrcamento] = useState(false);

  const [descricaoOrcamento, setDescricaoOrcamento] = useState('');

  const [enviandoOrcamento, setEnviandoOrcamento] = useState(false);

  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoPublica[]>([]);

  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState(false);

  const [minhaNota, setMinhaNota] = useState(0);

  const [meuComentario, setMeuComentario] = useState('');

  const [jaAvaliei, setJaAvaliei] = useState(false);

  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  const [fotoSelecionada, setFotoSelecionada] = useState(0);

  useEffect(() => {

    if (id) {

      carregarAnuncio();

    } else {

      setErro('Anúncio não encontrado.');

      setLoading(false);

    }

  }, [id]);

  async function carregarAnuncio() {

    setLoading(true);

    setErro('');

    try {

      const { data: auth } = await supabase.auth.getUser();

      const utilizador = auth.user;

      setUtilizadorId(utilizador?.id ?? null);

      const { data, error } = await supabase

        .from('anuncios')

        .select(

          'id, user_id, titulo, descricao, categoria, localidade, preco, preco_negociavel, tipo_anuncio, contato, dados_especificos'

        )

        .eq('id', id)

        .eq('estado', 'publicado')

        .maybeSingle();

      if (error) throw error;

      if (!data) {

        setErro('Este anúncio não está disponível.');

        setAnuncio(null);

        return;

      }

      const anuncioCarregado = data as Anuncio;

      setAnuncio(anuncioCarregado);

      setFotoSelecionada(0);

      await carregarAvaliacoes(

        anuncioCarregado.user_id,

        utilizador?.id ?? null

      );

    } catch (e: any) {

      console.error('Erro ao carregar anúncio:', e);

      setErro('Não foi possível carregar o anúncio.');

      setAnuncio(null);

    } finally {

      setLoading(false);

    }

  }

  function formatarPreco() {

    if (!anuncio) return '';

    if (anuncio.preco === null || anuncio.preco === undefined) {

      return anuncio.preco_negociavel

        ? 'Preço negociável'

        : 'Preço sob consulta';

    }

    const valor = Number(anuncio.preco).toLocaleString('pt-PT', {

      style: 'currency',

      currency: 'EUR',

    });

    return anuncio.preco_negociavel

      ? `${valor} · Negociável`

      : valor;

  }

  function contactar() {

    if (!anuncio?.contato) {

      Alert.alert(

        'Contacto indisponível',

        'Este anúncio não tem um contacto disponível.'

      );

      return;

    }

    Alert.alert(

      'Contacto do anunciante',

      `Contacto indicado no anúncio:\n\n${anuncio.contato}`

    );

  }

  async function abrirMensagens() {

    if (!anuncio) return;

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {

      Alert.alert(

        'Inicia sessão',

        'Tens de iniciar sessão para enviar mensagens.',

        [

          { text: 'Cancelar', style: 'cancel' },

          {

            text: 'Iniciar sessão',

            onPress: () => router.push('/conta'),

          },

        ]

      );

      return;

    }

    if (data.user.id === anuncio.user_id) {

      Alert.alert(

        'O teu anúncio',

        'Não podes enviar uma mensagem para a tua própria conta.'

      );

      return;

    }

    router.push({

      pathname: '/mensagens',

      params: {

        anuncioId: anuncio.id,

        anuncioTitulo: anuncio.titulo,

        destinatarioId: anuncio.user_id,

      },

    });

  }

  async function carregarAvaliacoes(

    vendedorId: string,

    avaliadorId: string | null

  ) {

    setCarregandoAvaliacoes(true);

    try {

      const { data, error } = await supabase

        .from('avaliacoes_publicas_vendedores')

        .select('id, nota, comentario, criado_em')

        .eq('vendedor_id', vendedorId)

        .order('criado_em', { ascending: false });

      if (error) throw error;

      setAvaliacoes((data || []) as AvaliacaoPublica[]);

      if (avaliadorId) {

        const { data: propria, error: erroPropria } = await supabase

          .from('avaliacoes_publicas_vendedores')

          .select('id')

          .eq('vendedor_id', vendedorId)

          .eq('avaliador_id', avaliadorId)

          .maybeSingle();

        if (erroPropria) throw erroPropria;

        setJaAvaliei(Boolean(propria));

      } else {

        setJaAvaliei(false);

      }

    } catch (e: any) {

      console.error('Erro ao carregar avaliações públicas:', e);

      setAvaliacoes([]);

      Alert.alert(

        'Avaliações',

        e?.message || 'Não foi possível carregar as avaliações.'

      );

    } finally {

      setCarregandoAvaliacoes(false);

    }

  }

  async function enviarAvaliacaoPublica() {

    if (!anuncio || enviandoAvaliacao) return;

    if (!utilizadorId) {

      Alert.alert(

        'Inicia sessão',

        'Tens de iniciar sessão para avaliar este anunciante.',

        [

          { text: 'Cancelar', style: 'cancel' },

          {

            text: 'Iniciar sessão',

            onPress: () => router.push('/conta'),

          },

        ]

      );

      return;

    }

    if (utilizadorId === anuncio.user_id) {

      Alert.alert(

        'O teu anúncio',

        'Não podes avaliar a tua própria conta.'

      );

      return;

    }

    if (jaAvaliei) {

      Alert.alert(

        'Avaliação já enviada',

        'Cada conta pode avaliar este anunciante apenas uma vez.'

      );

      return;

    }

    if (minhaNota < 1 || minhaNota > 5) {

      Alert.alert(

        'Classificação em falta',

        'Seleciona de 1 a 5 estrelas.'

      );

      return;

    }

    setEnviandoAvaliacao(true);

    try {

      const { error } = await supabase

        .from('avaliacoes_publicas_vendedores')

        .insert({

          vendedor_id: anuncio.user_id,

          avaliador_id: utilizadorId,

          nota: minhaNota,

          comentario: meuComentario.trim() || null,

        });

      if (error) {

        if (error.code === '23505') {

          setJaAvaliei(true);

          throw new Error(

            'Esta conta já avaliou este anunciante.'

          );

        }

        throw error;

      }

      setJaAvaliei(true);

      setMeuComentario('');

      await carregarAvaliacoes(anuncio.user_id, utilizadorId);

      Alert.alert(

        'Avaliação publicada',

        'Obrigado por partilhares a tua opinião.'

      );

    } catch (e: any) {

      Alert.alert(

        'Não foi possível publicar',

        e?.message || 'Tenta novamente.'

      );

    } finally {

      setEnviandoAvaliacao(false);

    }

  }

  function dataAvaliacao(valor: string) {

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return '';

    return data.toLocaleDateString('pt-PT', {

      day: '2-digit',

      month: '2-digit',

      year: 'numeric',

    });

  }

  async function enviarPedidoOrcamento() {

    if (!anuncio || enviandoOrcamento) return;

    const descricao = descricaoOrcamento.trim();

    if (!descricao) {

      Alert.alert(

        'Descrição em falta',

        'Descreve o serviço ou explica o que pretendes antes de pedir o orçamento.'

      );

      return;

    }

    setEnviandoOrcamento(true);

    try {

      const { data: auth, error: erroAuth } =

        await supabase.auth.getUser();

      if (erroAuth) throw erroAuth;

      const utilizador = auth.user;

      if (!utilizador) {

        setModalOrcamento(false);

        Alert.alert(

          'Inicia sessão',

          'Tens de iniciar sessão para pedir um orçamento.',

          [

            { text: 'Cancelar', style: 'cancel' },

            {

              text: 'Iniciar sessão',

              onPress: () => router.push('/conta'),

            },

          ]

        );

        return;

      }

      if (utilizador.id === anuncio.user_id) {

        Alert.alert(

          'O teu anúncio',

          'Não podes pedir um orçamento ao proprietário do teu próprio anúncio.'

        );

        return;

      }

      const nome =

        utilizador.user_metadata?.nome_preferido ||

        utilizador.user_metadata?.nome ||

        utilizador.user_metadata?.full_name ||

        utilizador.email ||

        'Utilizador Conecta';

      const { data: pedido, error: erroPedido } = await supabase

        .from('pedidos_orcamento')

        .insert({

          anuncio_id: anuncio.id,

          solicitante_id: utilizador.id,

          profissional_id: anuncio.user_id,

          nome_solicitante: nome,

          contacto_solicitante: utilizador.email || null,

          servico: anuncio.titulo,

          descricao,

          localidade: anuncio.localidade,

          estado: 'pendente',

        })

        .select('id')

        .single();

      if (erroPedido) throw erroPedido;

      setModalOrcamento(false);

      setDescricaoOrcamento('');

      Alert.alert(

        'Pedido enviado',

        'O teu pedido de orçamento foi enviado ao anunciante.',

        [

          {

            text: 'OK',

            onPress: () => router.push('/conta'),

          },

        ]

      );

      console.log('Pedido de orçamento criado:', pedido.id);

    } catch (e: any) {

      console.error('Erro ao enviar pedido de orçamento:', e);

      Alert.alert(

        'Não foi possível enviar',

        e?.message ||

          'Ocorreu um erro ao enviar o pedido. Verifica as permissões do Supabase e tenta novamente.'

      );

    } finally {

      setEnviandoOrcamento(false);

    }

  }

  if (loading) {

    return (

      <View style={styles.center}>

        <ActivityIndicator size="large" color="#1677B8" />

        <Text style={styles.loadingText}>A carregar anúncio...</Text>

      </View>

    );

  }

  if (erro || !anuncio) {

    return (

      <View style={styles.center}>

        <Text style={styles.errorTitle}>Anúncio indisponível</Text>

        <Text style={styles.errorText}>

          {erro || 'Não foi possível encontrar este anúncio.'}

        </Text>

        <TouchableOpacity

          style={styles.primaryButton}

          onPress={() => router.back()}

          activeOpacity={0.85}

        >

          <Text style={styles.primaryButtonText}>‹  Voltar</Text>

        </TouchableOpacity>

      </View>

    );

  }

  const eProprietario = utilizadorId === anuncio.user_id;

  const dadosEspecificos = anuncio.dados_especificos ?? {};

  const imagensAnuncio = Array.isArray(dadosEspecificos.imagens)

    ? dadosEspecificos.imagens

        .filter(

          (valor): valor is string =>

            typeof valor === 'string' && valor.trim().length > 0

        )

        .slice(0, 5)

    : [];

  const camposInternos = new Set([

    'imagens',

    'user_id',

    'id',

    'estado',

    'criado_em',

    'atualizado_em',

    'created_at',

    'updated_at',

  ]);

  const camposVisiveis = Object.entries(dadosEspecificos).filter(

    ([chave, valor]) => {

      if (

        camposInternos.has(chave.toLowerCase()) ||

        valor === null ||

        valor === undefined ||

        valor === ''

      ) {

        return false;

      }

      if (typeof valor === 'object') return false;

      return true;

    }

  );

  const formatarNomeCampo = (chave: string) =>

    chave

      .replace(/_/g, ' ')

      .replace(/([a-z])([A-Z])/g, '$1 $2')

      .replace(/^./, (letra) => letra.toUpperCase());

  const formatarValorCampo = (valor: unknown) => {

    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';

    if (typeof valor === 'number') return String(valor);

    return String(valor).trim();

  };

  const nomeAnunciante = String(

    dadosEspecificos.nome_profissional ||

      dadosEspecificos.nome_negocio ||

      'Anunciante Conecta'

  );

  const mediaAvaliacoes = avaliacoes.length

    ? avaliacoes.reduce(

        (total, item) => total + Number(item.nota),

        0

      ) / avaliacoes.length

    : 0;

  return (

    <View style={styles.container}>

      <ScrollView

        showsVerticalScrollIndicator={false}

        contentContainerStyle={styles.content}

      >

        <View style={styles.topBar}>

          <TouchableOpacity

            style={styles.backButton}

            onPress={() => router.back()}

            activeOpacity={0.7}

          >

            <Text style={styles.backButtonText}>

              ‹  Voltar aos anúncios

            </Text>

          </TouchableOpacity>

          <View style={styles.topActions}>

            <Text style={styles.topActionIcon}>♡</Text>

            <Text style={styles.topActionIcon}>↗</Text>

          </View>

        </View>

        <View style={styles.card}>

          <View style={styles.typeBadge}>

            <Text style={styles.type}>

              {anuncio.tipo_anuncio || 'Anúncio'}

            </Text>

          </View>

          {imagensAnuncio.length > 0 ? (

            <View style={styles.galleryContainer}>

              <View style={styles.mainPhotoWrap}>

                <Image

                  source={{

                    uri: imagensAnuncio[

                      Math.min(

                        fotoSelecionada,

                        imagensAnuncio.length - 1

                      )

                    ],

                  }}

                  style={styles.galleryImage}

                  resizeMode="cover"

                  accessibilityLabel={`Fotografia ${fotoSelecionada + 1} do anúncio`}

                />

                <View style={styles.photoCounter}>

                  <Text style={styles.photoCounterText}>

                    {fotoSelecionada + 1}/{imagensAnuncio.length}

                  </Text>

                </View>

              </View>

              {imagensAnuncio.length > 1 ? (

                <ScrollView

                  horizontal

                  showsHorizontalScrollIndicator={false}

                  contentContainerStyle={styles.thumbnailList}

                >

                  {imagensAnuncio.map((url, indice) => (

                    <TouchableOpacity

                      key={`${url}-${indice}`}

                      onPress={() => setFotoSelecionada(indice)}

                      activeOpacity={0.8}

                      style={[

                        styles.thumbnailButton,

                        fotoSelecionada === indice &&

                          styles.thumbnailSelected,

                      ]}

                    >

                      <Image

                        source={{ uri: url }}

                        style={styles.thumbnailImage}

                        resizeMode="cover"

                      />

                    </TouchableOpacity>

                  ))}

                </ScrollView>

              ) : null}

            </View>

          ) : (

            <View style={styles.noImageBox}>

              <Text style={styles.noImageIcon}>🖼️</Text>

              <Text style={styles.noImageText}>

                Sem fotografias disponíveis

              </Text>

            </View>

          )}

          <Text style={styles.title}>{anuncio.titulo}</Text>

          {anuncio.categoria ? (

            <Text style={styles.category}>{anuncio.categoria}</Text>

          ) : null}

          <View style={styles.locationPriceRow}>

            {anuncio.localidade ? (

              <View style={[styles.locationBox, styles.halfInfoBox]}>

                <Text style={styles.locationPin}>📍</Text>

                <View style={styles.locationTextGroup}>

                  <Text style={styles.infoLabel}>LOCALIDADE</Text>

                  <Text style={styles.infoValue}>

                    {anuncio.localidade}

                  </Text>

                </View>

              </View>

            ) : null}

            <View style={[styles.priceBox, styles.halfInfoBox]}>

              <Text style={styles.infoLabel}>PREÇO</Text>

              <Text style={styles.price}>{formatarPreco()}</Text>

            </View>

          </View>

          {camposVisiveis.length > 0 ? (

            <View style={styles.quickDetails}>

              {camposVisiveis.slice(0, 4).map(([chave, valor]) => (

                <View key={chave} style={styles.quickDetail}>

                  <Text style={styles.quickDetailIcon}>

                    {/marca/i.test(chave)

                      ? '🏷️'

                      : /modelo/i.test(chave)

                        ? '🚘'

                        : /tempo|ano|data/i.test(chave)

                          ? '📅'

                          : /estado|condição/i.test(chave)

                            ? '☆'

                            : '📋'}

                  </Text>

                  <View style={styles.quickDetailText}>

                    <Text style={styles.quickDetailLabel}>

                      {formatarNomeCampo(chave)}

                    </Text>

                    <Text style={styles.quickDetailValue}>

                      {formatarValorCampo(valor)}

                    </Text>

                  </View>

                </View>

              ))}

            </View>

          ) : null}

          {anuncio.descricao ? (

            <View style={styles.descriptionCard}>

              <Text style={styles.sectionHeading}>

                📄  Sobre este anúncio

              </Text>

              <Text style={styles.description}>

                {anuncio.descricao}

              </Text>

            </View>

          ) : null}

          {camposVisiveis.length > 0 ? (

            <View style={styles.detailsSection}>

              <Text style={styles.sectionHeading}>

                📄  Detalhes do produto

              </Text>

              {camposVisiveis.map(([chave, valor]) => (

                <View key={chave} style={styles.detailRow}>

                  <Text style={styles.detailIcon}>

                    {/marca/i.test(chave)

                      ? '🏷️'

                      : /modelo/i.test(chave)

                        ? '🚘'

                        : /tempo|ano|data/i.test(chave)

                          ? '📅'

                          : /estado|condição/i.test(chave)

                            ? '☆'

                            : '📋'}

                  </Text>

                  <Text style={styles.detailLabel}>

                    {formatarNomeCampo(chave)}

                  </Text>

                  <Text style={styles.detailValue}>

                    {formatarValorCampo(valor)}

                  </Text>

                </View>

              ))}

            </View>

          ) : null}

          <View style={styles.sellerCard}>

            <View style={styles.sellerHeader}>

              <View style={styles.sellerAvatar}>

                <Text style={styles.sellerAvatarText}>

                  {nomeAnunciante.trim().charAt(0).toUpperCase()}

                </Text>

              </View>

              <View style={styles.sellerIdentity}>

                <Text style={styles.sellerName}>{nomeAnunciante}</Text>

                <Text style={styles.sellerSubtitle}>

                  Perfil do anunciante no Conecta

                </Text>

              </View>

              <Text style={styles.sellerChevron}>›</Text>

            </View>

            <View style={styles.sellerStats}>

              <View style={styles.sellerStat}>

                <Text style={styles.sellerStatIcon}>☆</Text>

                <View>

                  <Text style={styles.sellerStatValue}>

                    {mediaAvaliacoes

                      ? mediaAvaliacoes.toFixed(1).replace('.', ',')

                      : '—'}

                  </Text>

                  <Text style={styles.sellerStatLabel}>

                    {avaliacoes.length}{' '}

                    {avaliacoes.length === 1

                      ? 'avaliação'

                      : 'avaliações'}

                  </Text>

                </View>

              </View>

              <View style={styles.sellerStat}>

                <Text style={styles.sellerStatIcon}>📄</Text>

                <View>

                  <Text style={styles.sellerStatValue}>

                    Conecta

                  </Text>

                  <Text style={styles.sellerStatLabel}>

                    anunciante

                  </Text>

                </View>

              </View>

            </View>

            <TouchableOpacity

              style={styles.sellerAdsButton}

              onPress={() =>

                router.push({

                  pathname: '/anuncios-anunciante' as any,

                  params: { userId: anuncio.user_id, nome: nomeAnunciante },

                })

              }

              activeOpacity={0.82}

            >

              <Text style={styles.sellerAdsButtonText}>

                Ver todos os anúncios deste anunciante  ›

              </Text>

            </TouchableOpacity>

          </View>

          <View style={styles.actionsSection}>

            <Text style={styles.actionsTitle}>

              ✨  Interessado neste anúncio?

            </Text>

            <Text style={styles.actionsSubtitle}>

              Escolhe como queres entrar em contacto com o anunciante.

            </Text>

            <TouchableOpacity

              style={styles.contactButton}

              onPress={contactar}

              activeOpacity={0.82}

            >

              <Text style={styles.contactButtonIcon}>☎️</Text>

              <View style={styles.buttonTextGroup}>

                <Text style={styles.contactButtonText}>

                  Ver contacto

                </Text>

                <Text style={styles.contactButtonSubtext}>

                  Consultar os dados de contacto

                </Text>

              </View>

              <Text style={styles.buttonArrow}>›</Text>

            </TouchableOpacity>

            <TouchableOpacity

              style={styles.messageButton}

              onPress={abrirMensagens}

              activeOpacity={0.82}

            >

              <Text style={styles.messageButtonIcon}>💬</Text>

              <View style={styles.buttonTextGroup}>

                <Text style={styles.messageButtonText}>

                  Enviar mensagem

                </Text>

                <Text style={styles.messageButtonSubtext}>

                  Conversa privada no Conecta

                </Text>

              </View>

              <Text style={styles.messageButtonArrow}>›</Text>

            </TouchableOpacity>

            <TouchableOpacity

              style={styles.quoteButton}

              onPress={() => {

                setDescricaoOrcamento('');

                setModalOrcamento(true);

              }}

              activeOpacity={0.82}

            >

              <Text style={styles.quoteButtonIcon}>📄</Text>

              <View style={styles.buttonTextGroup}>

                <Text style={styles.quoteButtonText}>

                  Pedir orçamento

                </Text>

                <Text style={styles.quoteButtonSubtext}>

                  Explica o que precisas

                </Text>

              </View>

              <Text style={styles.buttonArrow}>›</Text>

            </TouchableOpacity>

          </View>

          <View style={styles.reviewsSection}>

            <View style={styles.purchaseDivider} />

            <Text style={styles.reviewsTitle}>

              ☆  Avaliações do anunciante

            </Text>

            <Text style={styles.reviewsSubtitle}>

              Consulta as opiniões da comunidade e ajuda outras pessoas

              a escolher com mais confiança.

            </Text>

            <View style={styles.ratingSummary}>

              <Text style={styles.ratingAverage}>

                {avaliacoes.length

                  ? mediaAvaliacoes.toFixed(1).replace('.', ',')

                  : '—'}

              </Text>

              <View style={styles.ratingSummaryDetails}>

                <Text style={styles.ratingStars}>

                  {avaliacoes.length

                    ? '★'.repeat(Math.round(mediaAvaliacoes)) +

                      '☆'.repeat(5 - Math.round(mediaAvaliacoes))

                    : '☆☆☆☆☆'}

                </Text>

                <Text style={styles.ratingCount}>

                  {avaliacoes.length}{' '}

                  {avaliacoes.length === 1

                    ? 'avaliação'

                    : 'avaliações'}

                </Text>

              </View>

            </View>

            {!eProprietario && !jaAvaliei && utilizadorId ? (

              <View style={styles.reviewForm}>

                <Text style={styles.reviewFormTitle}>

                  Deixa a tua avaliação

                </Text>

                <Text style={styles.reviewFieldLabel}>

                  A tua classificação

                </Text>

                <View style={styles.starPicker}>

                  {[1, 2, 3, 4, 5].map((estrela) => (

                    <TouchableOpacity

                      key={estrela}

                      onPress={() => setMinhaNota(estrela)}

                      accessibilityRole="button"

                      accessibilityLabel={`${estrela} ${

                        estrela === 1 ? 'estrela' : 'estrelas'

                      }`}

                      style={styles.starButton}

                    >

                      <Text

                        style={[

                          styles.starButtonText,

                          estrela <= minhaNota &&

                            styles.starButtonSelected,

                        ]}

                      >

                        {estrela <= minhaNota ? '★' : '☆'}

                      </Text>

                    </TouchableOpacity>

                  ))}

                </View>

                <Text style={styles.reviewFieldLabel}>

                  Comentário (opcional)

                </Text>

                <TextInput

                  style={styles.reviewInput}

                  value={meuComentario}

                  onChangeText={setMeuComentario}

                  placeholder="Partilha a tua experiência (máximo 500 caracteres)"

                  placeholderTextColor="#89939E"

                  multiline

                  maxLength={500}

                  textAlignVertical="top"

                  editable={!enviandoAvaliacao}

                />

                <Text style={styles.reviewCharacterCount}>

                  {meuComentario.length}/500

                </Text>

                <TouchableOpacity

                  style={[

                    styles.primaryButton,

                    enviandoAvaliacao && styles.disabledButton,

                  ]}

                  onPress={enviarAvaliacaoPublica}

                  disabled={enviandoAvaliacao}

                  activeOpacity={0.82}

                >

                  {enviandoAvaliacao ? (

                    <ActivityIndicator color="#FFFFFF" />

                  ) : (

                    <Text style={styles.primaryButtonText}>

                      Publicar avaliação

                    </Text>

                  )}

                </TouchableOpacity>

                <Text style={styles.reviewDisclaimer}>

                  As avaliações são públicas. Não é necessária

                  confirmação de compra pelo vendedor.

                </Text>

              </View>

            ) : null}

            {!eProprietario && !utilizadorId ? (

              <TouchableOpacity

                style={styles.loginReviewButton}

                onPress={() => router.push('/conta')}

                activeOpacity={0.82}

              >

                <Text style={styles.loginReviewButtonText}>

                  Inicia sessão para avaliar

                </Text>

              </TouchableOpacity>

            ) : null}

            {jaAvaliei ? (

              <View style={styles.reviewAlreadyBox}>

                <Text style={styles.reviewAlreadyText}>

                  Já enviaste uma avaliação a este anunciante.

                </Text>

              </View>

            ) : null}

            {!carregandoAvaliacoes && avaliacoes.length === 0 ? (

              <View style={styles.noReviewsBox}>

                <Text style={styles.noReviewsIcon}>💬</Text>

                <Text style={styles.noReviewsText}>

                  Ainda não existem avaliações para este anunciante.

                </Text>

              </View>

            ) : null}

            {carregandoAvaliacoes ? (

              <ActivityIndicator

                size="small"

                color="#1677B8"

                style={styles.reviewsLoading}

              />

            ) : null}

            {avaliacoes.map((avaliacao) => (

              <View key={avaliacao.id} style={styles.reviewCard}>

                <View style={styles.reviewCardHeader}>

                  <Text style={styles.reviewStars}>

                    {'★'.repeat(avaliacao.nota)}

                    {'☆'.repeat(5 - avaliacao.nota)}

                  </Text>

                  <Text style={styles.reviewDate}>

                    {dataAvaliacao(avaliacao.criado_em)}

                  </Text>

                </View>

                {avaliacao.comentario ? (

                  <Text style={styles.reviewComment}>

                    {avaliacao.comentario}

                  </Text>

                ) : null}

              </View>

            ))}

          </View>

          <View style={styles.safePurchase}>

            <Text style={styles.safePurchaseIcon}>🛡️</Text>

            <View style={styles.safePurchaseTextGroup}>

              <Text style={styles.safePurchaseTitle}>

                Compra segura

              </Text>

              <Text style={styles.safePurchaseText}>

                Comunica sempre através do Conecta e evita pagamentos antecipados.

              </Text>

            </View>

          </View>

        </View>

      </ScrollView>

      <Modal

        visible={modalOrcamento}

        transparent

        animationType="slide"

        onRequestClose={() => setModalOrcamento(false)}

      >

        <KeyboardAvoidingView

          style={styles.modalOverlay}

          behavior={Platform.OS === 'ios' ? 'padding' : undefined}

        >

          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>Pedir orçamento</Text>

            <Text style={styles.modalSubtitle}>

              Explica ao anunciante aquilo de que precisas.

            </Text>

            <TextInput

              style={styles.quoteInput}

              value={descricaoOrcamento}

              onChangeText={setDescricaoOrcamento}

              placeholder="Descreve o teu pedido..."

              placeholderTextColor="#89939E"

              multiline

              textAlignVertical="top"

              editable={!enviandoOrcamento}

            />

            <TouchableOpacity

              style={[

                styles.primaryButton,

                enviandoOrcamento && styles.disabledButton,

              ]}

              onPress={enviarPedidoOrcamento}

              disabled={enviandoOrcamento}

              activeOpacity={0.82}

            >

              {enviandoOrcamento ? (

                <ActivityIndicator color="#FFFFFF" />

              ) : (

                <Text style={styles.primaryButtonText}>

                  Enviar pedido

                </Text>

              )}

            </TouchableOpacity>

            <TouchableOpacity

              style={styles.cancelButton}

              onPress={() => setModalOrcamento(false)}

              disabled={enviandoOrcamento}

              activeOpacity={0.82}

            >

              <Text style={styles.cancelButtonText}>Cancelar</Text>

            </TouchableOpacity>

          </View>

        </KeyboardAvoidingView>

      </Modal>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#F1F6FB',

  },

  content: {

    paddingHorizontal: 14,

    paddingTop: 12,

    paddingBottom: 30,

  },

  center: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    padding: 24,

    backgroundColor: '#F1F6FB',

  },

  loadingText: {

    marginTop: 12,

    fontSize: 16,

    color: '#68727E',

  },

  errorTitle: {

    fontSize: 24,

    fontWeight: '800',

    color: '#1D2733',

    textAlign: 'center',

    marginBottom: 10,

  },

  errorText: {

    fontSize: 16,

    lineHeight: 22,

    color: '#68727E',

    textAlign: 'center',

    marginBottom: 20,

  },

  topBar: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 10,

  },

  backButton: {

    alignSelf: 'flex-start',

    paddingVertical: 8,

    paddingHorizontal: 2,

  },

  backButtonText: {

    fontSize: 15,

    fontWeight: '700',

    color: '#1677B8',

  },

  topActions: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 16,

  },

  topActionIcon: {

    color: '#344A62',

    fontSize: 27,

    fontWeight: '500',

  },

  card: {

    backgroundColor: '#FFFFFF',

    borderRadius: 26,

    padding: 16,

    borderWidth: 1,

    borderColor: '#E8EDF3',

    shadowColor: '#102A43',

    shadowOffset: { width: 0, height: 8 },

    shadowOpacity: 0.07,

    shadowRadius: 18,

    elevation: 4,

  },

  galleryContainer: {

    marginHorizontal: -2,

    marginBottom: 18,

  },

  mainPhotoWrap: {

    position: 'relative',

    borderRadius: 22,

    overflow: 'hidden',

  },

  galleryImage: {

    width: '100%',

    height: 300,

    borderRadius: 22,

    backgroundColor: '#E8EDF2',

  },

  photoCounter: {

    position: 'absolute',

    right: 12,

    bottom: 12,

    backgroundColor: 'rgba(20,30,40,0.72)',

    borderRadius: 18,

    paddingHorizontal: 12,

    paddingVertical: 6,

  },

  photoCounterText: {

    color: '#FFFFFF',

    fontWeight: '800',

    fontSize: 13,

  },

  thumbnailList: {

    paddingTop: 9,

    paddingBottom: 2,

    gap: 8,

  },

  thumbnailButton: {

    width: 92,

    height: 76,

    borderRadius: 13,

    borderWidth: 2,

    borderColor: '#E5EAF0',

    overflow: 'hidden',

  },

  thumbnailSelected: {

    borderColor: '#0785E5',

  },

  thumbnailImage: {

    width: '100%',

    height: '100%',

  },

  noImageBox: {

    height: 190,

    borderRadius: 18,

    backgroundColor: '#F1F5F9',

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: 20,

    borderWidth: 1,

    borderColor: '#E2E8F0',

  },

  noImageIcon: {

    fontSize: 40,

    color: '#9AA8B6',

    marginBottom: 8,

  },

  noImageText: {

    color: '#718091',

    fontSize: 14,

    fontWeight: '600',

  },

  typeBadge: {

    alignSelf: 'flex-start',

    backgroundColor: '#EAF4FC',

    borderRadius: 8,

    paddingHorizontal: 10,

    paddingVertical: 6,

    marginBottom: 12,

  },

  type: {

    fontSize: 12,

    fontWeight: '800',

    color: '#1677B8',

    textTransform: 'uppercase',

    letterSpacing: 0.5,

  },

  title: {

    fontSize: 29,

    lineHeight: 36,

    fontWeight: '800',

    color: '#102A43',

    marginBottom: 10,

  },

  category: {

    fontSize: 15,

    color: '#68727E',

    marginBottom: 8,

  },

  locationPriceRow: {

    flexDirection: 'row',

    alignItems: 'stretch',

    gap: 10,

    marginTop: 14,

  },

  halfInfoBox: {

    flex: 1,

    marginTop: 0,

    minWidth: 0,

  },

  locationBox: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#F3F7FC',

    borderRadius: 16,

    padding: 13,

    marginTop: 16,

  },

  locationPin: {

    fontSize: 21,

    color: '#1677B8',

    marginRight: 9,

  },

  locationTextGroup: {

    flex: 1,

  },

  infoLabel: {

    fontSize: 11,

    fontWeight: '800',

    color: '#7B8794',

    marginBottom: 7,

    letterSpacing: 0.8,

  },

  infoValue: {

    fontSize: 16,

    color: '#1D2733',

    fontWeight: '700',

  },

  priceBox: {

    backgroundColor: '#EAF4FF',

    borderRadius: 16,

    padding: 13,

    marginTop: 16,

    borderWidth: 1,

    borderColor: '#D9EAFE',

  },

  price: {

    fontSize: 24,

    fontWeight: '900',

    color: '#075985',

  },

  quickDetails: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    marginTop: 18,

    marginBottom: 6,

    gap: 8,

  },

  quickDetail: {

    width: '48%',

    flexDirection: 'row',

    alignItems: 'flex-start',

    paddingVertical: 10,

    paddingHorizontal: 4,

  },

  quickDetailIcon: {

    width: 28,

    fontSize: 20,

    color: '#344A62',

  },

  quickDetailText: {

    flex: 1,

  },

  quickDetailLabel: {

    color: '#718091',

    fontSize: 12,

    marginBottom: 5,

  },

  quickDetailValue: {

    color: '#102A43',

    fontSize: 14,

    fontWeight: '800',

  },

  descriptionCard: {

    backgroundColor: '#F5F8FC',

    borderRadius: 18,

    padding: 18,

    marginTop: 20,

    borderWidth: 1,

    borderColor: '#E8EDF3',

  },

  sectionHeading: {

    color: '#172433',

    fontSize: 19,

    fontWeight: '800',

    marginBottom: 12,

  },

  description: {

    fontSize: 16,

    lineHeight: 25,

    color: '#394451',

  },

  detailsSection: {

    marginTop: 22,

    borderWidth: 1,

    borderColor: '#E6ECF2',

    borderRadius: 20,

    paddingHorizontal: 16,

    paddingTop: 20,

    paddingBottom: 6,

    backgroundColor: '#FFFFFF',

  },

  detailRow: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    borderTopWidth: 1,

    borderTopColor: '#E8EDF3',

    paddingVertical: 14,

  },

  detailIcon: {

    width: 30,

    color: '#344A62',

    fontSize: 20,

    fontWeight: '700',

    marginRight: 8,

  },

  detailLabel: {

    flex: 1,

    fontSize: 14,

    color: '#718091',

  },

  detailValue: {

    flex: 1,

    fontSize: 14,

    color: '#102A43',

    fontWeight: '800',

    textAlign: 'right',

  },

  sellerCard: {

    marginTop: 22,

    marginBottom: 6,

    padding: 16,

    borderRadius: 22,

    borderWidth: 1,

    borderColor: '#E7EDF4',

    backgroundColor: '#FFFFFF',

  },

  sellerHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 15,

  },

  sellerAvatar: {

    width: 56,

    height: 56,

    borderRadius: 28,

    backgroundColor: '#E1F1FF',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 12,

  },

  sellerAvatarText: {

    color: '#0878C9',

    fontSize: 20,

    fontWeight: '900',

  },

  sellerIdentity: {

    flex: 1,

  },

  sellerName: {

    color: '#102A43',

    fontSize: 17,

    fontWeight: '900',

  },

  sellerSubtitle: {

    color: '#718091',

    fontSize: 13,

    marginTop: 4,

  },

  sellerChevron: {

    color: '#40556D',

    fontSize: 30,

    paddingLeft: 8,

  },

  sellerAdsButton: {

    marginTop: 14,

    paddingVertical: 13,

    paddingHorizontal: 14,

    borderRadius: 13,

    backgroundColor: '#EAF4FC',

    borderWidth: 1,

    borderColor: '#CFE5F8',

    alignItems: 'center',

  },

  sellerAdsButtonText: {

    color: '#0879C9',

    fontSize: 14,

    fontWeight: '900',

    textAlign: 'center',

  },

  sellerStats: {

    flexDirection: 'row',

    gap: 8,

  },

  sellerStat: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    borderWidth: 1,

    borderColor: '#E6EDF4',

    borderRadius: 14,

    padding: 9,

    gap: 7,

  },

  sellerStatIcon: {

    color: '#E6A100',

    fontSize: 23,

    fontWeight: '800',

  },

  sellerStatValue: {

    color: '#102A43',

    fontSize: 13,

    fontWeight: '900',

  },

  sellerStatLabel: {

    color: '#718091',

    fontSize: 10,

    marginTop: 2,

  },

  actionsSection: {

    marginTop: 24,

    paddingTop: 22,

    borderTopWidth: 1,

    borderTopColor: '#E7EDF4',

  },

  actionsTitle: {

    color: '#102A43',

    fontSize: 20,

    fontWeight: '900',

    marginBottom: 8,

  },

  actionsSubtitle: {

    color: '#718091',

    fontSize: 14,

    lineHeight: 21,

    marginBottom: 18,

  },

  contactButton: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#0879C9',

    borderRadius: 18,

    paddingVertical: 19,

    paddingHorizontal: 17,

    marginBottom: 12,

  },

  contactButtonIcon: {

    color: '#FFFFFF',

    fontSize: 27,

    width: 48,

    textAlign: 'center',

  },

  buttonTextGroup: {

    flex: 1,

  },

  contactButtonText: {

    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '900',

  },

  contactButtonSubtext: {

    color: '#EAF5FF',

    fontSize: 13,

    marginTop: 5,

  },

  buttonArrow: {

    color: '#FFFFFF',

    fontSize: 28,

    marginLeft: 8,

  },

  messageButton: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#FFFFFF',

    borderRadius: 18,

    paddingVertical: 17,

    paddingHorizontal: 17,

    marginBottom: 12,

    borderWidth: 1,

    borderColor: '#DCE6EF',

  },

  messageButtonIcon: {

    color: '#0879C9',

    fontSize: 27,

    width: 48,

    textAlign: 'center',

  },

  messageButtonText: {

    color: '#102A43',

    fontSize: 16,

    fontWeight: '900',

  },

  messageButtonSubtext: {

    color: '#718091',

    fontSize: 13,

    marginTop: 5,

  },

  messageButtonArrow: {

    color: '#0879C9',

    fontSize: 28,

    marginLeft: 8,

  },

  quoteButton: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#152F46',

    borderRadius: 18,

    paddingVertical: 19,

    paddingHorizontal: 17,

    marginBottom: 6,

  },

  quoteButtonIcon: {

    color: '#FFFFFF',

    fontSize: 27,

    width: 48,

    textAlign: 'center',

  },

  quoteButtonText: {

    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '900',

  },

  quoteButtonSubtext: {

    color: '#E6EEF5',

    fontSize: 13,

    marginTop: 5,

  },

  reviewsSection: {

    marginTop: 24,

  },

  purchaseDivider: {

    height: 1,

    backgroundColor: '#E7EDF4',

    marginBottom: 22,

  },

  reviewsTitle: {

    color: '#102A43',

    fontSize: 20,

    fontWeight: '900',

    marginBottom: 8,

  },

  reviewsSubtitle: {

    color: '#718091',

    fontSize: 14,

    lineHeight: 21,

    marginBottom: 16,

  },

  ratingSummary: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#F4F8FC',

    borderRadius: 20,

    padding: 18,

    marginBottom: 16,

  },

  ratingAverage: {

    color: '#102A43',

    fontSize: 29,

    fontWeight: '900',

    width: 80,

  },

  ratingSummaryDetails: {

    flex: 1,

  },

  ratingStars: {

    color: '#E6A100',

    fontSize: 25,

    letterSpacing: 1,

  },

  ratingCount: {

    fontSize: 13,

    color: '#718091',

    marginTop: 3,

  },

  reviewForm: {

    borderWidth: 1,

    borderColor: '#DCE6EF',

    borderRadius: 16,

    padding: 15,

    marginBottom: 18,

    backgroundColor: '#FBFCFD',

  },

  reviewFormTitle: {

    fontSize: 16,

    fontWeight: '800',

    color: '#172433',

    marginBottom: 12,

  },

  reviewFieldLabel: {

    fontSize: 13,

    fontWeight: '700',

    color: '#394451',

    marginBottom: 6,

  },

  starPicker: {

    flexDirection: 'row',

    marginBottom: 14,

  },

  starButton: {

    paddingVertical: 3,

    paddingHorizontal: 5,

  },

  starButtonText: {

    fontSize: 34,

    color: '#C7D0D9',

  },

  starButtonSelected: {

    color: '#E6A100',

  },

  reviewInput: {

    minHeight: 100,

    maxHeight: 180,

    borderWidth: 1,

    borderColor: '#D9E0E6',

    borderRadius: 12,

    padding: 12,

    fontSize: 15,

    lineHeight: 21,

    color: '#1D2733',

    backgroundColor: '#FFFFFF',

  },

  reviewCharacterCount: {

    fontSize: 12,

    color: '#68727E',

    textAlign: 'right',

    marginTop: 5,

    marginBottom: 12,

  },

  reviewDisclaimer: {

    fontSize: 11,

    lineHeight: 16,

    color: '#718091',

    marginTop: 10,

  },

  loginReviewButton: {

    borderWidth: 1,

    borderColor: '#1677B8',

    borderRadius: 12,

    padding: 14,

    alignItems: 'center',

    marginBottom: 16,

  },

  loginReviewButtonText: {

    fontSize: 14,

    fontWeight: '800',

    color: '#1677B8',

  },

  reviewAlreadyBox: {

    backgroundColor: '#EAF8F0',

    borderRadius: 12,

    padding: 12,

    marginBottom: 16,

  },

  reviewAlreadyText: {

    color: '#126644',

    fontSize: 13,

    fontWeight: '700',

  },

  noReviewsBox: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#F4F8FC',

    borderRadius: 16,

    padding: 15,

    marginBottom: 12,

  },

  noReviewsIcon: {

    fontSize: 22,

    color: '#40556D',

    marginRight: 12,

  },

  noReviewsText: {

    flex: 1,

    color: '#718091',

    fontSize: 14,

    lineHeight: 21,

  },

  reviewsLoading: {

    marginVertical: 15,

  },

  reviewCard: {

    borderWidth: 1,

    borderColor: '#E5EAF0',

    borderRadius: 14,

    padding: 14,

    marginBottom: 10,

    backgroundColor: '#FFFFFF',

  },

  reviewCardHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 6,

  },

  reviewStars: {

    fontSize: 18,

    color: '#E6A100',

    letterSpacing: 1,

  },

  reviewDate: {

    fontSize: 11,

    color: '#89939E',

  },

  reviewComment: {

    fontSize: 14,

    lineHeight: 21,

    color: '#394451',

  },

  safePurchase: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    backgroundColor: '#EFF6FF',

    borderRadius: 18,

    padding: 16,

    marginTop: 22,

  },

  safePurchaseIcon: {

    color: '#0879C9',

    fontSize: 26,

    marginRight: 12,

  },

  safePurchaseTextGroup: {

    flex: 1,

  },

  safePurchaseTitle: {

    color: '#0879C9',

    fontSize: 15,

    fontWeight: '900',

    marginBottom: 5,

  },

  safePurchaseText: {

    color: '#62758A',

    fontSize: 14,

    lineHeight: 21,

  },

  modalOverlay: {

    flex: 1,

    backgroundColor: 'rgba(12,25,38,0.55)',

    justifyContent: 'flex-end',

  },

  modalCard: {

    backgroundColor: '#FFFFFF',

    borderTopLeftRadius: 24,

    borderTopRightRadius: 24,

    padding: 22,

    paddingBottom: 32,

  },

  modalTitle: {

    color: '#102A43',

    fontSize: 22,

    fontWeight: '900',

    marginBottom: 7,

  },

  modalSubtitle: {

    color: '#718091',

    fontSize: 14,

    lineHeight: 21,

    marginBottom: 15,

  },

  quoteInput: {

    minHeight: 130,

    maxHeight: 220,

    borderWidth: 1,

    borderColor: '#D9E0E6',

    borderRadius: 14,

    padding: 14,

    fontSize: 15,

    lineHeight: 22,

    color: '#1D2733',

    backgroundColor: '#FFFFFF',

    marginBottom: 15,

  },

  primaryButton: {

    backgroundColor: '#0879C9',

    borderRadius: 14,

    minHeight: 52,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 18,

    paddingVertical: 14,

  },

  primaryButtonText: {

    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '900',

  },

  cancelButton: {

    backgroundColor: '#FFFFFF',

    minHeight: 50,

    borderRadius: 14,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    borderColor: '#D9DDE3',

    marginTop: 10,

  },

  cancelButtonText: {

    color: '#626B78',

    fontSize: 16,

    fontWeight: '800',

  },

  disabledButton: {

    opacity: 0.65,

  },

});