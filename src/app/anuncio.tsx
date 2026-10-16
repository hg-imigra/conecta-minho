import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { useEffect, useRef, useState } from 'react';

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

  const galeriaRef = useRef<ScrollView | null>(null);
  const [indiceImagem, setIndiceImagem] = useState(0);

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
      // A consulta do anúncio é prioritária: não esperar por autenticação
      // nem por avaliações para mostrar o conteúdo principal.
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

      if (
        Boolean(dadosAnuncio.submissao_prive) ||
        tipoAnuncio.includes('adulto') ||
        tipoAnuncio.includes('privé') ||
        tipoAnuncio.includes('prive')
      ) {
        setErro('Este perfil pertence ao Conecta Privé e só pode ser consultado dentro da área Privé.');
        setAnuncio(null);
        return;
      }

      setAnuncio(anuncioCarregado);
      setLoading(false);

      // Autenticação e avaliações carregam em segundo plano, sem bloquear a página.
      void (async () => {
        try {
          const { data: auth, error: erroAuth } = await supabase.auth.getUser();
          if (erroAuth) throw erroAuth;
          const utilizador = auth.user;
          setUtilizadorId(utilizador?.id ?? null);
          await carregarAvaliacoes(anuncioCarregado.id, utilizador?.id ?? null);
        } catch (e) {
          console.error('Erro ao carregar sessão/avaliações:', e);
          // A página continua utilizável mesmo que as avaliações falhem.
        }
      })();
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

  function obterContacto(): string {
    if (!anuncio) return '';
    const dados = anuncio.dados_especificos ?? {};
    const candidatos = [
      anuncio.contato,
      dados.contato,
      dados.contacto,
      dados.telefone,
      dados.telemovel,
      dados.telefone_contacto,
      dados.numero_telefone,
      dados.whatsapp,
      dados.email,
      dados.email_contacto,
    ];
    const contacto = candidatos.find(
      (valor) => typeof valor === 'string' && valor.trim().length > 0
    );
    return typeof contacto === 'string' ? contacto.trim() : '';
  }

  function contactar() {
    if (!obterContacto()) {
      setErro('Este anúncio não tem dados de contacto disponíveis.');
      return;
    }
    setErro('');
    setModalContacto(true);
  }

  function utilizarContacto() {
    const contacto = obterContacto();
    if (!contacto) {
      setErro('Este anúncio não tem dados de contacto disponíveis.');
      setModalContacto(false);
      return;
    }

    // E-mail deve ser tratado antes do telefone para evitar abrir tel: por engano.
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto)) {
      Linking.openURL(`mailto:${contacto}`).catch(() =>
        setErro('Não foi possível abrir a aplicação de e-mail. Copia o endereço apresentado.'));
      return;
    }

    const dados = anuncio?.dados_especificos ?? {};
    const whatsappGuardado = [dados.whatsapp, dados.numero_whatsapp, dados.telefone_whatsapp]
      .some((valor) => typeof valor === 'string' && valor.trim() === contacto);
    const numero = contacto.replace(/[^+0-9]/g, '');
    if (numero.replace(/\D/g, '').length >= 6) {
      if (whatsappGuardado) {
        const internacional = numero.replace(/^\+/, '').replace(/^00/, '');
        Linking.openURL(`https://wa.me/${internacional}`).catch(() =>
          setErro('Não foi possível abrir o WhatsApp. Copia o número apresentado.'));
      } else {
        Linking.openURL(`tel:${numero}`).catch(() =>
          setErro('Não foi possível abrir a aplicação de chamadas. Copia o número apresentado.'));
      }
      return;
    }

    setErro('O contacto está apresentado acima. Copia-o para o utilizar.');
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

      // A falha das avaliações não deve bloquear nem interromper a consulta do anúncio.
      console.warn('Avaliações indisponíveis neste momento.');

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
        <Stack.Screen options={{ headerShown: false }} />

        <ActivityIndicator size="large" color="#1677B8" />

        <Text style={styles.loadingText}>A carregar anúncio...</Text>

      </View>

    );

  }

  if (erro || !anuncio) {

    return (

      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />

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
    'contato',
    'contacto',
    'telefone',
    'telemovel',
    'telefone_contacto',
    'numero_telefone',
    'whatsapp',
    'numero_whatsapp',
    'telefone_whatsapp',
    'email',
    'email_contacto',
    'nome_profissional',
    'nome_negocio',
    'nome_empresa',
    'experiencia',
    'fotos',
    'fotografias',
  ]);

  const camposVisiveis = Object.entries(dadosEspecificos).filter(

    ([chave, valor]) => {

      const chaveNormalizada = chave.toLowerCase().replace(/[\s_-]+/g, '');
      const valorNormalizado = String(valor ?? '').trim().toLocaleLowerCase('pt-PT');
      const localidadeNormalizada = String(anuncio.localidade ?? '').trim().toLocaleLowerCase('pt-PT');
      const eZonaAtendimento = ['zonaatendimento', 'areaatendimento', 'localidadesatendidas', 'zonadeatendimento'].includes(chaveNormalizada);
      const zonaRepeteLocalidade = eZonaAtendimento && valorNormalizado && localidadeNormalizada && valorNormalizado === localidadeNormalizada;

      if (
        camposInternos.has(chave.toLowerCase()) ||
        valor === null ||
        valor === undefined ||
        valor === '' ||
        zonaRepeteLocalidade
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
      <Stack.Screen options={{ headerShown: false }} />

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
              <View style={styles.galleryFrame}>
                <ScrollView
                  ref={galeriaRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.gallery}
                  onMomentumScrollEnd={(event) => {
                    const largura = Math.max(1, Math.min(larguraEcra - 76, 980));
                    setIndiceImagem(Math.max(0, Math.min(imagensAnuncio.length - 1, Math.round(event.nativeEvent.contentOffset.x / largura))));
                  }}
                >
                  {imagensAnuncio.map((url, indice) => (
                    <Image
                      key={`${url}-${indice}`}
                      source={{ uri: url }}
                      style={[styles.galleryImage, { width: Math.min(Math.max(260, larguraEcra - (larguraEcra < 600 ? 72 : 92)), 1076) }]}
                      resizeMode="cover"
                      accessibilityLabel={`Fotografia ${indice + 1} do anúncio`}
                    />
                  ))}
                </ScrollView>
                {imagensAnuncio.length > 1 ? (
                  <>
                    <View style={styles.galleryCounter}>
                      <Text style={styles.galleryCounterText}>{indiceImagem + 1} / {imagensAnuncio.length}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.galleryArrow, styles.galleryArrowLeft, indiceImagem === 0 && styles.galleryArrowDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel="Ver fotografia anterior"
                      disabled={indiceImagem === 0}
                      onPress={() => {
                        const proximo = Math.max(0, indiceImagem - 1);
                        setIndiceImagem(proximo);
                        galeriaRef.current?.scrollTo({ x: proximo * Math.min(Math.max(260, larguraEcra - (larguraEcra < 600 ? 72 : 92)), 1076), animated: true });
                      }}
                    >
                      <Text style={styles.galleryArrowText}>‹</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.galleryArrow, styles.galleryArrowRight, indiceImagem >= imagensAnuncio.length - 1 && styles.galleryArrowDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel="Ver fotografia seguinte"
                      disabled={indiceImagem >= imagensAnuncio.length - 1}
                      onPress={() => {
                        const proximo = Math.min(imagensAnuncio.length - 1, indiceImagem + 1);
                        setIndiceImagem(proximo);
                        galeriaRef.current?.scrollTo({ x: proximo * Math.min(Math.max(260, larguraEcra - (larguraEcra < 600 ? 72 : 92)), 1076), animated: true });
                      }}
                    >
                      <Text style={styles.galleryArrowText}>›</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
              {imagensAnuncio.length > 1 ? (
                <Text style={styles.galleryHint}>
                  Usa as setas ou desliza a galeria para ver as fotografias
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.noImageBox}>
              <Text style={styles.noImageIcon}>▧</Text>
              <Text style={styles.noImageText}>Sem fotografias disponíveis</Text>
            </View>
          )}

          <View style={styles.listingHeading}>
            <Text style={styles.metaLabel}>TÍTULO DO ANÚNCIO</Text>
            <Text style={styles.title}>{anuncio.titulo}</Text>
            {anuncio.categoria ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{anuncio.categoria}</Text>
              </View>
            ) : null}
          </View>

          {(dadosEspecificos.nome_profissional || dadosEspecificos.nome_negocio || dadosEspecificos.nome_empresa) ? (
            <View style={styles.businessNameBlock}>
              <Text style={styles.metaLabel}>NOME / EMPRESA</Text>
              <Text style={styles.businessName}>
                {String(dadosEspecificos.nome_profissional || dadosEspecificos.nome_negocio || dadosEspecificos.nome_empresa)}
              </Text>
            </View>
          ) : null}

          {anuncio.localidade ? (

            <View style={styles.locationBox}>

              <Text style={styles.locationPin}>⌖</Text>

              <View style={styles.locationTextGroup}>

                <Text style={styles.infoLabel}>LOCALIDADE DO ANÚNCIO</Text>

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
                Descrição do anúncio
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
            <Text style={styles.actionsTitle}>Queres saber mais sobre este serviço?</Text>
            <Text style={styles.actionsSubtitle}>
              Entra em contacto com o anunciante ou pede um orçamento através dos botões sempre disponíveis no fundo do ecrã.
            </Text>
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

      <View style={styles.stickyActionsOuter}>
        <View style={styles.stickyActions}>
          <TouchableOpacity
            style={[styles.stickyActionButton, styles.stickyMessageButton]}
            onPress={abrirMensagens}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem ao anunciante"
          >
            <Text style={styles.stickyActionIcon}>✉</Text>
            <Text style={styles.stickyMessageText} numberOfLines={1}>Mensagem</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stickyActionButton, styles.stickyQuoteButton]}
            onPress={() => {
              setDescricaoOrcamento('');
              setModalOrcamento(true);
            }}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Pedir orçamento para este anúncio"
          >
            <Text style={styles.stickyActionIcon}>▤</Text>
            <Text style={styles.stickyQuoteText} numberOfLines={1}>Orçamento</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stickyActionButton, styles.stickyContactButton]}
            onPress={contactar}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Ver contacto do anunciante"
          >
            <Text style={styles.stickyActionIcon}>☎</Text>
            <Text style={styles.stickyContactText} numberOfLines={1}>Contacto</Text>
          </TouchableOpacity>
        </View>
      </View>

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
            <Text selectable style={styles.contactValue}>{obterContacto() || 'Contacto indisponível'}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={utilizarContacto}
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
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 14,
    paddingTop: Platform.OS === 'web' ? 24 : 14,
    paddingBottom: 148,
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
    borderRadius: 24,
    padding: 26,
    borderWidth: 1,
    borderColor: '#E3EAF2',
    shadowColor: '#17324D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 3,
  },

  galleryContainer: {
    marginHorizontal: -4,
    marginBottom: 22,
  },
  galleryFrame: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#E8EDF2',
  },
  gallery: { width: '100%' },
  galleryImage: {
    height: Platform.OS === 'web' ? 420 : 300,
    borderRadius: 18,
    backgroundColor: '#E8EDF2',
  },
  galleryCounter: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(18, 32, 47, 0.82)',
  },
  galleryCounterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  galleryArrow: {
    position: 'absolute',
    top: '45%',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 32, 47, 0.78)',
  },
  galleryArrowLeft: { left: 12 },
  galleryArrowRight: { right: 12 },
  galleryArrowDisabled: { opacity: 0.35 },
  galleryArrowText: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontWeight: '500' },
  galleryHint: {
    color: '#718091',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 9,
  },

  noImageBox: {

    height: 260,

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

  listingHeading: {
    gap: 9,
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#EAF4FC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    color: '#1677B8',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  businessNameBlock: { marginTop: 8, marginBottom: 5 },
  metaLabel: {
    color: '#7B8794',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  businessName: {
    color: '#177DBA',
    fontSize: 16,
    fontWeight: '800',
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
    fontSize: Platform.OS === 'web' ? 28 : 25,
    lineHeight: Platform.OS === 'web' ? 34 : 31,
    fontWeight: '800',
    color: '#172433',
    marginBottom: 0,
    flexShrink: 1,
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
    backgroundColor: '#EFF7FD',
    borderRadius: 18,
    padding: 20,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#D9ECFA',
  },

  price: {
    fontSize: Platform.OS === 'web' ? 25 : 22,
    lineHeight: Platform.OS === 'web' ? 31 : 28,
    fontWeight: '800',
    color: '#1677B8',
    flexShrink: 1,
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

    marginTop: 32,

    paddingTop: 24,

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

    marginTop: 32,

    paddingTop: 8,

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

  stickyActionsOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2EAF2',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'web' ? 12 : 18,
    shadowColor: '#18324A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  stickyActions: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  stickyActionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 5,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  stickyMessageButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1677B8',
  },
  stickyQuoteButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1677B8',
  },
  stickyContactButton: {
    backgroundColor: '#0EAD73',
    borderWidth: 1,
    borderColor: '#0EAD73',
  },
  stickyActionIcon: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1677B8',
  },
  stickyMessageText: {
    color: '#1677B8',
    fontSize: 12,
    fontWeight: '800',
  },
  stickyQuoteText: {
    color: '#1677B8',
    fontSize: 12,
    fontWeight: '800',
  },
  stickyContactText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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