import AsyncStorage from '@react-native-async-storage/async-storage';

import { useRouter } from 'expo-router';

import { useCallback, useEffect, useState } from 'react';



import {
  ActivityIndicator,

  Alert,

  Modal,

  Pressable,

  RefreshControl,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  View,
} from 'react-native';



import { supabase } from '../supabase';



type Evento = {

  id: string;

  titulo: string | null;

  descricao: string | null;

  categoria: string | null;

  localidade: string | null;

  contato: string | null;

  publicado_em: string | null;

  dados_especificos: Record<string, any> | null;

};



const TIPO_EVENTO = 'Evento';

const CHAVE_REGIAO = '@conecta_regiao';

type Regiao = 'Guimarães' | 'Vizela' | 'Fafe';

function normalizarTexto(texto: string | null | undefined) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}



const CATEGORIAS = [

  'Cultura',

  'Música',

  'Desporto',

  'Gastronomia',

  'Festas e festivais',

  'Feiras e mercados',

  'Infantil',

  'Formação',

  'Religião',

  'Comunidade',

  'Outros',

];



export default function EventosScreen() {

  const router = useRouter();



  const [modo, setModo] = useState<'lista' | 'criar'>('lista');

  const [regiaoSelecionada, setRegiaoSelecionada] = useState<Regiao>('Guimarães');



  const [eventos, setEventos] = useState<Evento[]>([]);

  const [eventoSelecionado, setEventoSelecionado] =

    useState<Evento | null>(null);



  const [carregando, setCarregando] = useState(true);

  const [atualizando, setAtualizando] = useState(false);



  const [titulo, setTitulo] = useState('');

  const [descricao, setDescricao] = useState('');

  const [categoria, setCategoria] = useState('');

  const [dataEvento, setDataEvento] = useState('');

  const [horaEvento, setHoraEvento] = useState('');

  const [localidade, setLocalidade] = useState('Guimarães');

  const [organizador, setOrganizador] = useState('');

  const [contato, setContato] = useState('');



  const [visibilidade, setVisibilidade] = useState<

    'publico' | 'privado'

  >('publico');



  const [aceitouResponsabilidade, setAceitouResponsabilidade] =

    useState(false);



  const [enviando, setEnviando] = useState(false);



  async function carregarRegiao() {
    try {
      const regiaoSalva = await AsyncStorage.getItem(CHAVE_REGIAO);

      if (
        regiaoSalva === 'Guimarães' ||
        regiaoSalva === 'Vizela' ||
        regiaoSalva === 'Fafe'
      ) {
        setRegiaoSelecionada(regiaoSalva);
        setLocalidade(regiaoSalva);
        return regiaoSalva as Regiao;
      }
    } catch (error) {
      console.error('Erro ao carregar região:', error);
    }

    setRegiaoSelecionada('Guimarães');
    setLocalidade('Guimarães');
    return 'Guimarães' as Regiao;
  }



  const carregarEventos = useCallback(async (regiao: Regiao) => {

    try {

      const { data, error } = await supabase

        .from('anuncios')

        .select(

          'id, titulo, descricao, categoria, localidade, contato, publicado_em, dados_especificos',

        )

        .eq('estado', 'publicado')

        .eq('tipo_anuncio', TIPO_EVENTO)

        .order('publicado_em', { ascending: false });



      if (error) {

        console.error('Erro ao carregar eventos:', error);



        Alert.alert(

          'Eventos',

          'Não foi possível carregar os eventos neste momento.',

        );



        setEventos([]);

        return;

      }



      const eventosPublicos = ((data || []) as Evento[]).filter(

        (evento) => {

          const dados = evento.dados_especificos || {};



          if (dados.visibilidade === 'privado') {
            return false;
          }



          return (
            normalizarTexto(evento.localidade).includes(
              normalizarTexto(regiao),
            )
          );

        },

      );



      setEventos(eventosPublicos);

    } catch (error) {

      console.error('Erro ao carregar eventos:', error);



      Alert.alert(

        'Eventos',

        'Ocorreu um erro ao carregar os eventos.',

      );



      setEventos([]);

    } finally {

      setCarregando(false);

      setAtualizando(false);

    }

  }, []);



  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      const regiao = await carregarRegiao();

      if (ativo) {
        await carregarEventos(regiao);
      }
    }

    iniciar();

    return () => {
      ativo = false;
    };
  }, []);



  async function atualizarEventos() {

    setAtualizando(true);

    await carregarEventos(regiaoSelecionada);

  }



  function limparFormulario() {

    setTitulo('');

    setDescricao('');

    setCategoria('');

    setDataEvento('');

    setHoraEvento('');

    setLocalidade(regiaoSelecionada);

    setOrganizador('');

    setContato('');

    setVisibilidade('publico');

    setAceitouResponsabilidade(false);

  }



  function voltarParaLista() {

    limparFormulario();

    setModo('lista');

  }



  async function criarEvento() {

    if (!titulo.trim()) {

      Alert.alert('Dados em falta', 'Indique o nome do evento.');

      return;

    }



    if (!descricao.trim()) {

      Alert.alert('Dados em falta', 'Escreva uma descrição do evento.');

      return;

    }



    if (!categoria.trim()) {

      Alert.alert('Dados em falta', 'Selecione uma categoria.');

      return;

    }



    if (!dataEvento.trim()) {

      Alert.alert(

        'Dados em falta',

        'Indique a data do evento.',

      );

      return;

    }



    if (!horaEvento.trim()) {

      Alert.alert(

        'Dados em falta',

        'Indique a hora do evento.',

      );

      return;

    }



    if (!localidade.trim()) {

      Alert.alert(

        'Dados em falta',

        'Indique o local ou a localidade do evento.',

      );

      return;

    }



    if (!organizador.trim()) {

      Alert.alert(

        'Dados em falta',

        'Indique o nome do organizador ou produtor.',

      );

      return;

    }



    if (!aceitouResponsabilidade) {

      Alert.alert(

        'Declaração obrigatória',

        'É necessário aceitar a declaração de responsabilidade para enviar o evento.',

      );

      return;

    }



    setEnviando(true);



    try {

      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();



      if (userError) {

        throw userError;

      }



      if (!user) {

        Alert.alert(

          'É necessário iniciar sessão',

          'Entre na sua conta antes de criar um evento.',

        );



        router.push('/conta');

        return;

      }



      const dadosEvento = {

        tipo: 'evento',

        visibilidade,

        data_evento: dataEvento.trim(),

        hora_evento: horaEvento.trim(),

        organizador: organizador.trim(),

        aceitou_responsabilidade: true,

        responsabilidade_versao: '1.0',

        criado_em: new Date().toISOString(),

      };



      const { error } = await supabase.from('anuncios').insert({

        user_id: user.id,

        titulo: titulo.trim(),

        descricao: descricao.trim(),

        tipo_anuncio: TIPO_EVENTO,

        categoria: categoria.trim(),

        localidade: localidade.trim(),

        preco: null,

        preco_negociavel: false,

        contato: contato.trim() || null,

        estado: 'em_analise',

        dados_especificos: dadosEvento,

      });



      if (error) {

        throw error;

      }



      Alert.alert(

        'Evento enviado',

        'O seu evento foi enviado para análise. Ele só ficará disponível no Conecta depois de ser aprovado pelo moderador.',

        [

          {

            text: 'OK',

            onPress: () => {

              limparFormulario();

              setModo('lista');

              carregarEventos(regiaoSelecionada);

            },

          },

        ],

      );

    } catch (error: any) {

      console.error('Erro ao criar evento:', error);



      Alert.alert(

        'Não foi possível enviar',

        error?.message ||

          'Ocorreu um erro ao enviar o evento. Tente novamente.',

      );

    } finally {

      setEnviando(false);

    }

  }



  function formatarData(data: string | undefined) {

    if (!data) {

      return '';

    }



    const partes = data.split('-');



    if (partes.length === 3) {

      return `${partes[2]}/${partes[1]}/${partes[0]}`;

    }



    return data;

  }



  function nomeMes(data: string | undefined) {

    if (!data) {

      return '';

    }



    const mes = data.split('-')[1];



    const meses: Record<string, string> = {

      '01': 'JAN',

      '02': 'FEV',

      '03': 'MAR',

      '04': 'ABR',

      '05': 'MAI',

      '06': 'JUN',

      '07': 'JUL',

      '08': 'AGO',

      '09': 'SET',

      '10': 'OUT',

      '11': 'NOV',

      '12': 'DEZ',

    };



    return meses[mes] || '';

  }



  function abrirEvento(evento: Evento) {

    setEventoSelecionado(evento);

  }



  function fecharEvento() {

    setEventoSelecionado(null);

  }



  if (modo === 'criar') {

    return (

      <View style={styles.container}>

        <ScrollView

          contentContainerStyle={styles.content}

          keyboardShouldPersistTaps="handled"

          showsVerticalScrollIndicator={false}

        >

          <Pressable

            style={styles.backButton}

            onPress={voltarParaLista}

          >

            <Text style={styles.backButtonText}>‹ Voltar</Text>

          </Pressable>



          <Text style={styles.title}>Criar evento</Text>



          <Text style={styles.subtitle}>

            Crie gratuitamente o seu evento. Depois de enviado, ele será

            analisado pelo moderador antes de ser publicado.

          </Text>



          <View style={styles.infoBox}>

            <Text style={styles.infoTitle}>

              🛡️ Publicação mediante aprovação

            </Text>



            <Text style={styles.infoText}>

              Todos os eventos passam por moderação. O evento só ficará

              disponível publicamente depois de aprovado.

            </Text>

          </View>



          <Text style={styles.label}>Nome do evento *</Text>



          <TextInput

            style={styles.input}

            placeholder="Ex.: Feira Medieval de Guimarães"

            placeholderTextColor="#8A929A"

            value={titulo}

            onChangeText={setTitulo}

          />



          <Text style={styles.label}>Descrição *</Text>



          <TextInput

            style={[styles.input, styles.textarea]}

            placeholder="Descreva o evento..."

            placeholderTextColor="#8A929A"

            value={descricao}

            onChangeText={setDescricao}

            multiline

            textAlignVertical="top"

          />



          <Text style={styles.label}>Categoria *</Text>



          <View style={styles.categoryGrid}>

            {CATEGORIAS.map((item) => {

              const selecionada = categoria === item;



              return (

                <Pressable

                  key={item}

                  style={[

                    styles.categoryButton,

                    selecionada && styles.categoryButtonActive,

                  ]}

                  onPress={() => setCategoria(item)}

                >

                  <Text

                    style={[

                      styles.categoryButtonText,

                      selecionada &&

                        styles.categoryButtonTextActive,

                    ]}

                  >

                    {item}

                  </Text>

                </Pressable>

              );

            })}

          </View>



          <Text style={styles.label}>Data do evento *</Text>



          <TextInput

            style={styles.input}

            placeholder="AAAA-MM-DD"

            placeholderTextColor="#8A929A"

            value={dataEvento}

            onChangeText={setDataEvento}

            keyboardType="numbers-and-punctuation"

          />



          <Text style={styles.helperText}>

            Exemplo: 2026-12-20

          </Text>



          <Text style={styles.label}>Hora do evento *</Text>



          <TextInput

            style={styles.input}

            placeholder="HH:MM"

            placeholderTextColor="#8A929A"

            value={horaEvento}

            onChangeText={setHoraEvento}

            keyboardType="numbers-and-punctuation"

          />



          <Text style={styles.helperText}>

            Exemplo: 20:30

          </Text>



          <Text style={styles.label}>Local / localidade *</Text>



          <TextInput

            style={styles.input}

            placeholder="Ex.: Centro Histórico de Guimarães"

            placeholderTextColor="#8A929A"

            value={localidade}

            onChangeText={setLocalidade}

          />



          <Text style={styles.label}>

            Organizador / produtor *

          </Text>



          <TextInput

            style={styles.input}

            placeholder="Nome do organizador ou entidade"

            placeholderTextColor="#8A929A"

            value={organizador}

            onChangeText={setOrganizador}

          />



          <Text style={styles.label}>Contacto</Text>



          <TextInput

            style={styles.input}

            placeholder="Telefone, WhatsApp ou outro contacto"

            placeholderTextColor="#8A929A"

            value={contato}

            onChangeText={setContato}

            keyboardType="phone-pad"

          />



          <Text style={styles.sectionTitle}>

            Visibilidade do evento

          </Text>



          <View style={styles.visibilityRow}>

            <Pressable

              style={[

                styles.visibilityCard,

                visibilidade === 'publico' &&

                  styles.visibilityCardActive,

              ]}

              onPress={() => setVisibilidade('publico')}

            >

              <Text style={styles.visibilityIcon}>🌐</Text>



              <Text

                style={[

                  styles.visibilityTitle,

                  visibilidade === 'publico' &&

                    styles.visibilityTitleActive,

                ]}

              >

                Público

              </Text>



              <Text style={styles.visibilityDescription}>

                Aparece na área pública de Eventos depois de aprovado.

              </Text>

            </Pressable>



            <Pressable

              style={[

                styles.visibilityCard,

                visibilidade === 'privado' &&

                  styles.visibilityCardActive,

              ]}

              onPress={() => setVisibilidade('privado')}

            >

              <Text style={styles.visibilityIcon}>🔒</Text>



              <Text

                style={[

                  styles.visibilityTitle,

                  visibilidade === 'privado' &&

                    styles.visibilityTitleActive,

                ]}

              >

                Privado

              </Text>



              <Text style={styles.visibilityDescription}>

                Não aparece na listagem pública de Eventos.

              </Text>

            </Pressable>

          </View>



          <View style={styles.warningBox}>

            <Text style={styles.warningTitle}>

              Responsabilidade do organizador

            </Text>



            <Text style={styles.warningText}>

              Os eventos publicados no Conecta Guimarães são de exclusiva

              responsabilidade dos respetivos organizadores e produtores.

              O Conecta Guimarães atua apenas como plataforma de divulgação

              e não é responsável pela organização, realização, alteração,

              cancelamento, bilheteira, segurança ou demais condições

              relacionadas com o evento.

            </Text>



            <Text style={styles.warningText}>

              O organizador é responsável pela veracidade das informações

              fornecidas e pelos direitos de utilização dos conteúdos,

              imagens e materiais utilizados na publicação.

            </Text>

          </View>



          <Pressable

            style={styles.checkboxRow}

            onPress={() =>

              setAceitouResponsabilidade(

                !aceitouResponsabilidade,

              )

            }

          >

            <View

              style={[

                styles.checkbox,

                aceitouResponsabilidade &&

                  styles.checkboxActive,

              ]}

            >

              {aceitouResponsabilidade && (

                <Text style={styles.checkmark}>✓</Text>

              )}

            </View>



            <Text style={styles.checkboxText}>

              Declaro que sou responsável pelas informações e conteúdos

              deste evento e aceito os Termos de Publicação de Eventos do

              Conecta Guimarães.

            </Text>

          </Pressable>



          <Pressable

            style={[

              styles.submitButton,

              enviando && styles.submitButtonDisabled,

            ]}

            onPress={criarEvento}

            disabled={enviando}

          >

            {enviando ? (

              <ActivityIndicator color="#FFFFFF" />

            ) : (

              <Text style={styles.submitButtonText}>

                Enviar evento para aprovação

              </Text>

            )}

          </Pressable>



          <Text style={styles.freeText}>

            ✓ Criação gratuita

            {'\n'}

            ✓ Publicação gratuita

            {'\n'}

            ✓ Sem subscrição

          </Text>



          <View style={{ height: 40 }} />

        </ScrollView>

      </View>

    );

  }



  return (

    <View style={styles.container}>

      <ScrollView

        contentContainerStyle={styles.content}

        refreshControl={

          <RefreshControl

            refreshing={atualizando}

            onRefresh={atualizarEventos}

          />

        }

        showsVerticalScrollIndicator={false}

      >

        <Pressable

          style={styles.backButton}

          onPress={() => router.back()}

        >

          <Text style={styles.backButtonText}>‹ Voltar</Text>

        </Pressable>



        <View style={styles.headerRow}>

          <View style={styles.headerTextContainer}>

            <Text style={styles.title}>Eventos</Text>



            <Text style={styles.subtitle}>

              Descubra o que acontece em {regiaoSelecionada} e região.

            </Text>

          </View>



          <Text style={styles.headerIcon}>📅</Text>

        </View>



        <View style={styles.noticeBox}>

          <Text style={styles.noticeTitle}>

            Eventos da comunidade

          </Text>



          <Text style={styles.noticeText}>

            Qualquer utilizador pode criar um evento gratuitamente. Todos

            os eventos passam por aprovação do moderador antes de serem

            publicados.

          </Text>

        </View>



        <Pressable

          style={styles.createButton}

          onPress={() => setModo('criar')}

        >

          <Text style={styles.createButtonIcon}>＋</Text>



          <View style={{ flex: 1 }}>

            <Text style={styles.createButtonTitle}>

              Criar um evento

            </Text>



            <Text style={styles.createButtonSubtitle}>

              Publique gratuitamente no Conecta

            </Text>

          </View>

        </Pressable>



        <Text style={styles.listTitle}>

          Próximos eventos em {regiaoSelecionada}

        </Text>



        {carregando ? (

          <View style={styles.loadingBox}>

            <ActivityIndicator size="large" />



            <Text style={styles.loadingText}>

              A carregar eventos...

            </Text>

          </View>

        ) : eventos.length === 0 ? (

          <View style={styles.emptyBox}>

            <Text style={styles.emptyIcon}>📅</Text>



            <Text style={styles.emptyTitle}>

              Ainda não há eventos em {regiaoSelecionada}

            </Text>



            <Text style={styles.emptyText}>

              Ainda não existem eventos publicados nesta região. Seja o primeiro a criar um evento para a comunidade.

            </Text>



            <Pressable

              style={styles.emptyButton}

              onPress={() => setModo('criar')}

            >

              <Text style={styles.emptyButtonText}>

                Criar primeiro evento

              </Text>

            </Pressable>

          </View>

        ) : (

          eventos.map((evento) => {

            const dados = evento.dados_especificos || {};



            return (

              <Pressable

                key={evento.id}

                style={styles.eventCard}

                onPress={() => abrirEvento(evento)}

              >

                <View style={styles.eventDateBox}>

                  <Text style={styles.eventDateDay}>

                    {dados.data_evento

                      ? dados.data_evento.split('-')[2]

                      : '—'}

                  </Text>



                  <Text style={styles.eventDateMonth}>

                    {nomeMes(dados.data_evento)}

                  </Text>

                </View>



                <View style={styles.eventContent}>

                  <View style={styles.eventCategoryRow}>

                    <Text style={styles.eventCategory}>

                      {evento.categoria || 'Evento'}

                    </Text>

                  </View>



                  <Text

                    style={styles.eventTitle}

                    numberOfLines={2}

                  >

                    {evento.titulo || 'Evento'}

                  </Text>



                  <Text

                    style={styles.eventDescription}

                    numberOfLines={2}

                  >

                    {evento.descricao || ''}

                  </Text>



                  <Text style={styles.eventInfo}>

                    🕐 {dados.hora_evento || 'Hora não informada'}

                  </Text>



                  <Text style={styles.eventInfo}>

                    📍 {evento.localidade || 'Local não informado'}

                  </Text>



                  {dados.organizador ? (

                    <Text style={styles.eventOrganizer}>

                      Organizado por {dados.organizador}

                    </Text>

                  ) : null}

                </View>

              </Pressable>

            );

          })

        )}



        <View style={styles.footerNotice}>

          <Text style={styles.footerNoticeTitle}>

            Importante

          </Text>



          <Text style={styles.footerNoticeText}>

            Os eventos são de exclusiva responsabilidade dos seus

            organizadores e produtores. A aprovação pelo Conecta não

            representa garantia ou certificação da realização, segurança,

            qualidade ou condições do evento.

          </Text>

        </View>



        <View style={{ height: 40 }} />

      </ScrollView>



      <Modal

        visible={eventoSelecionado !== null}

        animationType="slide"

        presentationStyle="pageSheet"

        onRequestClose={fecharEvento}

      >

        {eventoSelecionado && (

          <View style={styles.modalContainer}>

            <ScrollView

              contentContainerStyle={styles.modalContent}

              showsVerticalScrollIndicator={false}

            >

              <Pressable

                style={styles.modalBackButton}

                onPress={fecharEvento}

              >

                <Text style={styles.modalBackText}>

                  ‹ Voltar aos eventos

                </Text>

              </Pressable>



              <View style={styles.modalIconBox}>

                <Text style={styles.modalIcon}>📅</Text>

              </View>



              <Text style={styles.modalCategory}>

                {eventoSelecionado.categoria || 'EVENTO'}

              </Text>



              <Text style={styles.modalTitle}>

                {eventoSelecionado.titulo || 'Evento'}

              </Text>



              <View style={styles.modalInfoCard}>

                <Text style={styles.modalInfoLabel}>

                  📅 DATA

                </Text>



                <Text style={styles.modalInfoValue}>

                  {formatarData(

                    eventoSelecionado.dados_especificos

                      ?.data_evento,

                  ) || 'Data não informada'}

                </Text>



                <Text style={styles.modalInfoLabel}>

                  🕐 HORA

                </Text>



                <Text style={styles.modalInfoValue}>

                  {eventoSelecionado.dados_especificos

                    ?.hora_evento || 'Hora não informada'}

                </Text>



                <Text style={styles.modalInfoLabel}>

                  📍 LOCAL

                </Text>



                <Text style={styles.modalInfoValue}>

                  {eventoSelecionado.localidade ||

                    'Local não informado'}

                </Text>



                <Text style={styles.modalInfoLabel}>

                  👤 ORGANIZADOR

                </Text>



                <Text style={styles.modalInfoValue}>

                  {eventoSelecionado.dados_especificos

                    ?.organizador || 'Não informado'}

                </Text>

              </View>



              <Text style={styles.modalSectionTitle}>

                Sobre o evento

              </Text>



              <Text style={styles.modalDescription}>

                {eventoSelecionado.descricao ||

                  'Não foi fornecida uma descrição para este evento.'}

              </Text>



              {eventoSelecionado.contato ? (

                <>

                  <Text style={styles.modalSectionTitle}>

                    Contacto

                  </Text>



                  <View style={styles.contactCard}>

                    <Text style={styles.contactText}>

                      {eventoSelecionado.contato}

                    </Text>

                  </View>

                </>

              ) : null}



              <View style={styles.modalResponsibilityBox}>

                <Text style={styles.modalResponsibilityTitle}>

                  Responsabilidade do evento

                </Text>



                <Text style={styles.modalResponsibilityText}>

                  Este evento é de exclusiva responsabilidade do

                  respetivo organizador ou produtor. O Conecta

                  Guimarães atua apenas como plataforma de divulgação.

                  A aprovação do evento não representa garantia da sua

                  realização, segurança, qualidade ou condições.

                </Text>

              </View>



              <View style={{ height: 35 }} />

            </ScrollView>

          </View>

        )}

      </Modal>

    </View>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#F7F9FB',

  },



  content: {

    padding: 20,

    paddingBottom: 30,

  },



  backButton: {

    alignSelf: 'flex-start',

    marginBottom: 12,

    paddingVertical: 6,

  },



  backButtonText: {

    fontSize: 16,

    fontWeight: '600',

    color: '#1267A5',

  },



  headerRow: {

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 18,

  },



  headerTextContainer: {

    flex: 1,

  },



  headerIcon: {

    fontSize: 42,

    marginLeft: 10,

  },



  title: {

    fontSize: 30,

    fontWeight: '800',

    color: '#16212B',

    marginBottom: 6,

  },



  subtitle: {

    fontSize: 15,

    lineHeight: 22,

    color: '#66717C',

  },



  noticeBox: {

    backgroundColor: '#EAF4FB',

    borderRadius: 16,

    padding: 16,

    marginBottom: 16,

    borderWidth: 1,

    borderColor: '#D6E9F6',

  },



  noticeTitle: {

    fontSize: 16,

    fontWeight: '800',

    color: '#1267A5',

    marginBottom: 6,

  },



  noticeText: {

    fontSize: 14,

    lineHeight: 21,

    color: '#43515D',

  },



  createButton: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#1267A5',

    borderRadius: 16,

    padding: 16,

    marginBottom: 24,

  },



  createButtonIcon: {

    color: '#FFFFFF',

    fontSize: 30,

    fontWeight: '300',

    marginRight: 12,

  },



  createButtonTitle: {

    color: '#FFFFFF',

    fontSize: 17,

    fontWeight: '800',

    marginBottom: 3,

  },



  createButtonSubtitle: {

    color: '#DDEFFF',

    fontSize: 13,

  },



  listTitle: {

    fontSize: 21,

    fontWeight: '800',

    color: '#16212B',

    marginBottom: 14,

  },



  loadingBox: {

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 60,

  },



  loadingText: {

    marginTop: 12,

    fontSize: 14,

    color: '#6C7680',

  },



  emptyBox: {

    backgroundColor: '#FFFFFF',

    borderRadius: 18,

    padding: 28,

    alignItems: 'center',

    borderWidth: 1,

    borderColor: '#E2E6EA',

  },



  emptyIcon: {

    fontSize: 42,

    marginBottom: 10,

  },



  emptyTitle: {

    fontSize: 20,

    fontWeight: '800',

    color: '#16212B',

    marginBottom: 7,

  },



  emptyText: {

    textAlign: 'center',

    color: '#69747E',

    fontSize: 14,

    lineHeight: 21,

    marginBottom: 18,

  },



  emptyButton: {

    backgroundColor: '#1267A5',

    paddingHorizontal: 18,

    paddingVertical: 12,

    borderRadius: 12,

  },



  emptyButtonText: {

    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '700',

  },



  eventCard: {

    flexDirection: 'row',

    backgroundColor: '#FFFFFF',

    borderRadius: 17,

    marginBottom: 14,

    overflow: 'hidden',

    borderWidth: 1,

    borderColor: '#E2E6EA',

  },



  eventDateBox: {

    width: 76,

    backgroundColor: '#EAF4FB',

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 16,

  },



  eventDateDay: {

    fontSize: 27,

    fontWeight: '800',

    color: '#1267A5',

  },



  eventDateMonth: {

    fontSize: 12,

    fontWeight: '800',

    color: '#1267A5',

    marginTop: 2,

  },



  eventContent: {

    flex: 1,

    padding: 14,

  },



  eventCategoryRow: {

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 5,

  },



  eventCategory: {

    fontSize: 12,

    fontWeight: '800',

    color: '#1267A5',

    textTransform: 'uppercase',

  },



  eventTitle: {

    fontSize: 18,

    fontWeight: '800',

    color: '#17222C',

    marginBottom: 5,

  },



  eventDescription: {

    fontSize: 13,

    lineHeight: 19,

    color: '#65717C',

    marginBottom: 8,

  },



  eventInfo: {

    fontSize: 13,

    color: '#4C5964',

    marginTop: 3,

  },



  eventOrganizer: {

    fontSize: 12,

    color: '#7A848D',

    marginTop: 7,

    fontStyle: 'italic',

  },



  footerNotice: {

    marginTop: 22,

    backgroundColor: '#FFF8E8',

    borderRadius: 15,

    padding: 15,

    borderWidth: 1,

    borderColor: '#F1DFB2',

  },



  footerNoticeTitle: {

    fontSize: 14,

    fontWeight: '800',

    color: '#785A17',

    marginBottom: 5,

  },



  footerNoticeText: {

    fontSize: 12,

    lineHeight: 18,

    color: '#6D603F',

  },



  label: {

    fontSize: 14,

    fontWeight: '800',

    color: '#303A43',

    marginTop: 17,

    marginBottom: 7,

  },



  input: {

    backgroundColor: '#FFFFFF',

    borderWidth: 1,

    borderColor: '#D9DEE3',

    borderRadius: 12,

    minHeight: 48,

    paddingHorizontal: 14,

    fontSize: 15,

    color: '#17222C',

  },



  textarea: {

    minHeight: 120,

    paddingTop: 14,

  },



  helperText: {

    fontSize: 12,

    color: '#7B858E',

    marginTop: 5,

  },



  categoryGrid: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 8,

  },



  categoryButton: {

    borderWidth: 1,

    borderColor: '#D7DDE2',

    backgroundColor: '#FFFFFF',

    borderRadius: 20,

    paddingHorizontal: 13,

    paddingVertical: 9,

  },



  categoryButtonActive: {

    backgroundColor: '#EAF4FB',

    borderColor: '#1267A5',

  },



  categoryButtonText: {

    fontSize: 13,

    color: '#5F6972',

    fontWeight: '600',

  },



  categoryButtonTextActive: {

    color: '#1267A5',

    fontWeight: '800',

  },



  sectionTitle: {

    fontSize: 18,

    fontWeight: '800',

    color: '#16212B',

    marginTop: 24,

    marginBottom: 10,

  },



  visibilityRow: {

    flexDirection: 'row',

    gap: 10,

  },



  visibilityCard: {

    flex: 1,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,

    borderColor: '#D9DEE3',

    borderRadius: 15,

    padding: 14,

  },



  visibilityCardActive: {

    borderColor: '#1267A5',

    backgroundColor: '#F1F8FC',

  },



  visibilityIcon: {

    fontSize: 24,

    marginBottom: 7,

  },



  visibilityTitle: {

    fontSize: 16,

    fontWeight: '800',

    color: '#26313A',

    marginBottom: 5,

  },



  visibilityTitleActive: {

    color: '#1267A5',

  },



  visibilityDescription: {

    fontSize: 12,

    lineHeight: 17,

    color: '#69747E',

  },



  warningBox: {

    backgroundColor: '#FFF8E8',

    borderWidth: 1,

    borderColor: '#EED9A5',

    borderRadius: 15,

    padding: 15,

    marginTop: 20,

  },



  warningTitle: {

    fontSize: 15,

    fontWeight: '800',

    color: '#735616',

    marginBottom: 8,

  },



  warningText: {

    fontSize: 12,

    lineHeight: 18,

    color: '#665A3D',

    marginBottom: 8,

  },



  checkboxRow: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    marginTop: 18,

  },



  checkbox: {

    width: 23,

    height: 23,

    borderWidth: 2,

    borderColor: '#B7BEC5',

    borderRadius: 6,

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 10,

    backgroundColor: '#FFFFFF',

  },



  checkboxActive: {

    backgroundColor: '#1267A5',

    borderColor: '#1267A5',

  },



  checkmark: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '900',

  },



  checkboxText: {

    flex: 1,

    fontSize: 13,

    lineHeight: 19,

    color: '#4E5963',

  },



  submitButton: {

    backgroundColor: '#1267A5',

    borderRadius: 13,

    minHeight: 52,

    alignItems: 'center',

    justifyContent: 'center',

    marginTop: 22,

  },



  submitButtonDisabled: {

    opacity: 0.7,

  },



  submitButtonText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',

  },



  freeText: {

    textAlign: 'center',

    color: '#5C6872',

    fontSize: 13,

    lineHeight: 21,

    marginTop: 14,

  },



  infoBox: {

    backgroundColor: '#EAF4FB',

    borderRadius: 14,

    padding: 14,

    marginTop: 4,

  },



  infoTitle: {

    color: '#1267A5',

    fontSize: 14,

    fontWeight: '800',

    marginBottom: 5,

  },



  infoText: {

    color: '#4C5964',

    fontSize: 13,

    lineHeight: 19,

  },



  modalContainer: {

    flex: 1,

    backgroundColor: '#F7F9FB',

  },



  modalContent: {

    padding: 20,

    paddingTop: 18,

    paddingBottom: 40,

  },



  modalBackButton: {

    alignSelf: 'flex-start',

    paddingVertical: 8,

    marginBottom: 16,

  },



  modalBackText: {

    color: '#1267A5',

    fontSize: 16,

    fontWeight: '700',

  },



  modalIconBox: {

    width: 72,

    height: 72,

    borderRadius: 20,

    backgroundColor: '#EAF4FB',

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: 16,

  },



  modalIcon: {

    fontSize: 36,

  },



  modalCategory: {

    fontSize: 12,

    fontWeight: '800',

    color: '#1267A5',

    textTransform: 'uppercase',

    marginBottom: 6,

  },



  modalTitle: {

    fontSize: 30,

    lineHeight: 36,

    fontWeight: '800',

    color: '#16212B',

    marginBottom: 20,

  },



  modalInfoCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 17,

    padding: 17,

    borderWidth: 1,

    borderColor: '#E1E5E8',

    marginBottom: 22,

  },



  modalInfoLabel: {

    fontSize: 11,

    fontWeight: '800',

    color: '#7A858E',

    marginTop: 5,

    marginBottom: 3,

  },



  modalInfoValue: {

    fontSize: 16,

    color: '#25313A',

    fontWeight: '600',

    marginBottom: 9,

  },



  modalSectionTitle: {

    fontSize: 19,

    fontWeight: '800',

    color: '#16212B',

    marginBottom: 8,

  },



  modalDescription: {

    fontSize: 15,

    lineHeight: 23,

    color: '#4E5963',

    marginBottom: 22,

  },



  contactCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 14,

    borderWidth: 1,

    borderColor: '#E1E5E8',

    padding: 15,

    marginBottom: 22,

  },



  contactText: {

    fontSize: 16,

    fontWeight: '700',

    color: '#1267A5',

  },



  modalResponsibilityBox: {

    backgroundColor: '#FFF8E8',

    borderWidth: 1,

    borderColor: '#EED9A5',

    borderRadius: 15,

    padding: 15,

    marginTop: 5,

  },



  modalResponsibilityTitle: {

    fontSize: 15,

    fontWeight: '800',

    color: '#735616',

    marginBottom: 7,

  },



  modalResponsibilityText: {

    fontSize: 12,

    lineHeight: 18,

    color: '#665A3D',

  },

});