import * as Linking from 'expo-linking';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supabase';

type PedidoOrcamento = {
  id: string;
  anuncio_id: string;
  solicitante_id: string;
  profissional_id: string;
  nome_solicitante: string | null;
  contacto_solicitante: string | null;
  servico: string | null;
  descricao: string | null;
  localidade: string | null;
  data_pretendida: string | null;
  orcamento: number | string | null;
  observacoes: string | null;
  estado: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

type Anuncio = {
  id: string;
  user_id: string | null;
  titulo: string | null;
  descricao: string | null;
  tipo_anuncio: string | null;
  categoria: string | null;
  localidade: string | null;
  preco: number | string | null;
  preco_negociavel: boolean | null;
  contato: string | null;
  estado: string | null;
  criado_em: string | null;
  publicado_em: string | null;
  dados_especificos: Record<string, any> | null;
  alteracao_pendente?: Record<string, any> | null;
  pedido_exclusao_pendente?: boolean | null;
  pedido_exclusao_em?: string | null;
};

type Pesquisa = {
  id: string;
  termo: string | null;
  regiao: string | null;
  resultados: number | null;
  criado_em: string | null;
};

type CompraAnuncio = {
  id: string;
  anuncio_id: string;
  comprador_id: string;
  vendedor_id: string;
  estado: 'pendente' | 'confirmada' | 'recusada' | string;
  solicitado_em: string | null;
  confirmado_em: string | null;
  titulo_anuncio?: string;
  avaliacao?: { nota: number; comentario: string | null } | null;
};

const MASTER_EMAIL = 'hgimigra@gmail.com';

type Periodo = 'hoje' | '7dias' | '30dias' | 'tudo';
type TipoConta = 'utilizador' | 'profissional' | 'empresa';
type PlanoConta = 'gratuito' | 'profissional' | 'empresa';

export default function ContaScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerRight: () => null });
  }, [navigation]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modoRecuperacao, setModoRecuperacao] = useState(false);
  const [modoRedefinirPassword, setModoRedefinirPassword] = useState(false);
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const [modoRegisto, setModoRegisto] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [nomePreferido, setNomePreferido] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [nomePerfil, setNomePerfil] = useState('');
  const [apelidoPerfil, setApelidoPerfil] = useState('');
  const [dataNascimentoPerfil, setDataNascimentoPerfil] = useState('');
  const [nomePreferidoPerfil, setNomePreferidoPerfil] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarNovaPassword, setMostrarNovaPassword] = useState(false);
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);
  const [alterandoPassword, setAlterandoPassword] = useState(false);
  const [secaoPerfilAberta, setSecaoPerfilAberta] = useState(false);
  const [secaoSegurancaAberta, setSecaoSegurancaAberta] = useState(false);
  const [secaoDefinicoesAberta, setSecaoDefinicoesAberta] = useState(false);
  const [mostrarPedidosDetalhe, setMostrarPedidosDetalhe] = useState(false);
  const [irParaPedidos, setIrParaPedidos] = useState(false);
  const scrollContaRef = useRef<ScrollView>(null);

  const [tipoConta, setTipoConta] =
    useState<TipoConta>('utilizador');

  const [planoConta, setPlanoConta] =
    useState<PlanoConta>('gratuito');

  const [salvandoTipoConta, setSalvandoTipoConta] =
    useState(false);

  const [etapaConta, setEtapaConta] =
    useState<'escolha' | 'autenticacao'>('escolha');

  const [modoAdministrador, setModoAdministrador] = useState(false);

  const [pedidos, setPedidos] =
    useState<PedidoOrcamento[]>([]);

  // IDs dos pedidos de orçamento que o anunciante já consultou.
  // Guardados nos metadados da conta para manter a leitura após fechar/reabrir a app.
  const [pedidosLidos, setPedidosLidos] = useState<string[]>([]);

  const [carregandoPedidos, setCarregandoPedidos] =
    useState(false);

  const [valores, setValores] =
    useState<Record<string, string>>({});

  const [respondendoId, setRespondendoId] =
    useState<string | null>(null);

  const [anuncios, setAnuncios] =
    useState<Anuncio[]>([]);

  const [meusAnuncios, setMeusAnuncios] = useState<Anuncio[]>([]);
  const [carregandoMeusAnuncios, setCarregandoMeusAnuncios] = useState(false);
  const [mostrarMeusAnuncios, setMostrarMeusAnuncios] = useState(false);
  const [anuncioEmEdicao, setAnuncioEmEdicao] = useState<Anuncio | null>(null);
  const [camposEdicao, setCamposEdicao] = useState<Record<string, string>>({});
  const [dadosEspecificosEdicao, setDadosEspecificosEdicao] = useState<Record<string, any>>({});
  const [guardandoAlteracao, setGuardandoAlteracao] = useState(false);
  const [processandoPedidoModeracao, setProcessandoPedidoModeracao] = useState<string | null>(null);

  const [carregandoMaster, setCarregandoMaster] =
    useState(false);

  const [atualizandoMaster, setAtualizandoMaster] =
    useState(false);

  const [erroMaster, setErroMaster] =
    useState('');

  const [processandoId, setProcessandoId] =
    useState<string | null>(null);
  const [mostrarGestaoEliminacao, setMostrarGestaoEliminacao] = useState(false);
  const [anunciosParaEliminar, setAnunciosParaEliminar] = useState<string[]>([]);
  const [pesquisaEliminacao, setPesquisaEliminacao] = useState('');
  const [eliminandoEmMassa, setEliminandoEmMassa] = useState(false);

  const [periodo, setPeriodo] =
    useState<Periodo>('tudo');

  const [pesquisas, setPesquisas] =
    useState<Pesquisa[]>([]);

  const [comprasAnuncios, setComprasAnuncios] = useState<CompraAnuncio[]>([]);
  const [carregandoComprasAnuncios, setCarregandoComprasAnuncios] = useState(false);
  const [mostrarComprasAnuncios, setMostrarComprasAnuncios] = useState(false);
  const [processandoCompraId, setProcessandoCompraId] = useState<string | null>(null);
  const [notasCompra, setNotasCompra] = useState<Record<string, number>>({});
  const [comentariosCompra, setComentariosCompra] = useState<Record<string, string>>({});

  const isMaster =
    session?.user?.email?.trim().toLowerCase() ===
    MASTER_EMAIL.toLowerCase();

  useEffect(() => {
    if (isMaster && !modoRecuperacao && !modoRedefinirPassword) {
      router.replace('/admin');
    }
  }, [isMaster, modoRecuperacao, modoRedefinirPassword, router]);

  function lerTipoConta(user: any): TipoConta {
    const valor = user?.user_metadata?.tipo_conta;

    if (
      valor === 'profissional' ||
      valor === 'empresa'
    ) {
      return valor;
    }

    return 'utilizador';
  }

  function lerPlanoConta(
    user: any,
    tipo: TipoConta
  ): PlanoConta {
    const valor = user?.user_metadata?.plano;

    if (
      valor === 'profissional' ||
      valor === 'empresa'
    ) {
      return valor;
    }

    if (tipo === 'profissional') {
      return 'profissional';
    }

    if (tipo === 'empresa') {
      return 'empresa';
    }

    return 'gratuito';
  }

  function atualizarDadosConta(
    sessao: any
  ) {
    const tipo = lerTipoConta(
      sessao?.user ?? null
    );

    const plano = lerPlanoConta(
      sessao?.user ?? null,
      tipo
    );

    setTipoConta(tipo);
    setPlanoConta(plano);
  }

  async function salvarTipoConta(
    tipo: TipoConta
  ) {
    if (!session?.user) {
      Alert.alert(
        'Atenção',
        'Inicie sessão para escolher o tipo de conta.'
      );

      return;
    }

    setSalvandoTipoConta(true);

    const plano: PlanoConta =
      tipo === 'profissional'
        ? 'profissional'
        : tipo === 'empresa'
          ? 'empresa'
          : 'gratuito';

    const { data, error } =
      await supabase.auth.updateUser({
        data: {
          tipo_conta: tipo,
          plano,
        },
      });

    setSalvandoTipoConta(false);

    if (error) {
      Alert.alert(
        'Não foi possível atualizar',
        error.message
      );

      return;
    }

    setTipoConta(tipo);
    setPlanoConta(plano);

    if (data.user) {
      setSession((atual: any) =>
        atual
          ? {
              ...atual,
              user: data.user,
            }
          : atual
      );
    }

    Alert.alert(
      'Conta atualizada',
      'O tipo de conta foi guardado com sucesso.'
    );
  }

  useEffect(() => {
    carregarSessao();

    const processarLinkRecuperacao = async (url: string | null) => {
      if (!url) return;
      try {
        const partes = url.split('#');
        const query = new URLSearchParams(partes[1] || partes[0].split('?')[1] || '');
        const tipo = query.get('type');
        const accessToken = query.get('access_token');
        const refreshToken = query.get('refresh_token');
        if (tipo !== 'recovery' || !accessToken || !refreshToken) return;

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          Alert.alert('Link inválido ou expirado', 'Peça um novo link de recuperação e tente novamente.');
          return;
        }
        setModoRecuperacao(false);
        setModoRedefinirPassword(true);
        setNovaPassword('');
        setConfirmarPassword('');
      } catch (error: any) {
        Alert.alert('Não foi possível abrir o link', error?.message || 'Peça um novo link de recuperação.');
      }
    };

    Linking.getInitialURL().then(processarLinkRecuperacao).catch(() => undefined);
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      processarLinkRecuperacao(url);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nova) => {
        setSession(nova);
        atualizarDadosConta(nova);
        if (event === 'PASSWORD_RECOVERY') {
          setModoRecuperacao(false);
          setModoRedefinirPassword(true);
        }

        if (nova?.user?.id) {
          carregarPedidos(nova.user.id);
        } else {
          setPedidos([]);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const metadata = session?.user?.user_metadata ?? {};
    const lidos = Array.isArray(metadata.pedidos_orcamento_lidos)
      ? metadata.pedidos_orcamento_lidos.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    setPedidosLidos(lidos);
    setNomePerfil(String(metadata.nome ?? ''));
    setApelidoPerfil(String(metadata.apelido ?? ''));
    setDataNascimentoPerfil(String(metadata.data_nascimento ?? ''));
    setNomePreferidoPerfil(String(metadata.nome_preferido ?? ''));
  }, [session?.user?.id, session?.user?.user_metadata]);

  useEffect(() => {
    if (session?.user?.id) {
      carregarPedidos(session.user.id);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      carregarComprasAnuncios(session.user.id);
    } else {
      setComprasAnuncios([]);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (isMaster) {
      carregarAnuncios();
    } else {
      setAnuncios([]);
      setErroMaster('');
    }
  }, [isMaster]);

  async function carregarSessao() {
    const {
      data: { session: sessao },
    } = await supabase.auth.getSession();

    setSession(sessao);
    atualizarDadosConta(sessao);

    if (sessao?.user?.id) {
      carregarPedidos(sessao.user.id);
    }
  }

  async function marcarPedidosComoLidos(ids: string[]) {
    if (!session?.user || ids.length === 0) return;

    const metadataAtual = session.user.user_metadata ?? {};
    const lidosAtuais = Array.isArray(metadataAtual.pedidos_orcamento_lidos)
      ? metadataAtual.pedidos_orcamento_lidos.filter((id: unknown): id is string => typeof id === 'string')
      : pedidosLidos;
    const novosLidos = [...new Set([...lidosAtuais, ...ids])];

    // Actualiza primeiro a interface; se a gravação falhar, repõe o estado e informa.
    setPedidosLidos(novosLidos);
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...metadataAtual,
        pedidos_orcamento_lidos: novosLidos,
      },
    });

    if (error) {
      setPedidosLidos(lidosAtuais);
      Alert.alert(
        'Não foi possível guardar a leitura',
        'O indicador será mantido até conseguirmos guardar que consultou os pedidos.'
      );
      return;
    }

    if (data.user) {
      setSession((atual: any) => atual ? { ...atual, user: data.user } : atual);
    }
  }

  async function carregarPedidos(
    userId: string
  ) {
    try {
      setCarregandoPedidos(true);

      const { data, error } =
        await supabase
          .from('pedidos_orcamento')
          .select(
            'id, anuncio_id, solicitante_id, profissional_id, nome_solicitante, contacto_solicitante, servico, descricao, localidade, data_pretendida, orcamento, observacoes, estado, criado_em, atualizado_em'
          )
          .eq('profissional_id', userId)
          .order('criado_em', {
            ascending: false,
          });

      if (error) {
        console.error(
          'Erro ao carregar pedidos:',
          error
        );

        setPedidos([]);
      } else {
        setPedidos(
          (data || []) as PedidoOrcamento[]
        );
      }
    } catch (error) {
      console.error(
        'Erro inesperado ao carregar pedidos:',
        error
      );

      setPedidos([]);
    } finally {
      setCarregandoPedidos(false);
    }
  }

  async function carregarComprasAnuncios(userId: string) {
    setCarregandoComprasAnuncios(true);
    try {
      const { data, error } = await supabase
        .from('compras_anuncios')
        .select('id, anuncio_id, comprador_id, vendedor_id, estado, solicitado_em, confirmado_em')
        .or(`comprador_id.eq.${userId},vendedor_id.eq.${userId}`)
        .order('solicitado_em', { ascending: false });

      if (error) throw error;

      const compras = (data || []) as CompraAnuncio[];
      const anuncioIds = [...new Set(compras.map((compra) => compra.anuncio_id).filter(Boolean))];
      const compraIds = compras.map((compra) => compra.id);

      let titulos: Record<string, string> = {};
      if (anuncioIds.length) {
        const { data: anunciosData, error: anunciosError } = await supabase
          .from('anuncios')
          .select('id, titulo')
          .in('id', anuncioIds);
        if (anunciosError) throw anunciosError;
        (anunciosData || []).forEach((anuncio: any) => {
          titulos[anuncio.id] = anuncio.titulo || 'Anúncio sem título';
        });
      }

      let avaliacoes: Record<string, { nota: number; comentario: string | null }> = {};
      if (compraIds.length) {
        const { data: avaliacoesData, error: avaliacoesError } = await supabase
          .from('avaliacoes_anunciantes')
          .select('compra_id, nota, comentario')
          .in('compra_id', compraIds);
        if (avaliacoesError) throw avaliacoesError;
        (avaliacoesData || []).forEach((avaliacao: any) => {
          avaliacoes[avaliacao.compra_id] = {
            nota: Number(avaliacao.nota),
            comentario: avaliacao.comentario || null,
          };
        });
      }

      setComprasAnuncios(compras.map((compra) => ({
        ...compra,
        titulo_anuncio: titulos[compra.anuncio_id] || 'Anúncio',
        avaliacao: avaliacoes[compra.id] || null,
      })));
    } catch (error: any) {
      console.error('Erro ao carregar compras e vendas:', error);
      Alert.alert('Compras e vendas', error?.message || 'Não foi possível carregar os pedidos de compra.');
      setComprasAnuncios([]);
    } finally {
      setCarregandoComprasAnuncios(false);
    }
  }

  async function responderCompraAnuncio(compra: CompraAnuncio, confirmar: boolean) {
    if (!session?.user?.id) return;
    setProcessandoCompraId(compra.id);
    try {
      const { error } = await supabase.rpc('responder_compra_anuncio', {
        p_compra_id: compra.id,
        p_confirmar: confirmar,
      });
      if (error) throw error;
      await carregarComprasAnuncios(session.user.id);
      Alert.alert(
        confirmar ? 'Compra confirmada' : 'Pedido recusado',
        confirmar
          ? 'A compra foi confirmada. O comprador poderá avaliar a sua experiência.'
          : 'O pedido de compra foi recusado.'
      );
    } catch (error: any) {
      Alert.alert('Não foi possível atualizar o pedido', error?.message || 'Tente novamente.');
    } finally {
      setProcessandoCompraId(null);
    }
  }

  async function enviarAvaliacaoAnunciante(compra: CompraAnuncio) {
    if (!session?.user?.id) return;
    const nota = notasCompra[compra.id] || 0;
    const comentario = (comentariosCompra[compra.id] || '').trim();
    if (nota < 1 || nota > 5) {
      Alert.alert('Escolha uma classificação', 'Selecione entre 1 e 5 estrelas.');
      return;
    }
    setProcessandoCompraId(compra.id);
    try {
      const { error } = await supabase.rpc('avaliar_anunciante', {
        p_compra_id: compra.id,
        p_nota: nota,
        p_comentario: comentario || null,
      });
      if (error) throw error;
      await carregarComprasAnuncios(session.user.id);
      Alert.alert('Avaliação enviada', 'Obrigado por partilhar a sua experiência.');
    } catch (error: any) {
      Alert.alert('Não foi possível enviar a avaliação', error?.message || 'Verifique se a compra foi confirmada.');
    } finally {
      setProcessandoCompraId(null);
    }
  }

  async function carregarMeusAnuncios(userId: string) {
    setCarregandoMeusAnuncios(true);
    try {
      const { data, error } = await supabase
        .from('anuncios')
        .select('id, user_id, titulo, descricao, tipo_anuncio, categoria, localidade, preco, preco_negociavel, contato, estado, criado_em, publicado_em, dados_especificos, alteracao_pendente, pedido_exclusao_pendente, pedido_exclusao_em')
        .eq('user_id', userId)
        .neq('estado', 'eliminado')
        .order('criado_em', { ascending: false });
      if (error) {
        console.error('Erro ao carregar os meus anúncios:', error);
        Alert.alert('Não foi possível carregar os anúncios', error.message);
        setMeusAnuncios([]);
      } else {
        setMeusAnuncios((data || []) as Anuncio[]);
      }
    } catch (error: any) {
      Alert.alert('Erro ao carregar os anúncios', error?.message || 'Tente novamente.');
      setMeusAnuncios([]);
    } finally {
      setCarregandoMeusAnuncios(false);
    }
  }

  function abrirEdicaoAnuncio(anuncio: Anuncio) {
    if (anuncio.alteracao_pendente) {
      Alert.alert('Alteração pendente', 'Este anúncio já tem uma alteração à espera da aprovação do MASTER. Aguarde pela decisão antes de enviar outra.');
      return;
    }
    setAnuncioEmEdicao(anuncio);
    setCamposEdicao({
      titulo: anuncio.titulo || '',
      descricao: anuncio.descricao || '',
      categoria: anuncio.categoria || '',
      localidade: anuncio.localidade || '',
      preco: anuncio.preco === null || anuncio.preco === undefined ? '' : String(anuncio.preco),
      contato: anuncio.contato || '',
      preco_negociavel: anuncio.preco_negociavel ? 'true' : 'false',
    });
    const dados = { ...(anuncio.dados_especificos || {}) };
    delete dados.criado_em;
    delete dados.tipo;
    setDadosEspecificosEdicao(dados);
  }

  async function solicitarAlteracaoAnuncio() {
    if (!anuncioEmEdicao || !session?.user?.id) return;
    if (!camposEdicao.titulo?.trim() || !camposEdicao.descricao?.trim() || !camposEdicao.categoria?.trim() || !camposEdicao.localidade?.trim()) {
      Alert.alert('Dados em falta', 'Preencha o título, a descrição, a categoria e a localidade.');
      return;
    }
    const precoTexto = (camposEdicao.preco || '').trim();
    const precoNumero = precoTexto ? Number(precoTexto.replace(',', '.')) : null;
    if (precoTexto && (precoNumero === null || Number.isNaN(precoNumero) || precoNumero < 0)) {
      Alert.alert('Preço inválido', 'Introduza um preço numérico válido.');
      return;
    }
    setGuardandoAlteracao(true);
    try {
      const proposta = {
        titulo: camposEdicao.titulo.trim(),
        descricao: camposEdicao.descricao.trim(),
        categoria: camposEdicao.categoria.trim(),
        localidade: camposEdicao.localidade.trim(),
        preco: precoNumero,
        preco_negociavel: camposEdicao.preco_negociavel === 'true',
        contato: (camposEdicao.contato || '').trim() || null,
        dados_especificos: {
          ...(anuncioEmEdicao.dados_especificos || {}),
          ...dadosEspecificosEdicao,
        },
      };
      const { error } = await supabase.from('anuncios').update({ alteracao_pendente: proposta }).eq('id', anuncioEmEdicao.id).eq('user_id', session.user.id).is('alteracao_pendente', null);
      if (error) throw error;
      setAnuncioEmEdicao(null);
      await carregarMeusAnuncios(session.user.id);
      Alert.alert('Alteração enviada', 'As alterações foram enviadas ao MASTER. O anúncio publicado continuará igual até à aprovação.');
    } catch (error: any) {
      Alert.alert('Não foi possível enviar', error?.message || 'Ocorreu um erro ao enviar a alteração.');
    } finally {
      setGuardandoAlteracao(false);
    }
  }

  function confirmarPedidoExclusao(anuncio: Anuncio) {
    if (!session?.user?.id) return;
    if (anuncio.user_id !== session.user.id) {
      Alert.alert('Sem permissão', 'Só pode excluir os seus próprios anúncios.');
      return;
    }
    if (anuncio.estado === 'eliminado') {
      setMeusAnuncios((lista) => lista.filter((item) => item.id !== anuncio.id));
      return;
    }

    Alert.alert(
      'Excluir anúncio',
      `Tem a certeza de que pretende excluir o anúncio “${anuncio.titulo || 'sem título'}”? A exclusão é imediata e não precisa de aprovação do MASTER.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir anúncio',
          style: 'destructive',
          onPress: async () => {
            setProcessandoPedidoModeracao(anuncio.id);
            try {
              const { data, error } = await supabase
                .from('anuncios')
                .update({
                  estado: 'eliminado',
                  pedido_exclusao_pendente: false,
                  pedido_exclusao_em: null,
                  alteracao_pendente: null,
                  atualizado_em: new Date().toISOString(),
                })
                .eq('id', anuncio.id)
                .eq('user_id', session.user.id)
                .neq('estado', 'eliminado')
                .select('id, estado')
                .maybeSingle();

              if (error) throw error;
              if (!data?.id || data.estado !== 'eliminado') {
                throw new Error('A base de dados não confirmou a exclusão. Verifique as permissões RLS para o utilizador atualizar os próprios anúncios.');
              }

              // Retira imediatamente da interface; o filtro no carregamento impede o regresso após atualizar.
              setMeusAnuncios((lista) => lista.filter((item) => item.id !== anuncio.id));
              Alert.alert('Anúncio excluído', 'O anúncio foi retirado da publicação. Não é necessária aprovação do MASTER.');
              await carregarMeusAnuncios(session.user.id);
            } catch (error: any) {
              Alert.alert(
                'Não foi possível excluir',
                error?.message || 'Ocorreu um erro ao excluir o anúncio.'
              );
              await carregarMeusAnuncios(session.user.id);
            } finally {
              setProcessandoPedidoModeracao(null);
            }
          },
        },
      ]
    );
  }

  async function decidirPedidoModeracao(anuncio: Anuncio, decisao: 'aprovar' | 'rejeitar') {
    setProcessandoPedidoModeracao(anuncio.id);
    try {
      if (anuncio.pedido_exclusao_pendente) {
        if (decisao === 'aprovar') {
          // Exclusão lógica: evita apagar em cascata pedidos de orçamento
          // que têm regras próprias de integridade/validação na base de dados.
          const { data, error } = await supabase
            .from('anuncios')
            .update({
              estado: 'eliminado',
              pedido_exclusao_pendente: false,
              pedido_exclusao_em: null,
              alteracao_pendente: null,
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', anuncio.id)
            .eq('pedido_exclusao_pendente', true)
            .select('id, estado, pedido_exclusao_pendente')
            .maybeSingle();
          if (error) throw error;
          if (!data?.id || data.estado !== 'eliminado' || data.pedido_exclusao_pendente !== false) {
            throw new Error('A base de dados não confirmou a exclusão. O pedido continua pendente; verifique as permissões de atualização da tabela anuncios para a conta MASTER.');
          }
          setAnuncios((lista) => lista.map((item) => item.id === anuncio.id
            ? { ...item, estado: 'eliminado', pedido_exclusao_pendente: false, pedido_exclusao_em: null, alteracao_pendente: null }
            : item));
          Alert.alert('Exclusão aprovada', 'O anúncio foi retirado da publicação e o pedido foi concluído.');
        } else {
          const { data, error } = await supabase
            .from('anuncios')
            .update({ pedido_exclusao_pendente: false, pedido_exclusao_em: null })
            .eq('id', anuncio.id)
            .eq('pedido_exclusao_pendente', true)
            .select('id')
            .maybeSingle();
          if (error) throw error;
          if (!data?.id) {
            throw new Error('A rejeição não foi gravada na base de dados. Verifique as permissões RLS da tabela anuncios para a conta MASTER.');
          }
          setAnuncios((lista) => lista.map((item) => item.id === anuncio.id ? { ...item, pedido_exclusao_pendente: false, pedido_exclusao_em: null } : item));
          Alert.alert('Pedido rejeitado', 'A rejeição foi guardada. O anúncio foi mantido publicado.');
        }
      } else if (anuncio.alteracao_pendente) {
        if (decisao === 'aprovar') {
          const proposta = anuncio.alteracao_pendente;
          const { data, error } = await supabase.from('anuncios').update({
            titulo: proposta.titulo,
            descricao: proposta.descricao,
            categoria: proposta.categoria,
            localidade: proposta.localidade,
            preco: proposta.preco,
            preco_negociavel: proposta.preco_negociavel,
            contato: proposta.contato,
            dados_especificos: proposta.dados_especificos,
            alteracao_pendente: null,
          }).eq('id', anuncio.id).not('alteracao_pendente', 'is', null).select('id').maybeSingle();
          if (error) throw error;
          if (!data?.id) {
            throw new Error('A aprovação não foi gravada na base de dados. Verifique as permissões RLS da tabela anuncios para a conta MASTER.');
          }
          setAnuncios((lista) => lista.map((item) => item.id === anuncio.id ? { ...item, ...proposta, alteracao_pendente: null } : item));
          Alert.alert('Alteração aprovada', 'A aprovação foi guardada e os novos dados foram aplicados ao anúncio.');
        } else {
          const { data, error } = await supabase
            .from('anuncios')
            .update({ alteracao_pendente: null })
            .eq('id', anuncio.id)
            .not('alteracao_pendente', 'is', null)
            .select('id')
            .maybeSingle();
          if (error) throw error;
          if (!data?.id) {
            throw new Error('A rejeição não foi gravada na base de dados. Verifique as permissões RLS da tabela anuncios para a conta MASTER.');
          }
          setAnuncios((lista) => lista.map((item) => item.id === anuncio.id ? { ...item, alteracao_pendente: null } : item));
          Alert.alert('Alteração rejeitada', 'A rejeição foi guardada na base de dados. O anúncio original foi mantido sem alterações.');
        }
      }
    } catch (error: any) {
      Alert.alert('Decisão não confirmada', error?.message || 'Não foi possível guardar a decisão. O pedido foi mantido para que possa tentar novamente.');
      await carregarAnuncios();
    } finally {
      setProcessandoPedidoModeracao(null);
    }
  }

  async function pedirRecuperacaoPassword() {
    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      Alert.alert('E-mail necessário', 'Introduza um endereço de e-mail válido para receber o link.');
      return;
    }

    setEnviandoRecuperacao(true);
    try {
      const redirectTo = 'https://conecta-guimaraes.netlify.app/conta';
      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, { redirectTo });
      if (error) {
        Alert.alert('Não foi possível enviar', error.message);
        return;
      }
      Alert.alert('Verifique o seu e-mail', 'Se o endereço puder receber uma recuperação, receberá um link para definir uma nova palavra-passe. Verifique também a pasta de spam.');
      setModoRecuperacao(false);
    } catch (error: any) {
      Alert.alert('Erro ao pedir recuperação', error?.message || 'Tente novamente dentro de momentos.');
    } finally {
      setEnviandoRecuperacao(false);
    }
  }

  async function guardarPasswordRecuperada() {
    if (!novaPassword || !confirmarPassword) {
      Alert.alert('Dados em falta', 'Preencha e confirme a nova palavra-passe.');
      return;
    }
    if (novaPassword.length < 8 || !/[A-Za-zÀ-ÿ]/.test(novaPassword) || !/\d/.test(novaPassword) || !/[^A-Za-zÀ-ÿ0-9]/.test(novaPassword)) {
      Alert.alert('Palavra-passe fraca', 'Use pelo menos 8 caracteres, incluindo uma letra, um número e um carácter especial.');
      return;
    }
    if (novaPassword !== confirmarPassword) {
      Alert.alert('Palavras-passe diferentes', 'A confirmação não corresponde à nova palavra-passe.');
      return;
    }

    setAlterandoPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaPassword });
      if (error) {
        Alert.alert('Não foi possível alterar', error.message);
        return;
      }
      setNovaPassword('');
      setConfirmarPassword('');
      setModoRedefinirPassword(false);
      setModoRecuperacao(false);
      Alert.alert('Palavra-passe actualizada', 'Já pode iniciar sessão com a nova palavra-passe.');
    } catch (error: any) {
      Alert.alert('Erro ao actualizar', error?.message || 'O link pode ter expirado. Peça um novo link de recuperação.');
    } finally {
      setAlterandoPassword(false);
    }
  }

  async function entrar() {
    if (!email || !password) {
      Alert.alert(
        'Atenção',
        'Preencha o email e a palavra-passe.'
      );

      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (
      error ||
      !data.session ||
      !data.user
    ) {
      setLoading(false);

      Alert.alert(
        'Não foi possível entrar',
        error?.message ||
          'Não foi possível iniciar a sessão.'
      );

      return;
    }

    // MASTER entra na área administrativa e não recebe metadados de conta normal.
    if (data.user.email?.trim().toLowerCase() === MASTER_EMAIL.toLowerCase()) {
      setSession(data.session);
      setLoading(false);
      router.replace('/admin');
      return;
    }

    const tipoEscolhido = tipoConta;

    const planoEscolhido: PlanoConta =
      tipoEscolhido === 'profissional'
        ? 'profissional'
        : tipoEscolhido === 'empresa'
          ? 'empresa'
          : 'gratuito';

    const {
      data: dadosAtualizados,
      error: erroAtualizacao,
    } =
      await supabase.auth.updateUser({
        data: {
          tipo_conta: tipoEscolhido,
          plano: planoEscolhido,
        },
      });

    if (
      erroAtualizacao ||
      !dadosAtualizados.user
    ) {
      await supabase.auth.signOut();

      setLoading(false);

      Alert.alert(
        'Não foi possível configurar a conta',
        erroAtualizacao?.message ||
          'Não foi possível guardar o tipo de conta escolhido.'
      );

      return;
    }

    const novaSession = {
      ...data.session,
      user: dadosAtualizados.user,
    };

    setSession(novaSession);
    setTipoConta(tipoEscolhido);
    setPlanoConta(planoEscolhido);

    setLoading(false);

    router.replace('/');
  }

  function selecionarTipoParaConta(
    tipo: TipoConta
  ) {
    setModoAdministrador(false);
    setTipoConta(tipo);

    setPlanoConta(
      tipo === 'profissional'
        ? 'profissional'
        : tipo === 'empresa'
          ? 'empresa'
          : 'gratuito'
    );

    setEtapaConta('autenticacao');
  }

  function nomeTipoConta(
    tipo: TipoConta
  ) {
    if (tipo === 'profissional') {
      return '🧑‍🔧 Sou profissional';
    }

    if (tipo === 'empresa') {
      return '🏢 Sou uma empresa';
    }

    return '👤 Quero utilizar o Conecta';
  }

  function descricaoTipoConta(
    tipo: TipoConta
  ) {
    if (tipo === 'profissional') {
      return 'Divulgar os meus serviços e receber pedidos de orçamento.';
    }

    if (tipo === 'empresa') {
      return 'Divulgar a minha empresa, produtos e serviços.';
    }

    return 'Procurar serviços, profissionais, anúncios e fazer pedidos.';
  }

  function voltarParaEscolha() {
    setEtapaConta('escolha');
    setEmail('');
    setPassword('');
  }

  async function criarConta() {
    const emailLimpo = email.trim().toLowerCase();
    const nomeLimpo = nome.trim();
    const apelidoLimpo = apelido.trim();

    if (!nomeLimpo || !apelidoLimpo || !dataNascimento.trim() || !emailLimpo || !password) {
      Alert.alert('Dados em falta', 'Preencha o nome, apelido, data de nascimento, e-mail e palavra-passe.');
      return;
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataNascimento.trim())) {
      Alert.alert('Data inválida', 'Introduza a data de nascimento no formato DD/MM/AAAA.');
      return;
    }
    const [dia, mes, ano] = dataNascimento.trim().split('/').map(Number);
    const dataValida = new Date(ano, mes - 1, dia);
    if (dataValida.getFullYear() !== ano || dataValida.getMonth() !== mes - 1 || dataValida.getDate() !== dia || ano < 1900 || dataValida > new Date()) {
      Alert.alert('Data inválida', 'Verifique a data de nascimento introduzida.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      Alert.alert('E-mail inválido', 'Introduza um endereço de e-mail válido.');
      return;
    }
    if (password.length < 8 || !/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password) || !/[^A-Za-zÀ-ÿ0-9]/.test(password)) {
      Alert.alert('Palavra-passe fraca', 'Use pelo menos 8 caracteres, incluindo uma letra, um número e um carácter especial.');
      return;
    }
    if (!aceitouTermos) {
      Alert.alert('Consentimento necessário', 'Tem de aceitar os Termos e Condições e a Política de Privacidade para criar a conta.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailLimpo,
        password,
        options: {
          data: {
            nome: nomeLimpo,
            apelido: apelidoLimpo,
            data_nascimento: dataNascimento.trim(),
            nome_preferido: nomePreferido.trim() || null,
            aceitou_termos: true,
            aceitou_termos_em: new Date().toISOString(),
            tipo_conta: tipoConta,
            plano: tipoConta === 'profissional' ? 'profissional' : tipoConta === 'empresa' ? 'empresa' : 'gratuito',
          },
        },
      });
      if (error) {
        Alert.alert('Não foi possível criar a conta', error.message);
        return;
      }
      if (!data.session) {
        Alert.alert('Conta criada', 'Verifique o seu e-mail para confirmar o endereço antes de iniciar sessão.');
        setModoRegisto(false);
        setPassword('');
        return;
      }
      setSession(data.session);
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Erro ao criar conta', error?.message || 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function guardarDadosPessoais() {
    if (!session?.user) {
      Alert.alert('Sessão necessária', 'Inicie sessão para editar os seus dados.');
      return;
    }

    const nomeLimpo = nomePerfil.trim();
    const apelidoLimpo = apelidoPerfil.trim();
    const dataLimpa = dataNascimentoPerfil.trim();

    if (!nomeLimpo || !apelidoLimpo || !dataLimpa) {
      Alert.alert('Dados em falta', 'Preencha o nome, o apelido e a data de nascimento.');
      return;
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataLimpa)) {
      Alert.alert('Data inválida', 'Use o formato DD/MM/AAAA.');
      return;
    }

    const [dia, mes, ano] = dataLimpa.split('/').map(Number);
    const data = new Date(ano, mes - 1, dia);
    if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia || ano < 1900 || data > new Date()) {
      Alert.alert('Data inválida', 'Verifique a data de nascimento.');
      return;
    }

    setSalvandoPerfil(true);
    try {
      const { data: resultado, error } = await supabase.auth.updateUser({
        data: {
          nome: nomeLimpo,
          apelido: apelidoLimpo,
          data_nascimento: dataLimpa,
          nome_preferido: nomePreferidoPerfil.trim() || null,
        },
      });

      if (error) {
        Alert.alert('Não foi possível guardar', error.message);
        return;
      }

      if (resultado.user) {
        setSession((atual: any) => atual ? { ...atual, user: resultado.user } : atual);
      }
      Alert.alert('Dados actualizados', 'Os seus dados pessoais foram guardados com sucesso.');
    } catch (error: any) {
      Alert.alert('Erro ao guardar', error?.message || 'Ocorreu um erro inesperado.');
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function alterarPalavraPasse() {
    if (!novaPassword || !confirmarPassword) {
      Alert.alert('Dados em falta', 'Preencha e confirme a nova palavra-passe.');
      return;
    }
    if (novaPassword.length < 8 || !/[A-Za-zÀ-ÿ]/.test(novaPassword) || !/\d/.test(novaPassword) || !/[^A-Za-zÀ-ÿ0-9]/.test(novaPassword)) {
      Alert.alert('Palavra-passe fraca', 'Use pelo menos 8 caracteres, incluindo uma letra, um número e um carácter especial.');
      return;
    }
    if (novaPassword !== confirmarPassword) {
      Alert.alert('Palavras-passe diferentes', 'A confirmação não corresponde à nova palavra-passe.');
      return;
    }

    setAlterandoPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaPassword });
      if (error) {
        Alert.alert('Não foi possível alterar', error.message);
        return;
      }
      setNovaPassword('');
      setConfirmarPassword('');
      setMostrarNovaPassword(false);
      setMostrarConfirmarPassword(false);
      Alert.alert('Palavra-passe alterada', 'A sua palavra-passe foi actualizada com sucesso.');
    } catch (error: any) {
      Alert.alert('Erro de segurança', error?.message || 'Ocorreu um erro inesperado.');
    } finally {
      setAlterandoPassword(false);
    }
  }

  async function sair() {
    setLoading(true);

    const { error } =
      await supabase.auth.signOut();

    setLoading(false);

    if (error) {
      Alert.alert(
        'Não foi possível terminar sessão',
        error.message
      );

      return;
    }

    setSession(null);
    setPedidos([]);
    setComprasAnuncios([]);
    setMostrarComprasAnuncios(false);
    setMeusAnuncios([]);
    setMostrarMeusAnuncios(false);
    setMostrarPedidosDetalhe(false);
    setEtapaConta('escolha');
    setEmail('');
    setPassword('');
  }

  function dataPT(
    valor: string | null
  ) {
    if (!valor) {
      return '—';
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return valor;
    }

    return data.toLocaleDateString(
      'pt-PT',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    );
  }

  function preco(
    valor: number | string | null
  ) {
    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return '—';
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
      return String(valor);
    }

    return `${numero.toFixed(2).replace('.', ',')} €`;
  }

  async function responderPedido(
    pedido: PedidoOrcamento
  ) {
    const valor =
      valores[pedido.id]?.trim();

    if (!valor) {
      Alert.alert(
        'Atenção',
        'Informe o valor do orçamento.'
      );

      return;
    }

    const numero = Number(
      valor.replace(',', '.')
    );

    if (
      Number.isNaN(numero) ||
      numero < 0
    ) {
      Alert.alert(
        'Atenção',
        'Informe um valor válido.'
      );

      return;
    }

    setRespondendoId(pedido.id);

    const { error } =
      await supabase
        .from('pedidos_orcamento')
        .update({
          orcamento: numero,
          estado: 'respondido',
          atualizado_em:
            new Date().toISOString(),
        })
        .eq('id', pedido.id)
        .eq(
          'profissional_id',
          session?.user?.id
        );

    setRespondendoId(null);

    if (error) {
      Alert.alert(
        'Não foi possível responder',
        error.message
      );

      return;
    }

    setValores((atual) => ({
      ...atual,
      [pedido.id]: '',
    }));

    if (session?.user?.id) {
      await carregarPedidos(
        session.user.id
      );
    }

    Alert.alert(
      'Orçamento enviado',
      'A sua proposta foi enviada ao cliente.'
    );
  }

  async function recusarPedido(
    pedido: PedidoOrcamento
  ) {
    setRespondendoId(pedido.id);

    const { error } =
      await supabase
        .from('pedidos_orcamento')
        .update({
          estado: 'recusado',
          atualizado_em:
            new Date().toISOString(),
        })
        .eq('id', pedido.id)
        .eq(
          'profissional_id',
          session?.user?.id
        );

    setRespondendoId(null);

    if (error) {
      Alert.alert(
        'Não foi possível recusar',
        error.message
      );

      return;
    }

    if (session?.user?.id) {
      await carregarPedidos(
        session.user.id
      );
    }

    Alert.alert(
      'Pedido recusado',
      'O pedido foi marcado como recusado.'
    );
  }

  async function carregarAnuncios() {
    try {
      setCarregandoMaster(true);
      setErroMaster('');

      const { data, error } =
        await supabase
          .from('anuncios')
          .select(
            'id, user_id, titulo, descricao, tipo_anuncio, categoria, localidade, preco, preco_negociavel, contato, estado, criado_em, publicado_em, dados_especificos, alteracao_pendente, pedido_exclusao_pendente, pedido_exclusao_em'
          )
          .order('criado_em', {
            ascending: false,
          });

      if (error) {
        console.error(
          'Erro ao carregar painel MASTER:',
          error
        );

        setAnuncios([]);
        setErroMaster(error.message);
      } else {
        setAnuncios(
          (data || []) as Anuncio[]
        );
      }

      const {
        data: pesquisasData,
        error: pesquisasError,
      } = await supabase
        .from('pesquisas')
        .select(
          'id, termo, regiao, resultados, criado_em'
        )
        .order('criado_em', {
          ascending: false,
        });

      if (!pesquisasError) {
        setPesquisas(
          (pesquisasData || []) as Pesquisa[]
        );
      }
    } catch (error: any) {
      setAnuncios([]);

      setErroMaster(
        error?.message ||
          'Não foi possível carregar o painel.'
      );
    } finally {
      setCarregandoMaster(false);
    }
  }

  async function atualizarMaster() {
    setAtualizandoMaster(true);

    await carregarAnuncios();

    setAtualizandoMaster(false);
  }

  function alternarSelecaoEliminacao(id: string) {
    setAnunciosParaEliminar((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]
    );
  }

  const anunciosFiltradosParaEliminar = anuncios.filter((anuncio) => {
    const termo = pesquisaEliminacao.trim().toLowerCase();
    if (!termo) return true;
    return [anuncio.titulo, anuncio.tipo_anuncio, anuncio.categoria, anuncio.localidade, anuncio.estado, anuncio.id]
      .some((valor) => String(valor || '').toLowerCase().includes(termo));
  });

  function alternarTodosFiltrados() {
    const idsVisiveis = anunciosFiltradosParaEliminar.map((item) => item.id);
    const todosMarcados = idsVisiveis.length > 0 && idsVisiveis.every((id) => anunciosParaEliminar.includes(id));
    setAnunciosParaEliminar((atuais) => todosMarcados
      ? atuais.filter((id) => !idsVisiveis.includes(id))
      : [...new Set([...atuais, ...idsVisiveis])]
    );
  }

  function confirmarExclusaoMasterEmMassa() {
    if (!isMaster) {
      const mensagem = 'Esta operação é exclusiva da conta MASTER.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(mensagem);
      } else {
        Alert.alert('Sem permissão', mensagem);
      }
      return;
    }

    const ids = anunciosParaEliminar.filter((id) =>
      anuncios.some((item) => item.id === id)
    );

    if (!ids.length) {
      const mensagem = 'Selecione pelo menos um anúncio.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(mensagem);
      } else {
        Alert.alert('Nenhum anúncio selecionado', mensagem);
      }
      return;
    }

    const executarExclusao = async () => {
      setEliminandoEmMassa(true);
      try {
        const { data, error } = await supabase
          .from('anuncios')
          .delete()
          .in('id', ids)
          .select('id');

        if (error) throw error;

        const removidos = (data || []).map((item: any) => String(item.id));

        if (removidos.length !== ids.length) {
          await carregarAnuncios();
          throw new Error(
            `O Supabase confirmou ${removidos.length} de ${ids.length} eliminações. Verifique as permissões DELETE e as relações associadas.`
          );
        }

        setAnuncios((lista) => lista.filter((item) => !removidos.includes(item.id)));
        setAnunciosParaEliminar([]);
        setMostrarGestaoEliminacao(false);

        const sucesso = `${removidos.length} anúncio(s) foram eliminados definitivamente.`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(sucesso);
        } else {
          Alert.alert('Eliminação concluída', sucesso);
        }
      } catch (error: any) {
        const mensagem =
          error?.message ||
          'O Supabase recusou a eliminação. Nenhum sucesso será indicado sem confirmação da base de dados.';

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Não foi possível eliminar\n\n${mensagem}`);
        } else {
          Alert.alert('Não foi possível eliminar', mensagem);
        }
      } finally {
        setEliminandoEmMassa(false);
      }
    };

    const mensagem =
      `Vai tentar eliminar definitivamente ${ids.length} anúncio(s). Esta operação não pode ser anulada.`;

    // No React Native Web, Alert.alert não apresenta de forma fiável
    // os botões de confirmação. Usamos a confirmação nativa do navegador.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(mensagem)) {
        void executarExclusao();
      }
      return;
    }

    Alert.alert('Confirmar eliminação definitiva', mensagem, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: `Eliminar ${ids.length}`,
        style: 'destructive',
        onPress: () => {
          void executarExclusao();
        },
      },
    ]);
  }

  async function alterarEstado(
    anuncio: Anuncio,
    estado:
      | 'publicado'
      | 'rejeitado'
  ) {
    setProcessandoId(anuncio.id);

    const atualizacao: Record<
      string,
      any
    > = {
      estado,
    };

    if (estado === 'publicado') {
      atualizacao.publicado_em =
        new Date().toISOString();
    }

    const { error } =
      await supabase
        .from('anuncios')
        .update(atualizacao)
        .eq('id', anuncio.id)
        .eq('estado', 'em_analise');

    setProcessandoId(null);

    if (error) {
      Alert.alert(
        'Não foi possível concluir',
        error.message
      );

      return;
    }

    setAnuncios((lista) =>
      lista.map((item) =>
        item.id === anuncio.id
          ? {
              ...item,
              estado,
              publicado_em:
                estado === 'publicado'
                  ? new Date().toISOString()
                  : item.publicado_em,
            }
          : item
      )
    );

    Alert.alert(
      estado === 'publicado'
        ? 'Anúncio aprovado'
        : 'Anúncio reprovado',
      estado === 'publicado'
        ? 'O anúncio foi aprovado.'
        : 'O anúncio foi reprovado.'
    );
  }

  function confirmarEstado(
    anuncio: Anuncio,
    estado:
      | 'publicado'
      | 'rejeitado'
  ) {
    Alert.alert(
      estado === 'publicado'
        ? 'Aprovar anúncio'
        : 'Reprovar anúncio',
      `Tem certeza que deseja ${
        estado === 'publicado'
          ? 'aprovar'
          : 'reprovar'
      } "${anuncio.titulo || 'este anúncio'}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text:
            estado === 'publicado'
              ? 'Aprovar'
              : 'Reprovar',
          style:
            estado === 'rejeitado'
              ? 'destructive'
              : 'default',
          onPress: () =>
            alterarEstado(
              anuncio,
              estado
            ),
        },
      ]
    );
  }

  function dadosEvento(
    anuncio: Anuncio
  ) {
    if (
      anuncio.tipo_anuncio !==
        'Evento' ||
      !anuncio.dados_especificos
    ) {
      return null;
    }

    return anuncio.dados_especificos;
  }

  function dentroPeriodo(
    anuncio: Anuncio
  ) {
    if (periodo === 'tudo') {
      return true;
    }

    if (!anuncio.criado_em) {
      return false;
    }

    const data = new Date(
      anuncio.criado_em
    );

    if (Number.isNaN(data.getTime())) {
      return false;
    }

    const inicio = new Date();

    inicio.setHours(0, 0, 0, 0);

    if (periodo === '7dias') {
      inicio.setDate(
        inicio.getDate() - 6
      );
    }

    if (periodo === '30dias') {
      inicio.setDate(
        inicio.getDate() - 29
      );
    }

    return (
      data >= inicio &&
      data <= new Date()
    );
  }

  function pesquisaDentroPeriodo(
    pesquisa: Pesquisa
  ) {
    if (periodo === 'tudo') {
      return true;
    }

    if (!pesquisa.criado_em) {
      return false;
    }

    const data = new Date(
      pesquisa.criado_em
    );

    if (Number.isNaN(data.getTime())) {
      return false;
    }

    const inicio = new Date();

    inicio.setHours(0, 0, 0, 0);

    if (periodo === '7dias') {
      inicio.setDate(
        inicio.getDate() - 6
      );
    }

    if (periodo === '30dias') {
      inicio.setDate(
        inicio.getDate() - 29
      );
    }

    return (
      data >= inicio &&
      data <= new Date()
    );
  }

  function mapaContagem(
    lista: Anuncio[],
    campo:
      | 'categoria'
      | 'tipo_anuncio'
  ) {
    const mapa: Record<
      string,
      number
    > = {};

    lista.forEach((anuncio) => {
      const padrao =
        campo === 'categoria'
          ? 'Sem categoria'
          : 'Sem tipo';

      const valor =
        (
          (anuncio[campo] as
            | string
            | null) ||
          padrao
        ).trim() || padrao;

      mapa[valor] =
        (mapa[valor] || 0) + 1;
    });

    return Object.entries(mapa)
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 10);
  }

  function mapaPesquisa(
    lista: Pesquisa[],
    campo: 'termo' | 'regiao'
  ) {
    const mapa: Record<
      string,
      number
    > = {};

    lista.forEach((pesquisa) => {
      const valor =
        (
          pesquisa[campo] ||
          'Não informado'
        ).trim();

      mapa[valor] =
        (mapa[valor] || 0) + 1;
    });

    return Object.entries(mapa)
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 10);
  }

  function Stat({
    numero,
    texto,
  }: {
    numero: number;
    texto: string;
  }) {
    return (
      <View style={s.stat}>
        <Text style={s.statNumber}>
          {numero}
        </Text>

        <Text style={s.statLabel}>
          {texto}
        </Text>
      </View>
    );
  }

  function ListaEstatistica({
    titulo,
    itens,
    vazio,
  }: {
    titulo: string;
    itens: [string, number][];
    vazio?: string;
  }) {
    return (
      <View style={s.listBox}>
        <Text style={s.listTitle}>
          {titulo}
        </Text>

        {itens.length === 0 ? (
          <Text style={s.muted}>
            {vazio ||
              'Ainda não existem dados.'}
          </Text>
        ) : (
          itens.map(
            ([nome, quantidade]) => (
              <View
                key={nome}
                style={s.listRow}
              >
                <Text style={s.listName}>
                  {nome}
                </Text>

                <Text style={s.listValue}>
                  {quantidade}
                </Text>
              </View>
            )
          )
        )}
      </View>
    );
  }

  if (isMaster) {
    const pendentes =
      anuncios.filter(
        (anuncio) =>
          anuncio.estado ===
          'em_analise'
      );

    const pedidosModeracao = anuncios.filter((anuncio) => Boolean(anuncio.pedido_exclusao_pendente || anuncio.alteracao_pendente));

    const aprovados =
      anuncios.filter(
        (anuncio) =>
          anuncio.estado ===
          'publicado'
      );

    const rejeitados =
      anuncios.filter(
        (anuncio) =>
          anuncio.estado ===
          'rejeitado'
      );

    const eventosPendentes =
      pendentes.filter(
        (anuncio) =>
          anuncio.tipo_anuncio ===
          'Evento'
      );

    const estatisticas =
      anuncios.filter(dentroPeriodo);

    const pesquisasPeriodo =
      pesquisas.filter(
        pesquisaDentroPeriodo
      );

    const totalPesquisas =
      pesquisasPeriodo.length;

    const totalResultadosPesquisas =
      pesquisasPeriodo.reduce(
        (total, pesquisa) =>
          total +
          Number(
            pesquisa.resultados || 0
          ),
        0
      );

    const pesquisasPorTermo =
      mapaPesquisa(
        pesquisasPeriodo,
        'termo'
      );

    const pesquisasPorRegiao =
      mapaPesquisa(
        pesquisasPeriodo,
        'regiao'
      );

    const pesquisaMaisRepetida =
      pesquisasPorTermo.length > 0
        ? pesquisasPorTermo[0][0]
        : '—';

    const regioes = [
      'Guimarães',
      'Vizela',
      'Fafe',
    ].map((nome) => ({
      nome,
      quantidade:
        estatisticas.filter(
          (anuncio) =>
            (
              anuncio.localidade ||
              ''
            )
              .toLowerCase()
              .includes(
                nome.toLowerCase()
              )
        ).length,
    }));

    const categorias =
      mapaContagem(
        estatisticas,
        'categoria'
      );

    const tipos =
      mapaContagem(
        estatisticas,
        'tipo_anuncio'
      );

    if (carregandoMaster) {
      return (
        <View style={s.masterLoading}>
          <ActivityIndicator
            size="large"
            color="#1677B8"
          />

          <Text style={s.muted}>
            A carregar Painel de Controlo...
          </Text>
        </View>
      );
    }

    return (
      <View style={s.masterPage}>
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                atualizandoMaster
              }
              onRefresh={
                atualizarMaster
              }
            />
          }
          contentContainerStyle={
            s.masterContent
          }
        >
          <View
            style={s.masterHeader}
          >
            <View style={s.headerRow}>
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text style={s.badge}>
                  ADMINISTRADOR MASTER
                </Text>

                <Text
                  style={s.masterTitle}
                >
                  Painel de Controlo
                </Text>

                <Text style={s.muted}>
                  Gestão administrativa do
                  Conecta Guimarães.
                </Text>
              </View>

              <TouchableOpacity
                style={s.close}
                onPress={() =>
                  router.back()
                }
              >
                <Text
                  style={s.closeText}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.emailBox}>
              <Text style={s.small}>
                Conta MASTER
              </Text>

              <Text
                style={s.emailValue}
              >
                {session?.user?.email}
              </Text>
            </View>
          </View>

          <View style={s.warning}>
            <Text
              style={s.warningTitle}
            >
              🛡️ Área exclusiva
            </Text>

            <Text
              style={s.warningText}
            >
              Aqui são tratados os anúncios
              enviados pelos utilizadores,
              incluindo eventos. A aprovação
              coloca o conteúdo como publicado.
              A reprovação impede a publicação.
            </Text>
          </View>

          {erroMaster ? (
            <View style={s.errorBox}>
              <Text
                style={s.errorTitle}
              >
                Não foi possível carregar o painel
              </Text>

              <Text
                style={s.errorText}
              >
                {erroMaster}
              </Text>

              <TouchableOpacity
                style={s.retry}
                onPress={
                  atualizarMaster
                }
              >
                <Text
                  style={s.retryText}
                >
                  Tentar novamente
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={s.grid}>
            <Stat
              numero={pendentes.length}
              texto="⏳ Aguardam aprovação"
            />

            <Stat
              numero={aprovados.length}
              texto="✅ Aprovados"
            />

            <Stat
              numero={rejeitados.length}
              texto="❌ Rejeitados"
            />

            <Stat
              numero={
                eventosPendentes.length
              }
              texto="📅 Eventos pendentes"
            />
          </View>

          <View style={{ marginBottom: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE2E7', borderRadius: 18, padding: 16 }}>
            <Text style={s.sectionTitle}>🗑️ Gestão e eliminação de anúncios</Text>
            <Text style={[s.muted, { marginTop: 6, marginBottom: 14 }]}>
              Área exclusiva MASTER. Abra a janela para pesquisar anúncios, selecionar vários ou selecionar todos os resultados filtrados e executar uma única operação.
            </Text>
            <TouchableOpacity
              style={[s.reject, { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 15 }]}
              onPress={() => setMostrarGestaoEliminacao(true)}
            >
              <Text style={s.rejectText}>🗑️ Abrir gestor de eliminações ({anuncios.length} anúncios)</Text>
            </TouchableOpacity>
            <Text style={[s.small, { marginTop: 9 }]}>
              Selecionados: {anunciosParaEliminar.length}. A eliminação definitiva só será confirmada se o Supabase a concluir.
            </Text>
          </View>

          <Modal
            visible={mostrarGestaoEliminacao}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setMostrarGestaoEliminacao(false)}
          >
            <View style={{ flex: 1, backgroundColor: '#F7F8FA', paddingTop: Platform.OS === 'ios' ? 48 : 18 }}>
              <View style={{ paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#DDE2E7', backgroundColor: '#FFFFFF' }}>
                <Text style={[s.masterTitle, { fontSize: 24 }]}>Gestor de eliminações</Text>
                <Text style={[s.muted, { marginTop: 5 }]}>{anunciosParaEliminar.length} selecionado(s) de {anuncios.length}</Text>
                <TextInput
                  value={pesquisaEliminacao}
                  onChangeText={setPesquisaEliminacao}
                  placeholder="Pesquisar por título, categoria, estado ou ID…"
                  placeholderTextColor="#7B8794"
                  style={{ backgroundColor: '#F4F6F8', borderWidth: 1, borderColor: '#DDE2E7', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, marginTop: 12, color: '#1D2733' }}
                  autoCapitalize="none"
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={s.period} onPress={alternarTodosFiltrados}>
                    <Text style={s.periodText}>Selecionar todos os filtrados ({anunciosFiltradosParaEliminar.length})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.period} onPress={() => setAnunciosParaEliminar([])}>
                    <Text style={s.periodText}>Limpar seleção</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 22 }}>
                {anunciosFiltradosParaEliminar.length === 0 ? (
                  <Text style={[s.muted, { padding: 20 }]}>Não foram encontrados anúncios com essa pesquisa.</Text>
                ) : anunciosFiltradosParaEliminar.map((anuncio) => {
                  const marcado = anunciosParaEliminar.includes(anuncio.id);
                  return (
                    <TouchableOpacity
                      key={`selecionar-eliminar-${anuncio.id}`}
                      onPress={() => alternarSelecaoEliminacao(anuncio.id)}
                      activeOpacity={0.8}
                      style={[s.modCard, { marginBottom: 9, borderWidth: marcado ? 2 : 1, borderColor: marcado ? '#B4232F' : '#DDE2E7', flexDirection: 'row', alignItems: 'flex-start', gap: 11 }]}
                    >
                      <View style={{ width: 27, height: 27, borderRadius: 7, borderWidth: 2, borderColor: marcado ? '#B4232F' : '#9AA4AF', backgroundColor: marcado ? '#B4232F' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{marcado ? '✓' : ''}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.anuncioTitle}>{anuncio.titulo || 'Anúncio sem título'}</Text>
                        <Text style={s.muted}>{(anuncio.tipo_anuncio || 'Sem tipo') + ' · ' + (anuncio.categoria || 'Sem categoria')}</Text>
                        <Text style={[s.small, { marginTop: 4 }]}>Estado: {anuncio.estado || 'desconhecido'}</Text>
                        <Text style={[s.small, { marginTop: 2 }]} numberOfLines={1}>ID: {anuncio.id}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={{ padding: 14, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#DDE2E7', gap: 9 }}>
                <TouchableOpacity
                  style={[s.reject, { alignItems: 'center', paddingVertical: 14, opacity: anunciosParaEliminar.length === 0 || eliminandoEmMassa ? 0.45 : 1 }]}
                  disabled={anunciosParaEliminar.length === 0 || eliminandoEmMassa}
                  onPress={confirmarExclusaoMasterEmMassa}
                >
                  <Text style={s.rejectText}>{eliminandoEmMassa ? 'A eliminar…' : `🗑️ Eliminar definitivamente (${anunciosParaEliminar.length})`}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.sessionSecondary, { marginTop: 0 }]} onPress={() => setMostrarGestaoEliminacao(false)}>
                  <Text style={{ color: '#344054', fontWeight: '700' }}>Fechar gestor</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <View
            style={s.sectionHeader}
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={s.sectionTitle}
              >
                Aprovação e moderação
              </Text>

              <Text style={s.muted}>
                Serviços, produtos, lojas e
                eventos enviados pelos
                utilizadores.
              </Text>
            </View>

            <TouchableOpacity
              style={s.refresh}
              onPress={atualizarMaster}
              disabled={
                atualizandoMaster
              }
            >
              <Text
                style={s.refreshText}
              >
                {atualizandoMaster
                  ? '...'
                  : '↻'}
              </Text>
            </TouchableOpacity>
          </View>

          {pendentes.length === 0 ? (
            <View style={s.empty}>
              <Text
                style={s.emptyIcon}
              >
                ✅
              </Text>

              <Text
                style={s.emptyTitle}
              >
                Nenhum anúncio pendente
              </Text>

              <Text
                style={s.emptyText}
              >
                Quando um utilizador enviar um
                anúncio ou evento para análise,
                ele aparecerá aqui.
              </Text>
            </View>
          ) : (
            pendentes.map((anuncio) => {
              const evento =
                dadosEvento(anuncio);

              const processando =
                processandoId ===
                anuncio.id;

              return (
                <View
                  key={anuncio.id}
                  style={s.modCard}
                >
                  <View
                    style={s.headerRow}
                  >
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={s.status}
                      >
                        Pendente
                      </Text>

                      {anuncio.tipo_anuncio ? (
                        <Text
                          style={s.type}
                        >
                          {
                            anuncio.tipo_anuncio
                          }
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <Text
                    style={s.anuncioTitle}
                  >
                    {anuncio.titulo ||
                      'Sem título'}
                  </Text>

                  <Text style={s.meta}>
                    {anuncio.categoria ||
                      'Sem categoria'}

                    {anuncio.localidade
                      ? ` • ${anuncio.localidade}`
                      : ''}
                  </Text>

                  <Text style={s.date}>
                    Criado em{' '}
                    {dataPT(
                      anuncio.criado_em
                    )}
                  </Text>

                  <View style={s.line} />

                  {anuncio.descricao ? (
                    <>
                      <Text style={s.label}>
                        Descrição
                      </Text>

                      <Text
                        style={
                          s.valueNormal
                        }
                      >
                        {anuncio.descricao}
                      </Text>
                    </>
                  ) : null}

                  {anuncio.contato ? (
                    <>
                      <Text style={s.label}>
                        Contacto
                      </Text>

                      <Text
                        style={s.value}
                      >
                        {anuncio.contato}
                      </Text>
                    </>
                  ) : null}

                  {anuncio.preco !== null &&
                  anuncio.preco !== undefined &&
                  anuncio.preco !== '' ? (
                    <>
                      <Text style={s.label}>
                        Preço
                      </Text>

                      <Text
                        style={s.value}
                      >
                        {preco(
                          anuncio.preco
                        )}
                      </Text>
                    </>
                  ) : null}

                  {anuncio.preco_negociavel ? (
                    <Text
                      style={
                        s.negociavel
                      }
                    >
                      Preço negociável
                    </Text>
                  ) : null}

                  {evento ? (
                    <View
                      style={s.eventBox}
                    >
                      <Text
                        style={
                          s.eventTitle
                        }
                      >
                        📅 Dados do evento
                      </Text>

                      {evento.data_evento ? (
                        <EventRow
                          l="Data"
                          v={String(
                            evento.data_evento
                          )}
                        />
                      ) : null}

                      {evento.hora_evento ? (
                        <EventRow
                          l="Hora"
                          v={String(
                            evento.hora_evento
                          )}
                        />
                      ) : null}

                      {evento.organizador ? (
                        <EventRow
                          l="Organizador"
                          v={String(
                            evento.organizador
                          )}
                        />
                      ) : null}

                      {evento.visibilidade ? (
                        <EventRow
                          l="Visibilidade"
                          v={
                            evento.visibilidade ===
                            'privado'
                              ? 'Privado'
                              : 'Público'
                          }
                        />
                      ) : null}

                      <Text
                        style={
                          s.responsibility
                        }
                      >
                        ⚠️ O evento é de exclusiva
                        responsabilidade do seu
                        organizador/produtor.
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={s.actions}
                  >
                    <TouchableOpacity
                      style={[
                        s.approve,
                        processando &&
                          s.disabled,
                      ]}
                      disabled={
                        processando
                      }
                      onPress={() =>
                        alterarEstado(
                          anuncio,
                          'publicado'
                        )
                      }
                    >
                      {processando ? (
                        <ActivityIndicator
                          color="#FFFFFF"
                        />
                      ) : (
                        <Text
                          style={
                            s.approveText
                          }
                        >
                          ✓ Aprovar
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        s.reject,
                        processando &&
                          s.disabled,
                      ]}
                      disabled={
                        processando
                      }
                      onPress={() =>
                        alterarEstado(
                          anuncio,
                          'rejeitado'
                        )
                      }
                    >
                      <Text
                        style={
                          s.rejectText
                        }
                      >
                        ✕ Reprovar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View style={s.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>🛠️ Alterações e exclusões</Text>
              <Text style={s.muted}>Pedidos feitos pelos proprietários de anúncios já existentes.</Text>
            </View>
            <View style={s.pendingCount}><Text style={s.pendingCountText}>{pedidosModeracao.length}</Text></View>
          </View>
          {pedidosModeracao.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyIcon}>✅</Text><Text style={s.emptyTitle}>Nenhum pedido pendente</Text><Text style={s.emptyText}>As alterações e exclusões solicitadas pelos anunciantes aparecerão aqui.</Text></View>
          ) : pedidosModeracao.map((anuncio) => {
            const exclusao = Boolean(anuncio.pedido_exclusao_pendente);
            const proposta = anuncio.alteracao_pendente;
            const ocupado = processandoPedidoModeracao === anuncio.id;
            return (
              <View key={`moderacao-${anuncio.id}`} style={s.modCard}>
                <Text style={s.status}>{exclusao ? '🗑️ Pedido de exclusão' : '✏️ Pedido de alteração'}</Text>
                <Text style={s.anuncioTitle}>{anuncio.titulo || 'Anúncio sem título'}</Text>
                <Text style={s.meta}>{anuncio.tipo_anuncio || 'Anúncio'} · {anuncio.localidade || 'Localidade não indicada'}</Text>
                {exclusao ? (
                  <Text style={s.valueNormal}>O proprietário solicita a remoção deste anúncio. Se aprovar, o anúncio será retirado da publicação sem apagar os pedidos de orçamento associados.</Text>
                ) : proposta ? (
                  <View style={s.eventBox}>
                    <Text style={s.eventTitle}>Dados propostos</Text>
                    <Text style={s.label}>Título</Text><Text style={s.value}>{proposta.titulo || '—'}</Text>
                    <Text style={s.label}>Categoria</Text><Text style={s.value}>{proposta.categoria || '—'}</Text>
                    <Text style={s.label}>Localidade</Text><Text style={s.value}>{proposta.localidade || '—'}</Text>
                    <Text style={s.label}>Descrição</Text><Text style={s.valueNormal}>{proposta.descricao || '—'}</Text>
                    <Text style={s.label}>Preço</Text><Text style={s.value}>{proposta.preco === null || proposta.preco === undefined ? 'Sem preço' : preco(proposta.preco)}</Text>
                    <Text style={s.label}>Contacto</Text><Text style={s.value}>{proposta.contato || '—'}</Text>
                    {proposta.dados_especificos && Object.keys(proposta.dados_especificos).filter((key) => !['tipo', 'criado_em'].includes(key)).length ? (
                      <>
                        <Text style={s.label}>Dados específicos</Text>
                        {Object.entries(proposta.dados_especificos).filter(([key]) => !['tipo', 'criado_em'].includes(key)).map(([key, value]) => (
                          <Text key={key} style={s.value}>{key.replace(/_/g, ' ')}: {String(value ?? '—')}</Text>
                        ))}
                      </>
                    ) : null}
                  </View>
                ) : null}
                <View style={s.actions}>
                  <TouchableOpacity style={[s.approve, ocupado && s.disabled]} disabled={ocupado} onPress={() => Alert.alert(exclusao ? 'Aprovar exclusão' : 'Aprovar alteração', exclusao ? 'O anúncio será retirado da publicação e os pedidos de orçamento associados serão preservados. Continuar?' : 'Os dados propostos substituirão os dados atuais do anúncio. Continuar?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Aprovar', onPress: () => decidirPedidoModeracao(anuncio, 'aprovar') }])}>
                    {ocupado ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.approveText}>✓ Aprovar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.reject, ocupado && s.disabled]} disabled={ocupado} onPress={() => Alert.alert('Rejeitar pedido', 'O anúncio original será mantido. Deseja rejeitar este pedido?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Rejeitar', style: s.rejectText ? 'destructive' : 'default', onPress: () => decidirPedidoModeracao(anuncio, 'rejeitar') }])}>
                    <Text style={s.rejectText}>✕ Rejeitar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <View
            style={s.sectionHeader}
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={s.sectionTitle}
              >
                📊 Estatísticas
              </Text>

              <Text style={s.muted}>
                Visão geral dos dados reais já
                registados no Conecta.
              </Text>
            </View>
          </View>

          <View style={s.periodRow}>
            {(
              [
                ['hoje', 'Hoje'],
                ['7dias', '7 dias'],
                ['30dias', '30 dias'],
                ['tudo', 'Tudo'],
              ] as [
                Periodo,
                string
              ][]
            ).map(
              ([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    s.period,
                    periodo === key &&
                      s.periodActive,
                  ]}
                  onPress={() =>
                    setPeriodo(key)
                  }
                >
                  <Text
                    style={[
                      s.periodText,
                      periodo === key &&
                        s.periodTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          <View style={s.grid}>
            <Stat
              numero={estatisticas.length}
              texto="📋 Total de anúncios"
            />

            <Stat
              numero={
                estatisticas.filter(
                  (a) =>
                    a.estado ===
                    'publicado'
                ).length
              }
              texto="✅ Publicados"
            />

            <Stat
              numero={
                estatisticas.filter(
                  (a) =>
                    a.estado ===
                    'em_analise'
                ).length
              }
              texto="⏳ Em análise"
            />

            <Stat
              numero={
                estatisticas.filter(
                  (a) =>
                    a.estado ===
                    'rejeitado'
                ).length
              }
              texto="❌ Rejeitados"
            />

            <Stat
              numero={
                estatisticas.filter(
                  (a) =>
                    a.tipo_anuncio ===
                    'Evento'
                ).length
              }
              texto="📅 Eventos"
            />
          </View>

          <View
            style={s.searchStatsHeader}
          >
            <Text
              style={s.sectionTitle}
            >
              🔎 Estatísticas de procura
            </Text>
          </View>

          <View style={s.grid}>
            <Stat
              numero={totalPesquisas}
              texto="🔎 Pesquisas realizadas"
            />

            <Stat
              numero={
                totalResultadosPesquisas
              }
              texto="📋 Resultados encontrados"
            />

            <Stat
              numero={
                pesquisaMaisRepetida === '—'
                  ? 0
                  : 1
              }
              texto={`🏆 Pesquisa mais repetida: ${pesquisaMaisRepetida}`}
            />

            <Stat
              numero={
                pesquisasPorRegiao.length
              }
              texto="📍 Regiões com procura"
            />
          </View>

          <ListaEstatistica
            titulo="🔥 Termos mais pesquisados"
            itens={pesquisasPorTermo}
            vazio="Ainda não existem pesquisas registadas."
          />

          <ListaEstatistica
            titulo="📍 Procura por região"
            itens={pesquisasPorRegiao}
            vazio="Ainda não existem pesquisas por região."
          />

          <ListaEstatistica
            titulo="🌍 Por região"
            itens={regioes.map(
              (regiao) => [
                regiao.nome,
                regiao.quantidade,
              ]
            )}
          />

          <ListaEstatistica
            titulo="📂 Por categoria"
            itens={categorias}
            vazio="Ainda não existem dados para este período."
          />

          <ListaEstatistica
            titulo="🏷️ Por tipo"
            itens={tipos}
            vazio="Ainda não existem dados para este período."
          />

          <View style={s.note}>
            <Text style={s.noteText}>
              ℹ️ Os dados apresentados são
              baseados nos registos reais
              existentes no Supabase.
            </Text>
          </View>

          <View style={s.footer}>
            <Text
              style={s.footerTitle}
            >
              Painel MASTER
            </Text>

            <Text style={s.noteText}>
              As decisões tomadas aqui alteram o
              estado real dos anúncios no Supabase.
            </Text>
          </View>

          <TouchableOpacity
            style={s.sessionSecondary}
            onPress={sair}
            disabled={loading}
          >
            <Text
              style={s.secondaryText}
            >
              {loading
                ? 'Aguarde...'
                : 'Terminar sessão'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.back}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={s.backText}
            >
              Voltar
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (session) {
    const nomeExibicao =
      nomePreferidoPerfil.trim() ||
      [nomePerfil.trim(), apelidoPerfil.trim()].filter(Boolean).join(' ') ||
      session.user.email?.split('@')[0] ||
      'Utilizador';

    const tipoResumo =
      tipoConta === 'profissional'
        ? 'Profissional'
        : tipoConta === 'empresa'
          ? 'Empresa'
          : 'Utilizador';

    // Indicador de pedidos de orçamento que ainda aguardam resposta.
    // Não altera os dados nem o fluxo de envio de pedidos.
    const pedidosPendentes = pedidos.filter(
      (pedido) => pedido.estado === 'pendente' && !pedidosLidos.includes(pedido.id)
    ).length;

    return (
      <ScrollView
        ref={scrollContaRef}
        style={s.page}
        contentContainerStyle={s.dashboardContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.dashboardHeader}>
          <View style={s.dashboardHeaderText}>
            <Text style={s.dashboardTitle}>A minha conta</Text>
            <Text style={s.dashboardSubtitle}>Gerir a sua conta CONECTA MINHO.</Text>
          </View>
        </View>

        <View style={s.welcomeCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>👤</Text>
          </View>
          <View style={s.welcomeTextColumn}>
            <Text style={s.welcomeTitle} numberOfLines={2}>Olá, {nomeExibicao}!</Text>
            <Text style={s.welcomeSubtitle}>A sua conta CONECTA MINHO</Text>
            <View style={s.confirmedPill}>
              <Text style={s.confirmedPillText}>✓ Conta autenticada</Text>
            </View>
            <Text style={s.welcomeAccountType}>{tipoResumo} · Plano {planoConta}</Text>
            <TouchableOpacity
              style={s.welcomeEditButton}
              onPress={() => {
                setSecaoPerfilAberta(true);
                setSecaoSegurancaAberta(false);
                setSecaoDefinicoesAberta(false);
              }}
              accessibilityRole="button"
            >
              <Text style={s.welcomeEditButtonText}>✎  Editar perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.dashboardSectionHeader}>
          <View style={s.dashboardSectionHeaderText}>
            <Text style={s.dashboardSectionTitle}>A minha atividade</Text>
            <Text style={s.dashboardSectionSubtitle}>Acompanhe a atividade da sua conta.</Text>
          </View>
          <TouchableOpacity
            style={s.refresh}
            onPress={() => session.user.id && carregarPedidos(session.user.id)}
            disabled={carregandoPedidos}
            accessibilityRole="button"
            accessibilityLabel="Atualizar pedidos de orçamento"
          >
            {carregandoPedidos ? <ActivityIndicator color="#0878D1" /> : <Text style={s.refreshText}>↻</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.activityGrid}>
          <TouchableOpacity style={s.activityTile} onPress={() => {
            const abrir = !mostrarMeusAnuncios;
            setMostrarMeusAnuncios(abrir);
            setMostrarPedidosDetalhe(false);
            if (abrir && session?.user?.id) carregarMeusAnuncios(session.user.id);
          }} activeOpacity={0.82} accessibilityRole="button" accessibilityState={{ expanded: mostrarMeusAnuncios }}>
            <View style={s.activityIconBlue}><Text style={s.activityIconText}>📣</Text></View>
            <View style={s.activityTileText}>
              <Text style={s.activityTileTitle}>Os meus anúncios</Text>
              <Text style={s.activityTileSubtitle}>Ver e gerir as minhas publicações</Text>
            </View>
            <Text style={s.activityArrow}>{mostrarMeusAnuncios ? '⌄' : '›'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.activityTile} onPress={() => {
            setMostrarPedidosDetalhe(true);
            setMostrarMeusAnuncios(false);
            setIrParaPedidos(true);
            const idsPorLer = pedidos
              .filter((pedido) => pedido.estado === 'pendente' && !pedidosLidos.includes(pedido.id))
              .map((pedido) => pedido.id);
            if (idsPorLer.length > 0) {
              void marcarPedidosComoLidos(idsPorLer);
            }
            if (session?.user?.id) carregarPedidos(session.user.id);
          }} activeOpacity={0.82} accessibilityRole="button" accessibilityState={{ expanded: mostrarPedidosDetalhe }}>
            <View style={s.activityIconPurple}><Text style={s.activityIconText}>🔔</Text></View>
            <View style={s.activityTileText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={s.activityTileTitle}>Notificações</Text>
                {pedidosPendentes > 0 ? (
                  <View
                    style={{
                      minWidth: 20,
                      height: 20,
                      paddingHorizontal: 6,
                      borderRadius: 10,
                      backgroundColor: '#D92D36',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 7,
                    }}
                    accessibilityLabel={`${pedidosPendentes} pedido${pedidosPendentes === 1 ? '' : 's'} de orçamento pendente${pedidosPendentes === 1 ? '' : 's'}`}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>
                      {pedidosPendentes > 99 ? '99+' : pedidosPendentes}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.activityTileSubtitle}>Pedidos de orçamento recebidos</Text>
            </View>
            <Text style={s.activityArrow}>{mostrarPedidosDetalhe ? '⌄' : '›'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.activityTile} onPress={() => {
            const abrir = !mostrarComprasAnuncios;
            setMostrarComprasAnuncios(abrir);
            setMostrarMeusAnuncios(false);
            setMostrarPedidosDetalhe(false);
            if (abrir && session?.user?.id) carregarComprasAnuncios(session.user.id);
          }} activeOpacity={0.82} accessibilityRole="button" accessibilityState={{ expanded: mostrarComprasAnuncios }}>
            <View style={s.activityIconGreen}><Text style={s.activityIconText}>🛍️</Text></View>
            <View style={s.activityTileText}>
              <Text style={s.activityTileTitle}>Compras e vendas</Text>
              <Text style={s.activityTileSubtitle}>Confirmar compras e avaliar vendedores</Text>
            </View>
            <Text style={s.activityArrow}>{mostrarComprasAnuncios ? '⌄' : '›'}</Text>
          </TouchableOpacity>
        </View>

        {mostrarMeusAnuncios ? (
          <View>
            <View style={s.dashboardSectionHeader}>
              <View style={s.dashboardSectionHeaderText}>
                <Text style={s.dashboardSectionTitle}>Os meus anúncios</Text>
                <Text style={s.dashboardSectionSubtitle}>São apresentados apenas os anúncios associados à sua conta.</Text>
              </View>
              <TouchableOpacity style={s.refresh} onPress={() => session?.user?.id && carregarMeusAnuncios(session.user.id)} disabled={carregandoMeusAnuncios}>
                {carregandoMeusAnuncios ? <ActivityIndicator color="#0878D1" /> : <Text style={s.refreshText}>↻</Text>}
              </TouchableOpacity>
            </View>
            {carregandoMeusAnuncios ? (
              <View style={s.loadingBox}><ActivityIndicator color="#0878D1" /><Text style={s.muted}>A carregar os seus anúncios...</Text></View>
            ) : meusAnuncios.length === 0 ? (
              <View style={s.emptyDashboard}><Text style={s.emptyIcon}>📭</Text><Text style={s.emptyTitle}>Ainda não tem anúncios</Text><Text style={s.emptyText}>Quando publicar um anúncio com esta conta, ele aparecerá aqui.</Text></View>
            ) : meusAnuncios.map((anuncio) => (
              <View key={anuncio.id} style={s.pedido}>
                <Text style={s.pedidoTitle}>{anuncio.titulo || 'Anúncio sem título'}</Text>
                <Text style={s.date}>{anuncio.categoria || anuncio.tipo_anuncio || 'Anúncio'}{anuncio.localidade ? ` · ${anuncio.localidade}` : ''}</Text>
                {anuncio.descricao ? <Text style={s.valueNormal}>{anuncio.descricao}</Text> : null}
                <Text style={s.label}>Estado</Text><Text style={s.value}>{anuncio.estado || 'Por definir'}</Text>
                {anuncio.preco !== null && anuncio.preco !== undefined && anuncio.preco !== '' ? <Text style={s.value}>{preco(anuncio.preco)}</Text> : null}
                {anuncio.pedido_exclusao_pendente ? <View style={s.pendingNotice}><Text style={s.pendingNoticeText}>⏳ Pedido de exclusão à espera da aprovação do MASTER. O anúncio permanece publicado até à decisão.</Text></View> : null}
                {anuncio.alteracao_pendente ? <View style={s.pendingNotice}><Text style={s.pendingNoticeText}>⏳ Alteração à espera da aprovação do MASTER</Text></View> : null}
                <View style={s.actions}>
                  <TouchableOpacity style={[s.approve, (Boolean(anuncio.alteracao_pendente) || Boolean(anuncio.pedido_exclusao_pendente) || processandoPedidoModeracao === anuncio.id) && s.disabled]} disabled={Boolean(anuncio.alteracao_pendente) || Boolean(anuncio.pedido_exclusao_pendente) || processandoPedidoModeracao === anuncio.id} onPress={() => abrirEdicaoAnuncio(anuncio)}>
                    <Text style={s.approveText}>✎ Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.reject, processandoPedidoModeracao === anuncio.id && s.disabled]} disabled={processandoPedidoModeracao === anuncio.id} onPress={() => confirmarPedidoExclusao(anuncio)}>
                    <Text style={s.rejectText}>🗑️ Excluir anúncio</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {mostrarComprasAnuncios ? (
          <View>
            <View style={s.dashboardSectionHeader}>
              <View style={s.dashboardSectionHeaderText}>
                <Text style={s.dashboardSectionTitle}>Compras e vendas</Text>
                <Text style={s.dashboardSectionSubtitle}>Os pedidos de compra dos seus anúncios e as compras que pode avaliar.</Text>
              </View>
              <TouchableOpacity style={s.refresh} onPress={() => session?.user?.id && carregarComprasAnuncios(session.user.id)} disabled={carregandoComprasAnuncios}>
                {carregandoComprasAnuncios ? <ActivityIndicator color="#0878D1" /> : <Text style={s.refreshText}>↻</Text>}
              </TouchableOpacity>
            </View>
            {carregandoComprasAnuncios ? (
              <View style={s.loadingBox}><ActivityIndicator color="#0878D1" /><Text style={s.muted}>A carregar compras e vendas...</Text></View>
            ) : comprasAnuncios.length === 0 ? (
              <View style={s.emptyDashboard}><Text style={s.emptyIcon}>🛍️</Text><Text style={s.emptyTitle}>Ainda não existem pedidos</Text><Text style={s.emptyText}>Quando alguém pedir para confirmar a compra de um dos seus anúncios, ou quando tiver uma compra confirmada, ela aparecerá aqui.</Text></View>
            ) : comprasAnuncios.map((compra) => {
              const souVendedor = compra.vendedor_id === session?.user?.id;
              const souComprador = compra.comprador_id === session?.user?.id;
              const processando = processandoCompraId === compra.id;
              return (
                <View key={compra.id} style={s.pedido}>
                  <Text style={s.pedidoTitle}>{compra.titulo_anuncio || 'Anúncio'}</Text>
                  <Text style={s.date}>Pedido feito em {dataPT(compra.solicitado_em)}</Text>
                  <View style={s.purchaseStatus}>
                    <Text style={s.purchaseStatusText}>
                      {compra.estado === 'pendente' ? '⏳ A aguardar resposta do vendedor' : compra.estado === 'confirmada' ? '✓ Compra confirmada' : 'Pedido de compra recusado'}
                    </Text>
                  </View>
                  {souVendedor && compra.estado === 'pendente' ? (
                    <View style={s.actions}>
                      <TouchableOpacity style={[s.approve, processando && s.disabled]} disabled={processando} onPress={() => Alert.alert('Confirmar compra', 'Confirma que este utilizador comprou o artigo anunciado?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Confirmar compra', onPress: () => responderCompraAnuncio(compra, true) },
                      ])}>
                        {processando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.approveText}>✓ Confirmar compra</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.reject, processando && s.disabled]} disabled={processando} onPress={() => Alert.alert('Recusar pedido', 'Tem a certeza de que pretende recusar este pedido de compra?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Recusar', style: 'destructive', onPress: () => responderCompraAnuncio(compra, false) },
                      ])}>
                        <Text style={s.rejectText}>Recusar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {souComprador && compra.estado === 'confirmada' ? (
                    compra.avaliacao ? (
                      <View style={s.okBox}>
                        <Text style={s.okTitle}>A sua avaliação</Text>
                        <Text style={s.ratingStars}>{'★'.repeat(compra.avaliacao.nota)}{'☆'.repeat(5 - compra.avaliacao.nota)}</Text>
                        {compra.avaliacao.comentario ? <Text style={s.valueNormal}>{compra.avaliacao.comentario}</Text> : null}
                      </View>
                    ) : (
                      <View style={s.resposta}>
                        <Text style={s.label}>Avalie o vendedor</Text>
                        <Text style={s.muted}>Só pode avaliar depois de o vendedor confirmar a compra.</Text>
                        <View style={s.ratingRow}>
                          {[1, 2, 3, 4, 5].map((estrela) => (
                            <TouchableOpacity key={estrela} onPress={() => setNotasCompra((atual) => ({ ...atual, [compra.id]: estrela }))} accessibilityRole="button" accessibilityLabel={`${estrela} estrelas`}>
                              <Text style={s.ratingStarButton}>{estrela <= (notasCompra[compra.id] || 0) ? '★' : '☆'}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={[s.input, s.ratingCommentInput]}
                          value={comentariosCompra[compra.id] || ''}
                          onChangeText={(texto) => setComentariosCompra((atual) => ({ ...atual, [compra.id]: texto }))}
                          placeholder="Conte como foi a sua experiência (opcional)"
                          placeholderTextColor="#8A9AAF"
                          multiline
                          maxLength={2000}
                          textAlignVertical="top"
                          editable={!processando}
                        />
                        <TouchableOpacity style={[s.button, processando && s.disabled]} disabled={processando} onPress={() => enviarAvaliacaoAnunciante(compra)}>
                          {processando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.buttonText}>Enviar avaliação</Text>}
                        </TouchableOpacity>
                      </View>
                    )
                  ) : null}
                  {souComprador && compra.estado === 'pendente' ? <Text style={s.muted}>A avaliação ficará disponível depois de o vendedor confirmar a compra.</Text> : null}
                  {souComprador && compra.estado === 'recusada' ? <Text style={s.muted}>Este pedido não pode ser avaliado porque a compra não foi confirmada.</Text> : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={s.dashboardSectionHeader}>
          <View style={s.dashboardSectionHeaderText}>
            <Text style={s.dashboardSectionTitle}>Conta e preferências</Text>
            <Text style={s.dashboardSectionSubtitle}>Dados pessoais, segurança e configuração.</Text>
          </View>
        </View>

        <View style={s.preferencesList}>
          <TouchableOpacity
            style={s.preferenceRow}
            onPress={() => setSecaoPerfilAberta((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: secaoPerfilAberta }}
          >
            <View style={s.preferenceIconBlue}><Text style={s.preferenceIconText}>👤</Text></View>
            <View style={s.preferenceTextColumn}>
              <Text style={s.preferenceTitle}>Dados pessoais</Text>
              <Text style={s.preferenceSubtitle}>Nome, apelido, nascimento e nome preferido</Text>
            </View>
            <Text style={s.preferenceArrow}>{secaoPerfilAberta ? '⌄' : '›'}</Text>
          </TouchableOpacity>

          {secaoPerfilAberta ? (
            <View style={s.preferenceExpanded}>
              <Text style={s.formLabel}>Nome próprio</Text>
              <TextInput style={s.input} value={nomePerfil} onChangeText={setNomePerfil} placeholder="O seu nome" placeholderTextColor="#8A9AAF" autoCapitalize="words" editable={!salvandoPerfil} />
              <Text style={s.formLabel}>Apelido</Text>
              <TextInput style={s.input} value={apelidoPerfil} onChangeText={setApelidoPerfil} placeholder="O seu apelido" placeholderTextColor="#8A9AAF" autoCapitalize="words" editable={!salvandoPerfil} />
              <Text style={s.formLabel}>Data de nascimento (DD/MM/AAAA)</Text>
              <TextInput style={s.input} value={dataNascimentoPerfil} onChangeText={setDataNascimentoPerfil} placeholder="DD/MM/AAAA" placeholderTextColor="#8A9AAF" keyboardType="numbers-and-punctuation" maxLength={10} editable={!salvandoPerfil} />
              <Text style={s.formLabel}>Nome preferido (opcional)</Text>
              <TextInput style={s.input} value={nomePreferidoPerfil} onChangeText={setNomePreferidoPerfil} placeholder="Como prefere ser tratado" placeholderTextColor="#8A9AAF" autoCapitalize="words" editable={!salvandoPerfil} />
              <TouchableOpacity style={[s.button, salvandoPerfil && s.buttonDisabled]} onPress={guardarDadosPessoais} disabled={salvandoPerfil}>
                {salvandoPerfil ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.buttonText}>Guardar dados pessoais</Text>}
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={s.preferenceRow}
            onPress={() => setSecaoSegurancaAberta((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: secaoSegurancaAberta }}
          >
            <View style={s.preferenceIconGreen}><Text style={s.preferenceIconText}>🛡️</Text></View>
            <View style={s.preferenceTextColumn}>
              <Text style={s.preferenceTitle}>Segurança da conta</Text>
              <Text style={s.preferenceSubtitle}>Alterar palavra-passe e proteger o acesso</Text>
            </View>
            <Text style={s.preferenceArrow}>{secaoSegurancaAberta ? '⌄' : '›'}</Text>
          </TouchableOpacity>

          {secaoSegurancaAberta ? (
            <View style={s.preferenceExpanded}>
              <Text style={s.securityNotice}>Nunca mostramos a palavra-passe atual. Introduza uma nova palavra-passe para a alterar.</Text>
              <Text style={s.formLabel}>Nova palavra-passe</Text>
              <View style={s.profilePasswordRow}>
                <TextInput style={s.passwordField} value={novaPassword} onChangeText={setNovaPassword} placeholder="Nova palavra-passe" placeholderTextColor="#8A9AAF" secureTextEntry={!mostrarNovaPassword} autoCapitalize="none" autoCorrect={false} editable={!alterandoPassword} />
                <TouchableOpacity onPress={() => setMostrarNovaPassword((v) => !v)} accessibilityRole="button"><Text style={s.profilePasswordToggle}>{mostrarNovaPassword ? 'Ocultar' : 'Mostrar'}</Text></TouchableOpacity>
              </View>
              <Text style={s.profilePasswordHint}>Mínimo de 8 caracteres, com uma letra, um número e um carácter especial.</Text>
              <Text style={s.formLabel}>Confirmar nova palavra-passe</Text>
              <View style={s.profilePasswordRow}>
                <TextInput style={s.passwordField} value={confirmarPassword} onChangeText={setConfirmarPassword} placeholder="Repita a nova palavra-passe" placeholderTextColor="#8A9AAF" secureTextEntry={!mostrarConfirmarPassword} autoCapitalize="none" autoCorrect={false} editable={!alterandoPassword} />
                <TouchableOpacity onPress={() => setMostrarConfirmarPassword((v) => !v)} accessibilityRole="button"><Text style={s.profilePasswordToggle}>{mostrarConfirmarPassword ? 'Ocultar' : 'Mostrar'}</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={[s.button, alterandoPassword && s.buttonDisabled]} onPress={alterarPalavraPasse} disabled={alterandoPassword}>
                {alterandoPassword ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.buttonText}>Alterar palavra-passe</Text>}
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={s.preferenceRow}
            onPress={() => setSecaoDefinicoesAberta((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: secaoDefinicoesAberta }}
          >
            <View style={s.preferenceIconPurple}><Text style={s.preferenceIconText}>☷</Text></View>
            <View style={s.preferenceTextColumn}>
              <Text style={s.preferenceTitle}>Definições da conta</Text>
              <Text style={s.preferenceSubtitle}>Tipo de conta, plano e preferências</Text>
            </View>
            <Text style={s.preferenceArrow}>{secaoDefinicoesAberta ? '⌄' : '›'}</Text>
          </TouchableOpacity>

          {secaoDefinicoesAberta ? (
            <View style={s.preferenceExpanded}>
              <Text style={s.accountTypeTitle}>Perfil no Conecta</Text>
              <Text style={s.accountTypeSubtitle}>A sua conta está configurada como:</Text>
              <View style={s.sessionSelectedProfileBox}>
                <Text style={s.selectedProfileTitle}>{modoAdministrador ? 'Acesso de administrador' : nomeTipoConta(tipoConta)}</Text>
                <Text style={s.selectedProfileDescription}>{modoAdministrador ? 'Área reservada à conta MASTER autorizada.' : descricaoTipoConta(tipoConta)}</Text>
                <Text style={s.preferencePlan}>Plano associado: {planoConta}</Text>
              </View>
              <TouchableOpacity
                style={s.changeProfileButton}
                onPress={() => Alert.alert('Alterar perfil', 'Escolha como pretende utilizar o Conecta.', [
                  { text: 'Quero utilizar o Conecta', onPress: () => salvarTipoConta('utilizador') },
                  { text: 'Sou profissional', onPress: () => salvarTipoConta('profissional') },
                  { text: 'Sou uma empresa', onPress: () => salvarTipoConta('empresa') },
                  { text: 'Cancelar', style: 'cancel' },
                ])}
                disabled={salvandoTipoConta}
              >
                <Text style={s.changeProfileText}>{salvandoTipoConta ? 'A guardar...' : 'Alterar perfil'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={s.preferenceRowLast} onPress={sair} disabled={loading} accessibilityRole="button">
            <View style={s.preferenceIconRed}><Text style={s.preferenceIconText}>↪</Text></View>
            <View style={s.preferenceTextColumn}>
              <Text style={s.preferenceTitle}>Terminar sessão</Text>
              <Text style={s.preferenceSubtitle}>{loading ? 'A terminar sessão...' : 'Sair da sua conta com segurança'}</Text>
            </View>
            {loading ? <ActivityIndicator color="#D92D36" /> : <Text style={s.preferenceArrow}>›</Text>}
          </TouchableOpacity>
        </View>

        {mostrarPedidosDetalhe ? (
          <View onLayout={(event) => {
            if (irParaPedidos) {
              scrollContaRef.current?.scrollTo({
                y: Math.max(0, event.nativeEvent.layout.y - 12),
                animated: true,
              });
              setIrParaPedidos(false);
            }
          }}>
        <View style={s.dashboardSectionHeader}>
          <View style={s.dashboardSectionHeaderText}>
            <Text style={s.dashboardSectionTitle}>Pedidos de orçamento</Text>
            <Text style={s.dashboardSectionSubtitle}>Pedidos recebidos através dos seus anúncios profissionais.</Text>
          </View>
        </View>

        {carregandoPedidos ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color="#0878D1" />
            <Text style={s.muted}>A carregar pedidos...</Text>
          </View>
        ) : pedidos.length === 0 ? (
          <View style={s.emptyDashboard}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={s.emptyTitle}>Nenhum pedido recebido</Text>
            <Text style={s.emptyText}>Quando alguém pedir um orçamento através de um dos seus anúncios profissionais, o pedido aparecerá aqui.</Text>
          </View>
        ) : (
          <View>
            {pedidos.map((pedido) => {
              const respondendo = respondendoId === pedido.id;
              return (
                <View key={pedido.id} style={s.pedido}>
                  <Text style={s.pedidoTitle}>{pedido.servico || 'Pedido de orçamento'}</Text>
                  <Text style={s.date}>Recebido em {dataPT(pedido.criado_em)}</Text>
                  {pedido.nome_solicitante ? <><Text style={s.label}>Cliente</Text><Text style={s.value}>{pedido.nome_solicitante}</Text></> : null}
                  {pedido.contacto_solicitante ? <><Text style={s.label}>Contacto</Text><Text style={s.value}>{pedido.contacto_solicitante}</Text></> : null}
                  {pedido.descricao ? <><Text style={s.label}>Descrição</Text><Text style={s.valueNormal}>{pedido.descricao}</Text></> : null}
                  {pedido.localidade ? <><Text style={s.label}>Localidade</Text><Text style={s.value}>{pedido.localidade}</Text></> : null}
                  {pedido.data_pretendida ? <><Text style={s.label}>Data pretendida</Text><Text style={s.value}>{pedido.data_pretendida}</Text></> : null}
                  {pedido.observacoes ? <><Text style={s.label}>Observações</Text><Text style={s.valueNormal}>{pedido.observacoes}</Text></> : null}
                  {pedido.estado === 'pendente' ? (
                    <View style={s.resposta}>
                      <Text style={s.label}>O seu orçamento</Text>
                      <TextInput value={valores[pedido.id] || ''} onChangeText={(texto) => setValores((atual) => ({ ...atual, [pedido.id]: texto }))} keyboardType="decimal-pad" placeholder="Ex.: 50" placeholderTextColor="#8A949E" style={s.input} editable={!respondendo} />
                      <TouchableOpacity style={[s.button, respondendo && s.disabled]} onPress={() => responderPedido(pedido)} disabled={respondendo}>
                        {respondendo ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.buttonText}>Enviar orçamento</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={s.recusar} disabled={respondendo} onPress={() => Alert.alert('Recusar pedido', 'Tem a certeza de que pretende recusar este pedido de orçamento?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Recusar', style: 'destructive', onPress: () => recusarPedido(pedido) },
                      ])}>
                        <Text style={s.recusarText}>Recusar pedido</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {pedido.estado === 'respondido' ? <View style={s.okBox}><Text style={s.okTitle}>Orçamento enviado</Text><Text style={s.value}>{preco(pedido.orcamento)}</Text><Text style={s.muted}>A sua proposta foi enviada ao cliente.</Text></View> : null}
                  {pedido.estado === 'recusado' ? <View style={s.badBox}><Text style={s.badTitle}>Pedido recusado</Text><Text style={s.muted}>Este pedido foi recusado.</Text></View> : null}
                </View>
              );
            })}
          </View>
        )}
          </View>
        ) : null}

        <Modal visible={Boolean(anuncioEmEdicao)} transparent animationType="slide" onRequestClose={() => !guardandoAlteracao && setAnuncioEmEdicao(null)}>
          <KeyboardAvoidingView style={s.editModalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.editModalCard}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={s.editModalTitle}>Editar anúncio</Text>
                <Text style={s.editModalSubtitle}>As alterações só serão publicadas depois da aprovação do MASTER.</Text>
                {([
                  ['titulo', 'Nome / título'],
                  ['categoria', 'Categoria'],
                  ['localidade', 'Localidade'],
                  ['descricao', 'Descrição'],
                  ['preco', 'Preço (€)'],
                  ['contato', 'Contacto'],
                ] as [string, string][]).map(([key, label]) => (
                  <View key={key}>
                    <Text style={s.formLabel}>{label}</Text>
                    <TextInput style={[s.input, key === 'descricao' && s.editDescription]} value={camposEdicao[key] || ''} onChangeText={(value) => setCamposEdicao((current) => ({ ...current, [key]: value }))} placeholder={label} placeholderTextColor="#8A9AAF" multiline={key === 'descricao'} textAlignVertical={key === 'descricao' ? 'top' : 'center'} keyboardType={key === 'preco' ? 'decimal-pad' : 'default'} editable={!guardandoAlteracao} />
                  </View>
                ))}
                <TouchableOpacity style={s.editCheckboxRow} onPress={() => setCamposEdicao((current) => ({ ...current, preco_negociavel: current.preco_negociavel === 'true' ? 'false' : 'true' }))} disabled={guardandoAlteracao}>
                  <Text style={s.editCheckbox}>{camposEdicao.preco_negociavel === 'true' ? '☑' : '☐'}</Text><Text style={s.value}>Preço negociável</Text>
                </TouchableOpacity>
                {Object.keys(dadosEspecificosEdicao).length > 0 ? (
                  <View style={s.specificEditBox}>
                    <Text style={s.editSectionTitle}>Dados específicos</Text>
                    {Object.entries(dadosEspecificosEdicao).map(([key, value]) => (
                      <View key={key}>
                        <Text style={s.formLabel}>{key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}</Text>
                        <TextInput style={s.input} value={String(value ?? '')} onChangeText={(text) => setDadosEspecificosEdicao((current) => ({ ...current, [key]: text }))} placeholder={key.replace(/_/g, ' ')} placeholderTextColor="#8A9AAF" editable={!guardandoAlteracao} />
                      </View>
                    ))}
                  </View>
                ) : null}
                <View style={s.actions}>
                  <TouchableOpacity style={[s.approve, guardandoAlteracao && s.disabled]} onPress={solicitarAlteracaoAnuncio} disabled={guardandoAlteracao}>
                    {guardandoAlteracao ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.approveText}>Enviar para aprovação</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.reject, guardandoAlteracao && s.disabled]} onPress={() => setAnuncioEmEdicao(null)} disabled={guardandoAlteracao}><Text style={s.rejectText}>Cancelar</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <View style={s.dashboardThanks}>
          <Text style={s.dashboardThanksIcon}>♥</Text>
          <View style={s.dashboardThanksText}>
            <Text style={s.dashboardThanksTitle}>Obrigado por fazer parte do CONECTA MINHO!</Text>
            <Text style={s.dashboardThanksSubtitle}>Juntos fazemos uma região mais próxima, forte e conectada.</Text>
          </View>
        </View>

      </ScrollView>
    );
  }

  if (etapaConta === 'escolha') {
    return (
      <ScrollView
        style={s.page}
        contentContainerStyle={
          s.choiceContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={s.choiceScreen}>

          <Image
            source={require('../../assets/images/logo-conecta-minho.png')}
            style={s.choiceLogoImage}
            resizeMode="contain"
          />

          <Text
            style={s.choiceWelcomeTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            Bem-vindo!
          </Text>

          <Text
            style={s.choiceWelcomeText}
          >
            Estamos felizes por ter você por aqui.
          </Text>

          <View style={s.choiceDivider}>
            <View
              style={s.choiceDividerBlue}
            />
            <View
              style={s.choiceDividerGreen}
            />
          </View>

          <Text
            style={s.choiceQuestion}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            Como pretende utilizar o Conecta?
          </Text>

          <Text
            style={s.choiceSubtitle}
          >
            Escolha uma opção para continuar.
          </Text>

          <TouchableOpacity
            style={s.choiceOptionUser}
            onPress={() =>
              selecionarTipoParaConta(
                'utilizador'
              )
            }
            activeOpacity={0.82}
          >
            <View
              style={s.choiceIconUser}
            >
              <Text
                style={s.choiceIconText}
              >
                👤
              </Text>
            </View>

            <View
              style={s.choiceOptionText}
            >
              <Text
                style={
                  s.choiceOptionTitle
                }
              >
                Quero utilizar o Conecta
              </Text>

              <Text
                style={
                  s.choiceOptionDescription
                }
              >
                Procurar serviços, profissionais,
                anúncios e fazer pedidos.
              </Text>
            </View>

            <View
              style={s.choiceArrow}
            >
              <Text
                style={
                  s.choiceArrowText
                }
              >
                ›
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              s.choiceOptionProfessional
            }
            onPress={() =>
              selecionarTipoParaConta(
                'profissional'
              )
            }
            activeOpacity={0.82}
          >
            <View
              style={
                s.choiceIconProfessional
              }
            >
              <Text
                style={s.choiceIconText}
              >
                🧑‍🔧
              </Text>
            </View>

            <View
              style={s.choiceOptionText}
            >
              <Text
                style={
                  s.choiceOptionTitle
                }
              >
                Sou profissional
              </Text>

              <Text
                style={
                  s.choiceOptionDescription
                }
              >
                Divulgar os meus serviços e
                receber pedidos de orçamento.
              </Text>
            </View>

            <View
              style={s.choiceArrow}
            >
              <Text
                style={
                  s.choiceArrowText
                }
              >
                ›
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.choiceOptionCompany}
            onPress={() =>
              selecionarTipoParaConta(
                'empresa'
              )
            }
            activeOpacity={0.82}
          >
            <View
              style={s.choiceIconCompany}
            >
              <Text
                style={s.choiceIconText}
              >
                🏢
              </Text>
            </View>

            <View
              style={s.choiceOptionText}
            >
              <Text
                style={
                  s.choiceOptionTitle
                }
              >
                Sou uma empresa
              </Text>

              <Text
                style={
                  s.choiceOptionDescription
                }
              >
                Divulgar a minha empresa,
                produtos e serviços.
              </Text>
            </View>

            <View
              style={s.choiceArrow}
            >
              <Text
                style={
                  s.choiceArrowText
                }
              >
                ›
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.choiceOptionAdmin}
            onPress={() => {
              setModoAdministrador(true);
              setEtapaConta('autenticacao');
            }}
            activeOpacity={0.82}
          >
            <View style={s.choiceIconAdmin}>
              <Text style={s.choiceAdminIcon}>♙</Text>
              <View style={s.choiceAdminLock}>
                <Text style={s.choiceAdminLockText}>●</Text>
              </View>
            </View>
            <View style={s.choiceOptionText}>
              <Text style={s.choiceOptionTitle}>Sou administrador</Text>
              <Text style={s.choiceOptionDescription}>
                Acesso reservado à administração do Conecta Minho.
              </Text>
            </View>
            <View style={s.choiceArrow}>
              <Text style={s.choiceArrowText}>›</Text>
            </View>
          </TouchableOpacity>


        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={
          s.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>

          <Image
            source={require('../../assets/images/logo-conecta-minho.png')}
            style={s.authLogoImage}
            resizeMode="contain"
          />

          <Text style={s.title}>
            {modoRedefinirPassword ? 'Definir nova palavra-passe' : modoRecuperacao ? 'Recuperar palavra-passe' : modoRegisto ? 'Criar conta' : 'Iniciar sessão'}
          </Text>

          {!modoRecuperacao && !modoRedefinirPassword ? <View
            style={
              s.selectedProfileBox
            }
          >
            <Text
              style={
                s.selectedProfileLabel
              }
            >
              Perfil selecionado
            </Text>

            <Text
              style={
                s.selectedProfileTitle
              }
            >
              {modoAdministrador ? 'Acesso de administrador' : nomeTipoConta(tipoConta)}
            </Text>

            <Text
              style={
                s.selectedProfileDescription
              }
            >
              {modoAdministrador ? 'Área reservada à conta MASTER autorizada.' : descricaoTipoConta(tipoConta)}
            </Text>
          </View> : null}

          {modoRecuperacao ? (
            <>
              <Text style={s.securityNotice}>Introduza o e-mail associado à sua conta. Enviaremos um link para definir uma nova palavra-passe.</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="E-mail" placeholderTextColor="#8A949E" autoCapitalize="none" keyboardType="email-address" style={s.input} />
              <TouchableOpacity style={s.button} onPress={pedirRecuperacaoPassword} disabled={enviandoRecuperacao}>
                {enviandoRecuperacao ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.buttonText}>Enviar link de recuperação</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.secondary} onPress={() => setModoRecuperacao(false)} disabled={enviandoRecuperacao}>
                <Text style={s.secondaryText}>← Voltar ao início de sessão</Text>
              </TouchableOpacity>
            </>
          ) : modoRedefinirPassword ? (
            <>
              <Text style={s.securityNotice}>Escolha uma palavra-passe nova com pelo menos 8 caracteres, uma letra, um número e um carácter especial.</Text>
              <TextInput value={novaPassword} onChangeText={setNovaPassword} placeholder="Nova palavra-passe" placeholderTextColor="#8A949E" secureTextEntry={!mostrarNovaPassword} autoCapitalize="none" style={s.input} />
              <TextInput value={confirmarPassword} onChangeText={setConfirmarPassword} placeholder="Confirmar nova palavra-passe" placeholderTextColor="#8A949E" secureTextEntry={!mostrarConfirmarPassword} autoCapitalize="none" style={s.input} />
              <TouchableOpacity style={s.button} onPress={guardarPasswordRecuperada} disabled={alterandoPassword}>
                {alterandoPassword ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.buttonText}>Guardar nova palavra-passe</Text>}
              </TouchableOpacity>
            </>
          ) : (
          <>
          {modoRegisto ? (
            <>
              <TextInput value={nome} onChangeText={setNome} placeholder="Nome" placeholderTextColor="#8A949E" autoCapitalize="words" style={s.input} returnKeyType="next" />
              <TextInput value={apelido} onChangeText={setApelido} placeholder="Apelido" placeholderTextColor="#8A949E" autoCapitalize="words" style={s.input} returnKeyType="next" />
              <TextInput value={dataNascimento} onChangeText={(v) => setDataNascimento(v.replace(/[^0-9/]/g, '').slice(0, 10))} placeholder="Data de nascimento (DD/MM/AAAA)" placeholderTextColor="#8A949E" keyboardType="numbers-and-punctuation" style={s.input} returnKeyType="next" />
              <TextInput value={nomePreferido} onChangeText={setNomePreferido} placeholder="Nome preferido (opcional)" placeholderTextColor="#8A949E" autoCapitalize="words" style={s.input} returnKeyType="next" />
            </>
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#8A949E"
            autoCapitalize="none"
            keyboardType="email-address"
            style={s.input}
          />

          <View style={s.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Palavra-passe"
              placeholderTextColor="#8A949E"
              secureTextEntry={!mostrarPassword}
              autoCapitalize="none"
              style={[s.input, s.passwordInput]}
            />
            <TouchableOpacity style={s.passwordToggle} onPress={() => setMostrarPassword((v) => !v)} accessibilityRole="button" accessibilityLabel={mostrarPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}>
              <Text style={s.passwordToggleText}>{mostrarPassword ? 'Ocultar' : 'Mostrar'}</Text>
            </TouchableOpacity>
          </View>

          {modoRegisto ? (
            <>
              <Text style={s.passwordHint}>A palavra-passe deve ter pelo menos 8 caracteres, uma letra, um número e um carácter especial.</Text>
              <TouchableOpacity style={s.termsRow} onPress={() => setAceitouTermos((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: aceitouTermos }}>
                <View style={[s.termsCheckbox, aceitouTermos && s.termsCheckboxChecked]}>
                  {aceitouTermos ? <Text style={s.termsCheckmark}>✓</Text> : null}
                </View>
                <Text style={s.termsText}>Li e aceito os Termos e Condições e a Política de Privacidade.</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity
            style={s.button}
            onPress={modoRegisto ? criarConta : entrar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={s.buttonText}
              >
                {modoRegisto ? 'Criar conta' : 'Entrar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondary}
            onPress={() => {
              setModoRegisto((v) => !v);
              setPassword('');
              setAceitouTermos(false);
            }}
            disabled={loading}
          >
            <Text
              style={s.secondaryText}
            >
              {modoRegisto ? 'Já tenho conta — iniciar sessão' : 'Ainda não tenho conta — registar-me'}
            </Text>
          </TouchableOpacity>

          {!modoRegisto ? (
            <TouchableOpacity style={s.secondary} onPress={() => { setModoRecuperacao(true); setModoRedefinirPassword(false); }}>
              <Text style={s.secondaryText}>Esqueci-me da palavra-passe</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={s.backChoice}
            onPress={
              voltarParaEscolha
            }
          >
            <Text
              style={s.backChoiceText}
            >
              ← Voltar e escolher outro perfil
            </Text>
          </TouchableOpacity>
          </>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EventRow({
  l,
  v,
}: {
  l: string;
  v: string;
}) {
  return (
    <View style={eventStyles.row}>
      <Text style={eventStyles.label}>
        {l}
      </Text>

      <Text style={eventStyles.value}>
        {v}
      </Text>
    </View>
  );
}

const eventStyles = StyleSheet.create({
  row: {
    marginBottom: 9,
  },

  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#68727E',
    marginBottom: 2,
  },

  value: {
    fontSize: 14,
    color: '#1D2733',
  },
});

const s = StyleSheet.create({
  editModalOverlay: { flex: 1, backgroundColor: 'rgba(10,20,30,0.58)', justifyContent: 'center', padding: 16 },
  editModalCard: { width: '100%', maxHeight: '92%', maxWidth: 620, alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20 },
  editModalTitle: { fontSize: 24, fontWeight: '900', color: '#1D2733', marginBottom: 6 },
  editModalSubtitle: { fontSize: 14, lineHeight: 20, color: '#68727E', marginBottom: 10 },
  editDescription: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
  editCheckboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 10 },
  editCheckbox: { fontSize: 24, color: '#1677B8' },
  editSectionTitle: { fontSize: 17, fontWeight: '800', color: '#1D2733', marginTop: 8 },
  specificEditBox: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: '#F5F8FB' },
  pendingNotice: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: '#FFF4D6' },
  pendingNoticeText: { color: '#805B00', fontSize: 13, fontWeight: '700' },
  pendingCount: { minWidth: 32, height: 32, paddingHorizontal: 8, borderRadius: 16, backgroundColor: '#EAF4FB', alignItems: 'center', justifyContent: 'center' },
  pendingCountText: { color: '#1677B8', fontWeight: '900' },

  page: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },

  choiceContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 32,
  },

  choiceScreen: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
  },

  choiceLogoImage: {
    width: '82%',
    maxWidth: 360,
    height: 150,
    marginBottom: 4,
  },

  choiceWelcomeTitle: {
    width: '100%',
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
    color: '#13294B',
    textAlign: 'center',
    marginTop: 4,
  },

  choiceWelcomeText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#667487',
    textAlign: 'center',
    marginTop: 7,
  },

  choiceDivider: {
    flexDirection: 'row',
    width: 96,
    height: 5,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 18,
    marginBottom: 17,
  },

  choiceDividerBlue: {
    flex: 1,
    backgroundColor: '#1688E8',
  },

  choiceDividerGreen: {
    flex: 1,
    backgroundColor: '#37B86A',
  },

  choiceQuestion: {
    width: '100%',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    color: '#13294B',
    textAlign: 'center',
  },

  choiceSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: '#718096',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 19,
  },

  choiceOptionUser: {
    width: '100%',
    minHeight: 118,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D5E8FB',
    backgroundColor: '#F7FBFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 12,
  },

  choiceOptionProfessional: {
    width: '100%',
    minHeight: 118,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D8EFDF',
    backgroundColor: '#F8FCF9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 12,
  },

  choiceOptionAdmin: {
    width: '100%',
    minHeight: 118,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#BBD3F5',
    backgroundColor: '#F0F6FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  choiceIconAdmin: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: '#DFEBFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  choiceAdminIcon: {
    fontSize: 32,
    color: '#214B7A',
  },
  choiceAdminLock: {
    position: 'absolute',
    right: 5,
    bottom: 4,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#214B7A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceAdminLockText: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  choiceOptionCompany: {
    width: '100%',
    minHeight: 118,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E1D9FA',
    backgroundColor: '#FBF9FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 4,
  },

  choiceIconUser: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  choiceIconProfessional: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: '#EAF8EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  choiceIconCompany: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: '#F0EBFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  choiceIconText: {
    fontSize: 29,
  },

  choiceOptionText: {
    flex: 1,
    paddingRight: 8,
  },

  choiceOptionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    color: '#13294B',
    marginBottom: 5,
  },

  choiceOptionDescription: {
    fontSize: 14,
    lineHeight: 19,
    color: '#687789',
  },

  choiceArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    marginLeft: 4,
  },

  choiceArrowText: {
    fontSize: 33,
    lineHeight: 37,
    color: '#18395E',
    fontWeight: '400',
    marginTop: -3,
  },

  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },

  passwordRow: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 82,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  passwordToggleText: {
    color: '#1769AA',
    fontSize: 13,
    fontWeight: '700',
  },
  passwordHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68727E',
    marginTop: -7,
    marginBottom: 12,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  termsCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#9AA7B5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsCheckboxChecked: {
    backgroundColor: '#1769AA',
    borderColor: '#1769AA',
  },
  termsCheckmark: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  termsText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
  },

  authLogoImage: {
    width: '82%',
    maxWidth: 330,
    height: 125,
    alignSelf: 'center',
    marginBottom: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1D2733',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 14,
  },

  mutedCenter: {
    fontSize: 15,
    lineHeight: 22,
    color: '#68727E',
    textAlign: 'center',
    marginBottom: 20,
  },

  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: '#68727E',
  },

  small: {
    fontSize: 12,
    color: '#68727E',
    marginBottom: 3,
  },

  emailBox: {
    backgroundColor: '#F7F8FA',
    borderRadius: 14,
    padding: 15,
    marginBottom: 20,
  },

  emailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D2733',
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#DDE2E7',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1D2733',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },

  button: {
    height: 52,
    borderRadius: 13,
    backgroundColor: '#1677B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  secondary: {
    height: 52,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#1677B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  secondaryText: {
    color: '#1677B8',
    fontSize: 16,
    fontWeight: '800',
  },

  backChoice: {
    alignItems: 'center',
    marginTop: 18,
  },

  backChoiceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#68727E',
  },

  selectedProfileBox: {
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#DCE5EE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },

  selectedProfileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#68727E',
    marginBottom: 5,
  },

  selectedProfileTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1677B8',
    marginBottom: 5,
  },

  selectedProfileDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#50616F',
  },

  accountTypeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 4,
  },

  accountTypeSubtitle: {
    fontSize: 14,
    color: '#68727E',
  },

  sessionContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 24,
    paddingBottom: 40,
  },

  sessionCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },

  sessionLogoImage: {
    width: '72%',
    maxWidth: 300,
    height: 110,
    alignSelf: 'center',
    marginBottom: 6,
  },

  sessionTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1D2733',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 7,
  },

  sessionLogged: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1677B8',
    textAlign: 'center',
  },

  sessionMuted: {
    fontSize: 14,
    lineHeight: 21,
    color: '#68727E',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },

  sessionEmailBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8EBEF',
  },

  profileEditBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EBEF',
    marginBottom: 20,
  },

  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#50616F',
    marginBottom: 6,
  },

  profilePasswordRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDE2E7',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },

  passwordField: {
    flex: 1,
    minHeight: 50,
    fontSize: 16,
    color: '#1D2733',
    paddingVertical: 8,
  },

  profilePasswordToggle: {
    color: '#1677B8',
    fontSize: 13,
    fontWeight: '800',
    paddingLeft: 8,
  },

  profilePasswordHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68727E',
    marginTop: -5,
    marginBottom: 14,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  sessionAccountTypeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EBEF',
    marginBottom: 24,
  },

  sessionSelectedProfileBox: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },

  changeProfileButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },

  changeProfileText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1677B8',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1D2733',
  },

  searchStatsHeader: {
    marginTop: 8,
    marginBottom: 14,
  },

  refresh: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  refreshText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1677B8',
  },

  loadingBox: {
    padding: 24,
    alignItems: 'center',
  },

  empty: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE2E7',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyIcon: {
    fontSize: 38,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1D2733',
    textAlign: 'center',
    marginBottom: 7,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#68727E',
    textAlign: 'center',
  },

  total: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1677B8',
    marginBottom: 10,
  },

  pedido: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 18,
    padding: 17,
    marginBottom: 14,
  },

  pedidoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 5,
  },

  date: {
    fontSize: 13,
    color: '#68727E',
    marginTop: 5,
  },

  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#68727E',
    marginTop: 12,
    marginBottom: 3,
  },

  value: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D2733',
  },

  valueNormal: {
    fontSize: 15,
    lineHeight: 22,
    color: '#384452',
  },

  resposta: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },

  okBox: {
    backgroundColor: '#EAF6EF',
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
  },

  okTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#167648',
  },

  badBox: {
    backgroundColor: '#FDECEC',
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
  },

  badTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#A22A2A',
  },

  recusar: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9DEE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  recusarText: {
    color: '#A22A2A',
    fontWeight: '800',
  },

  sessionSecondary: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: '#FFFFFF',
  },

  masterPage: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  masterContent: {
    padding: 20,
    paddingBottom: 40,
  },

  masterLoading: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  masterHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    padding: 20,
    marginBottom: 14,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF6EF',
    color: '#167648',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },

  masterTitle: {
    fontSize: 29,
    fontWeight: '800',
    color: '#1D2733',
  },

  close: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    fontSize: 28,
    color: '#4E5964',
  },

  warning: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F0D89A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#805D12',
    marginBottom: 5,
  },

  warningText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6E5A2B',
  },

  errorBox: {
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#E8B7B7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#A22A2A',
  },

  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7D3030',
    marginVertical: 8,
  },

  retry: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9A5A5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  retryText: {
    color: '#A22A2A',
    fontWeight: '800',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  stat: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },

  statNumber: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1677B8',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: '#68727E',
  },

  modCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE2E7',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },

  status: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3D6',
    color: '#805D12',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
  },

  type: {
    fontSize: 13,
    fontWeight: '700',
    color: '#68727E',
  },

  anuncioTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 5,
  },

  meta: {
    fontSize: 14,
    color: '#1677B8',
    fontWeight: '700',
  },

  line: {
    height: 1,
    backgroundColor: '#E6E9ED',
    marginVertical: 15,
  },

  negociavel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#167648',
    marginTop: 6,
  },

  eventBox: {
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#DCE5EE',
    borderRadius: 16,
    padding: 15,
    marginTop: 16,
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 10,
  },

  responsibility: {
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 11,
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: '#6E5A2B',
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    marginTop: 18,
  },

  approve: {
    flex: 1,
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: '#CDA64A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  approveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  reject: {
    flex: 1,
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: '#F0F2F5',
    borderWidth: 1,
    borderColor: '#D9DEE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  rejectText: {
    color: '#A22A2A',
    fontSize: 16,
    fontWeight: '800',
  },

  disabled: {
    opacity: 0.55,
  },

  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },

  period: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE2E7',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
  },

  periodActive: {
    backgroundColor: '#1677B8',
    borderColor: '#1677B8',
  },

  periodText: {
    color: '#50616F',
    fontSize: 13,
    fontWeight: '700',
  },

  periodTextActive: {
    color: '#FFFFFF',
  },

  listBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },

  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 10,
  },

  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F4',
  },

  listName: {
    flex: 1,
    fontSize: 14,
    color: '#384452',
    paddingRight: 12,
  },

  listValue: {
    minWidth: 32,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '800',
    color: '#1677B8',
  },

  note: {
    backgroundColor: '#EAF4FB',
    borderRadius: 14,
    padding: 13,
    marginBottom: 12,
  },

  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#50616F',
  },

  footer: {
    backgroundColor: '#EAF4FB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  footerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1677B8',
    marginBottom: 4,
  },

  back: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE2E7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: '#1D2733',
    fontSize: 16,
    fontWeight: '800',
  },

  /* Layout atualizado da Conta autenticada */
  dashboardContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 30,
    backgroundColor: '#F1F6FF',
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  dashboardHeaderText: { flex: 1, paddingRight: 12 },
  dashboardTitle: { fontSize: 28, lineHeight: 34, fontWeight: '900', color: '#102B50', letterSpacing: -0.5 },
  dashboardSubtitle: { fontSize: 14, lineHeight: 20, color: '#64758B', marginTop: 3 },
  welcomeCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#DDEEFF',
    borderRadius: 23, borderWidth: 1, borderColor: '#C8E2FC', padding: 16, marginBottom: 22,
  },
  avatarCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#F8FBFF', borderWidth: 4,
    borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 35 },
  welcomeTextColumn: { flex: 1 },
  welcomeTitle: { fontSize: 23, lineHeight: 28, fontWeight: '900', color: '#102B50' },
  welcomeSubtitle: { fontSize: 13, lineHeight: 19, color: '#4E6682', marginTop: 3 },
  confirmedPill: {
    alignSelf: 'flex-start', backgroundColor: '#C9F3DE', borderRadius: 18,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 9,
  },
  confirmedPillText: { color: '#07834C', fontSize: 12, fontWeight: '900' },
  welcomeAccountType: { color: '#27618E', fontSize: 12, fontWeight: '700', marginTop: 8 },
  welcomeEditButton: { alignSelf: 'flex-start', marginTop: 10, borderWidth: 1, borderColor: '#7BB9FF', backgroundColor: '#F5FAFF', borderRadius: 22, paddingHorizontal: 13, paddingVertical: 7 },
  welcomeEditButtonText: { color: '#0870C4', fontSize: 13, fontWeight: '800' },
  dashboardEmailBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18,
    borderWidth: 1, borderColor: '#E4EAF2', padding: 14, marginBottom: 23,
  },
  dashboardEmailIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F4FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  dashboardEmailIconText: { fontSize: 22, color: '#0878D1' },
  dashboardEmailText: { flex: 1 },
  dashboardEmailLabel: { color: '#738197', fontSize: 12, marginBottom: 3 },
  dashboardEmailValue: { color: '#182D4A', fontSize: 15, fontWeight: '800' },
  dashboardSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 1,
  },
  dashboardSectionHeaderText: { flex: 1, paddingRight: 10 },
  dashboardSectionTitle: { fontSize: 21, lineHeight: 27, fontWeight: '900', color: '#13294B' },
  dashboardSectionSubtitle: { fontSize: 13, lineHeight: 19, color: '#6B7A8E', marginTop: 3 },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  activitySeeAll: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 7, marginRight: 4 },
  activitySeeAllText: { color: '#0878D1', fontSize: 12, fontWeight: '800' },
  activityTile: {
    width: '48.5%', minHeight: 96, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 19, borderWidth: 1, borderColor: '#E6EDF6',
    padding: 11, marginBottom: 10, shadowColor: '#16345A', shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  activityIconBlue: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E6F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  activityIconGreen: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E4F8EF', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  activityIconPurple: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0E8FF', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  activityIconOrange: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF0DE', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  activityIconText: { fontSize: 20 },
  activityTileText: { flex: 1 },
  activityTileTitle: { color: '#13294B', fontSize: 12, lineHeight: 16, fontWeight: '900' },
  activityTileSubtitle: { color: '#6B7A8E', fontSize: 10, lineHeight: 14, marginTop: 3 },
  activityArrow: { color: '#73859C', fontSize: 25, marginLeft: 3 },
  preferencesList: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4EAF2', borderRadius: 20,
    overflow: 'hidden', marginBottom: 24, shadowColor: '#16345A', shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  preferenceRow: {
    minHeight: 67, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EDF1F6',
  },
  preferenceRowLast: { minHeight: 67, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  preferenceIconBlue: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E6F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  preferenceIconGreen: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E4F8EF', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  preferenceIconPurple: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0E8FF', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  preferenceIconRed: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  preferenceIconText: { fontSize: 20 },
  preferenceTextColumn: { flex: 1 },
  preferenceTitle: { color: '#172D4B', fontSize: 14, fontWeight: '900', lineHeight: 19 },
  preferenceSubtitle: { color: '#6B7A8E', fontSize: 11, lineHeight: 15, marginTop: 2 },
  preferenceArrow: { color: '#7B8BA0', fontSize: 25, marginLeft: 8 },
  preferenceExpanded: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 17, backgroundColor: '#FAFCFF', borderBottomWidth: 1, borderBottomColor: '#EDF1F6' },
  preferencePlan: { color: '#4D6682', fontSize: 12, fontWeight: '700', marginTop: 8 },
  securityNotice: { color: '#607189', fontSize: 12, lineHeight: 18, marginBottom: 13 },
  emptyDashboard: {
    alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 20, paddingHorizontal: 22, paddingVertical: 27, marginBottom: 22,
  },
  dashboardThanks: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#DDEEFF', borderRadius: 17,
    padding: 14, marginTop: 3, marginBottom: 16,
  },
  dashboardThanksIcon: { color: '#0878D1', fontSize: 28, fontWeight: '900', marginRight: 12 },
  dashboardThanksText: { flex: 1 },
  dashboardThanksTitle: { color: '#0870C4', fontSize: 13, lineHeight: 18, fontWeight: '900' },
  dashboardThanksSubtitle: { color: '#4E6682', fontSize: 11, lineHeight: 16, marginTop: 3 },
  dashboardBackButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE6F0' },
  dashboardBackText: { color: '#27618E', fontSize: 14, fontWeight: '800' },
  purchaseStatus: { alignSelf: 'flex-start', backgroundColor: '#EEF5FC', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10, marginBottom: 8 },
  purchaseStatusText: { color: '#315B84', fontSize: 12, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 10 },
  ratingStarButton: { color: '#F4A900', fontSize: 34, fontWeight: '900' },
  ratingStars: { color: '#F4A900', fontSize: 24, fontWeight: '900', marginBottom: 5 },
  ratingCommentInput: { minHeight: 90, textAlignVertical: 'top' },

});