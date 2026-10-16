import { useLocalSearchParams, useRouter } from 'expo-router';

import { useEffect, useState } from 'react';

import {
  ActivityIndicator,

  Alert,

  Image,

  KeyboardAvoidingView,

  Linking,

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

  function voltarComSeguranca() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  const { width: larguraEcra } = useWindowDimensions();

  const { id } = useLocalSearchParams<{ id?: string }>();

  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);

  const [loading, setLoading] = useState(true);

  const [erro, setErro] = useState('');

  const [utilizadorId, setUtilizadorId] = useState<string | null>(null);

  const [modalOrcamento, setModalOrcamento] = useState(false);

  const [modalContacto, setModalContacto] = useState(false);

  const [descricaoOrcamento, setDescricaoOrcamento] = useState('');

  const [enviandoOrcamento, setEnviandoOrcamento] = useState(false);

  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoPublica[]>([]);

  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState(false);

  const [minhaNota, setMinhaNota] = useState(0);

  const [meuComentario, setMeuComentario] = useState('');

  const [jaAvaliei, setJaAvaliei] = useState(false);

  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

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
      const tipoAnuncio = String(anuncioCarregado.tipo_anuncio || '').toLocaleLowerCase('pt-PT');
      const dadosAnuncio = anuncioCarregado.dados_especificos || {};
      if (Boolean(dadosAnuncio.submissao_prive) || tipoAnuncio.includes('adulto') || tipoAnuncio.includes('privé') || tipoAnuncio.includes('prive')) {
        setErro('Este perfil pertence ao Conecta Privé e só pode ser consultado dentro da área Privé.');
        setAnuncio(null);
        return;
      }

      setAnuncio(anuncioCarregado);

      await carregarAvaliacoes(
        anuncioCarregado.id,
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

    // Alguns anúncios antigos guardaram o preço dentro de dados_especificos.
    const dados = anuncio.dados_especificos ?? {};
    const candidatos = [
      anuncio.preco,
      dados.preco,
      dados.preco_valor,
      dados.valor_preco,
      dados.precoAnuncio,
      dados.preco_anuncio,
      dados.precoFinal,
      dados.preco_final,
      dados.valor_preco_anuncio,
      dados.valor_servico,
      dados.preco_servico,
      dados.price,
      dados.valor,
    ];
    const encontrado = candidatos.find((valor) =>
      valor !== null && valor !== undefined && String(valor).trim() !== ''
    );

    if (encontrado !== undefined) {
      const textoNumerico = String(encontrado).trim().replace(/[^0-9,.-]/g, '');
      const normalizado = textoNumerico.includes(',') && textoNumerico.includes('.')
        ? textoNumerico.replace(/\./g, '').replace(',', '.')
        : textoNumerico.replace(',', '.');
      const numero = typeof encontrado === 'number' ? encontrado : Number(normalizado);
      if (Number.isFinite(numero) && numero >= 0) {
        const valor = numero.toLocaleString('pt-PT', {
          style: 'currency',
          currency: 'EUR',
        });
        return anuncio.preco_negociavel ? `${valor} · Negociável` : valor;
      }
      const texto = String(encontrado).trim();
      if (texto && !/^sob consulta$/i.test(texto)) return texto;
    }

    if (anuncio.preco_negociavel) return 'Preço negociável';
    return 'Preço sob consulta';
  }

  function contactar() {
    if (!anuncio?.contato?.trim()) {
      setErro('Este anúncio não tem dados de contacto disponíveis.');
      return;
    }
    setErro('');
    setModalContacto(true);
  }

  async function abrirMensagens() {
    if (!anuncio) return;

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) {
        // Alert.alert não é apresentado de forma fiável na versão web.
        router.push('/conta');
        return;
      }
      if (data.user.id === anuncio.user_id) {
        setErro('Este é o teu próprio anúncio. Não podes enviar uma mensagem para a tua própria conta.');
        return;
      }
      router.push({
        pathname: '/mensagens',
        params: {
          anuncioId: String(anuncio.id),
          anuncioTitulo: String(anuncio.titulo || ''),
          destinatarioId: String(anuncio.user_id),
        },
      });
    } catch (e: any) {
      console.error('Erro ao abrir mensagens:', e);
      setErro(e?.message || 'Não foi possível abrir as mensagens. Tenta novamente.');
    }
  }

  async function carregarAvaliacoes(
    anuncioId: string,
    avaliadorId: string | null
  ) {

    setCarregandoAvaliacoes(true);

    try {

      const { data, error } = await supabase

        .from('avaliacoes_publicas_vendedores')

        .select('id, nota, comentario, criado_em')
        .eq('anuncio_id', anuncioId)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      setAvaliacoes((data || []) as AvaliacaoPublica[]);

      if (avaliadorId) {

        const { data: propria, error: erroPropria } = await supabase

          .from('avaliacoes_publicas_vendedores')

          .select('id')
          .eq('anuncio_id', anuncioId)
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

        'Cada conta pode avaliar este anúncio apenas uma vez.'

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
          anuncio_id: anuncio.id,
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

      await carregarAvaliacoes(anuncio.id, utilizadorId);

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

          onPress={voltarComSeguranca}

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
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (letra) => letra.toUpperCase());

  const formatarValorCampo = (valor: unknown) => {

    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';

    if (typeof valor === 'number') return String(valor);

    return String(valor).trim();

  };

  return (

    <View style={styles.container}>

      <ScrollView

        showsVerticalScrollIndicator={false}

        contentContainerStyle={styles.content}

      >

        <TouchableOpacity

          style={styles.backButton}

          onPress={voltarComSeguranca}

          activeOpacity={0.7}

        >

          <Text style={styles.backButtonText}>

            ‹  Voltar aos anúncios

          </Text>

        </TouchableOpacity>

        <View style={styles.card}>

          <View style={styles.typeBadge}>

            <Text style={styles.type}>

              {anuncio.tipo_anuncio || 'Anúncio'}

            </Text>

          </View>

          {imagensAnuncio.length > 0 ? (

            <View style={styles.galleryContainer}>

              <ScrollView

                horizontal

                pagingEnabled

                showsHorizontalScrollIndicator={false}

                style={styles.gallery}

              >

                {imagensAnuncio.map((url, indice) => (

                  <Image

                    key={`${url}-${indice}`}

                    source={{ uri: url }}

                    style={[

                      styles.galleryImage,

                      { width: Math.min(Math.max(260, larguraEcra - 76), 980) },

                    ]}

                    resizeMode="cover"

                    accessibilityLabel={`Fotografia ${indice + 1} do anúncio`}

                  />

                ))}

              </ScrollView>

              {imagensAnuncio.length > 1 ? (

                <Text style={styles.galleryHint}>

                  Desliza para ver as {imagensAnuncio.length} fotografias

                </Text>

              ) : null}

            </View>

          ) : (

            <View style={styles.noImageBox}>

              <Text style={styles.noImageIcon}>▧</Text>

              <Text style={styles.noImageText}>

                Sem fotografias disponíveis

              </Text>

            </View>

          )}

          <Text style={styles.title}>{anuncio.titulo}</Text>

          {dadosEspecificos.nome_profissional ||

          dadosEspecificos.nome_negocio ? (

            <Text style={styles.businessName}>

              {String(

                dadosEspecificos.nome_profissional ||

                  dadosEspecificos.nome_negocio

              )}

            </Text>

          ) : null}

          {anuncio.categoria ? (

            <Text style={styles.category}>{anuncio.categoria}</Text>

          ) : null}

          {anuncio.localidade ? (

            <View style={styles.locationBox}>

              <Text style={styles.locationPin}>⌖</Text>

              <View style={styles.locationTextGroup}>

                <Text style={styles.infoLabel}>LOCALIDADE</Text>

                <Text style={styles.infoValue}>{anuncio.localidade}</Text>

              </View>

            </View>

          ) : null}

          <View style={styles.priceBox}>

            <Text style={styles.infoLabel}>PREÇO</Text>

            <Text style={styles.price}>{formatarPreco()}</Text>

          </View>

          {anuncio.descricao ? (

            <View style={styles.descriptionCard}>

              <Text style={styles.sectionHeading}>

                Sobre este anúncio

              </Text>

              <Text style={styles.description}>

                {anuncio.descricao}

              </Text>

            </View>

          ) : null}

          {camposVisiveis.length > 0 ? (

            <View style={styles.detailsSection}>

              <Text style={styles.sectionHeading}>

                Detalhes do anúncio

              </Text>

              {camposVisiveis.map(([chave, valor]) => (

                <View key={chave} style={styles.detailRow}>

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

          {erro ? <View style={styles.warningBox}><Text style={styles.warningText}>{erro}</Text></View> : null}

          <View style={styles.actionsSection}>

            <Text style={styles.actionsTitle}>

              Interessado neste anúncio?

            </Text>

            <Text style={styles.actionsSubtitle}>

              Escolhe como queres entrar em contacto com o anunciante.

            </Text>

            <TouchableOpacity

              style={styles.contactButton}

              onPress={contactar}

              activeOpacity={0.82}

            >

              <Text style={styles.contactButtonIcon}>☎</Text>

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

              <Text style={styles.messageButtonIcon}>✉</Text>

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

              <Text style={styles.quoteButtonIcon}>☷</Text>

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

              Avaliações deste anúncio

            </Text>

            <Text style={styles.reviewsSubtitle}>

              Consulta as opiniões da comunidade sobre este anúncio específico.

            </Text>

            <View style={styles.ratingSummary}>

              <Text style={styles.ratingAverage}>

                {avaliacoes.length

                  ? (

                      avaliacoes.reduce(

                        (total, item) => total + Number(item.nota),

                        0

                      ) / avaliacoes.length

                    )

                      .toFixed(1)

                      .replace('.', ',')

                  : '—'}

              </Text>

              <View style={styles.ratingSummaryDetails}>

                <Text style={styles.ratingStars}>

                  {avaliacoes.length

                    ? '★'.repeat(

                        Math.round(

                          avaliacoes.reduce(

                            (total, item) => total + Number(item.nota),

                            0

                          ) / avaliacoes.length

                        )

                      ) +

                      '☆'.repeat(

                        5 -

                          Math.round(

                            avaliacoes.reduce(

                              (total, item) => total + Number(item.nota),

                              0

                            ) / avaliacoes.length

                          )

                      )

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

            {!eProprietario && jaAvaliei ? (

              <View style={styles.reviewAlreadyBox}>

                <Text style={styles.reviewAlreadyText}>

                  ✓ Já enviaste uma avaliação a este anunciante.

                </Text>

              </View>

            ) : null}

            {carregandoAvaliacoes ? (

              <ActivityIndicator

                color="#1677B8"

                style={{ marginVertical: 18 }}

              />

            ) : avaliacoes.length === 0 ? (

              <Text style={styles.noReviewsText}>

                Ainda não existem avaliações para este anunciante.

              </Text>

            ) : (

              avaliacoes.map((avaliacao) => (

                <View key={avaliacao.id} style={styles.reviewCard}>

                  <View style={styles.reviewCardHeader}>

                    <Text style={styles.reviewStars}>

                      {'★'.repeat(Number(avaliacao.nota))}

                      {'☆'.repeat(5 - Number(avaliacao.nota))}

                    </Text>

                    <Text style={styles.reviewDate}>

                      {dataAvaliacao(avaliacao.criado_em)}

                    </Text>

                  </View>

                  <Text style={styles.reviewAuthor}>

                    Utilizador Conecta

                  </Text>

                  {avaliacao.comentario ? (

                    <Text style={styles.reviewComment}>

                      {avaliacao.comentario}

                    </Text>

                  ) : (

                    <Text style={styles.reviewNoComment}>

                      Sem comentário escrito.

                    </Text>

                  )}

                </View>

              ))

            )}

          </View>

        </View>

      </ScrollView>

      <Modal
        visible={modalContacto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalContacto(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Contacto do anunciante</Text>
            <Text style={styles.modalSubtitle}>Dados de contacto fornecidos neste anúncio</Text>
            <Text selectable style={styles.contactValue}>{anuncio?.contato || 'Contacto indisponível'}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => {
                const contacto = String(anuncio?.contato || '').trim();
                const telefone = contacto.replace(/[^+0-9]/g, '');
                if (telefone.length >= 6) {
                  Linking.openURL(`tel:${telefone}`).catch(() => setErro('Não foi possível abrir a aplicação de chamadas.'));
                } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto)) {
                  Linking.openURL(`mailto:${contacto}`).catch(() => setErro('Não foi possível abrir a aplicação de e-mail.'));
                } else {
                  setErro('O contacto foi apresentado acima. Copia-o para o utilizar.');
                }
              }}
            >
              <Text style={styles.primaryButtonText}>Utilizar contacto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalContacto(false)}>
              <Text style={styles.cancelButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal

        visible={modalOrcamento}

        transparent

        animationType="slide"

        onRequestClose={() => {

          if (!enviandoOrcamento) setModalOrcamento(false);

        }}

      >

        <KeyboardAvoidingView

          style={styles.modalOverlay}

          behavior={Platform.OS === 'ios' ? 'padding' : undefined}

        >

          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>Pedir orçamento</Text>

            <Text style={styles.modalSubtitle}>

              Anúncio: {anuncio.titulo}

            </Text>

            <Text style={styles.fieldLabel}>

              Descreve o serviço que pretendes

            </Text>

            <TextInput

              style={styles.quoteInput}

              value={descricaoOrcamento}

              onChangeText={setDescricaoOrcamento}

              placeholder="Explica o que precisas e indica os detalhes relevantes..."

              placeholderTextColor="#89939E"

              multiline

              maxLength={2000}

              textAlignVertical="top"

              editable={!enviandoOrcamento}

            />

            <Text style={styles.characterCount}>

              {descricaoOrcamento.length}/2000

            </Text>

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

                  Enviar pedido de orçamento

                </Text>

              )}

            </TouchableOpacity>

            <TouchableOpacity

              style={styles.cancelButton}

              onPress={() => setModalOrcamento(false)}

              disabled={enviandoOrcamento}

              activeOpacity={0.7}

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

    backgroundColor: '#F5F8FC',

  },

  content: {

    padding: 18,

    paddingBottom: 40,

  },

  center: {

    flex: 1,

    backgroundColor: '#F5F8FC',

    alignItems: 'center',

    justifyContent: 'center',

    padding: 24,

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

  backButton: {

    alignSelf: 'flex-start',

    marginBottom: 14,

    paddingVertical: 8,

    paddingHorizontal: 2,

  },

  backButtonText: {

    fontSize: 15,

    fontWeight: '700',

    color: '#1677B8',

  },

  card: {

    backgroundColor: '#FFFFFF',

    borderRadius: 22,

    padding: 20,

    borderWidth: 1,

    borderColor: '#E5EAF0',

    shadowColor: '#1D2733',

    shadowOffset: { width: 0, height: 5 },

    shadowOpacity: 0.045,

    shadowRadius: 12,

    elevation: 2,

  },

  galleryContainer: {

    marginHorizontal: -4,

    marginBottom: 18,

  },

  gallery: {

    width: '100%',

  },

  galleryImage: {

    height: 340,

    borderRadius: 18,

    marginRight: 10,

    backgroundColor: '#E8EDF2',

  },

  galleryHint: {

    color: '#718091',

    fontSize: 12,

    textAlign: 'center',

    marginTop: 8,

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

  businessName: {

    color: '#177DBA',

    fontSize: 17,

    fontWeight: '800',

    marginTop: 6,

    marginBottom: 8,

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

    fontSize: 27,

    lineHeight: 34,

    fontWeight: '800',

    color: '#172433',

    marginBottom: 8,

  },

  category: {

    fontSize: 15,

    color: '#68727E',

    marginBottom: 8,

  },

  locationBox: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#F8FAFC',

    borderRadius: 14,

    padding: 14,

    marginTop: 16,

  },

  locationPin: {

    fontSize: 24,

    color: '#1677B8',

    marginRight: 12,

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

    backgroundColor: '#F0F7FC',

    borderRadius: 16,

    padding: 16,

    marginTop: 14,

  },

  price: {

    fontSize: 28,

    fontWeight: '800',

    color: '#1677B8',

  },

  sectionHeading: {

    color: '#172433',

    fontSize: 19,

    fontWeight: '800',

    marginBottom: 12,

  },

  descriptionCard: {

    backgroundColor: '#F8FAFC',

    borderRadius: 16,

    padding: 16,

    marginTop: 22,

  },

  description: {

    fontSize: 16,

    lineHeight: 25,

    color: '#394451',

  },

  detailsSection: {

    marginTop: 22,

    borderWidth: 1,

    borderColor: '#E5EAF0',

    borderRadius: 16,

    paddingHorizontal: 15,

    paddingTop: 16,

    paddingBottom: 4,

  },

  detailRow: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'flex-start',

    paddingVertical: 12,

    borderTopWidth: 1,

    borderTopColor: '#EDF0F3',

    gap: 12,

  },

  detailLabel: {

    flex: 1,

    color: '#718091',

    fontSize: 13,

    fontWeight: '600',

    textTransform: 'capitalize',

  },

  detailValue: {

    flex: 1.2,

    color: '#243445',

    fontSize: 14,

    fontWeight: '700',

    textAlign: 'right',

  },

  actionsSection: {

    marginTop: 26,

    paddingTop: 20,

    borderTopWidth: 1,

    borderTopColor: '#E8EDF2',

  },

  actionsTitle: {

    fontSize: 18,

    fontWeight: '800',

    color: '#172433',

    marginBottom: 5,

  },

  actionsSubtitle: {

    fontSize: 13,

    lineHeight: 19,

    color: '#718091',

    marginBottom: 15,

  },

  buttonTextGroup: {

    flex: 1,

  },

  contactButton: {

    minHeight: 68,

    borderRadius: 15,

    backgroundColor: '#1677B8',

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 16,

    paddingVertical: 12,

    marginTop: 3,

    shadowColor: '#1677B8',

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.16,

    shadowRadius: 7,

    elevation: 3,

  },

  contactButtonIcon: {

    fontSize: 22,

    color: '#FFFFFF',

    marginRight: 13,

    width: 27,

    textAlign: 'center',

  },

  contactButtonText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',

  },

  contactButtonSubtext: {

    color: '#E0F1FC',

    fontSize: 12,

    marginTop: 3,

  },

  buttonArrow: {

    fontSize: 27,

    fontWeight: '400',

    color: '#FFFFFF',

    marginLeft: 10,

  },

  messageButton: {

    minHeight: 68,

    borderRadius: 15,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,

    borderColor: '#D8E4EF',

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 16,

    paddingVertical: 12,

    marginTop: 11,

  },

  messageButtonIcon: {

    fontSize: 22,

    color: '#1677B8',

    marginRight: 13,

    width: 27,

    textAlign: 'center',

  },

  messageButtonText: {

    color: '#17354D',

    fontSize: 15,

    fontWeight: '800',

  },

  messageButtonSubtext: {

    color: '#718091',

    fontSize: 12,

    marginTop: 3,

  },

  messageButtonArrow: {

    fontSize: 27,

    color: '#1677B8',

    marginLeft: 10,

  },

  quoteButton: {

    minHeight: 68,

    borderRadius: 15,

    backgroundColor: '#203448',

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 16,

    paddingVertical: 12,

    marginTop: 11,

  },

  quoteButtonIcon: {

    fontSize: 22,

    color: '#FFFFFF',

    marginRight: 13,

    width: 27,

    textAlign: 'center',

  },

  quoteButtonText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',

  },

  quoteButtonSubtext: {

    color: '#D5E1EB',

    fontSize: 12,

    marginTop: 3,

  },

  purchaseDivider: {

    height: 1,

    backgroundColor: '#E8EDF2',

    marginBottom: 20,

  },

  reviewsSection: {

    marginTop: 24,

    paddingTop: 2,

  },

  reviewsTitle: {

    fontSize: 20,

    fontWeight: '800',

    color: '#172433',

    marginBottom: 6,

  },

  reviewsSubtitle: {

    fontSize: 13,

    lineHeight: 20,

    color: '#718091',

    marginBottom: 16,

  },

  ratingSummary: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#F4F8FB',

    borderRadius: 15,

    padding: 16,

    marginBottom: 16,

  },

  ratingAverage: {

    fontSize: 34,

    fontWeight: '800',

    color: '#172433',

    marginRight: 14,

  },

  ratingSummaryDetails: {

    flex: 1,

  },

  ratingStars: {

    fontSize: 22,

    color: '#E6A100',

    letterSpacing: 1,

  },

  ratingCount: {

    fontSize: 12,

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

  noReviewsText: {

    color: '#718091',

    fontSize: 13,

    lineHeight: 20,

    paddingVertical: 12,

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

  reviewAuthor: {

    fontSize: 12,

    fontWeight: '800',

    color: '#394451',

    marginBottom: 7,

  },

  reviewComment: {

    fontSize: 14,

    lineHeight: 21,

    color: '#394451',

  },

  reviewNoComment: {

    fontSize: 13,

    color: '#89939E',

    fontStyle: 'italic',

  },

  ownerNotice: {

    marginTop: 22,

    padding: 15,

    backgroundColor: '#F0F5F9',

    borderRadius: 14,

  },

  ownerNoticeTitle: {

    fontSize: 14,

    fontWeight: '800',

    color: '#304457',

    marginBottom: 4,

  },

  ownerNoticeText: {

    fontSize: 13,

    lineHeight: 19,

    color: '#657587',

  },

  modalOverlay: {

    flex: 1,

    backgroundColor: 'rgba(15, 23, 42, 0.52)',

    justifyContent: 'center',

    padding: 20,

  },

  modalCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 22,

    padding: 22,

    shadowColor: '#000000',

    shadowOffset: { width: 0, height: 8 },

    shadowOpacity: 0.15,

    shadowRadius: 18,

    elevation: 8,

  },

  modalTitle: {

    fontSize: 24,

    fontWeight: '800',

    color: '#1D2733',

    marginBottom: 8,

  },

  modalSubtitle: {

    fontSize: 15,

    lineHeight: 22,

    color: '#68727E',

    marginBottom: 22,

  },

  fieldLabel: {

    fontSize: 14,

    fontWeight: '700',

    color: '#394451',

    marginBottom: 8,

  },

  quoteInput: {

    minHeight: 140,

    maxHeight: 240,

    borderWidth: 1,

    borderColor: '#D9E0E6',

    borderRadius: 13,

    padding: 14,

    fontSize: 16,

    lineHeight: 23,

    color: '#1D2733',

    backgroundColor: '#FBFCFD',

  },

  characterCount: {

    fontSize: 12,

    color: '#68727E',

    textAlign: 'right',

    marginTop: 6,

    marginBottom: 18,

  },

  warningBox: {
    backgroundColor: '#FFF7E6',
    borderColor: '#F0D49B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  warningText: { color: '#805600', fontSize: 13, lineHeight: 19 },

  contactValue: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '800',
    color: '#172A48',
    backgroundColor: '#F1F6FB',
    borderWidth: 1,
    borderColor: '#DCE5F0',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    marginBottom: 14,
    textAlign: 'center',
  },

  primaryButton: {

    minHeight: 52,

    paddingHorizontal: 18,

    borderRadius: 13,

    backgroundColor: '#1677B8',

    alignItems: 'center',

    justifyContent: 'center',

  },

  primaryButtonText: {

    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '800',

    textAlign: 'center',

  },

  disabledButton: {

    opacity: 0.65,

  },

  cancelButton: {

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 14,

    marginTop: 4,

  },

  cancelButtonText: {

    color: '#68727E',

    fontSize: 15,

    fontWeight: '700',

  },

});