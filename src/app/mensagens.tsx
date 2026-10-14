
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../supabase';

type Mensagem = {
  id: string;
  pedido_orcamento_id: string | null;
  anuncio_id: string | null;
  remetente_id: string;
  destinatario_id: string;
  mensagem: string;
  lida: boolean;
  criado_em: string;
};

type Conversa = {
  chave: string;
  anuncioId: string | null;
  pedidoId: string | null;
  outroUtilizadorId: string;
  titulo: string;
  ultimaMensagem: string;
  data: string;
  naoLidas: number;
};

export default function MensagensScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    anuncioId?: string;
    anuncioTitulo?: string;
    pedidoId?: string;
    destinatarioId?: string;
  }>();

  const [utilizadorId, setUtilizadorId] = useState('');
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<Conversa | null>(null);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const carregarConversas = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!auth.user) {
        setErro('Inicia sessão para consultar as tuas mensagens.');
        setUtilizadorId('');
        setConversas([]);
        return;
      }

      const uid = auth.user.id;
      setUtilizadorId(uid);

      const { data, error } = await supabase
        .from('mensagens')
        .select(
          'id, pedido_orcamento_id, anuncio_id, remetente_id, destinatario_id, mensagem, lida, criado_em'
        )
        .or(`remetente_id.eq.${uid},destinatario_id.eq.${uid}`)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const lista = (data || []) as Mensagem[];
      const agrupadas = new Map<string, Conversa>();

      for (const item of lista) {
        const outroId =
          item.remetente_id === uid
            ? item.destinatario_id
            : item.remetente_id;

        const chave = item.pedido_orcamento_id
          ? `pedido:${item.pedido_orcamento_id}`
          : `anuncio:${item.anuncio_id || 'sem-anuncio'}:${[
              uid,
              outroId,
            ]
              .sort()
              .join(':')}`;

        const existente = agrupadas.get(chave);

        if (!existente) {
          agrupadas.set(chave, {
            chave,
            anuncioId: item.anuncio_id,
            pedidoId: item.pedido_orcamento_id,
            outroUtilizadorId: outroId,
            titulo: item.pedido_orcamento_id
              ? 'Conversa sobre pedido de orçamento'
              : 'Conversa sobre anúncio',
            ultimaMensagem: item.mensagem,
            data: item.criado_em,
            naoLidas:
              item.destinatario_id === uid && !item.lida ? 1 : 0,
          });
        } else if (item.destinatario_id === uid && !item.lida) {
          existente.naoLidas += 1;
        }
      }

      const resultado = Array.from(agrupadas.values());

      const anunciosIds = [
        ...new Set(
          resultado
            .map((c) => c.anuncioId)
            .filter((value): value is string => Boolean(value))
        ),
      ];

      if (anunciosIds.length) {
        const { data: anuncios, error: erroAnuncios } = await supabase
          .from('anuncios')
          .select('id, titulo')
          .in('id', anunciosIds);

        if (erroAnuncios) throw erroAnuncios;

        for (const conversa of resultado) {
          const anuncio = (anuncios || []).find(
            (item) => item.id === conversa.anuncioId
          );

          if (anuncio?.titulo) {
            conversa.titulo = anuncio.titulo;
          }
        }
      }

      setConversas(resultado);

      if (params.anuncioId && !conversaAtiva) {
        const { data: anuncio, error: erroAnuncio } = await supabase
          .from('anuncios')
          .select('id, titulo, user_id')
          .eq('id', params.anuncioId)
          .maybeSingle();

        if (erroAnuncio) throw erroAnuncio;

        if (!anuncio) {
          setErro('Este anúncio já não está disponível.');
          return;
        }

        if (anuncio.user_id === uid) {
          setErro('Não podes iniciar uma conversa contigo próprio.');
          return;
        }

        const conversaExistente = resultado.find(
          (c) =>
            c.anuncioId === anuncio.id &&
            c.outroUtilizadorId === anuncio.user_id &&
            !c.pedidoId
        );

        setConversaAtiva(
          conversaExistente || {
            chave: `anuncio:${anuncio.id}:${[uid, anuncio.user_id]
              .sort()
              .join(':')}`,
            anuncioId: anuncio.id,
            pedidoId: null,
            outroUtilizadorId: anuncio.user_id,
            titulo: anuncio.titulo || params.anuncioTitulo || 'Anúncio',
            ultimaMensagem: '',
            data: new Date().toISOString(),
            naoLidas: 0,
          }
        );
      } else if (params.destinatarioId && !conversaAtiva) {
        const conversaExistente = resultado.find(
          (c) =>
            c.outroUtilizadorId === params.destinatarioId &&
            (!params.anuncioId || c.anuncioId === params.anuncioId)
        );

        if (conversaExistente) setConversaAtiva(conversaExistente);
      }
    } catch (e: any) {
      console.error('Erro ao carregar mensagens:', e);
      setErro(
        e?.message ||
          'Não foi possível carregar as mensagens. Verifica as permissões do Supabase.'
      );
    } finally {
      setCarregando(false);
    }
  }, [
    params.anuncioId,
    params.anuncioTitulo,
    params.destinatarioId,
    conversaAtiva,
  ]);

  const carregarMensagens = useCallback(async () => {
    if (!utilizadorId || !conversaAtiva) return;

    let query = supabase
      .from('mensagens')
      .select(
        'id, pedido_orcamento_id, anuncio_id, remetente_id, destinatario_id, mensagem, lida, criado_em'
      )
      .order('criado_em', { ascending: true });

    if (conversaAtiva.pedidoId) {
      query = query.eq(
        'pedido_orcamento_id',
        conversaAtiva.pedidoId
      );
    } else if (conversaAtiva.anuncioId) {
      query = query
        .eq('anuncio_id', conversaAtiva.anuncioId)
        .is('pedido_orcamento_id', null)
        .or(
          `and(remetente_id.eq.${utilizadorId},destinatario_id.eq.${conversaAtiva.outroUtilizadorId}),and(remetente_id.eq.${conversaAtiva.outroUtilizadorId},destinatario_id.eq.${utilizadorId})`
        );
    } else {
      setMensagens([]);
      return;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao carregar conversa:', error);
      setErro(error.message);
      return;
    }

    setMensagens((data || []) as Mensagem[]);

    const porLer = (data || [])
      .filter(
        (m: any) =>
          m.destinatario_id === utilizadorId && !m.lida
      )
      .map((m: any) => m.id);

    if (porLer.length) {
      const { error: erroLidas } = await supabase
        .from('mensagens')
        .update({ lida: true })
        .in('id', porLer);

      if (erroLidas) {
        console.warn('Não foi possível marcar as mensagens como lidas:', erroLidas);
      }
    }
  }, [utilizadorId, conversaAtiva]);

  useEffect(() => {
    carregarConversas();
  }, [carregarConversas]);

  useEffect(() => {
    carregarMensagens();
  }, [carregarMensagens]);

  async function enviarMensagem() {
    const conteudo = texto.trim();

    if (!conteudo || !conversaAtiva || !utilizadorId || enviando) {
      return;
    }

    setEnviando(true);
    setErro('');

    try {
      const registo = {
        pedido_orcamento_id: conversaAtiva.pedidoId,
        anuncio_id: conversaAtiva.anuncioId,
        remetente_id: utilizadorId,
        destinatario_id: conversaAtiva.outroUtilizadorId,
        mensagem: conteudo,
        lida: false,
      };

      const { data, error } = await supabase
        .from('mensagens')
        .insert(registo)
        .select(
          'id, pedido_orcamento_id, anuncio_id, remetente_id, destinatario_id, mensagem, lida, criado_em'
        )
        .single();

      if (error) throw error;

      setMensagens((anteriores) => [...anteriores, data as Mensagem]);
      setTexto('');
      await carregarConversas();
    } catch (e: any) {
      console.error('Erro ao enviar mensagem:', e);
      Alert.alert(
        'Mensagem não enviada',
        e?.message ||
          'Verifica a ligação e as permissões de mensagens no Supabase.'
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1677B8" />
        <Text style={styles.subtitle}>A carregar mensagens...</Text>
      </View>
    );
  }

  if (!utilizadorId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Mensagens</Text>
        <Text style={styles.subtitle}>
          {erro || 'Inicia sessão para consultar as tuas conversas.'}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/conta')}
        >
          <Text style={styles.primaryButtonText}>Iniciar sessão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {conversaAtiva ? (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                setConversaAtiva(null);
                setTexto('');
                setErro('');
              }}
            >
              <Text style={styles.backText}>‹ Conversas</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={2}>
              {conversaAtiva.titulo}
            </Text>
            <Text style={styles.subtitle}>Conversa privada</Text>
          </View>

          {erro ? <Text style={styles.errorText}>{erro}</Text> : null}

          <FlatList
            style={styles.chatList}
            data={mensagens}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatContent}
            renderItem={({ item }) => {
              const minha = item.remetente_id === utilizadorId;

              return (
                <View
                  style={[
                    styles.messageBubble,
                    minha ? styles.myMessage : styles.theirMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      minha && styles.myMessageText,
                    ]}
                  >
                    {item.mensagem}
                  </Text>
                  <Text
                    style={[
                      styles.messageDate,
                      minha && styles.myMessageDate,
                    ]}
                  >
                    {new Date(item.criado_em).toLocaleString('pt-PT', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Ainda não existem mensagens nesta conversa. Escreve a primeira!
              </Text>
            }
          />

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={texto}
              onChangeText={setTexto}
              placeholder="Escreve a tua mensagem..."
              placeholderTextColor="#89939E"
              multiline
              maxLength={3000}
              editable={!enviando}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!texto.trim() || enviando) && styles.disabledButton,
              ]}
              onPress={enviarMensagem}
              disabled={!texto.trim() || enviando}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.listContainer}>
          <Text style={styles.title}>As minhas mensagens</Text>
          <Text style={styles.subtitle}>
            Conversas privadas com quem publicou anúncios.
          </Text>

          {erro ? <Text style={styles.errorText}>{erro}</Text> : null}

          <FlatList
            data={conversas}
            keyExtractor={(item) => item.chave}
            contentContainerStyle={styles.conversationList}
            onRefresh={carregarConversas}
            refreshing={carregando}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Ainda sem conversas</Text>
                <Text style={styles.subtitle}>
                  Quando enviares ou receberes uma mensagem, a conversa aparecerá aqui.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.conversationCard}
                onPress={() => {
                  setErro('');
                  setConversaAtiva(item);
                }}
              >
                <View style={styles.conversationTop}>
                  <Text style={styles.conversationTitle} numberOfLines={1}>
                    {item.titulo}
                  </Text>
                  {item.naoLidas > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>
                        {item.naoLidas}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.preview} numberOfLines={2}>
                  {item.ultimaMensagem}
                </Text>
                <Text style={styles.messageDate}>
                  {new Date(item.data).toLocaleString('pt-PT')}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F7F8FA',
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E7EB',
  },
  backText: {
    color: '#1677B8',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: '#68727E',
  },
  conversationList: {
    paddingTop: 18,
    paddingBottom: 30,
    flexGrow: 1,
  },
  conversationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  conversationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  conversationTitle: {
    flex: 1,
    color: '#1D2733',
    fontSize: 16,
    fontWeight: '800',
  },
  preview: {
    color: '#68727E',
    fontSize: 15,
    marginTop: 8,
    lineHeight: 21,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#1677B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '86%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#1677B8',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7EB',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#1D2733',
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageDate: {
    color: '#89939E',
    fontSize: 11,
    marginTop: 6,
  },
  myMessageDate: {
    color: '#D8EAF6',
    textAlign: 'right',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E3E7EB',
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#D9E0E6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1D2733',
    backgroundColor: '#FFFFFF',
  },
  sendButton: {
    minWidth: 82,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#1677B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 13,
    backgroundColor: '#1677B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyBox: {
    paddingVertical: 45,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#1D2733',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#68727E',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginVertical: 30,
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    paddingHorizontal: 20,
  },
});
