import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

type VagaEmprego = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  categoria: string | null;
  localidade: string | null;
  publicado_em: string | null;
  dados_especificos: any;
};

const CHAVE_REGIAO = '@conecta_regiao';

function normalizarTexto(valor: string | null | undefined) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function EmpregosScreen() {
  const router = useRouter();

  const [vagas, setVagas] = useState<VagaEmprego[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [session, setSession] = useState<Session | null>(null);

  const [regiaoSelecionada, setRegiaoSelecionada] =
    useState('Guimarães');

  const [empresa, setEmpresa] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [localidade, setLocalidade] = useState('Guimarães');
  const [tipoContrato, setTipoContrato] = useState('');
  const [regime, setRegime] = useState('');
  const [salario, setSalario] = useState('');
  const [contacto, setContacto] = useState('');
  const [email, setEmail] = useState('');
  const [candidatura, setCandidatura] = useState('');

  const [aceitouResponsabilidade, setAceitouResponsabilidade] =
    useState(false);

  const [publicando, setPublicando] = useState(false);

  useEffect(() => {
    carregarSessao();
    carregarRegiao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function carregarRegiao() {
    try {
      const regiaoSalva = await AsyncStorage.getItem(
        CHAVE_REGIAO
      );

      const regiao =
        regiaoSalva === 'Guimarães' ||
        regiaoSalva === 'Vizela' ||
        regiaoSalva === 'Fafe'
          ? regiaoSalva
          : 'Guimarães';

      setRegiaoSelecionada(regiao);
      setLocalidade(regiao);

      await carregarVagas(regiao);
    } catch (error) {
      console.log('Erro ao carregar região:', error);
      setRegiaoSelecionada('Guimarães');
      setLocalidade('Guimarães');
      await carregarVagas('Guimarães');
    }
  }

  async function carregarSessao() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    setSession(currentSession);
  }

  async function carregarVagas(regiao?: string) {
    try {
      setCarregando(true);

      const regiaoAtual =
        regiao || regiaoSelecionada || 'Guimarães';

      const { data, error } = await supabase
        .from('anuncios')
        .select(
          'id,titulo,descricao,categoria,localidade,publicado_em,dados_especificos'
        )
        .eq('estado', 'publicado')
        .eq('tipo_anuncio', 'Emprego')
        .order('publicado_em', { ascending: false });

      if (error) {
        console.log('Erro ao carregar vagas:', error);
        setVagas([]);
        return;
      }

      const regiaoNormalizada = normalizarTexto(regiaoAtual);

      const vagasDaRegiao = ((data || []) as VagaEmprego[]).filter(
        (vaga) => {
          const localidade = normalizarTexto(vaga.localidade);

          if (!localidade) {
            return false;
          }

          return (
            localidade === regiaoNormalizada ||
            localidade.includes(regiaoNormalizada) ||
            regiaoNormalizada.includes(localidade)
          );
        }
      );

      setVagas(vagasDaRegiao);
    } catch (error) {
      console.log('Erro inesperado ao carregar vagas:', error);
      setVagas([]);
    } finally {
      setCarregando(false);
    }
  }

  async function atualizarVagas() {
    try {
      setAtualizando(true);

      await carregarVagas();
    } finally {
      setAtualizando(false);
    }
  }

  function limparFormulario() {
    setEmpresa('');
    setTitulo('');
    setDescricao('');
    setCategoria('');
    setLocalidade(regiaoSelecionada || 'Guimarães');
    setTipoContrato('');
    setRegime('');
    setSalario('');
    setContacto('');
    setEmail('');
    setCandidatura('');
    setAceitouResponsabilidade(false);
  }

  async function publicarVaga() {
    if (!session?.user?.id) {
      Alert.alert(
        'Login necessário',
        'Para publicar uma vaga, precisa estar autenticado no Conecta Guimarães.'
      );
      return;
    }

    if (
      !empresa.trim() ||
      !titulo.trim() ||
      !descricao.trim() ||
      !categoria.trim() ||
      !localidade.trim()
    ) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha empresa, título da vaga, descrição, área e localidade.'
      );
      return;
    }

    if (!aceitouResponsabilidade) {
      Alert.alert(
        'Confirmação necessária',
        'É necessário confirmar que as informações da vaga são verdadeiras e que possui autorização para publicar esta oportunidade.'
      );
      return;
    }

    try {
      setPublicando(true);

      const { error } = await supabase.from('anuncios').insert({
        user_id: session.user.id,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria: categoria.trim(),
        localidade: localidade.trim(),
        estado: 'em_analise',
        tipo_anuncio: 'Emprego',
        dados_especificos: {
          tipo: 'emprego',
          empresa: empresa.trim(),
          tipo_contrato: tipoContrato.trim(),
          regime: regime.trim(),
          salario: salario.trim(),
          contacto: contacto.trim(),
          email: email.trim(),
          candidatura: candidatura.trim(),
          aceitou_responsabilidade: true,
          responsabilidade_versao: '1.0',
          criado_em: new Date().toISOString(),
        },
      });

      if (error) {
        console.log('Erro ao publicar vaga:', error);

        Alert.alert(
          'Não foi possível publicar',
          error.message ||
            'Ocorreu um erro ao enviar a vaga.'
        );

        return;
      }

      Alert.alert(
        'Vaga enviada',
        'A vaga foi enviada para análise. Depois de aprovada pelo moderador, ficará disponível na área de Empregos do Conecta Guimarães.'
      );

      limparFormulario();
      setMostrarFormulario(false);
    } catch (error) {
      console.log('Erro inesperado:', error);

      Alert.alert(
        'Erro',
        'Não foi possível enviar a vaga neste momento.'
      );
    } finally {
      setPublicando(false);
    }
  }

  async function abrirCandidatura(vaga: VagaEmprego) {
    const dados = vaga.dados_especificos || {};

    const candidaturaVaga = String(
      dados.candidatura || ''
    ).trim();

    const emailVaga = String(dados.email || '').trim();

    const contactoVaga = String(
      dados.contacto || ''
    ).trim();

    if (candidaturaVaga) {
      try {
        await Linking.openURL(candidaturaVaga);
        return;
      } catch {
        // Continua para as alternativas abaixo.
      }
    }

    if (emailVaga) {
      try {
        await Linking.openURL(
          `mailto:${emailVaga}?subject=${encodeURIComponent(
            `Candidatura - ${
              vaga.titulo || 'Vaga de emprego'
            }`
          )}`
        );

        return;
      } catch {
        // Continua para contacto telefónico.
      }
    }

    if (contactoVaga) {
      try {
        await Linking.openURL(`tel:${contactoVaga}`);
        return;
      } catch {
        // Sem ação possível.
      }
    }

    Alert.alert(
      'Candidatura',
      'Esta vaga não disponibilizou um meio de candidatura.'
    );
  }

  function formatarData(data: string | null) {
    if (!data) return '';

    try {
      return new Date(data).toLocaleDateString('pt-PT');
    } catch {
      return '';
    }
  }

  async function abrirLink(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.log(
        'Não foi possível abrir o link:',
        error
      );
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizarVagas}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.logo}>Empregos</Text>

            <Text style={styles.subtitle}>
              Encontre oportunidades de trabalho em Portugal
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Text style={styles.introIconText}>💼</Text>
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Oportunidades de emprego
            </Text>

            <Text style={styles.introText}>
              Encontre vagas publicadas por empresas e organizações da
              região ou pesquise nas principais plataformas de emprego.
            </Text>
          </View>
        </View>

        <View style={styles.regionBadge}>
          <Text style={styles.regionBadgeIcon}>📍</Text>

          <Text style={styles.regionBadgeText}>
            Região selecionada: {regiaoSelecionada}
          </Text>
        </View>

        <View style={styles.regionalHeader}>
          <View style={styles.regionalHeaderText}>
            <Text style={styles.sectionTitle}>
              Vagas Regionais
            </Text>

            <Text style={styles.sectionSubtitle}>
              Oportunidades publicadas diretamente no Conecta Guimarães
            </Text>
          </View>

          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>
              GRATUITO
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.publishButton}
          onPress={() => {
            if (!session?.user?.id) {
              Alert.alert(
                'Login necessário',
                'Entre na sua conta para publicar uma vaga.',
                [
                  {
                    text: 'Entrar',
                    onPress: () => router.push('/conta'),
                  },
                  {
                    text: 'Cancelar',
                    style: 'cancel',
                  },
                ]
              );

              return;
            }

            setMostrarFormulario(!mostrarFormulario);
          }}
        >
          <Text style={styles.publishButtonIcon}>＋</Text>

          <View style={styles.publishButtonContent}>
            <Text style={styles.publishButtonTitle}>
              Publicar uma vaga
            </Text>

            <Text style={styles.publishButtonSubtitle}>
              Divulgue uma oportunidade de trabalho na região
            </Text>
          </View>

          <Text style={styles.publishButtonArrow}>
            {mostrarFormulario ? '⌃' : '›'}
          </Text>
        </TouchableOpacity>

        {mostrarFormulario && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              Publicar vaga de emprego
            </Text>

            <Text style={styles.formDescription}>
              Preencha os dados abaixo. A vaga será analisada antes de
              ficar disponível publicamente.
            </Text>

            <Text style={styles.inputLabel}>
              Empresa *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome da empresa"
              placeholderTextColor="#9AA2AA"
              value={empresa}
              onChangeText={setEmpresa}
            />

            <Text style={styles.inputLabel}>
              Título da vaga *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ex.: Operador de produção"
              placeholderTextColor="#9AA2AA"
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={styles.inputLabel}>
              Área / categoria *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ex.: Indústria, Restauração, Construção..."
              placeholderTextColor="#9AA2AA"
              value={categoria}
              onChangeText={setCategoria}
            />

            <Text style={styles.inputLabel}>
              Localidade *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ex.: Guimarães"
              placeholderTextColor="#9AA2AA"
              value={localidade}
              onChangeText={setLocalidade}
            />

            <Text style={styles.inputLabel}>
              Descrição da vaga *
            </Text>

            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Descreva a função, requisitos e principais responsabilidades..."
              placeholderTextColor="#9AA2AA"
              value={descricao}
              onChangeText={setDescricao}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>
              Tipo de contrato
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ex.: Full-time, Part-time, Temporário..."
              placeholderTextColor="#9AA2AA"
              value={tipoContrato}
              onChangeText={setTipoContrato}
            />

            <Text style={styles.inputLabel}>
              Regime de trabalho
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ex.: Presencial, Híbrido, Remoto..."
              placeholderTextColor="#9AA2AA"
              value={regime}
              onChangeText={setRegime}
            />

            <Text style={styles.inputLabel}>
              Salário / remuneração
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ex.: 950 € + subsídio de alimentação"
              placeholderTextColor="#9AA2AA"
              value={salario}
              onChangeText={setSalario}
            />

            <Text style={styles.inputLabel}>
              Contacto
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Telefone ou WhatsApp"
              placeholderTextColor="#9AA2AA"
              value={contacto}
              onChangeText={setContacto}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>
              Email
            </Text>

            <TextInput
              style={styles.input}
              placeholder="email@empresa.pt"
              placeholderTextColor="#9AA2AA"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>
              Link para candidatura
            </Text>

            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="#9AA2AA"
              value={candidatura}
              onChangeText={setCandidatura}
              autoCapitalize="none"
            />

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.checkboxRow}
              onPress={() =>
                setAceitouResponsabilidade(
                  !aceitouResponsabilidade
                )
              }
            >
              <View
                style={[
                  styles.checkbox,
                  aceitouResponsabilidade &&
                    styles.checkboxChecked,
                ]}
              >
                {aceitouResponsabilidade && (
                  <Text style={styles.checkboxMark}>✓</Text>
                )}
              </View>

              <Text style={styles.checkboxText}>
                Declaro que as informações são verdadeiras e que tenho
                autorização para publicar esta vaga em nome da empresa.
              </Text>
            </TouchableOpacity>

            <View style={styles.moderationNotice}>
              <Text style={styles.moderationNoticeTitle}>
                🛡️ Moderação
              </Text>

              <Text style={styles.moderationNoticeText}>
                Todas as vagas passam por análise antes de serem
                disponibilizadas no Conecta Guimarães.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.submitButton,
                publicando && styles.submitButtonDisabled,
              ]}
              onPress={publicarVaga}
              disabled={publicando}
            >
              {publicando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Enviar vaga para análise
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.cancelButton}
              onPress={() => {
                limparFormulario();
                setMostrarFormulario(false);
              }}
            >
              <Text style={styles.cancelButtonText}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.jobsSection}>
          {carregando ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator
                size="small"
                color="#1677B8"
              />

              <Text style={styles.loadingText}>
                A carregar vagas...
              </Text>
            </View>
          ) : vagas.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>💼</Text>

              <Text style={styles.emptyTitle}>
                Ainda não há vagas regionais em {regiaoSelecionada}
              </Text>

              <Text style={styles.emptyText}>
                Ainda não existem vagas publicadas para esta região.
              </Text>
            </View>
          ) : (
            vagas.map((vaga) => {
              const dados = vaga.dados_especificos || {};

              return (
                <View
                  key={vaga.id}
                  style={styles.vagaCard}
                >
                  <View style={styles.vagaTop}>
                    <View style={styles.companyIcon}>
                      <Text style={styles.companyIconText}>
                        💼
                      </Text>
                    </View>

                    <View style={styles.vagaTopInfo}>
                      <Text style={styles.vagaTitle}>
                        {vaga.titulo || 'Vaga de emprego'}
                      </Text>

                      <Text style={styles.companyName}>
                        {dados.empresa || 'Empresa'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.vagaMetaRow}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>
                        📍 {vaga.localidade || 'Região'}
                      </Text>
                    </View>

                    {vaga.categoria && (
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaBadgeText}>
                          {vaga.categoria}
                        </Text>
                      </View>
                    )}
                  </View>

                  {dados.tipo_contrato && (
                    <Text style={styles.vagaDetail}>
                      🕐 {dados.tipo_contrato}
                    </Text>
                  )}

                  {dados.regime && (
                    <Text style={styles.vagaDetail}>
                      🏢 {dados.regime}
                    </Text>
                  )}

                  {dados.salario && (
                    <Text style={styles.vagaDetail}>
                      💰 {dados.salario}
                    </Text>
                  )}

                  {vaga.descricao && (
                    <Text
                      style={styles.vagaDescription}
                      numberOfLines={5}
                    >
                      {vaga.descricao}
                    </Text>
                  )}

                  <View style={styles.vagaBottom}>
                    <Text style={styles.vagaDate}>
                      Publicada em{' '}
                      {formatarData(vaga.publicado_em)}
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.applyButton}
                      onPress={() =>
                        abrirCandidatura(vaga)
                      }
                    >
                      <Text style={styles.applyButtonText}>
                        Candidatar-me
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.sectionTitle}>
          Onde procurar emprego
        </Text>

        <Text style={styles.sectionSubtitle}>
          Consulte também estas plataformas de referência em Portugal.
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.jobCard}
          onPress={() =>
            abrirLink('https://www.net-empregos.com/')
          }
        >
          <View
            style={[styles.brandCircle, styles.netBrand]}
          >
            <Text style={styles.netBrandText}>NE</Text>
          </View>

          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle}>
              Net-Empregos
            </Text>

            <Text style={styles.jobDescription}>
              Uma das principais plataformas de ofertas de emprego em
              Portugal.
            </Text>

            <View style={styles.accessBadge}>
              <Text style={styles.accessBadgeText}>
                Abrir plataforma
              </Text>
            </View>
          </View>

          <Text style={styles.arrow}>↗</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.jobCard}
          onPress={() =>
            abrirLink('https://emprego.sapo.pt/')
          }
        >
          <View
            style={[styles.brandCircle, styles.sapoBrand]}
          >
            <Text style={styles.sapoBrandText}>S</Text>
          </View>

          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle}>
              SAPO Emprego
            </Text>

            <Text style={styles.jobDescription}>
              Pesquise oportunidades por função, empresa ou localidade.
            </Text>

            <View style={styles.accessBadge}>
              <Text style={styles.accessBadgeText}>
                Abrir plataforma
              </Text>
            </View>
          </View>

          <Text style={styles.arrow}>↗</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.jobCard}
          onPress={() =>
            abrirLink(
              'https://iefponline.iefp.pt/IEFP/search.do?cat=ofertaEmprego'
            )
          }
        >
          <View
            style={[styles.brandCircle, styles.iefpBrand]}
          >
            <Text style={styles.iefpBrandText}>IEFP</Text>
          </View>

          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle}>
              IEFP
            </Text>

            <Text style={styles.jobDescription}>
              Ofertas de emprego e serviços públicos de emprego.
            </Text>

            <View style={styles.accessBadge}>
              <Text style={styles.accessBadgeText}>
                Ver ofertas
              </Text>
            </View>
          </View>

          <Text style={styles.arrow}>↗</Text>
        </TouchableOpacity>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>
            ℹ️ Informação
          </Text>

          <Text style={styles.noticeText}>
            O Conecta Guimarães facilita o acesso às plataformas de
            emprego e disponibiliza também vagas publicadas diretamente
            na plataforma. O Conecta não é responsável pelas ofertas,
            processos de recrutamento ou condições apresentadas pelas
            empresas.
          </Text>
        </View>

        <View style={styles.regionCard}>
          <Text style={styles.regionTitle}>
            📍 Região selecionada: {regiaoSelecionada}
          </Text>

          <Text style={styles.regionText}>
            As vagas regionais apresentadas acima correspondem à região
            atualmente selecionada na Home: {regiaoSelecionada}.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Conecta Guimarães
          </Text>

          <Text style={styles.footerSubtext}>
            Guimarães • Vizela • Fafe
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  logo: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1677B8',
  },

  subtitle: {
    fontSize: 14,
    color: '#68727E',
    marginTop: 4,
    lineHeight: 20,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    fontSize: 30,
    color: '#59636F',
    lineHeight: 32,
    marginTop: -2,
  },

  introCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF4FB',
    borderRadius: 18,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D5E8F4',
  },

  introIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  introIconText: {
    fontSize: 27,
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 5,
  },

  introText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#52606D',
  },

  regionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4FB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 22,
  },

  regionBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },

  regionBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1677B8',
  },

  regionalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  regionalHeaderText: {
    flex: 1,
    paddingRight: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#68727E',
    marginBottom: 14,
  },

  freeBadge: {
    backgroundColor: '#EAF7EE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  freeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#27834A',
  },

  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1677B8',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },

  publishButtonIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    marginRight: 12,
  },

  publishButtonContent: {
    flex: 1,
  },

  publishButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  publishButtonSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#EAF4FB',
    marginTop: 3,
  },

  publishButtonArrow: {
    fontSize: 25,
    color: '#FFFFFF',
    marginLeft: 8,
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E1E5EA',
  },

  formTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 5,
  },

  formDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68727E',
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34404C',
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#DCE1E6',
    borderRadius: 11,
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: '#27313D',
  },

  textarea: {
    minHeight: 120,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 18,
  },

  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#B9C1C9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },

  checkboxChecked: {
    backgroundColor: '#1677B8',
    borderColor: '#1677B8',
  },

  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  checkboxText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#59636F',
  },

  moderationNotice: {
    backgroundColor: '#F5F8FB',
    borderRadius: 12,
    padding: 13,
    marginTop: 15,
  },

  moderationNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34404C',
    marginBottom: 4,
  },

  moderationNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68727E',
  },

  submitButton: {
    minHeight: 48,
    backgroundColor: '#1677B8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 17,
  },

  submitButtonDisabled: {
    opacity: 0.65,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  cancelButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  cancelButtonText: {
    color: '#68727E',
    fontSize: 13,
    fontWeight: '700',
  },

  jobsSection: {
    marginBottom: 20,
  },

  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6E9ED',
  },

  loadingText: {
    fontSize: 12,
    color: '#68727E',
    marginTop: 8,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E6E9ED',
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#27313D',
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68727E',
    textAlign: 'center',
    marginTop: 6,
  },

  vagaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E1E5EA',
  },

  vagaTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  companyIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  companyIconText: {
    fontSize: 24,
  },

  vagaTopInfo: {
    flex: 1,
  },

  vagaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#27313D',
  },

  companyName: {
    fontSize: 13,
    color: '#68727E',
    marginTop: 3,
  },

  vagaMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 13,
  },

  metaBadge: {
    backgroundColor: '#F1F7FB',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginRight: 7,
    marginBottom: 6,
  },

  metaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1677B8',
  },

  vagaDetail: {
    fontSize: 12,
    color: '#59636F',
    marginTop: 5,
  },

  vagaDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#52606D',
    marginTop: 11,
  },

  vagaBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F2',
  },

  vagaDate: {
    flex: 1,
    fontSize: 10,
    color: '#9AA2AA',
    marginRight: 8,
  },

  applyButton: {
    backgroundColor: '#1677B8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E6E9ED',
  },

  brandCircle: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  netBrand: {
    backgroundColor: '#EAF4FB',
  },

  netBrandText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1677B8',
  },

  sapoBrand: {
    backgroundColor: '#FFF2E8',
  },

  sapoBrandText: {
    fontSize: 25,
    fontWeight: '900',
    color: '#E66B1A',
  },

  iefpBrand: {
    backgroundColor: '#EEF2F7',
  },

  iefpBrandText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#34495E',
  },

  jobInfo: {
    flex: 1,
  },

  jobTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#27313D',
  },

  jobDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#68727E',
    marginTop: 4,
  },

  accessBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F7FB',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 8,
  },

  accessBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1677B8',
  },

  arrow: {
    fontSize: 25,
    color: '#1677B8',
    marginLeft: 9,
  },

  notice: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E6E9ED',
  },

  noticeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#27313D',
    marginBottom: 6,
  },

  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68727E',
  },

  regionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E6E9ED',
  },

  regionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#27313D',
    marginBottom: 6,
  },

  regionText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68727E',
  },

  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 10,
  },

  footerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#68727E',
  },

  footerSubtext: {
    fontSize: 12,
    color: '#9AA2AA',
    marginTop: 4,
  },
});