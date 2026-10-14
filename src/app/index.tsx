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

  // Mantém o primeiro render estável entre servidor e navegador.
  const [horaLocal, setHoraLocal] = useState<number | null>(null);

  const [mostrarTodasNecessidades, setMostrarTodasNecessidades] =

    useState(false);



  useEffect(() => {

    carregarDadosIniciais();

  }, []);



  useEffect(() => {
    setHoraLocal(new Date().getHours());
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

      .channel(`mensagens-por-ler-${userId}-${Date.now()}`)

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

    const hora = horaLocal ?? 12;



    if (hora >= 5 && hora < 12) {

      return 'Bom dia,';

    }



    if (hora >= 12 && hora < 19) {

      return 'Boa tarde,';

    }



    return 'Boa noite,';

  }



  function periodoDoDia() {

    const hora = horaLocal ?? 12;



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

        {/* IDENTIDADE DA MARCA — novo cabeçalho visual */}

        <View style={styles.brandHeader}>
          <View style={styles.brandIdentity}>
            <Image
              source={{ uri: 'data:image/png;base64,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' }}
              style={styles.brandLogoImage}
              resizeMode="contain"
              accessibilityLabel="Símbolo oficial Conecta Minho"
            />
            <View style={styles.brandTextArea}>
              <Text style={styles.brandName}>CONECTA <Text style={styles.brandNameAccent}>MINHO</Text></Text>
              <Text style={styles.brandTagline} numberOfLines={1}>Pessoas, profissionais e negócios da nossa região.</Text>
            </View>
          </View>
          <View style={styles.brandActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.notificationButton}
              onPress={() => router.push('/mensagens')}
              accessibilityRole="button"
              accessibilityLabel="Notificações e mensagens"
            >
              <Text style={styles.notificationBell}>🔔</Text>
              {mensagensPorLer > 0 ? <View style={styles.notificationDot} /> : null}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.65}
              style={styles.brandMoreButton}
              onPress={() => router.push('/mais')}
              accessibilityRole="button"
              accessibilityLabel="Mais opções"
            >
              <Text style={styles.brandMoreText}>•••</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SAUDAÇÃO E LOCALIZAÇÃO */}

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

              {(nomeUtilizador || 'Utilizador').trim().split(/\s+/)[0]}!

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



            {/* O botão Mais está no cabeçalho da marca; não duplicar aqui. */}

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

  /* IDENTIDADE DA MARCA */

  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    minHeight: 48,
  },

  brandIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },

  brandLogoImage: { width: 52, height: 52, marginRight: 10, backgroundColor: 'transparent', overflow: 'visible' },
  brandTextArea: { flex: 1, minWidth: 0 },
  brandName: { color: '#172638', fontSize: 18, lineHeight: 22, fontWeight: '900', letterSpacing: -0.45 },
  brandNameAccent: { color: '#087FAE' },
  brandTagline: { color: '#687786', fontSize: 10, lineHeight: 14, marginTop: 1 },
  brandActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  notificationButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4EAF0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notificationBell: { fontSize: 23, color: '#24364A', lineHeight: 28 },
  notificationDot: { position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: 5, backgroundColor: '#F04444', borderWidth: 1, borderColor: '#FFFFFF' },
  brandMoreButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4EAF0', alignItems: 'center', justifyContent: 'center' },
  brandMoreText: { color: '#39495A', fontSize: 20, fontWeight: '800', letterSpacing: 1, marginTop: -5 },

  /* CABEÇALHO DE SAUDAÇÃO */

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