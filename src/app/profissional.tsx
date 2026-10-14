import { useLocalSearchParams, useRouter } from 'expo-router';

import { useEffect, useState } from 'react';

import {
  ActivityIndicator,

  Alert,

  Image,

  KeyboardAvoidingView,

  Platform,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  TouchableOpacity,

  View,
} from 'react-native';

import { supabase } from '../supabase';

type DadosEspecificosProfissional = {

  imagens?: string[];

  nome_profissional?: string;

  nome_negocio?: string;

  [chave: string]: unknown;

};

type Profissional = {

  id: string;

  user_id: string;

  titulo: string | null;

  descricao: string | null;

  categoria: string | null;

  localidade: string | null;

  preco: number | string | null;

  preco_negociavel: boolean | null;

  contato: string | null;

  dados_especificos?: DadosEspecificosProfissional | null;

};

function converterDataParaISO(valor: string): string | null | undefined {
  const data = valor.trim();

  if (!data) {
    return null;
  }

  let ano: number;
  let mes: number;
  let dia: number;

  const formatoPortugues = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const formatoISO = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (formatoPortugues) {
    dia = Number(formatoPortugues[1]);
    mes = Number(formatoPortugues[2]);
    ano = Number(formatoPortugues[3]);
  } else if (formatoISO) {
    ano = Number(formatoISO[1]);
    mes = Number(formatoISO[2]);
    dia = Number(formatoISO[3]);
  } else {
    return undefined;
  }

  const dataValidacao = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    dataValidacao.getUTCFullYear() !== ano ||
    dataValidacao.getUTCMonth() !== mes - 1 ||
    dataValidacao.getUTCDate() !== dia
  ) {
    return undefined;
  }

  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export default function ProfissionalScreen() {

  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string }>();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [profissional, setProfissional] =

    useState<Profissional | null>(null);

  const [carregando, setCarregando] = useState(true);

  const [erro, setErro] = useState('');

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [enviandoPedido, setEnviandoPedido] = useState(false);

  const [nome, setNome] = useState('');

  const [contacto, setContacto] = useState('');

  const [descricaoPedido, setDescricaoPedido] = useState('');

  const [dataPretendida, setDataPretendida] = useState('');

  const [orcamento, setOrcamento] = useState('');

  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {

    if (id) {

      carregarProfissional();

    } else {

      setErro('Profissional não encontrado.');

      setCarregando(false);

    }

  }, [id]);

  async function carregarProfissional() {

    try {

      setCarregando(true);

      setErro('');

      const { data, error } = await supabase

        .from('anuncios')

        .select(

          'id, user_id, titulo, descricao, categoria, localidade, preco, preco_negociavel, contato, dados_especificos'

        )

        .eq('id', id)

        .eq('estado', 'publicado')

        .eq('tipo_anuncio', 'Serviço profissional')

        .maybeSingle();

      if (error) {

        console.error('Erro ao carregar profissional:', error);

        setErro('Não foi possível carregar este profissional.');

        return;

      }

      if (!data) {

        setErro('Profissional não encontrado ou não está disponível.');

        return;

      }

      setProfissional(data as Profissional);

    } catch (error) {

      console.error(error);

      setErro('Ocorreu um erro ao carregar o profissional.');

    } finally {

      setCarregando(false);

    }

  }

  function formatarPreco(preco: number | string | null) {

    if (preco === null || preco === undefined || preco === '') {

      return 'Preço sob consulta';

    }

    const numero = Number(preco);

    if (Number.isNaN(numero)) {

      return String(preco);

    }

    return `${numero.toLocaleString('pt-PT', {

      minimumFractionDigits: 2,

      maximumFractionDigits: 2,

    })} €`;

  }

  function verContacto() {

    if (!profissional?.contato) {

      Alert.alert(

        'Contacto',

        'Este profissional não disponibilizou um contacto.'

      );

      return;

    }

    Alert.alert('Contacto', profissional.contato);

  }

  function abrirFormularioOrcamento() {

    setMostrarFormulario(true);

  }

  function fecharFormularioOrcamento() {

    if (enviandoPedido) {

      return;

    }

    setMostrarFormulario(false);

  }

  async function enviarPedidoOrcamento() {

    if (!profissional) {

      return;

    }

    if (!nome.trim()) {

      Alert.alert('Dados necessários', 'Informe o seu nome.');

      return;

    }

    if (!contacto.trim()) {

      Alert.alert(

        'Dados necessários',

        'Informe um contacto para que o profissional possa responder.'

      );

      return;

    }

    if (!descricaoPedido.trim()) {

      Alert.alert(

        'Dados necessários',

        'Descreva o serviço que pretende solicitar.'

      );

      return;

    }

    const dataPretendidaISO = converterDataParaISO(dataPretendida);

    if (dataPretendidaISO === undefined) {
      Alert.alert(
        'Data inválida',
        'Introduza a data no formato DD/MM/AAAA, por exemplo 20/10/2026.'
      );
      return;
    }

    try {

      setEnviandoPedido(true);

      const {

        data: { user },

        error: authError,

      } = await supabase.auth.getUser();

      if (authError || !user) {

        Alert.alert(

          'Sessão necessária',

          'É necessário iniciar sessão para pedir um orçamento.'

        );

        return;

      }

      let valorOrcamento: number | null = null;

      if (orcamento.trim()) {

        const valor = Number(

          orcamento.trim().replace(',', '.')

        );

        if (Number.isNaN(valor)) {

          Alert.alert(

            'Orçamento inválido',

            'Informe um valor válido ou deixe o campo em branco.'

          );

          return;

        }

        valorOrcamento = valor;

      }

      const { error } = await supabase

        .from('pedidos_orcamento')

        .insert({

          anuncio_id: profissional.id,

          solicitante_id: user.id,

          profissional_id: profissional.user_id,

          nome_solicitante: nome.trim(),

          contacto_solicitante: contacto.trim(),

          servico:

            profissional.titulo ||

            profissional.categoria ||

            'Serviço profissional',

          descricao: descricaoPedido.trim(),

          localidade: profissional.localidade,

          data_pretendida: dataPretendidaISO,

          orcamento: valorOrcamento,

          observacoes: observacoes.trim() || null,

          estado: 'pendente',

        });

      if (error) {

        console.error('Erro ao criar pedido de orçamento:', error);

        Alert.alert(

          'Não foi possível enviar',

          'O pedido de orçamento não foi enviado. Tente novamente.'

        );

        return;

      }

      setNome('');

      setContacto('');

      setDescricaoPedido('');

      setDataPretendida('');

      setOrcamento('');

      setObservacoes('');

      setMostrarFormulario(false);

      Alert.alert(

        'Pedido enviado',

        'O seu pedido de orçamento foi enviado ao profissional com sucesso.'

      );

    } catch (error) {

      console.error(error);

      Alert.alert(

        'Erro',

        'Ocorreu um erro ao enviar o pedido de orçamento.'

      );

    } finally {

      setEnviandoPedido(false);

    }

  }

  return (

    <KeyboardAvoidingView

      style={styles.screen}

      behavior={Platform.OS === 'ios' ? 'padding' : undefined}

    >

      <ScrollView

        style={styles.scroll}

        contentContainerStyle={styles.container}

        keyboardShouldPersistTaps="handled"

        showsVerticalScrollIndicator={false}

      >

        <TouchableOpacity

          style={styles.backButton}

          onPress={() => router.back()}

          activeOpacity={0.8}

        >

          <Text style={styles.backText}>‹ Voltar</Text>

        </TouchableOpacity>

        {carregando ? (

          <View style={styles.centerBox}>

            <ActivityIndicator size="large" />

            <Text style={styles.loadingText}>

              A carregar profissional...

            </Text>

          </View>

        ) : erro ? (

          <View style={styles.messageCard}>

            <Text style={styles.messageTitle}>

              Não foi possível carregar

            </Text>

            <Text style={styles.messageText}>{erro}</Text>

            <TouchableOpacity

              style={styles.retryButton}

              onPress={carregarProfissional}

              activeOpacity={0.8}

            >

              <Text style={styles.retryText}>

                Tentar novamente

              </Text>

            </TouchableOpacity>

          </View>

        ) : profissional ? (

          <>

            <View style={styles.headerCard}>

              {profissional.dados_especificos?.imagens?.length ? (

                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>

                  {profissional.dados_especificos.imagens.slice(0, 5).map((url, indice) => (

                    <Image key={`${url}-${indice}`} source={{ uri: url }} style={styles.galleryImage} resizeMode="cover" />

                  ))}

                </ScrollView>

              ) : (

                <View style={styles.avatar}><Text style={styles.avatarText}>📷</Text></View>

              )}

              <Text style={styles.title}>

                {profissional.dados_especificos?.nome_profissional || profissional.dados_especificos?.nome_negocio || profissional.titulo || 'Profissional'}

              </Text>

              <Text style={styles.category}>

                {profissional.categoria || 'Serviço profissional'}

              </Text>

              {profissional.localidade ? (

                <Text style={styles.location}>

                  📍 {profissional.localidade}

                </Text>

              ) : null}

            </View>

            <View style={styles.infoCard}>

              <Text style={styles.sectionTitle}>

                Sobre o profissional

              </Text>

              <Text style={styles.description}>

                {profissional.descricao ||

                  'Este profissional ainda não adicionou uma descrição.'}

              </Text>

            </View>

            <View style={styles.infoCard}>

              <Text style={styles.sectionTitle}>

                Preço

              </Text>

              <Text style={styles.price}>

                {formatarPreco(profissional.preco)}

              </Text>

              {profissional.preco_negociavel ? (

                <Text style={styles.negociavel}>

                  Preço negociável

                </Text>

              ) : null}

            </View>

            {!mostrarFormulario ? (

              <>

                <TouchableOpacity

                  style={styles.primaryButton}

                  onPress={abrirFormularioOrcamento}

                  activeOpacity={0.8}

                >

                  <Text style={styles.primaryButtonText}>

                    Pedir orçamento

                  </Text>

                </TouchableOpacity>

                <TouchableOpacity

                  style={styles.secondaryButton}

                  onPress={verContacto}

                  activeOpacity={0.8}

                >

                  <Text style={styles.secondaryButtonText}>

                    Ver contacto

                  </Text>

                </TouchableOpacity>

              </>

            ) : (

              <View style={styles.formCard}>

                <Text style={styles.formTitle}>

                  Pedir orçamento

                </Text>

                <Text style={styles.formSubtitle}>

                  Preencha os dados abaixo para enviar o pedido ao profissional.

                </Text>

                <Text style={styles.label}>

                  Nome \*

                </Text>

                <TextInput

                  value={nome}

                  onChangeText={setNome}

                  placeholder="O seu nome"

                  placeholderTextColor="#8A8A8A"

                  style={styles.input}

                  autoCapitalize="words"

                />

                <Text style={styles.label}>

                  Contacto \*

                </Text>

                <TextInput

                  value={contacto}

                  onChangeText={setContacto}

                  placeholder="Telefone, WhatsApp ou e-mail"

                  placeholderTextColor="#8A8A8A"

                  style={styles.input}

                  keyboardType="phone-pad"

                />

                <Text style={styles.label}>

                  O que precisa? \*

                </Text>

                <TextInput

                  value={descricaoPedido}

                  onChangeText={setDescricaoPedido}

                  placeholder="Descreva o serviço que pretende..."

                  placeholderTextColor="#8A8A8A"

                  style={[styles.input, styles.textArea]}

                  multiline

                  textAlignVertical="top"

                />

                <Text style={styles.label}>

                  Data pretendida

                </Text>

                <TextInput

                  value={dataPretendida}

                  onChangeText={setDataPretendida}

                  placeholder="Ex.: 20/10/2026"

                  placeholderTextColor="#8A8A8A"

                  style={styles.input}

                />

                <Text style={styles.label}>

                  Orçamento disponível

                </Text>

                <TextInput

                  value={orcamento}

                  onChangeText={setOrcamento}

                  placeholder="Ex.: 100"

                  placeholderTextColor="#8A8A8A"

                  style={styles.input}

                  keyboardType="decimal-pad"

                />

                <Text style={styles.label}>

                  Observações

                </Text>

                <TextInput

                  value={observacoes}

                  onChangeText={setObservacoes}

                  placeholder="Alguma informação adicional..."

                  placeholderTextColor="#8A8A8A"

                  style={[styles.input, styles.textAreaSmall]}

                  multiline

                  textAlignVertical="top"

                />

                <TouchableOpacity

                  style={[

                    styles.primaryButton,

                    enviandoPedido && styles.disabledButton,

                  ]}

                  onPress={enviarPedidoOrcamento}

                  disabled={enviandoPedido}

                  activeOpacity={0.8}

                >

                  {enviandoPedido ? (

                    <ActivityIndicator color="#FFFFFF" />

                  ) : (

                    <Text style={styles.primaryButtonText}>

                      Enviar pedido

                    </Text>

                  )}

                </TouchableOpacity>

                <TouchableOpacity

                  style={styles.cancelButton}

                  onPress={fecharFormularioOrcamento}

                  disabled={enviandoPedido}

                  activeOpacity={0.8}

                >

                  <Text style={styles.cancelButtonText}>

                    Cancelar

                  </Text>

                </TouchableOpacity>

              </View>

            )}

          </>

        ) : null}

      </ScrollView>

    </KeyboardAvoidingView>

  );

}

const styles = StyleSheet.create({

  screen: {

    flex: 1,

    backgroundColor: '#F5F6F8',

  },

  scroll: {

    flex: 1,

  },

  container: {

    paddingHorizontal: 20,

    paddingTop: 55,

    paddingBottom: 40,

  },

  backButton: {

    alignSelf: 'flex-start',

    paddingVertical: 10,

    paddingHorizontal: 2,

    marginBottom: 18,

  },

  backText: {

    color: '#177DBA',

    fontSize: 18,

    fontWeight: '800',

  },

  gallery: { width: '100%', marginBottom: 16 },

  galleryImage: { width: 290, height: 230, borderRadius: 16, marginRight: 10, backgroundColor: '#E8EDF2' },

  headerCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 24,

    padding: 24,

    alignItems: 'center',

    borderWidth: 1,

    borderColor: '#E0E3E8',

    marginBottom: 16,

  },

  avatar: {

    width: 82,

    height: 82,

    borderRadius: 41,

    backgroundColor: '#EAF4FB',

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: 16,

  },

  avatarText: {

    fontSize: 38,

  },

  title: {

    color: '#172033',

    fontSize: 28,

    lineHeight: 34,

    fontWeight: '800',

    textAlign: 'center',

  },

  category: {

    color: '#177DBA',

    fontSize: 17,

    fontWeight: '800',

    marginTop: 8,

    textAlign: 'center',

  },

  location: {

    color: '#626B78',

    fontSize: 16,

    marginTop: 10,

    textAlign: 'center',

  },

  infoCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 20,

    borderWidth: 1,

    borderColor: '#E0E3E8',

    padding: 20,

    marginBottom: 16,

  },

  sectionTitle: {

    color: '#172033',

    fontSize: 20,

    fontWeight: '800',

    marginBottom: 10,

  },

  description: {

    color: '#626B78',

    fontSize: 16,

    lineHeight: 25,

  },

  price: {

    color: '#172033',

    fontSize: 22,

    fontWeight: '800',

  },

  negociavel: {

    color: '#177DBA',

    fontSize: 15,

    fontWeight: '700',

    marginTop: 6,

  },

  primaryButton: {

    backgroundColor: '#177DBA',

    minHeight: 58,

    borderRadius: 16,

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: 12,

  },

  primaryButtonText: {

    color: '#FFFFFF',

    fontSize: 18,

    fontWeight: '800',

  },

  secondaryButton: {

    backgroundColor: '#FFFFFF',

    minHeight: 58,

    borderRadius: 16,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    borderColor: '#177DBA',

  },

  secondaryButtonText: {

    color: '#177DBA',

    fontSize: 18,

    fontWeight: '800',

  },

  formCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 22,

    borderWidth: 1,

    borderColor: '#E0E3E8',

    padding: 20,

    marginBottom: 16,

  },

  formTitle: {

    color: '#172033',

    fontSize: 24,

    fontWeight: '800',

    marginBottom: 8,

  },

  formSubtitle: {

    color: '#626B78',

    fontSize: 15,

    lineHeight: 22,

    marginBottom: 20,

  },

  label: {

    color: '#172033',

    fontSize: 15,

    fontWeight: '800',

    marginBottom: 7,

    marginTop: 10,

  },

  input: {

    backgroundColor: '#F8F9FA',

    borderWidth: 1,

    borderColor: '#D9DDE3',

    borderRadius: 14,

    minHeight: 52,

    paddingHorizontal: 14,

    color: '#172033',

    fontSize: 16,

  },

  textArea: {

    minHeight: 110,

    paddingTop: 14,

    paddingBottom: 14,

  },

  textAreaSmall: {

    minHeight: 90,

    paddingTop: 14,

    paddingBottom: 14,

  },

  cancelButton: {

    backgroundColor: '#FFFFFF',

    minHeight: 54,

    borderRadius: 16,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    borderColor: '#D9DDE3',

  },

  cancelButtonText: {

    color: '#626B78',

    fontSize: 17,

    fontWeight: '800',

  },

  disabledButton: {

    opacity: 0.65,

  },

  centerBox: {

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 80,

  },

  loadingText: {

    color: '#626B78',

    fontSize: 16,

    marginTop: 14,

  },

  messageCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 20,

    borderWidth: 1,

    borderColor: '#E0E3E8',

    padding: 22,

    marginTop: 10,

  },

  messageTitle: {

    color: '#172033',

    fontSize: 20,

    fontWeight: '800',

    marginBottom: 8,

  },

  messageText: {

    color: '#626B78',

    fontSize: 16,

    lineHeight: 24,

  },

  retryButton: {

    marginTop: 18,

    backgroundColor: '#177DBA',

    borderRadius: 14,

    minHeight: 50,

    alignItems: 'center',

    justifyContent: 'center',

  },

  retryText: {

    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '800',

  },

});
