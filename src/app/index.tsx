import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supabase';

const REGIOES = ['Guimarães', 'Vizela', 'Fafe'] as const;
type Regiao = (typeof REGIOES)[number];
const CHAVE_REGIAO = '@conecta_regiao';
const CHAVE_AVATAR_TIPO = '@conecta_avatar_tipo';
const CHAVE_AVATAR_VALOR = '@conecta_avatar_valor';
const CHAVE_AVATAR_FOTO = '@conecta_avatar_foto';

type AvatarTipo = 'inicial' | 'emoji' | 'foto';

type AvatarOption = {
  id: string;
  emoji: string;
  nome: string;
};

const AVATARES: AvatarOption[] = [
  { id: 'heroi', emoji: '🦸', nome: 'Herói' },
  { id: 'heroina', emoji: '🦸‍♀️', nome: 'Heroína' },
  { id: 'mago', emoji: '🧙', nome: 'Mago' },
  { id: 'maga', emoji: '🧙‍♀️', nome: 'Maga' },
  { id: 'fantasia', emoji: '🧚', nome: 'Fantasia' },
  { id: 'astronauta', emoji: '🧑‍🚀', nome: 'Astronauta' },
  { id: 'gamer', emoji: '🎮', nome: 'Gamer' },
  { id: 'futebol', emoji: '⚽', nome: 'Futebol' },
  { id: 'musica', emoji: '🎧', nome: 'Música' },
  { id: 'cao', emoji: '🐶', nome: 'Cão' },
  { id: 'gato', emoji: '🐱', nome: 'Gato' },
  { id: 'urso', emoji: '🐻', nome: 'Urso' },
];

const necessidades = [
  ['🔧', 'Reparação em casa', 'Canalizador, eletricista, obras'],
  ['🚗', 'Problema no carro', 'Mecânica, pneus, reboque'],
  ['🧹', 'Limpeza', 'Casa, escritório e pós-obra'],
  ['👶', 'Crianças e família', 'Babysitter, atividades, escolas'],
  ['🐾', 'Cuidados para pets', 'Veterinário, tosquia, pet sitting'],
  ['💻', 'Informática', 'Computadores, telemóveis e suporte'],
  ['⚖️', 'Questão jurídica', 'Advocacia e solicitadoria'],
  ['📦', 'Transportes', 'Mudanças, entregas e transporte'],
];

const especialidades = [
  ['👶', 'Babysitter'],
  ['🐾', 'Pet sitter'],
  ['💅', 'Manicure'],
  ['📷', 'Fotógrafo'],
  ['🌿', 'Jardineiro'],
  ['🪡', 'Costureira'],
  ['📚', 'Explicador'],
  ['💻', 'Técnico informático'],
];

const categorias = [
  ['🔨', 'Obras e remodelações', 'obras'],
  ['⚡', 'Eletricista', 'eletricista'],
  ['🚰', 'Canalizador', 'canalizador'],
  ['📺', 'Reparação de eletrodomésticos', 'eletrodomesticos'],
  ['💻', 'Informática', 'informatica'],
  ['🚘', 'Automóveis', 'automoveis'],
  ['🧹', 'Limpeza', 'limpeza'],
  ['🌿', 'Jardinagem', 'jardinagem'],
  ['💇', 'Beleza e estética', 'beleza'],
  ['💚', 'Saúde e bem-estar', 'saude'],
  ['⚖️', 'Advocacia', 'advocacia'],
  ['🧾', 'Contabilidade', 'contabilidade'],
  ['🚚', 'Transportes e mudanças', 'transportes'],
  ['🧺', 'Lavandarias e engomadorias', 'lavandarias'],
  ['🚦', 'Escolas de condução', 'escolas'],
  ['☕', 'Cafés, padarias e pastelarias', 'alimentacao'],
  ['⚖️', 'Solicitadores', 'solicitadores'],
  ['💇', 'Salões de beleza', 'saloes'],
  ['💈', 'Barbearias', 'barbearias'],
  ['🛠️', 'Oficinas e centros automóveis', 'oficinas'],
  ['🪡', 'Costura e arranjos', 'costura'],
  ['📷', 'Fotografia e vídeo', 'fotografia'],
  ['📚', 'Explicações e formação', 'explicacoes'],
  ['•••', 'Outros serviços', 'outros'],
];

export default function HomeScreen() {
  const router = useRouter();

  const [regiaoSelecionada, setRegiaoSelecionada] =
    useState<Regiao>('Guimarães');
  const [modalRegiaoVisivel, setModalRegiaoVisivel] = useState(false);
  const [modalAvatarVisivel, setModalAvatarVisivel] = useState(false);
  const [nomeUtilizador, setNomeUtilizador] = useState('Utilizador');
  const [avatarTipo, setAvatarTipo] = useState<AvatarTipo>('inicial');
  const [avatarValor, setAvatarValor] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mensagensPorLer, setMensagensPorLer] = useState(0);
  const [mostrarTodasNecessidades, setMostrarTodasNecessidades] =
    useState(false);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    if (!userId) {
      setMensagensPorLer(0);
      return;
    }

    let ativo = true;

    async function carregarMensagensPorLer() {
      const { count, error } = await supabase
        .from('mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', userId)
        .eq('lida', false);

      if (!ativo) return;

      if (error) {
        console.log('Erro ao contar mensagens por ler:', error.message);
        return;
      }

      setMensagensPorLer(count ?? 0);
    }

    carregarMensagensPorLer();

    const canal = supabase
      .channel(`mensagens-por-ler-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensagens',
          filter: `destinatario_id=eq.${userId}`,
        },
        () => carregarMensagensPorLer()
      )
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [userId]);

  async function carregarDadosIniciais() {
    await Promise.all([carregarRegiao(), carregarUtilizador()]);
  }

  async function carregarRegiao() {
    try {
      const regiaoGuardada = await AsyncStorage.getItem(CHAVE_REGIAO);

      if (
        regiaoGuardada === 'Guimarães' ||
        regiaoGuardada === 'Vizela' ||
        regiaoGuardada === 'Fafe'
      ) {
        setRegiaoSelecionada(regiaoGuardada);
      }
    } catch (error) {
      console.log('Erro ao carregar região:', error);
    }
  }

  async function selecionarRegiao(regiao: Regiao) {
    try {
      await AsyncStorage.setItem(CHAVE_REGIAO, regiao);
      setRegiaoSelecionada(regiao);
      setModalRegiaoVisivel(false);
    } catch (error) {
      console.log('Erro ao guardar região:', error);
    }
  }

  async function carregarUtilizador() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setNomeUtilizador('Utilizador');
        setUserId(null);
        await carregarAvatarLocal(null);
        return;
      }

      setUserId(session.user.id);

      const metadata = session.user.user_metadata || {};
      const nomePossiveis = [
        metadata.first_name,
        metadata.primeiro_nome,
        metadata.nome,
        metadata.name,
        metadata.full_name,
        metadata.display_name,
      ];

      let nomeEncontrado = '';

      for (const nome of nomePossiveis) {
        if (typeof nome === 'string' && nome.trim()) {
          nomeEncontrado = nome.trim().split(' ')[0];
          break;
        }
      }

      if (!nomeEncontrado) {
        const email = session.user.email?.trim();

        if (email) {
          const parte = email.split('@')[0];

          if (parte) {
            nomeEncontrado =
              parte.charAt(0).toUpperCase() + parte.slice(1);
          }
        }
      }

      if (!nomeEncontrado) {
        nomeEncontrado = 'Utilizador';
      }

      setNomeUtilizador(nomeEncontrado);

      const avatarTipoMetadata = metadata.avatar_tipo;
      const avatarValorMetadata = metadata.avatar_valor;

      if (
        avatarTipoMetadata === 'emoji' &&
        typeof avatarValorMetadata === 'string' &&
        avatarValorMetadata
      ) {
        setAvatarTipo('emoji');
        setAvatarValor(avatarValorMetadata);
      } else {
        await carregarAvatarLocal(session.user.id);
      }
    } catch (error) {
      console.log('Erro ao carregar utilizador:', error);
    }
  }

  async function carregarAvatarLocal(id: string | null) {
    try {
      const sufixo = id ? `_${id}` : '';

      const tipo = await AsyncStorage.getItem(
        `${CHAVE_AVATAR_TIPO}${sufixo}`
      );

      const valor = await AsyncStorage.getItem(
        `${CHAVE_AVATAR_VALOR}${sufixo}`
      );

      const foto = await AsyncStorage.getItem(
        `${CHAVE_AVATAR_FOTO}${sufixo}`
      );

      if (tipo === 'foto' && foto) {
        setAvatarTipo('foto');
        setFotoPerfil(foto);
        setAvatarValor('');
        return;
      }

      if (tipo === 'emoji' && valor) {
        setAvatarTipo('emoji');
        setAvatarValor(valor);
        setFotoPerfil(null);
        return;
      }

      setAvatarTipo('inicial');
      setAvatarValor('');
      setFotoPerfil(null);
    } catch (error) {
      console.log('Erro ao carregar avatar:', error);
    }
  }

  async function guardarAvatarLocal(
    tipo: AvatarTipo,
    valor: string,
    foto: string | null
  ) {
    try {
      const sufixo = userId ? `_${userId}` : '';

      await AsyncStorage.setItem(
        `${CHAVE_AVATAR_TIPO}${sufixo}`,
        tipo
      );

      await AsyncStorage.setItem(
        `${CHAVE_AVATAR_VALOR}${sufixo}`,
        valor || ''
      );

      if (foto) {
        await AsyncStorage.setItem(
          `${CHAVE_AVATAR_FOTO}${sufixo}`,
          foto
        );
      } else {
        await AsyncStorage.removeItem(
          `${CHAVE_AVATAR_FOTO}${sufixo}`
        );
      }
    } catch (error) {
      console.log('Erro ao guardar avatar:', error);
    }
  }

  async function salvarAvatarNoSupabase(
    tipo: AvatarTipo,
    valor: string
  ) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      await supabase.auth.updateUser({
        data: {
          avatar_tipo: tipo,
          avatar_valor: valor,
        },
      });
    } catch (error) {
      console.log('Erro ao guardar avatar no Supabase:', error);
    }
  }

  async function usarInicial() {
    setAvatarTipo('inicial');
    setAvatarValor('');
    setFotoPerfil(null);

    await guardarAvatarLocal('inicial', '', null);
    await salvarAvatarNoSupabase('inicial', '');

    setModalAvatarVisivel(false);
  }

  async function escolherAvatar(avatar: AvatarOption) {
    setAvatarTipo('emoji');
    setAvatarValor(avatar.emoji);
    setFotoPerfil(null);

    await guardarAvatarLocal('emoji', avatar.emoji, null);
    await salvarAvatarNoSupabase('emoji', avatar.emoji);

    setModalAvatarVisivel(false);
  }

  async function escolherFotoGaleria() {
    try {
      const permissao =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de acesso às suas fotografias para escolher uma imagem de perfil.'
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (
        resultado.canceled ||
        !resultado.assets ||
        resultado.assets.length === 0
      ) {
        return;
      }

      const uri = resultado.assets[0].uri;

      setAvatarTipo('foto');
      setFotoPerfil(uri);
      setAvatarValor('');

      await guardarAvatarLocal('foto', '', uri);
      await salvarAvatarNoSupabase('foto', '');

      setModalAvatarVisivel(false);
    } catch (error) {
      console.log('Erro ao escolher fotografia:', error);

      Alert.alert(
        'Não foi possível escolher a fotografia',
        'Tente novamente.'
      );
    }
  }

  async function tirarFoto() {
    try {
      const permissao =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de acesso à câmara para tirar a fotografia de perfil.'
        );
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (
        resultado.canceled ||
        !resultado.assets ||
        resultado.assets.length === 0
      ) {
        return;
      }

      const uri = resultado.assets[0].uri;

      setAvatarTipo('foto');
      setFotoPerfil(uri);
      setAvatarValor('');

      await guardarAvatarLocal('foto', '', uri);
      await salvarAvatarNoSupabase('foto', '');

      setModalAvatarVisivel(false);
    } catch (error) {
      console.log('Erro ao tirar fotografia:', error);

      Alert.alert(
        'Não foi possível tirar fotografia',
        'Tente novamente.'
      );
    }
  }

  function abrirPesquisa(categoria?: string) {
    if (categoria) {
      router.push({
        pathname: '/pesquisar',
        params: {
          categoria,
          regiao: regiaoSelecionada,
        },
      } as any);

      return;
    }

    router.push('/pesquisar');
  }

  function saudacaoDoDia() {
    const hora = new Date().getHours();

    if (hora >= 5 && hora < 12) {
      return 'Bom dia,';
    }

    if (hora >= 12 && hora < 19) {
      return 'Boa tarde,';
    }

    return 'Boa noite,';
  }

  function periodoDoDia() {
    const hora = new Date().getHours();

    if (hora >= 5 && hora < 12) {
      return 'manha';
    }

    if (hora >= 12 && hora < 19) {
      return 'tarde';
    }

    return 'noite';
  }

  function avatarInicial() {
    if (!nomeUtilizador || nomeUtilizador === 'Utilizador') {
      return 'U';
    }

    return nomeUtilizador.charAt(0).toUpperCase();
  }

  function renderAvatarPrincipal() {
    if (avatarTipo === 'foto' && fotoPerfil) {
      return (
        <Image
          source={{ uri: fotoPerfil }}
          style={styles.avatarImage}
        />
      );
    }

    if (avatarTipo === 'emoji' && avatarValor) {
      return (
        <Text style={styles.avatarEmoji}>
          {avatarValor}
        </Text>
      );
    }

    return (
      <Text style={styles.welcomeAvatarText}>
        {avatarInicial()}
      </Text>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* CABEÇALHO */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.headerAvatarButton}
            onPress={() => setModalAvatarVisivel(true)}
          >
            {renderAvatarPrincipal()}

            <View style={styles.headerAvatarEdit}>
              <Text style={styles.headerAvatarEditText}>✎</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerGreetingArea}>
            <Text style={styles.headerGreeting}>
              {saudacaoDoDia()}
            </Text>

            <Text
              style={styles.headerName}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {nomeUtilizador}!
            </Text>

            <Text style={styles.headerQuestion}>
              O que precisa hoje?
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.headerRegionButton}
              onPress={() => setModalRegiaoVisivel(true)}
            >
              <Text style={styles.headerRegionIcon}>📍</Text>

              <Text
                style={styles.headerRegionText}
                numberOfLines={1}
              >
                {regiaoSelecionada}
              </Text>

              <Text style={styles.headerRegionArrow}>⌄</Text>
            </TouchableOpacity>

            {/* BOTÃO MAIS */}
            <TouchableOpacity
              activeOpacity={0.65}
              style={styles.headerMoreButton}
              onPress={() => router.push('/mais')}
              accessibilityRole="button"
              accessibilityLabel="Mais opções"
            >
              <Text style={styles.headerMoreText}>•••</Text>
              <Text style={styles.headerMoreLabel}>Mais</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PESQUISA */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => abrirPesquisa()}
          style={styles.searchBox}
        >
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            editable={false}
            pointerEvents="none"
            placeholder="Pesquisar serviços, profissionais..."
            placeholderTextColor="#7B8794"
            style={styles.searchInput}
          />

          <View style={styles.searchFilterButton}>
            <Text style={styles.searchFilterIcon}>☷</Text>
          </View>
        </TouchableOpacity>

        {/* ÁREAS PRINCIPAIS */}
        <View style={styles.primaryGrid}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryCard, styles.primaryCardHome]}
            onPress={() => abrirPesquisa('casa')}
          >
            <Text style={styles.primaryIcon}>🏠</Text>
            <Text style={styles.primaryTitle}>Para a sua casa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryCard, styles.primaryCardCar]}
            onPress={() => abrirPesquisa('automoveis')}
          >
            <Text style={styles.primaryIcon}>🚗</Text>
            <Text style={styles.primaryTitle}>Para o seu carro</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryCard, styles.primaryCardPet]}
            onPress={() => abrirPesquisa('pet')}
          >
            <Text style={styles.primaryIcon}>🐶</Text>
            <Text style={styles.primaryTitle}>Para o seu animal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.classifiedCard}
            onPress={() => abrirPesquisa()}
          >
            <Text style={styles.classifiedIcon}>🛍️</Text>
            <Text style={styles.classifiedTitle}>Classificados</Text>
            <Text style={styles.classifiedArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* PRECISA DE ALGUMA COISA */}
        <View style={styles.sectionHeadingRow}>
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>
              Precisa de alguma coisa?
            </Text>

            <Text style={styles.sectionSubtitle}>
              Encontre rapidamente o serviço que procura.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.seeAllButton}
            onPress={() =>
              setMostrarTodasNecessidades(!mostrarTodasNecessidades)
            }
          >
            <Text style={styles.seeAllText}>
              {mostrarTodasNecessidades ? 'Menos' : 'Ver todos'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          {(mostrarTodasNecessidades
            ? necessidades
            : necessidades.slice(0, 4)
          ).map(([icon, titulo, descricao]) => (
            <TouchableOpacity
              key={titulo}
              activeOpacity={0.85}
              style={styles.quickCard}
              onPress={() => abrirPesquisa(titulo)}
            >
              <View style={styles.quickIconBox}>
                <Text style={styles.quickIcon}>{icon}</Text>
              </View>

              <View style={styles.quickInfo}>
                <Text style={styles.quickTitle} numberOfLines={1}>
                  {titulo}
                </Text>

                <Text
                  style={styles.quickDescription}
                  numberOfLines={2}
                >
                  {descricao}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* CATEGORIAS */}
        <View style={styles.sectionHeadingRowFull}>
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>Categorias</Text>

            <Text style={styles.sectionSubtitle}>
              Encontre rapidamente o que procura.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.seeAllButton}
            onPress={() => abrirPesquisa()}
          >
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {categorias.map(([icon, titulo, categoria]) => (
            <TouchableOpacity
              key={titulo}
              activeOpacity={0.85}
              style={styles.compactCategoryCard}
              onPress={() => abrirPesquisa(categoria)}
            >
              <View style={styles.compactIconBox}>
                <Text style={styles.compactIcon}>{icon}</Text>
              </View>

              <Text
                style={styles.compactTitle}
                numberOfLines={2}
              >
                {titulo}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ESPECIALIDADES */}
        <View style={styles.sectionHeadingRowFull}>
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>
              Profissionais por especialidade
            </Text>

            <Text style={styles.sectionSubtitle}>
              Encontre profissionais por especialidade.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.seeAllButton}
            onPress={() => abrirPesquisa()}
          >
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {especialidades.map(([icon, titulo]) => (
            <TouchableOpacity
              key={titulo}
              activeOpacity={0.85}
              style={styles.specialtyCompactCard}
              onPress={() => abrirPesquisa(titulo)}
            >
              <Text style={styles.specialtyCompactIcon}>{icon}</Text>

              <Text
                style={styles.specialtyCompactText}
                numberOfLines={2}
              >
                {titulo}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ATALHOS */}
        <Text style={styles.sectionTitle}>Acesso rápido</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.actionCompactCard}
          onPress={() => router.push('/profissionais')}
        >
          <View style={styles.actionCompactIconBox}>
            <Text style={styles.actionCompactIcon}>👷</Text>
          </View>

          <View style={styles.actionCompactInfo}>
            <Text style={styles.actionCompactTitle}>
              Encontrar profissionais
            </Text>

            <Text style={styles.actionCompactDescription}>
              Encontre serviços perto de si.
            </Text>
          </View>

          <Text style={styles.actionCompactArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.actionCompactCard}
          onPress={() => router.push('/publicar')}
        >
          <View style={styles.actionCompactIconBox}>
            <Text style={styles.actionCompactIcon}>📢</Text>
          </View>

          <View style={styles.actionCompactInfo}>
            <Text style={styles.actionCompactTitle}>
              Publicar um anúncio
            </Text>

            <Text style={styles.actionCompactDescription}>
              Venda, alugue ou divulgue o seu serviço.
            </Text>
          </View>

          <Text style={styles.actionCompactArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.actionCompactCard}
          onPress={() => router.push('/pesquisar')}
        >
          <View style={styles.actionCompactIconBox}>
            <Text style={styles.actionCompactIcon}>💬</Text>
          </View>

          <View style={styles.actionCompactInfo}>
            <Text style={styles.actionCompactTitle}>
              Pedir um orçamento
            </Text>

            <Text style={styles.actionCompactDescription}>
              Contacte profissionais da sua região.
            </Text>
          </View>

          <Text style={styles.actionCompactArrow}>›</Text>
        </TouchableOpacity>

        {/* REGIÃO */}
        <View style={styles.regionCompactBox}>
          <View style={styles.regionCompactIconBox}>
            <Text style={styles.regionCompactIcon}>📍</Text>
          </View>

          <View style={styles.regionCompactInfo}>
            <Text style={styles.regionCompactTitle}>
              Estamos na região
            </Text>

            <Text style={styles.regionCompactCities}>
              Guimarães • Vizela • Fafe
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.regionCompactButton}
            onPress={() => setModalRegiaoVisivel(true)}
          >
            <Text style={styles.regionCompactButtonText}>
              Alterar
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MENU INFERIOR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.bottomItem}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.bottomIcon}>⌂</Text>
          <Text style={styles.bottomTextActive}>Início</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.bottomItem}
          onPress={() => router.push('/pesquisar')}
        >
          <Text style={styles.bottomIcon}>🔎</Text>
          <Text style={styles.bottomText}>Pesquisar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.addButton}
          onPress={() => router.push('/publicar')}
        >
          <Text style={styles.addIcon}>＋</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.bottomItem}
          onPress={() => router.push('/mensagens')}
        >
          <View style={styles.bottomMessageIconWrap}>
            <Text style={styles.bottomIcon}>💬</Text>

            {mensagensPorLer > 0 ? (
              <View style={styles.messageUnreadBadge}>
                <Text style={styles.messageUnreadBadgeText}>
                  {mensagensPorLer > 99 ? '99+' : mensagensPorLer}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.bottomText}>Mensagens</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.bottomItem}
          onPress={() => router.push('/conta')}
        >
          <Text style={styles.bottomIcon}>👤</Text>
          <Text style={styles.bottomText}>Conta</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE REGIÃO */}
      <Modal
        visible={modalRegiaoVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRegiaoVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Escolha a sua região
            </Text>

            <Text style={styles.modalDescription}>
              O Conecta mostrará os conteúdos da região selecionada.
            </Text>

            {REGIOES.map((regiao) => {
              const selecionada = regiao === regiaoSelecionada;

              return (
                <TouchableOpacity
                  key={regiao}
                  activeOpacity={0.8}
                  style={[
                    styles.regionOption,
                    selecionada && styles.regionOptionSelected,
                  ]}
                  onPress={() => selecionarRegiao(regiao)}
                >
                  <Text style={styles.regionOptionIcon}>📍</Text>

                  <Text
                    style={[
                      styles.regionOptionText,
                      selecionada && styles.regionOptionTextSelected,
                    ]}
                  >
                    {regiao}
                  </Text>

                  {selecionada && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalCloseButton}
              onPress={() => setModalRegiaoVisivel(false)}
            >
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE PERSONALIZAÇÃO DO AVATAR */}
      <Modal
        visible={modalAvatarVisivel}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAvatarVisivel(false)}
      >
        <View style={styles.avatarModalOverlay}>
          <View style={styles.avatarModalCard}>
            <View style={styles.avatarModalHeader}>
              <View style={styles.avatarModalHeaderText}>
                <Text style={styles.avatarModalTitle}>
                  Personalize o seu perfil
                </Text>

                <Text style={styles.avatarModalSubtitle}>
                  Escolha como quer aparecer no CONECTA MINHO.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.avatarModalClose}
                onPress={() => setModalAvatarVisivel(false)}
              >
                <Text style={styles.avatarModalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.avatarPreviewArea}>
              <View style={styles.avatarPreview}>
                {renderAvatarPrincipal()}
              </View>

              <Text style={styles.avatarPreviewName}>
                {nomeUtilizador}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.avatarActionPrimary}
              onPress={escolherFotoGaleria}
            >
              <View style={styles.avatarActionIcon}>
                <Text style={styles.avatarActionEmoji}>🖼️</Text>
              </View>

              <View style={styles.avatarActionInfo}>
                <Text style={styles.avatarActionTitle}>
                  Escolher a minha foto
                </Text>

                <Text style={styles.avatarActionDescription}>
                  Selecionar uma fotografia da galeria.
                </Text>
              </View>

              <Text style={styles.avatarActionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.avatarAction}
              onPress={tirarFoto}
            >
              <View style={styles.avatarActionIcon}>
                <Text style={styles.avatarActionEmoji}>📷</Text>
              </View>

              <View style={styles.avatarActionInfo}>
                <Text style={styles.avatarActionTitle}>
                  Tirar uma fotografia
                </Text>

                <Text style={styles.avatarActionDescription}>
                  Usar a câmara do telemóvel.
                </Text>
              </View>

              <Text style={styles.avatarActionArrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.avatarSectionTitle}>
              Ou escolha um avatar
            </Text>

            <ScrollView
              horizontal={false}
              showsVerticalScrollIndicator={false}
              style={styles.avatarGridScroll}
              contentContainerStyle={styles.avatarGrid}
            >
              {AVATARES.map((avatar) => {
                const selecionado =
                  avatarTipo === 'emoji' &&
                  avatarValor === avatar.emoji;

                return (
                  <TouchableOpacity
                    key={avatar.id}
                    activeOpacity={0.8}
                    style={[
                      styles.avatarOption,
                      selecionado && styles.avatarOptionSelected,
                    ]}
                    onPress={() => escolherAvatar(avatar)}
                  >
                    <View style={styles.avatarOptionCircle}>
                      <Text style={styles.avatarOptionEmoji}>
                        {avatar.emoji}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.avatarOptionName,
                        selecionado && styles.avatarOptionNameSelected,
                      ]}
                    >
                      {avatar.nome}
                    </Text>

                    {selecionado && (
                      <View style={styles.avatarCheck}>
                        <Text style={styles.avatarCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.initialButton}
              onPress={usarInicial}
            >
              <Text style={styles.initialButtonText}>
                🔤 Usar a inicial do meu nome
              </Text>
            </TouchableOpacity>

            <Text style={styles.avatarLegalNote}>
              Os avatares são opções originais do aplicativo. Personagens
              oficiais de marcas como Marvel, Disney ou Harry Potter exigem
              autorização dos respetivos titulares.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 155,
    width: '100%',
    alignSelf: 'center',
  },
  /* CABEÇALHO */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  headerAvatarButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EAF4FB',
    borderWidth: 2,
    borderColor: '#D4E8F5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  headerAvatarEdit: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#1677B8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarEditText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  welcomeAvatarText: {
    fontSize: 23,
    fontWeight: '800',
    color: '#1677B8',
  },
  avatarEmoji: {
    fontSize: 31,
  },
  headerGreetingArea: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  headerGreeting: {
    fontSize: 14,
    fontWeight: '600',
    color: '#68727E',
    lineHeight: 18,
  },
  headerName: {
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '800',
    color: '#1D2733',
  },
  headerQuestion: {
    fontSize: 13,
    color: '#68727E',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 8,
    gap: 6,
  },
  headerRegionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A9D3EF',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: 132,
  },
  headerRegionIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  headerRegionText: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#126BA7',
  },
  headerRegionArrow: {
    fontSize: 16,
    lineHeight: 14,
    marginLeft: 4,
    color: '#126BA7',
  },
  headerMoreButton: {
    minWidth: 38,
    height: 44,
    paddingHorizontal: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  headerMoreText: {
    color: '#59636F',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 1,
    lineHeight: 21,
  },
  headerMoreLabel: {
    color: '#59636F',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  /* PESQUISA */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E0E5EA',
    paddingLeft: 14,
    paddingRight: 10,
    marginBottom: 22,
  },
  searchIcon: {
    fontSize: 25,
    color: '#59636F',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1D2733',
    paddingVertical: 0,
  },
  searchFilterButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchFilterIcon: {
    fontSize: 20,
    color: '#1677B8',
  },
  /* ÁREAS PRINCIPAIS */
  primaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  primaryCard: {
    width: '48.5%',
    minHeight: 104,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
    justifyContent: 'center',
  },
  primaryCardHome: {
    backgroundColor: '#EAF4FB',
  },
  primaryCardCar: {
    backgroundColor: '#F0EDFF',
  },
  primaryCardPet: {
    backgroundColor: '#EAF7EE',
  },
  primaryIcon: {
    fontSize: 27,
    marginBottom: 8,
  },
  primaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D2733',
  },
  classifiedCard: {
    width: '48.5%',
    minHeight: 104,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#FFF3E5',
    justifyContent: 'center',
    position: 'relative',
  },
  classifiedIcon: {
    fontSize: 27,
    marginBottom: 8,
  },
  classifiedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D2733',
  },
  classifiedArrow: {
    position: 'absolute',
    right: 14,
    top: 14,
    fontSize: 25,
    color: '#9B6A34',
  },
  /* TÍTULOS DE SECÇÃO */
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionHeadingRowFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
    marginTop: 4,
  },
  sectionHeadingText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#68727E',
    lineHeight: 17,
  },
  seeAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: '#EAF4FB',
  },
  seeAllText: {
    color: '#1677B8',
    fontSize: 12,
    fontWeight: '800',
  },
  /* NECESSIDADES */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  quickCard: {
    width: '48.5%',
    minHeight: 91,
    padding: 11,
    marginBottom: 10,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EBEF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickIconBox: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: '#F0F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  quickIcon: {
    fontSize: 19,
  },
  quickInfo: {
    flex: 1,
    minWidth: 0,
  },
  quickTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 4,
  },
  quickDescription: {
    fontSize: 10,
    color: '#68727E',
    lineHeight: 14,
  },
  /* CATEGORIAS */
  horizontalList: {
    paddingRight: 16,
    paddingBottom: 8,
  },
  compactCategoryCard: {
    width: 92,
    minHeight: 100,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EBEF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginRight: 9,
  },
  compactIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F0F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  compactIcon: {
    fontSize: 21,
  },
  compactTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D2733',
    textAlign: 'center',
  },
  /* ESPECIALIDADES */
  specialtyCompactCard: {
    width: 100,
    minHeight: 100,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EBEF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginRight: 9,
  },
  specialtyCompactIcon: {
    fontSize: 24,
    marginBottom: 9,
  },
  specialtyCompactText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D2733',
    textAlign: 'center',
  },
  /* ATALHOS */
  actionCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E7EBEF',
    padding: 12,
    marginTop: 9,
  },
  actionCompactIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionCompactIcon: {
    fontSize: 21,
  },
  actionCompactInfo: {
    flex: 1,
    minWidth: 0,
  },
  actionCompactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 4,
  },
  actionCompactDescription: {
    fontSize: 11,
    color: '#68727E',
    lineHeight: 16,
  },
  actionCompactArrow: {
    fontSize: 25,
    color: '#9AA4AE',
    marginLeft: 8,
  },
  /* REGIÃO */
  regionCompactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7EBEF',
    padding: 13,
    marginTop: 22,
  },
  regionCompactIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  regionCompactIcon: {
    fontSize: 21,
  },
  regionCompactInfo: {
    flex: 1,
    minWidth: 0,
  },
  regionCompactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D2733',
  },
  regionCompactCities: {
    fontSize: 11,
    color: '#68727E',
    marginTop: 4,
  },
  regionCompactButton: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: '#EAF4FB',
  },
  regionCompactButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1677B8',
  },
  /* MENU INFERIOR */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 78,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  bottomItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
  },
  bottomIcon: {
    fontSize: 21,
    marginBottom: 3,
  },
  bottomMessageIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageUnreadBadge: {
    position: 'absolute',
    top: -7,
    right: -13,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#E53935',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  messageUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
  bottomText: {
    fontSize: 11,
    color: '#68727E',
    fontWeight: '600',
  },
  bottomTextActive: {
    fontSize: 11,
    color: '#1677B8',
    fontWeight: '800',
  },
  addButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1677B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -25,
    borderWidth: 4,
    borderColor: '#F7F8FA',
  },
  addIcon: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '400',
    marginTop: -2,
  },
  /* MODAL REGIÃO */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D2733',
  },
  modalDescription: {
    fontSize: 14,
    color: '#68727E',
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 18,
  },
  regionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 15,
    marginBottom: 9,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  regionOptionSelected: {
    backgroundColor: '#EAF4FB',
    borderColor: '#1677B8',
  },
  regionOptionIcon: {
    fontSize: 19,
    marginRight: 11,
  },
  regionOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#27313D',
  },
  regionOptionTextSelected: {
    color: '#1677B8',
  },
  checkIcon: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1677B8',
  },
  modalCloseButton: {
    marginTop: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1677B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  /* MODAL AVATAR */
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  avatarModalCard: {
    width: '100%',
    maxHeight: '91%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  avatarModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avatarModalHeaderText: {
    flex: 1,
    paddingRight: 15,
  },
  avatarModalTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#1D2733',
  },
  avatarModalSubtitle: {
    fontSize: 14,
    color: '#68727E',
    lineHeight: 20,
    marginTop: 5,
  },
  avatarModalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarModalCloseText: {
    fontSize: 28,
    lineHeight: 30,
    color: '#59636F',
    fontWeight: '400',
  },
  avatarPreviewArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  avatarPreview: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#EAF4FB',
    borderWidth: 3,
    borderColor: '#D6EAF6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPreviewName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#27313D',
    marginTop: 7,
  },
  avatarActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4FB',
    borderWidth: 1,
    borderColor: '#CFE5F3',
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
  },
  avatarAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E1E5EA',
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
  },
  avatarActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarActionEmoji: {
    fontSize: 24,
  },
  avatarActionInfo: {
    flex: 1,
  },
  avatarActionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D2733',
  },
  avatarActionDescription: {
    fontSize: 12.5,
    color: '#68727E',
    marginTop: 3,
  },
  avatarActionArrow: {
    fontSize: 27,
    color: '#1677B8',
    marginLeft: 8,
  },
  avatarSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1D2733',
    marginTop: 7,
    marginBottom: 10,
  },
  avatarGridScroll: {
    maxHeight: 235,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  avatarOption: {
    width: '31.5%',
    minHeight: 82,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7EBEF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 9,
    position: 'relative',
  },
  avatarOptionSelected: {
    borderColor: '#1677B8',
    backgroundColor: '#EAF4FB',
  },
  avatarOptionCircle: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: '#F0F3F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarOptionEmoji: {
    fontSize: 22,
  },
  avatarOptionName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#59636F',
    textAlign: 'center',
  },
  avatarOptionNameSelected: {
    color: '#126BA7',
  },
  avatarCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#1677B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCheckText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  initialButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE2E7',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  initialButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#59636F',
  },
  avatarLegalNote: {
    fontSize: 10.5,
    color: '#8A929B',
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 9,
  },
});