import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supabase';

const MBWAY = '936 924 558';
const IBAN = 'PT50 0023 0000 4578003 8909 94';
const WHATSAPP = '936924558';
const VALOR = '10,00 €';
const BUCKET_PRIVE = 'prive-media';

type PriveMedia = {
  uri: string;
  storagePath: string;
  publicUrl: string;
  name: string;
  mimeType: string;
  kind: 'photo' | 'video';
};

// O catálogo usa exclusivamente anúncios Privé publicados.
const TIPO_PRIVE = 'Anúncio adulto +18';
const CATEGORIA_PRIVE = 'Entretenimento adulto +18';

type PriveMode = 'gate' | 'catalogo' | 'perfil' | 'anunciante' | 'meus-anuncios';

type PriveAd = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  categoria: string | null;
  localidade: string | null;
  preco: number | string | null;
  contato: string | null;
  tipo_anuncio: string | null;
  dados_especificos: Record<string, unknown> | null;
  criado_em?: string | null;
  publicado_em?: string | null;
  estado?: string | null;
};


/**
 * Valida uma data no formato DD/MM/AAAA e confirma se a pessoa
 * já completou 18 anos. Não confia apenas na caixa de confirmação.
 */
function validarMaioridade(data: string): { valida: boolean; maiorDeIdade: boolean } {
  const valor = data.trim();
  const correspondencia = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!correspondencia) {
    return { valida: false, maiorDeIdade: false };
  }

  const dia = Number(correspondencia[1]);
  const mes = Number(correspondencia[2]);
  const ano = Number(correspondencia[3]);

  if (ano < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return { valida: false, maiorDeIdade: false };
  }

  const nascimento = new Date(ano, mes - 1, dia);
  if (
    nascimento.getFullYear() !== ano ||
    nascimento.getMonth() !== mes - 1 ||
    nascimento.getDate() !== dia
  ) {
    return { valida: false, maiorDeIdade: false };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  nascimento.setHours(0, 0, 0, 0);

  if (nascimento.getTime() > hoje.getTime()) {
    return { valida: false, maiorDeIdade: false };
  }

  let idade = hoje.getFullYear() - ano;
  const aindaNaoFezAnos =
    hoje.getMonth() < mes - 1 ||
    (hoje.getMonth() === mes - 1 && hoje.getDate() < dia);

  if (aindaNaoFezAnos) idade -= 1;

  return { valida: true, maiorDeIdade: idade >= 18 };
}

export default function PriveScreen() {
  const [mode, setMode] = useState<PriveMode>('gate');
  const [idadeConfirmada, setIdadeConfirmada] = useState(false);
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [aceitaPrivacidade, setAceitaPrivacidade] = useState(false);
  const [declaraConteudoLicito, setDeclaraConteudoLicito] = useState(false);
  const [declaraTitularidade, setDeclaraTitularidade] = useState(false);
  const [aceitaModeracao, setAceitaModeracao] = useState(false);
  const [mostrarPopupPagamento, setMostrarPopupPagamento] = useState(false);
  const [anuncioEmEdicao, setAnuncioEmEdicao] = useState<PriveAd | null>(null);
  const [meusAnuncios, setMeusAnuncios] = useState<PriveAd[]>([]);
  const [carregandoMeusAnuncios, setCarregandoMeusAnuncios] = useState(false);
  const [aSubmeterPerfil, setASubmeterPerfil] = useState(false);

  const [dataNascimento, setDataNascimento] = useState('');
  const [nomeArtistico, setNomeArtistico] = useState('');
  const [paisOrigem, setPaisOrigem] = useState('');
  const [idiomas, setIdiomas] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [outraRede, setOutraRede] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [apresentacao, setApresentacao] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [tiposAtendimento, setTiposAtendimento] = useState<string[]>([]);
  const [modalidades, setModalidades] = useState<string[]>([]);
  const [disponibilidade, setDisponibilidade] = useState<string[]>([]);
  const [olhos, setOlhos] = useState('');
  const [cabelo, setCabelo] = useState('');
  const [tomPele, setTomPele] = useState('');
  const [altura, setAltura] = useState('');
  const [tipoCorpo, setTipoCorpo] = useState('');
  const [busto, setBusto] = useState('');
  const [tatuagens, setTatuagens] = useState('');
  const [piercings, setPiercings] = useState('');
  const [fotografias, setFotografias] = useState<PriveMedia[]>([]);
  const [videos, setVideos] = useState<PriveMedia[]>([]);
  const [aCarregarMedia, setACarregarMedia] = useState(false);
  const [seccoesAbertas, setSeccoesAbertas] = useState<Record<string, boolean>>({ perfil: true });
  function alternarSeccao(chave: string) { setSeccoesAbertas(atual => ({ ...atual, [chave]: !atual[chave] })); }

  const [perfis, setPerfis] = useState<PriveAd[]>([]);
  const [perfilSelecionado, setPerfilSelecionado] = useState<PriveAd | null>(null);
  const [carregandoPerfis, setCarregandoPerfis] = useState(false);
  const [erroPerfis, setErroPerfis] = useState('');

  useEffect(() => {
    if (mode === 'catalogo') {
      carregarPerfis();
    }
  }, [mode]);

  async function carregarPerfis() {
    setCarregandoPerfis(true);
    setErroPerfis('');

    try {
      // Não filtrar por categoria nem por publicado_em na consulta SQL:
      // anúncios antigos aprovados podem ter categoria diferente ou publicado_em nulo.
      const { data, error } = await supabase
        .from('anuncios')
        .select(
          'id, titulo, descricao, categoria, localidade, preco, contato, tipo_anuncio, dados_especificos, criado_em, publicado_em, estado'
        )
        .eq('estado', 'publicado')
        .order('publicado_em', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const linhas = (data || []) as PriveAd[];
      const apenasPrive = linhas.filter((ad) => {
        const dados = ad.dados_especificos || {};
        const tipo = String(ad.tipo_anuncio || '').trim().toLocaleLowerCase('pt-PT');
        const categoria = String(ad.categoria || '').trim().toLocaleLowerCase('pt-PT');
        const marcadoComoPrive = dados.submissao_prive === true;
        const tipoAdulto = tipo.includes('adulto') && tipo.includes('18');
        const categoriaAdulto = categoria.includes('adulto') && categoria.includes('18');
        if (!(marcadoComoPrive || tipoAdulto || categoriaAdulto)) return false;

        // publicado_em é a referência principal; criado_em serve de alternativa
        // quando o painel MASTER aprovou sem preencher a data de publicação.
        const dataReferencia = ad.publicado_em || ad.criado_em;
        if (!dataReferencia) return true; // não esconder um perfil aprovado só por falta de data
        const timestamp = new Date(dataReferencia).getTime();
        return !Number.isNaN(timestamp) && timestamp >= limite;
      });

      setPerfis(apenasPrive);
    } catch (error) {
      console.error('Erro ao carregar perfis Privé:', error);
      setErroPerfis('Não foi possível carregar os perfis neste momento. Verifique a ligação e as permissões do Supabase.');
      setPerfis([]);
    } finally {
      setCarregandoPerfis(false);
    }
  }

  function abrirWhatsApp() {
    const url = `https://wa.me/351${WHATSAPP}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        'WhatsApp',
        `Não foi possível abrir o WhatsApp. Contacte ${MBWAY}.`
      );
    });
  }

  function entrarNoPrive() {
    const verificacao = validarMaioridade(dataNascimento);

    if (!dataNascimento.trim()) {
      Alert.alert(
        'Confirmação de idade',
        'Indique a sua data de nascimento no formato DD/MM/AAAA.'
      );
      return;
    }

    if (!verificacao.valida) {
      Alert.alert(
        'Data de nascimento inválida',
        'Introduza uma data real, no formato DD/MM/AAAA. Não são aceites datas incompletas, impossíveis ou futuras.'
      );
      return;
    }

    if (!verificacao.maiorDeIdade) {
      setIdadeConfirmada(false);
      Alert.alert(
        'Acesso não permitido',
        'O Conecta Privé é exclusivo para pessoas que já completaram 18 anos. Não é possível entrar com esta data de nascimento.'
      );
      return;
    }

    if (!idadeConfirmada) {
      Alert.alert(
        'Confirmação de idade',
        'Assinale a caixa para confirmar que tem 18 anos ou mais.'
      );
      return;
    }

    setMode('catalogo');
  }

  function abrirPerfil(perfil: PriveAd) {
    // O catálogo só pode ser alcançado depois do gate +18.
    if (!idadeConfirmada) {
      setMode('gate');
      return;
    }

    setPerfilSelecionado(perfil);
    setMode('perfil');
  }

  function obterTipoMime(nome: string, tipo: 'photo' | 'video', mimeOriginal?: string | null) {
    const ext = (nome.split('.').pop() || '').toLowerCase();
    const mapa: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
      heic: 'image/heic', heif: 'image/heif', gif: 'image/gif',
      mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm',
    };
    const permitido = tipo === 'photo' ? mimeOriginal?.startsWith('image/') : mimeOriginal?.startsWith('video/');
    if (permitido && mimeOriginal) return mimeOriginal;
    if (mapa[ext] && (tipo === 'photo' ? mapa[ext].startsWith('image/') : mapa[ext].startsWith('video/'))) return mapa[ext];
    return tipo === 'photo' ? 'image/jpeg' : 'video/mp4';
  }

  async function carregarSelecionados(tipo: 'photo' | 'video', assets: ImagePicker.ImagePickerAsset[]) {
    const limite = tipo === 'photo' ? 10 : 2;
    const atuais = tipo === 'photo' ? fotografias : videos;
    const disponiveis = limite - atuais.length;
    const escolhidos = assets.slice(0, disponiveis);
    if (!escolhidos.length) return;
    setACarregarMedia(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authError || !user) throw new Error('Inicie sessão para carregar os ficheiros do perfil.');
      const novos: PriveMedia[] = [];
      for (const asset of escolhidos) {
        const nomeOriginal = asset.fileName || (tipo === 'photo' ? 'fotografia.jpg' : 'video.mp4');
        let ext = (nomeOriginal.split('.').pop() || '').toLowerCase();
        const mimeType = obterTipoMime(nomeOriginal, tipo, asset.mimeType);
        if (!ext || ext === nomeOriginal || ext === 'txt') ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : mimeType === 'video/quicktime' ? 'mov' : tipo === 'photo' ? 'jpg' : 'mp4';
        const nomeFinal = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `${user.id}/rascunho-${Date.now()}/${tipo === 'photo' ? 'fotos' : 'videos'}/${nomeFinal}`;
        // Enviar ArrayBuffer evita que o fetch local no iOS classifique o ficheiro como text/plain.
        const response = await fetch(asset.uri);
        if (!response.ok) throw new Error(`Não foi possível ler o ficheiro ${nomeOriginal}.`);
        const arrayBuffer = await response.arrayBuffer();
        const { error } = await supabase.storage.from(BUCKET_PRIVE).upload(path, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET_PRIVE).getPublicUrl(path);
        novos.push({ uri: asset.uri, storagePath: path, publicUrl: data.publicUrl, name: nomeOriginal, mimeType, kind: tipo });
      }
      if (tipo === 'photo') setFotografias(current => [...current, ...novos].slice(0, 10));
      else setVideos(current => [...current, ...novos].slice(0, 2));
    } catch (error: any) {
      Alert.alert(tipo === 'photo' ? 'Erro ao carregar fotografias' : 'Erro ao carregar vídeos', error?.message || 'Não foi possível carregar os ficheiros. Verifique a configuração do Supabase Storage.');
    } finally {
      setACarregarMedia(false);
    }
  }

  async function selecionarFotografias() {
    if (aCarregarMedia) return;
    if (fotografias.length >= 10) {
      Alert.alert('Limite atingido', 'Cada perfil pode ter no máximo 10 fotografias.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria do dispositivo para selecionar fotografias.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - fotografias.length,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) await carregarSelecionados('photo', result.assets);
  }

  async function selecionarVideos() {
    if (aCarregarMedia) return;
    if (videos.length >= 2) {
      Alert.alert('Limite atingido', 'Cada perfil pode ter no máximo 2 vídeos.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria do dispositivo para selecionar vídeos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: true,
      selectionLimit: 2 - videos.length,
      videoMaxDuration: 90,
    });
    if (!result.canceled && result.assets?.length) await carregarSelecionados('video', result.assets);
  }

  function removerMedia(item: PriveMedia, tipo: 'photo' | 'video') {
    if (tipo === 'photo') setFotografias(current => current.filter(media => media.storagePath !== item.storagePath));
    else setVideos(current => current.filter(media => media.storagePath !== item.storagePath));
    // O ficheiro remoto pode ser limpo depois da submissão; não falhar a edição local por isso.
  }

  function alternarOpcao(valor: string, lista: string[], atualizar: (lista: string[]) => void) {
    atualizar(lista.includes(valor) ? lista.filter(item => item !== valor) : [...lista, valor]);
  }

  function validarCadastro(): boolean {
    if (!nomeArtistico.trim() || !paisOrigem.trim() || !dataNascimento.trim() || !tipoServico.trim() || !localidade.trim() || !apresentacao.trim()) {
      Alert.alert('Dados em falta', 'Preencha nome artístico, país de origem, data de nascimento, tipo de serviço, localidade e apresentação.');
      return false;
    }
    const verificacaoIdade = validarMaioridade(dataNascimento);
    if (!verificacaoIdade.valida) {
      Alert.alert(
        'Data de nascimento inválida',
        'Introduza uma data real no formato DD/MM/AAAA. Não são aceites datas incompletas, impossíveis ou futuras.'
      );
      return false;
    }
    if (!verificacaoIdade.maiorDeIdade) {
      Alert.alert(
        'Acesso não permitido',
        'Só é possível criar um perfil no Conecta Privé depois de completar 18 anos.'
      );
      return false;
    }

    if (!tiposAtendimento.length) {
      Alert.alert('Atendimento', 'Selecione pelo menos uma modalidade de atendimento.');
      return false;
    }
    if (fotografias.length < 5 || fotografias.length > 10) {
      Alert.alert('Fotografias obrigatórias', 'O perfil precisa de pelo menos 5 e no máximo 10 fotografias. Os vídeos são opcionais.');
      return false;
    }
    if (!idadeConfirmada || !aceitaTermos || !aceitaPrivacidade || !declaraConteudoLicito || !declaraTitularidade || !aceitaModeracao) {
      Alert.alert('Declarações obrigatórias', 'Confirme a maioridade e assinale todas as declarações obrigatórias antes de anunciar.');
      return false;
    }
    return true;
  }

  async function submeterPerfilParaAprovacao() {
    if (aSubmeterPerfil) return;
    if (!validarCadastro()) return;
    try {
      setASubmeterPerfil(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authError || !user) {
        Alert.alert('Sessão necessária', 'Inicie sessão na sua conta antes de submeter o perfil.');
        return;
      }

      const dadosPublicos = {
        nomeArtistico: nomeArtistico.trim(), paisOrigem: paisOrigem.trim(), tipoServico: tipoServico.trim(),
        apresentacao: apresentacao.trim(), localidade: localidade.trim(), whatsapp: whatsapp.trim(),
        instagram: instagram.trim(), tiktok: tiktok.trim(), outraRede: outraRede.trim(), idiomas: idiomas.trim(),
        tiposAtendimento, modalidades, disponibilidade, olhos: olhos.trim(), cabelo: cabelo.trim(),
        tomPele: tomPele.trim(), altura: altura.trim(), tipoCorpo: tipoCorpo.trim(), busto: busto.trim(),
        tatuagens: tatuagens.trim(), piercings: piercings.trim(),
        fotografias: fotografias.map(item => ({ url: item.publicUrl, storagePath: item.storagePath, nome: item.name })),
        videos: videos.map(item => ({ url: item.publicUrl, storagePath: item.storagePath, nome: item.name })),
        pagamento_estado: 'por_confirmar', submissao_prive: true,
        declaracoes: { maioridade: idadeConfirmada, termos: aceitaTermos, privacidade: aceitaPrivacidade, conteudoLicito: declaraConteudoLicito, titularidadeMateriais: declaraTitularidade, moderacao: aceitaModeracao, registadasEm: new Date().toISOString() },
        validade_dias: 30,
      };

      const { data: existente, error: consultaError } = anuncioEmEdicao ? { data: [], error: null } : await supabase
        .from('anuncios').select('id, estado').eq('user_id', user.id).eq('tipo_anuncio', TIPO_PRIVE)
        .in('estado', ['em_analise']).contains('dados_especificos', { submissao_prive: true }).limit(1);
      if (consultaError) throw consultaError;
      if (existente?.length) {
        Alert.alert('Pedido já submetido', 'Já existe um perfil Privé deste utilizador pendente de análise.');
        setMode('meus-anuncios');
        await carregarMeusAnuncios();
        return;
      }

      const payload = {
        user_id: user.id, titulo: nomeArtistico.trim(), descricao: apresentacao.trim(), tipo_anuncio: TIPO_PRIVE,
        categoria: CATEGORIA_PRIVE, localidade: localidade.trim(), preco: null, preco_negociavel: true,
        contato: whatsapp.trim() || null, estado: 'em_analise', dados_especificos: dadosPublicos,
      };
      let anuncioId: string;
      if (anuncioEmEdicao) {
        const { data: atualizado, error: updateError } = await supabase.from('anuncios').update(payload)
          .eq('id', anuncioEmEdicao.id).eq('user_id', user.id).select('id').single();
        if (updateError) throw updateError;
        anuncioId = atualizado.id;
        setAnuncioEmEdicao(null);
      } else {
        const { data: inserido, error: insertError } = await supabase.from('anuncios').insert(payload).select('id').single();
        if (insertError) throw insertError;
        anuncioId = inserido.id;
      }
      setMostrarPopupPagamento(true);
    } catch (error: any) {
      console.error('Erro ao submeter perfil Privé para moderação:', error);
      Alert.alert('Não foi possível submeter', error?.message || 'O perfil não foi enviado. Verifique a ligação e as permissões do Supabase.');
    } finally {
      setASubmeterPerfil(false);
    }
  }

  async function carregarMeusAnuncios() {
    setCarregandoMeusAnuncios(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('Inicie sessão para consultar os seus anúncios.');
      const { data, error } = await supabase.from('anuncios')
        .select('id, titulo, descricao, categoria, localidade, preco, contato, tipo_anuncio, dados_especificos, criado_em, publicado_em, estado')
        .eq('user_id', authData.user.id).eq('tipo_anuncio', TIPO_PRIVE).order('criado_em', { ascending: false });
      if (error) throw error;
      setMeusAnuncios((data as PriveAd[]) || []);
    } catch (error: any) {
      Alert.alert('Meus anúncios', error?.message || 'Não foi possível carregar os anúncios.');
    } finally { setCarregandoMeusAnuncios(false); }
  }

  function editarMeuAnuncio(ad: PriveAd) {
    const dados = ad.dados_especificos || {};
    const texto = (key: string) => typeof dados[key] === 'string' ? String(dados[key]) : '';
    setAnuncioEmEdicao(ad);
    setNomeArtistico(ad.titulo || texto('nomeArtistico'));
    setPaisOrigem(texto('paisOrigem'));
    setTipoServico(texto('tipoServico'));
    setApresentacao(ad.descricao || texto('apresentacao'));
    setLocalidade(ad.localidade || texto('localidade'));
    setWhatsapp(ad.contato || texto('whatsapp'));
    setInstagram(texto('instagram')); setTiktok(texto('tiktok')); setOutraRede(texto('outraRede')); setIdiomas(texto('idiomas'));
    setOlhos(texto('olhos')); setCabelo(texto('cabelo')); setTomPele(texto('tomPele')); setAltura(texto('altura')); setTipoCorpo(texto('tipoCorpo')); setBusto(texto('busto')); setTatuagens(texto('tatuagens')); setPiercings(texto('piercings'));
    setTiposAtendimento(Array.isArray(dados.tiposAtendimento) ? dados.tiposAtendimento.filter((x): x is string => typeof x === 'string') : []);
    setModalidades(Array.isArray(dados.modalidades) ? dados.modalidades.filter((x): x is string => typeof x === 'string') : []);
    setDisponibilidade(Array.isArray(dados.disponibilidade) ? dados.disponibilidade.filter((x): x is string => typeof x === 'string') : []);
    const fotos = Array.isArray(dados.fotografias) ? dados.fotografias : [];
    setFotografias(fotos.filter((x: any) => x && typeof x.url === 'string').map((x: any) => ({ uri: x.url, publicUrl: x.url, storagePath: String(x.storagePath || ''), name: String(x.nome || 'Fotografia'), mimeType: 'image/jpeg', kind: 'photo' as const })).slice(0, 5));
    const clips = Array.isArray(dados.videos) ? dados.videos : [];
    setVideos(clips.filter((x: any) => x && typeof x.url === 'string').map((x: any) => ({ uri: x.url, publicUrl: x.url, storagePath: String(x.storagePath || ''), name: String(x.nome || 'Vídeo'), mimeType: 'video/mp4', kind: 'video' as const })).slice(0, 2));
    setIdadeConfirmada(true); setAceitaTermos(true); setAceitaPrivacidade(true); setDeclaraConteudoLicito(true); setDeclaraTitularidade(true); setAceitaModeracao(true);
    setMode('anunciante');
  }

  function abrirMeusAnuncios() {
    setMostrarPopupPagamento(false);
    setMode('meus-anuncios');
    carregarMeusAnuncios();
  }

  function enviarComprovativo() {
    Alert.alert(
      'Comprovativo',
      'Depois de efetuar o pagamento, envie o comprovativo pelo WhatsApp indicado. O pagamento será confirmado manualmente pelo administrador.',
      [
        {
          text: 'Abrir WhatsApp',
          onPress: abrirWhatsApp,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  }

  function voltarAoCatalogo() {
    setPerfilSelecionado(null);
    setMode('catalogo');
  }

  function abrirAnunciante() {
    setMode('anunciante');
  }

  function campoDados(perfil: PriveAd, chave: string) {
    const dados = perfil.dados_especificos || {};
    const valor = dados[chave];

    return typeof valor === 'string' && valor.trim()
      ? valor
      : '';
  }

  // =========================================================
  // GATE +18
  // =========================================================

  if (mode === 'gate') {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.ageBadge}>
            <Text style={styles.ageNumber}>18</Text>
            <Text style={styles.agePlus}>+</Text>
          </View>

          <Text style={styles.kicker}>CONECTA PRIVÉ</Text>

          <Text style={styles.heroTitle}>
            Área exclusiva para adultos
          </Text>

          <Text style={styles.heroText}>
            O Conecta Privé é uma área exclusiva para adultos e pode conter
            imagens e descrições sexualmente explícitas. Ao continuar, confirma
            que tem pelo menos 18 anos e que aceita aceder voluntariamente a
            este tipo de conteúdo. É proibido o acesso a menores de 18 anos.
          </Text>

          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionText}>
              Área +18
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🔞 Acesso reservado a maiores de 18 anos
          </Text>

          <Text style={styles.sectionText}>
            A entrada só é permitida a quem já completou 18 anos. A data de
            nascimento será validada antes de abrir qualquer perfil. Datas
            inválidas, futuras ou de pessoas menores de idade serão recusadas.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Data de nascimento — DD/MM/AAAA"
            placeholderTextColor="#8D7A87"
            value={dataNascimento}
            onChangeText={setDataNascimento}
          />

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIdadeConfirmada(!idadeConfirmada)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                idadeConfirmada && styles.checkboxChecked,
              ]}
            >
              {idadeConfirmada ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : null}
            </View>

            <Text style={styles.checkboxText}>
              Confirmo que tenho 18 anos ou mais e pretendo aceder à área adulta.
            </Text>
          </TouchableOpacity>

          <Text style={styles.privateNote}>
            A data de nascimento é utilizada para a confirmação de idade
            e não será exibida publicamente.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={entrarNoPrive}
          >
            <Text style={styles.primaryButtonText}>
              Entrar no Conecta Privé
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rulesSection}>
          <Text style={styles.rulesTitle}>
            Antes de continuar
          </Text>

          <Text style={styles.rulesText}>
            • Área adulta que pode apresentar imagens e descrições sexualmente explícitas.
          </Text>

          <Text style={styles.rulesText}>
            • Acesso estritamente proibido a menores de 18 anos.
          </Text>

          <Text style={styles.rulesText}>
            • Os perfis passam por aprovação administrativa e qualquer conteúdo envolvendo menores é proibido.
          </Text>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    );
  }

  // =========================================================
  // CATÁLOGO
  // =========================================================

  if (mode === 'catalogo') {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.ageBadge}>
            <Text style={styles.ageNumber}>18</Text>
            <Text style={styles.agePlus}>+</Text>
          </View>

          <Text style={styles.kicker}>
            CONECTA PRIVÉ  ·  BLACK LABEL
          </Text>

          <Text style={styles.heroTitle}>
            Perfis Conecta Privé
          </Text>

          <Text style={styles.heroText}>
            Encontre perfis disponíveis no Conecta Privé.
          </Text>
        </View>

        <View style={styles.section}>
          {carregandoPerfis ? (
            <View style={styles.centerBox}>
              <ActivityIndicator
                size="large"
                color="#C99B61"
              />

              <Text style={styles.loadingText}>
                A carregar perfis...
              </Text>
            </View>
          ) : erroPerfis ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                Não foi possível carregar
              </Text>

              <Text style={styles.emptyText}>
                {erroPerfis}
              </Text>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={carregarPerfis}
              >
                <Text style={styles.secondaryButtonText}>
                  Tentar novamente
                </Text>
              </TouchableOpacity>
            </View>
          ) : perfis.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                Ainda não existem perfis disponíveis
              </Text>

              <Text style={styles.emptyText}>
                Assim que houver perfis disponíveis, eles aparecerão aqui.
              </Text>
            </View>
          ) : (
            perfis.map((perfil) => (
              <TouchableOpacity
                key={perfil.id}
                style={styles.profileCard}
                onPress={() => abrirPerfil(perfil)}
                activeOpacity={0.85}
              >
                {Array.isArray(perfil.dados_especificos?.fotografias) && typeof (perfil.dados_especificos?.fotografias as any[])[0]?.url === 'string' ? (
                  <Image source={{ uri: (perfil.dados_especificos?.fotografias as any[])[0].url }} style={styles.catalogThumbnail} />
                ) : <View style={styles.catalogThumbnailPlaceholder}><Text style={styles.profileBadgeText}>18+</Text></View>}

                <View style={styles.profileInfo}>
                  <Text style={styles.profileTitle}>
                    {perfil.titulo || 'Perfil Privé'}
                  </Text>

                  {!!perfil.localidade && (
                    <Text style={styles.profileMeta}>
                      📍 {perfil.localidade}
                    </Text>
                  )}

                  {!!perfil.descricao && (
                    <Text
                      style={styles.profileDescription}
                      numberOfLines={3}
                    >
                      {perfil.descricao}
                    </Text>
                  )}
                </View>

                <Text style={styles.arrow}>
                  ›
                </Text>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={abrirAnunciante}
          >
            <Text style={styles.primaryButtonText}>
              Quero anunciar no Conecta Privé
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => { setMode('meus-anuncios'); carregarMeusAnuncios(); }}><Text style={styles.secondaryButtonText}>Meus anúncios</Text></TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setMode('gate')}
          >
            <Text style={styles.secondaryButtonText}>
              Voltar
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    );
  }

  // =========================================================
  // MEUS ANÚNCIOS
  // =========================================================
  if (mode === 'meus-anuncios') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}><Text style={styles.kicker}>CONECTA PRIVÉ</Text><Text style={styles.heroTitle}>Meus anúncios</Text><Text style={styles.heroText}>Acompanhe a moderação e a validade dos seus perfis.</Text></View>
        <View style={styles.section}>
          {carregandoMeusAnuncios ? <ActivityIndicator color="#C99B61" size="large" /> : meusAnuncios.length === 0 ? <View style={styles.emptyBox}><Text style={styles.emptyTitle}>Ainda não tem anúncios</Text><Text style={styles.emptyText}>Quando submeter um perfil, poderá acompanhar aqui o estado.</Text></View> : meusAnuncios.map(ad => {
            const dataPub = ad.publicado_em ? new Date(ad.publicado_em) : null;
            const expiracao = dataPub ? new Date(dataPub.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
            const diasRestantes = expiracao ? Math.max(0, Math.ceil((expiracao.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : null;
            const expirado = !!expiracao && expiracao.getTime() <= Date.now();
            const estado = expirado ? 'Expirado' : ad.estado || 'Em análise';
            return <View key={ad.id} style={styles.myAdCard}><Text style={styles.profileTitle}>{ad.titulo || 'Perfil Privé'}</Text><Text style={styles.profileMeta}>Estado: {estado === 'publicado' ? 'Publicado' : estado === 'rejeitado' ? 'Rejeitado' : estado === 'Expirado' ? 'Expirado' : 'Em análise'}</Text>{estado === 'publicado' && diasRestantes !== null ? <Text style={styles.profileMeta}>{diasRestantes === 0 ? 'Expira hoje' : `Faltam ${diasRestantes} dias para expirar`}</Text> : null}<Text style={styles.profileMeta}>📍 {ad.localidade || 'Localidade não indicada'}</Text><TouchableOpacity style={styles.secondaryButton} onPress={() => editarMeuAnuncio(ad)}><Text style={styles.secondaryButtonText}>Editar perfil (volta à moderação)</Text></TouchableOpacity>{estado === 'Expirado' ? <Text style={styles.paymentWarning}>Renove o anúncio e confirme o pagamento com o MASTER para voltar a publicar.</Text> : null}</View>;
          })}
          <TouchableOpacity style={styles.primaryButton} onPress={() => setMode('anunciante')}><Text style={styles.primaryButtonText}>Criar novo anúncio</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setMode('catalogo')}><Text style={styles.secondaryButtonText}>Voltar aos perfis</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // =========================================================
  // PERFIL INDIVIDUAL
  // =========================================================

  if (mode === 'perfil' && perfilSelecionado) {
    const whatsappPerfil =
      campoDados(perfilSelecionado, 'whatsapp') ||
      perfilSelecionado.contato ||
      '';

    const instagramPerfil =
      campoDados(perfilSelecionado, 'instagram');

    const tiktokPerfil =
      campoDados(perfilSelecionado, 'tiktok');

    const idiomasPerfil =
      campoDados(perfilSelecionado, 'idiomas');

    const tipoServicoPerfil =
      campoDados(perfilSelecionado, 'tipoServico') ||
      campoDados(perfilSelecionado, 'tipo_servico');

    // A tabela publica nunca apresenta os valores definidos no cadastro privado.
    const dadosPublicos = perfilSelecionado.dados_especificos || {};
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.ageBadge}>
            <Text style={styles.ageNumber}>18</Text>
            <Text style={styles.agePlus}>+</Text>
          </View>

          <Text style={styles.kicker}>
            CONECTA PRIVÉ
          </Text>

          <Text style={styles.heroTitle}>
            {perfilSelecionado.titulo || 'Perfil Privé'}
          </Text>

          <Text style={styles.heroText}>
            Perfil disponível no Conecta Privé.
          </Text>
        </View>

        <View style={styles.section}>
          {Array.isArray(dadosPublicos.fotografias) && (dadosPublicos.fotografias as any[]).length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.publicGallery}>
              {(dadosPublicos.fotografias as any[]).filter(item => item && typeof item.url === 'string').slice(0, 5).map((item, index) => (
                <TouchableOpacity key={`${item.url}-${index}`} activeOpacity={0.9} onPress={() => Linking.openURL(item.url).catch(() => {})}>
                  <Image source={{ uri: item.url }} style={styles.publicGalleryImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : <View style={styles.emptyBox}><Text style={styles.emptyText}>As fotografias deste perfil não estão disponíveis.</Text></View>}
          {Array.isArray(dadosPublicos.videos) ? (dadosPublicos.videos as any[]).filter(item => item && typeof item.url === 'string').slice(0, 2).map((item, index) => (
            <TouchableOpacity key={`${item.url}-${index}`} style={styles.videoSelectedRow} onPress={() => Linking.openURL(item.url).catch(() => {})}><Text style={styles.videoSelectedText}>▶ Ver vídeo {index + 1}</Text><Text style={styles.removeMediaText}>Abrir</Text></TouchableOpacity>
          )) : null}
          {!!perfilSelecionado.localidade && (
            <Text style={styles.profileDetail}>
              📍 {perfilSelecionado.localidade}
            </Text>
          )}

          {!!tipoServicoPerfil && (
            <Text style={styles.profileDetail}>
              💼 {tipoServicoPerfil}
            </Text>
          )}

          {!!idiomasPerfil && (
            <Text style={styles.profileDetail}>
              🗣️ {idiomasPerfil}
            </Text>
          )}

          <Text style={styles.sectionTitle}>
            Apresentação
          </Text>

          <Text style={styles.longText}>
            {perfilSelecionado.descricao ||
              'Sem apresentação disponível.'}
          </Text>

          {!!(dadosPublicos.tiposAtendimento as string[] | undefined)?.length && <Text style={styles.profileDetail}>📍 Atendimento: {(dadosPublicos.tiposAtendimento as string[]).join(' · ')}</Text>}
          {!!(dadosPublicos.modalidades as string[] | undefined)?.length && <Text style={styles.profileDetail}>✨ Serviços: {(dadosPublicos.modalidades as string[]).join(' · ')}</Text>}
          {!!(dadosPublicos.disponibilidade as string[] | undefined)?.length && <Text style={styles.profileDetail}>🕒 Disponibilidade: {(dadosPublicos.disponibilidade as string[]).join(' · ')}</Text>}
          {(['olhos','cabelo','tomPele','altura','tipoCorpo','busto','tatuagens','piercings'] as const).map(chave => typeof dadosPublicos[chave] === 'string' && (dadosPublicos[chave] as string).trim() ? <Text key={chave} style={styles.profileDetail}>{({olhos:'Olhos',cabelo:'Cabelo',tomPele:'Tom de pele',altura:'Altura',tipoCorpo:'Tipo de corpo',busto:'Busto',tatuagens:'Tatuagens',piercings:'Piercings'} as Record<string,string>)[chave]}: {String(dadosPublicos[chave])}</Text> : null)}
          <View style={styles.publicPriceNotice}><Text style={styles.publicServiceName}>Preço a combinar</Text><Text style={styles.publicServiceDetail}>Os valores são combinados diretamente com a profissional.</Text></View>

          {!!instagramPerfil && (
            <Text style={styles.profileDetail}>
              Instagram: {instagramPerfil}
            </Text>
          )}

          {!!tiktokPerfil && (
            <Text style={styles.profileDetail}>
              TikTok: {tiktokPerfil}
            </Text>
          )}

          <View style={styles.protectedBox}>
            <Text style={styles.protectedTitle}>
              🔞 Área protegida
            </Text>

            <Text style={styles.protectedText}>
              Este conteúdo só é acessível dentro da área Privé
              após a confirmação de idade.
            </Text>
          </View>

          {!!whatsappPerfil && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                const clean =
                  whatsappPerfil.replace(/\D/g, '');

                const number =
                  clean.startsWith('351')
                    ? clean
                    : `351${clean}`;

                Linking.openURL(
                  `https://wa.me/${number}`
                ).catch(() =>
                  Alert.alert(
                    'WhatsApp',
                    'Não foi possível abrir o WhatsApp.'
                  )
                );
              }}
            >
              <Text style={styles.primaryButtonText}>
                Contactar pelo WhatsApp
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={voltarAoCatalogo}
          >
            <Text style={styles.secondaryButtonText}>
              Voltar aos perfis
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    );
  }

  // =========================================================
  // ÁREA DO ANUNCIANTE
  // =========================================================

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.ageBadge}>
          <Text style={styles.ageNumber}>18</Text>
          <Text style={styles.agePlus}>+</Text>
        </View>

        <Text style={styles.kicker}>
          CONECTA PRIVÉ
        </Text>

        <Text style={styles.heroTitle}>
          Criar perfil de anunciante
        </Text>

        <Text style={styles.heroText}>
          Esta área é exclusivamente para quem pretende anunciar.
          A publicação depende de confirmação manual do pagamento
          e aprovação administrativa.
        </Text>

        <View style={styles.subscriptionBadge}>
          <Text style={styles.subscriptionText}>
            Publicação: {VALOR} / mês
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTag}>
          <Text style={styles.sectionTagText}>
            PERFIL +18
          </Text>
        </View>

        <TouchableOpacity style={styles.accordionHeader} onPress={() => alternarSeccao('perfil')} activeOpacity={0.85}>
  <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Crie o seu perfil</Text><Text style={styles.accordionSummary}>Dados principais, contacto e redes sociais</Text></View>
  <Text style={styles.accordionArrow}>{seccoesAbertas.perfil ? '−' : '＋'}</Text>
</TouchableOpacity>
{seccoesAbertas.perfil && (<>


        <Text style={styles.sectionText}>
          Os dados pessoais utilizados para verificação não
          serão exibidos publicamente.
        </Text>

        <Text style={styles.label}>
          Nome artístico / nome do perfil *
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Como pretende ser apresentada?"
          placeholderTextColor="#8D7A87"
          value={nomeArtistico}
          onChangeText={setNomeArtistico}
        />

        <Text style={styles.label}>
          País de origem *
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ex.: Portugal, Brasil..."
          placeholderTextColor="#8D7A87"
          value={paisOrigem}
          onChangeText={setPaisOrigem}
        />

        <Text style={styles.label}>
          Data de nascimento *
        </Text>

        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#8D7A87"
          value={dataNascimento}
          onChangeText={setDataNascimento}
        />

        <Text style={styles.label}>
          Idiomas
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ex.: português, inglês, espanhol"
          placeholderTextColor="#8D7A87"
          value={idiomas}
          onChangeText={setIdiomas}
        />

        <Text style={styles.label}>
          WhatsApp
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ex.: +351 912 345 678"
          placeholderTextColor="#8D7A87"
          keyboardType="phone-pad"
          value={whatsapp}
          onChangeText={setWhatsapp}
        />

        <Text style={styles.label}>
          Instagram
        </Text>

        <TextInput
          style={styles.input}
          placeholder="https://instagram.com/..."
          placeholderTextColor="#8D7A87"
          autoCapitalize="none"
          value={instagram}
          onChangeText={setInstagram}
        />

        <Text style={styles.label}>
          TikTok
        </Text>

        <TextInput
          style={styles.input}
          placeholder="https://tiktok.com/@..."
          placeholderTextColor="#8D7A87"
          autoCapitalize="none"
          value={tiktok}
          onChangeText={setTiktok}
        />

        <Text style={styles.label}>
          Outra rede social ou site
        </Text>

        <TextInput
          style={styles.input}
          placeholder="https://..."
          placeholderTextColor="#8D7A87"
          autoCapitalize="none"
          value={outraRede}
          onChangeText={setOutraRede}
        />
      
</>)}
</View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.accordionHeader} onPress={() => alternarSeccao('apresentacao')} activeOpacity={0.85}>
  <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Serviço / apresentação</Text><Text style={styles.accordionSummary}>Descrição que será apresentada aos clientes</Text></View>
  <Text style={styles.accordionArrow}>{seccoesAbertas.apresentacao ? '−' : '＋'}</Text>
</TouchableOpacity>
{seccoesAbertas.apresentacao && (<>


        <Text style={styles.label}>
          Tipo de serviço / apresentação *
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Indique o tipo de serviço anunciado"
          placeholderTextColor="#8D7A87"
          value={tipoServico}
          onChangeText={setTipoServico}
        />

        <Text style={styles.label}>
          Apresentação do perfil *
        </Text>

        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Escreva uma apresentação sobre si, a sua disponibilidade e os detalhes que pretende divulgar."
          placeholderTextColor="#8D7A87"
          multiline
          textAlignVertical="top"
          value={apresentacao}
          onChangeText={setApresentacao}
        />
      
</>)}
</View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.accordionHeader} onPress={() => alternarSeccao('atendimento')} activeOpacity={0.85}>
  <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Serviços e atendimento</Text><Text style={styles.accordionSummary}>Localidade, modalidades e disponibilidade</Text></View>
  <Text style={styles.accordionArrow}>{seccoesAbertas.atendimento ? '−' : '＋'}</Text>
</TouchableOpacity>
{seccoesAbertas.atendimento && (<>

        <Text style={styles.label}>Localidade principal *</Text>
        <TextInput style={styles.input} placeholder="Ex.: Guimarães, Braga, Vizela..." placeholderTextColor="#8D7A87" value={localidade} onChangeText={setLocalidade} />
        <Text style={styles.label}>Modalidades de atendimento *</Text>
        {['Na minha casa', 'Na casa do cliente', 'Em hotel ou alojamento', 'Noutro local combinado'].map(opcao => (
          <TouchableOpacity key={opcao} style={styles.checkboxRow} onPress={() => alternarOpcao(opcao, tiposAtendimento, setTiposAtendimento)}>
            <View style={[styles.checkbox, tiposAtendimento.includes(opcao) && styles.checkboxChecked]}>{tiposAtendimento.includes(opcao) ? <Text style={styles.checkmark}>✓</Text> : null}</View>
            <Text style={styles.checkboxText}>{opcao}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.label}>Tipos de serviço</Text>
        {['Atendimento presencial', 'Conteúdos digitais', 'Videochamada', 'Conteúdos personalizados'].map(opcao => (
          <TouchableOpacity key={opcao} style={styles.checkboxRow} onPress={() => alternarOpcao(opcao, modalidades, setModalidades)}>
            <View style={[styles.checkbox, modalidades.includes(opcao) && styles.checkboxChecked]}>{modalidades.includes(opcao) ? <Text style={styles.checkmark}>✓</Text> : null}</View>
            <Text style={styles.checkboxText}>{opcao}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.label}>Disponibilidade</Text>
        {['Com marcação', 'Durante o dia', 'À noite', 'Fins de semana'].map(opcao => (
          <TouchableOpacity key={opcao} style={styles.checkboxRow} onPress={() => alternarOpcao(opcao, disponibilidade, setDisponibilidade)}>
            <View style={[styles.checkbox, disponibilidade.includes(opcao) && styles.checkboxChecked]}>{disponibilidade.includes(opcao) ? <Text style={styles.checkmark}>✓</Text> : null}</View>
            <Text style={styles.checkboxText}>{opcao}</Text>
          </TouchableOpacity>
        ))}
      
</>)}
</View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.accordionHeader} onPress={() => alternarSeccao('caracteristicas')} activeOpacity={0.85}>
  <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Características físicas (opcional)</Text><Text style={styles.accordionSummary}>Campos opcionais do perfil</Text></View>
  <Text style={styles.accordionArrow}>{seccoesAbertas.caracteristicas ? '−' : '＋'}</Text>
</TouchableOpacity>
{seccoesAbertas.caracteristicas && (<>

        <Text style={styles.sectionText}>Preencha apenas as informações que pretende tornar públicas.</Text>
        <Text style={styles.label}>Olhos</Text><TextInput style={styles.input} placeholder="Ex.: castanhos" placeholderTextColor="#8D7A87" value={olhos} onChangeText={setOlhos} />
        <Text style={styles.label}>Cabelo</Text><TextInput style={styles.input} placeholder="Ex.: castanho, loiro, preto..." placeholderTextColor="#8D7A87" value={cabelo} onChangeText={setCabelo} />
        <Text style={styles.label}>Tom de pele</Text><TextInput style={styles.input} placeholder="Opcional" placeholderTextColor="#8D7A87" value={tomPele} onChangeText={setTomPele} />
        <Text style={styles.label}>Altura</Text><TextInput style={styles.input} placeholder="Ex.: 1,68 m" placeholderTextColor="#8D7A87" value={altura} onChangeText={setAltura} />
        <Text style={styles.label}>Tipo de corpo</Text><TextInput style={styles.input} placeholder="Opcional" placeholderTextColor="#8D7A87" value={tipoCorpo} onChangeText={setTipoCorpo} />
        <Text style={styles.label}>Busto</Text><TextInput style={styles.input} placeholder="Opcional" placeholderTextColor="#8D7A87" value={busto} onChangeText={setBusto} />
        <Text style={styles.label}>Tatuagens</Text><TextInput style={styles.input} placeholder="Opcional" placeholderTextColor="#8D7A87" value={tatuagens} onChangeText={setTatuagens} />
        <Text style={styles.label}>Piercings</Text><TextInput style={styles.input} placeholder="Opcional" placeholderTextColor="#8D7A87" value={piercings} onChangeText={setPiercings} />
      
</>)}
</View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.accordionHeader} onPress={() => alternarSeccao('precos')} activeOpacity={0.85}>
  <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Preços</Text><Text style={styles.accordionSummary}>Os valores são combinados diretamente</Text></View>
  <Text style={styles.accordionArrow}>{seccoesAbertas.precos ? '−' : '＋'}</Text>
</TouchableOpacity>
{seccoesAbertas.precos && (<>

        <Text style={styles.sectionText}>Os valores são combinados diretamente entre a anunciante e o cliente. O perfil público mostrará apenas «Preço a combinar».</Text>
      
</>)}
</View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.accordionHeader} onPress={() => alternarSeccao('media')} activeOpacity={0.85}>
  <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Fotografias e vídeos</Text><Text style={styles.accordionSummary}>Obrigatório: 5 a 10 fotografias; vídeos opcionais</Text></View>
  <Text style={styles.accordionArrow}>{seccoesAbertas.media ? '−' : '＋'}</Text>
</TouchableOpacity>
{seccoesAbertas.media && (<>


        <Text style={styles.sectionText}>
          Utilize apenas materiais próprios e consentidos.
          Não envie imagens de terceiros sem autorização,
          conteúdo sem consentimento ou qualquer material
          que envolva menores.
        </Text>

        <TouchableOpacity style={styles.uploadButton} onPress={selecionarFotografias} disabled={aCarregarMedia}>
          <Text style={styles.uploadIcon}>📷</Text>
          <View style={styles.uploadTextContainer}>
            <Text style={styles.uploadTitle}>Fotografias do perfil ({fotografias.length}/10)</Text>
            <Text style={styles.uploadSubtitle}>Obrigatório · mínimo 5 e máximo 10 fotografias</Text>
          </View>
        </TouchableOpacity>

        {fotografias.length > 0 && (
          <View style={styles.mediaPreviewGrid}>
            {fotografias.map((item) => (
              <View key={item.storagePath} style={styles.mediaPreviewItem}>
                <Image source={{ uri: item.uri }} style={styles.mediaPreviewImage} />
                <TouchableOpacity onPress={() => removerMedia(item, 'photo')}>
                  <Text style={styles.removeMediaText}>Remover</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.uploadButton} onPress={selecionarVideos} disabled={aCarregarMedia}>
          <Text style={styles.uploadIcon}>🎥</Text>
          <View style={styles.uploadTextContainer}>
            <Text style={styles.uploadTitle}>Vídeos do perfil ({videos.length}/2)</Text>
            <Text style={styles.uploadSubtitle}>Opcional · máximo 2 vídeos</Text>
          </View>
        </TouchableOpacity>

        {videos.map((item) => (
          <View key={item.storagePath} style={styles.videoSelectedRow}>
            <Text style={styles.videoSelectedText}>{item.name}</Text>
            <TouchableOpacity onPress={() => removerMedia(item, 'video')}>
              <Text style={styles.removeMediaText}>Remover</Text>
            </TouchableOpacity>
          </View>
        ))}

        {aCarregarMedia && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color="#C99B61" />
            <Text style={styles.uploadSubtitle}>A carregar ficheiros para o Supabase...</Text>
          </View>
        )}
        <Text style={styles.mediaFootnote}>
          As fotografias são obrigatórias: mínimo 2 e máximo 5. Os vídeos são opcionais.
        </Text>
      
</>)}
</View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.accordionHeader} onPress={() => alternarSeccao('declaracoes')} activeOpacity={0.85}>
  <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Declarações obrigatórias</Text><Text style={styles.accordionSummary}>Todas as declarações são obrigatórias</Text></View>
  <Text style={styles.accordionArrow}>{seccoesAbertas.declaracoes ? '−' : '＋'}</Text>
</TouchableOpacity>
{seccoesAbertas.declaracoes && (<>

        <Text style={styles.sectionText}>Assinale individualmente todas as declarações para enviar o perfil à moderação.</Text>
        {[
          { label: 'Declaro que tenho 18 anos ou mais.', value: idadeConfirmada, set: setIdadeConfirmada },
          { label: 'Li e aceito os Termos e Condições do Conecta Privé.', value: aceitaTermos, set: setAceitaTermos },
          { label: 'Li e aceito a Política de Privacidade.', value: aceitaPrivacidade, set: setAceitaPrivacidade },
          { label: 'Declaro que as informações, imagens, vídeos e demais conteúdos que publico são verdadeiros, lícitos e da minha responsabilidade.', value: declaraConteudoLicito, set: setDeclaraConteudoLicito },
          { label: 'Declaro que sou titular dos materiais enviados ou possuo autorização para os utilizar.', value: declaraTitularidade, set: setDeclaraTitularidade },
          { label: 'Aceito que o Conecta possa moderar, suspender ou remover o perfil em caso de violação das regras.', value: aceitaModeracao, set: setAceitaModeracao },
        ].map((item, idx) => (
          <TouchableOpacity key={idx} style={styles.checkboxRow} onPress={() => item.set(!item.value)} activeOpacity={0.8}>
            <View style={[styles.checkbox, item.value && styles.checkboxChecked]}>{item.value ? <Text style={styles.checkmark}>✓</Text> : null}</View>
            <Text style={styles.checkboxText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.primaryButton, (aSubmeterPerfil || aCarregarMedia) && { opacity: 0.6 }]} onPress={submeterPerfilParaAprovacao} disabled={aSubmeterPerfil || aCarregarMedia}>
          {aSubmeterPerfil ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{anuncioEmEdicao ? 'Guardar alterações e reenviar à moderação' : 'Anunciar e enviar para moderação'}</Text>}
        </TouchableOpacity>
        <Text style={styles.sectionText}>O anúncio será enviado ao MASTER mesmo que o comprovativo seja entregue posteriormente. A publicação depende da aprovação do MASTER.</Text>
      
</>)}
</View>

      <Modal visible={mostrarPopupPagamento} transparent animationType="slide" onRequestClose={abrirMeusAnuncios}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Perfil enviado para moderação</Text>
            <Text style={styles.sectionText}>O MASTER já pode analisar o seu perfil. A mensalidade é de {VALOR}; o pagamento será confirmado manualmente.</Text>
            <Text style={styles.label}>MB WAY</Text>
            <TouchableOpacity style={styles.paymentCard} onPress={() => Linking.openURL(`https://wa.me/351${WHATSAPP}`).catch(() => {})}>
              <Text style={styles.paymentCardTitle}>{MBWAY}</Text><Text style={styles.paymentSmall}>Toque para abrir o contacto do MASTER</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Transferência bancária</Text>
            <View style={styles.paymentCard}><Text style={styles.paymentValue}>{IBAN}</Text></View>
            <Text style={styles.sectionText}>Depois de pagar, envie o comprovativo ao MASTER pelo WhatsApp. O anúncio já está em moderação; não precisa de submeter novamente.</Text>
            <TouchableOpacity style={styles.whatsappButton} onPress={enviarComprovativo}><Text style={styles.whatsappButtonText}>Enviar comprovativo pelo WhatsApp</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={abrirMeusAnuncios}><Text style={styles.primaryButtonText}>Ir para Meus anúncios</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.rulesSection}>
        <Text style={styles.rulesTitle}>
          Regras do Conecta Privé
        </Text>

        <Text style={styles.rulesText}>
          • Área exclusivamente destinada a maiores de 18 anos.
        </Text>

        <Text style={styles.rulesText}>
          • Todos os perfis estão sujeitos a moderação e aprovação.
        </Text>

        <Text style={styles.rulesText}>
          • Os materiais publicados devem ser próprios e consentidos.
        </Text>

        <Text style={styles.rulesText}>
          • Não são permitidos conteúdos envolvendo menores.
        </Text>

        <Text style={styles.rulesText}>
          • A data de nascimento utilizada para verificação
          não será publicada no perfil.
        </Text>

        <Text style={styles.rulesText}>
          • O pagamento não garante aprovação do perfil.
        </Text>

        <Text style={styles.rulesText}>
          • O perfil só ficará online após confirmação do
          pagamento e aprovação administrativa.
        </Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={voltarAoCatalogo}
        >
          <Text style={styles.secondaryButtonText}>
            Voltar aos perfis
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: '#211521', borderColor: '#C99B61', borderWidth: 1, borderRadius: 20, padding: 20, maxHeight: '90%' },
  myAdCard: { backgroundColor: '#211521', borderColor: '#624257', borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  publicPriceNotice: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 8, marginBottom: 16 },
  serviceEditorCard: { backgroundColor: '#211521', borderColor: '#624257', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
  publicServicesTable: {
    borderWidth: 1,
    borderColor: '#E8DDE4',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  publicServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8ED',
  },
  publicServiceName: {
    color: '#34232D',
    fontSize: 14,
    fontWeight: '700',
  },
  publicServiceDetail: {
    color: '#806B78',
    fontSize: 12,
    marginTop: 4,
  },
  publicServicePrice: {
    color: '#7B345D',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  serviceEditorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  serviceEditorTitle: { color: '#E8C58F', fontSize: 15, fontWeight: '700' },
  servicePreviewTable: { borderColor: '#624257', borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  servicePreviewHeader: { backgroundColor: '#382236', flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  servicePreviewHeaderText: { color: '#E8C58F', fontWeight: '700' },
  servicePreviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: 12, borderTopWidth: 1, borderTopColor: '#493447' },
  servicePreviewName: { color: '#FFFFFF', fontWeight: '600' },
  servicePreviewDetail: { color: '#C7B7C5', fontSize: 12, marginTop: 3 },
  servicePreviewPrice: { color: '#E8C58F', fontWeight: '700' },
  servicePreviewEmpty: { color: '#C7B7C5', padding: 12 },
  screen: {
    flex: 1,
    backgroundColor: '#120811',
  },

  container: {
    paddingBottom: 30,
  },

  hero: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 28,
    backgroundColor: '#160A16',
    borderBottomWidth: 2,
    borderBottomColor: '#C99B61',
  },

  ageBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C99B61',
    backgroundColor: '#2A1327',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  ageNumber: {
    color: '#E8C58F',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 25,
  },

  agePlus: {
    color: '#E8C58F',
    fontSize: 13,
    fontWeight: '800',
  },

  kicker: {
    color: '#E8C58F',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 12,
  },

  heroText: {
    color: '#E9D6E2',
    fontSize: 16,
    lineHeight: 23,
  },

  subscriptionBadge: {
    alignSelf: 'flex-start',
    marginTop: 18,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#E8C58F',
  },

  subscriptionText: {
    color: '#321326',
    fontSize: 14,
    fontWeight: '900',
  },

  section: {
    backgroundColor: '#1A0B19',
    marginTop: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  sectionTag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#C99B61',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },

  sectionTagText: {
    color: '#E8C58F',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginBottom: 9,
  },

  sectionText: {
    color: '#D9C6D2',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },

  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 10,
  },

  input: {
    backgroundColor: '#FFFFFF',
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: '#241322',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#D8CBD4',
  },

  textarea: {
    minHeight: 135,
    paddingTop: 14,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 18,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C99B61',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  checkboxChecked: {
    backgroundColor: '#C99B61',
  },

  checkmark: {
    color: '#241322',
    fontSize: 17,
    fontWeight: '900',
  },

  checkboxText: {
    flex: 1,
    color: '#E9D6E2',
    fontSize: 14,
    lineHeight: 20,
  },

  privateNote: {
    color: '#C6AFBC',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },

  primaryButton: {
    shadowColor: '#C99B61',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 60,
    borderRadius: 17,
    backgroundColor: '#D7AD70',
    borderWidth: 1,
    borderColor: '#F0D5A2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 18,
  },

  primaryButtonText: {
    color: '#241322',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },

  secondaryButton: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#C99B61',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 10,
  },

  secondaryButtonText: {
    color: '#E8C58F',
    fontSize: 15,
    fontWeight: '900',
  },

  catalogCard: {
    backgroundColor: '#2B1728',
    borderWidth: 1,
    borderColor: '#76516A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },

  catalogIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  catalogTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  catalogText: {
    color: '#D9C6D2',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  profileCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B1728',
    borderWidth: 1,
    borderColor: '#76516A',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },

  profileBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8C58F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  profileBadgeText: {
    color: '#321326',
    fontWeight: '900',
    fontSize: 15,
  },

  profileInfo: {
  },

  profileTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  profileMeta: {
    color: '#E8C58F',
    fontSize: 13,
    marginTop: 4,
  },

  profileDescription: {
    color: '#D9C6D2',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  arrow: {
    color: '#E8C58F',
    fontSize: 30,
    fontWeight: '900',
  },

  profileDetail: {
    color: '#E8C58F',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
    backgroundColor: '#281426',
    borderWidth: 1,
    borderColor: '#4C2A43',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    overflow: 'hidden',
  },

  longText: {
    color: '#F6EAF2',
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 18,
    backgroundColor: '#281426',
    borderLeftWidth: 3,
    borderLeftColor: '#C99B61',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },

  protectedBox: {
    backgroundColor: '#261321',
    borderWidth: 1,
    borderColor: '#8D526F',
    borderRadius: 18,
    padding: 18,
    marginTop: 18,
    marginBottom: 8,
  },

  protectedTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  protectedText: {
    color: '#D9C6D2',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },

  centerBox: {
    alignItems: 'center',
    paddingVertical: 35,
  },

  loadingText: {
    color: '#D9C6D2',
    marginTop: 10,
    fontSize: 14,
  },

  emptyBox: {
    backgroundColor: '#2B1728',
    borderWidth: 1,
    borderColor: '#76516A',
    borderRadius: 15,
    padding: 18,
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  emptyText: {
    color: '#D9C6D2',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  divider: {
    height: 1,
    backgroundColor: '#4A3042',
    marginVertical: 22,
  },

  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B1728',
    borderWidth: 1,
    borderColor: '#76516A',
    borderRadius: 14,
    padding: 15,
    marginTop: 12,
  },

  uploadIcon: {
    fontSize: 27,
    marginRight: 13,
  },

  uploadTextContainer: {
    flex: 1,
  },

  uploadTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  uploadSubtitle: {
    color: '#CDB8C5',
    fontSize: 13,
    marginTop: 4,
  },

  paymentSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
  },

  paymentHeader: {
    backgroundColor: '#41142F',
    padding: 20,
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 20,
  },

  paymentKicker: {
    color: '#E8C58F',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  paymentTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },

  paymentText: {
    color: '#E9D6E2',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  paymentNotice: {
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#E8C985',
    borderRadius: 13,
    padding: 15,
    marginBottom: 15,
  },

  paymentNoticeTitle: {
    color: '#5D481A',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 5,
  },

  paymentNoticeText: {
    color: '#68562D',
    fontSize: 14,
    lineHeight: 20,
  },

  paymentWarning: {
    color: '#4B3715',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    marginTop: 6,
  },

  paymentCard: {
    borderWidth: 1,
    borderColor: '#DCE1E6',
    borderRadius: 15,
    padding: 17,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },

  paymentCardSelected: {
    borderColor: '#C99B61',
    borderWidth: 2,
  },

  paymentIcon: {
    fontSize: 25,
    marginBottom: 7,
  },

  paymentCardTitle: {
    color: '#18212B',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },

  paymentValue: {
    color: '#34404D',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },

  paymentSmall: {
    color: '#7B858F',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },

  steps: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E6E8EB',
    paddingTop: 15,
  },

  step: {
    flexDirection: 'row',
    marginBottom: 17,
  },

  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#42142F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    color: '#18212B',
    fontSize: 15,
    fontWeight: '900',
  },

  stepText: {
    color: '#69737D',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },

  selectedPayment: {
    marginTop: 8,
    marginBottom: 15,
  },

  selectedPaymentLabel: {
    color: '#25303A',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 7,
  },

  selectedPaymentValue: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D8DDE2',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#F7F8FA',
  },

  selectedPaymentText: {
    color: '#25303A',
    fontSize: 15,
    fontWeight: '700',
  },

  verificationBox: {
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#E6C77D',
    borderRadius: 14,
    padding: 17,
    alignItems: 'center',
  },

  verificationIcon: {
    fontSize: 30,
    marginBottom: 6,
  },

  verificationTitle: {
    color: '#503C18',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },

  verificationText: {
    color: '#68562D',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 7,
  },

  whatsappButton: {
    minHeight: 54,
    borderRadius: 13,
    backgroundColor: '#1D8A52',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    marginTop: 12,
  },

  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  manualApproval: {
    color: '#737B84',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 10,
  },

  bold: {
    fontWeight: '900',
  },

  rulesSection: {
    backgroundColor: '#1E101E',
    padding: 20,
    marginTop: 1,
  },

  rulesTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 13,
  },

  rulesText: {
    color: '#D9C6D2',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },

  mediaPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  mediaPreviewItem: {
    width: '30%',
    marginBottom: 8,
  },
  mediaPreviewImage: {
    width: '100%',
    height: 105,
    borderRadius: 10,
    backgroundColor: '#2B1728',
  },
  removeMediaText: {
    color: '#E8C58F',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  videoSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2B1728',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  videoSelectedText: {
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  mediaFootnote: {
    color: '#CDB8C5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  bottomSpace: {
    height: 40,
    backgroundColor: '#120811',
  },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  accordionSummary: { color: '#CDB8C5', fontSize: 12, lineHeight: 17, marginTop: 3 },
  accordionArrow: { color: '#E8C58F', fontSize: 25, fontWeight: '900', paddingHorizontal: 4 },
  catalogThumbnail: { width: 88, height: 112, borderRadius: 12, backgroundColor: '#2B1728' },
  catalogThumbnailPlaceholder: { width: 88, height: 112, borderRadius: 12, backgroundColor: '#50304B', alignItems: 'center', justifyContent: 'center' },
  publicGallery: { gap: 12, paddingBottom: 20, paddingTop: 4 },
  publicGalleryImage: { width: 286, height: 390, borderRadius: 20, backgroundColor: '#2B1728', borderWidth: 1, borderColor: '#8A6748' },

});