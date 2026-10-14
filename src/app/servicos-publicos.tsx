import { useRouter } from 'expo-router';

import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type ServicoPublico = {
  id: string;
  icon: string;
  nome: string;
  descricao: string;
  morada: string;
  horario: string;
  telefone?: string;
  telefoneLabel?: string;
  site?: string;
};

const SERVICOS: ServicoPublico[] = [
  {
    id: 'aima-guimaraes',
    icon: '🪪',
    nome: 'AIMA — Balcão de Guimarães',
    descricao:
      'Atendimento relacionado com regularização e integração de cidadãos migrantes.',
    morada:
      'Rua da Rainha Dona Maria II, n.º 58, 4800-000 Guimarães',
    horario:
      'Segunda a sexta: 09h00–12h30 e 14h00–17h30',
    telefone: '217115000',
    telefoneLabel: 'Centro de Contacto AIMA',
    site: 'https://aima.gov.pt/',
  },

  {
    id: 'irn',
    icon: '📑',
    nome: 'IRN — Registos de Guimarães',
    descricao:
      'Registo Civil, Cartão de Cidadão, nacionalidade, casamento, nascimento, óbito e outros atos de registo.',
    morada:
      'Rua da Ramada, 365, 4810-445 Guimarães',
    horario:
      'Dias úteis: 09h00–16h00',
    telefone: '253418836',
    telefoneLabel: 'Registo Civil',
    site: 'https://irn.justica.gov.pt/',
  },

  {
    id: 'espaco-cidadao',
    icon: '🏛️',
    nome: 'Espaço Cidadão de Guimarães',
    descricao:
      'Acesso a vários serviços públicos num único balcão.',
    morada:
      'Largo Cónego José Maria Gomes, 4804-534 Guimarães',
    horario:
      'Dias úteis: 09h00–17h00',
    telefone: '300003990',
    telefoneLabel: 'Linha de apoio',
    site: 'https://www.gov.pt/locais-de-atendimento/espaco-cidadao-de-guimaraes',
  },

  {
    id: 'camara',
    icon: '🏙️',
    nome: 'Câmara Municipal de Guimarães',
    descricao:
      'Serviços municipais, atendimento ao munícipe, urbanismo, ação social, ambiente e outros serviços.',
    morada:
      'Largo Cónego José Maria Gomes, 4804-534 Guimarães',
    horario:
      'Atendimento presencial mediante agendamento, conforme o serviço.',
    telefone: '253421200',
    telefoneLabel: 'Atendimento geral',
    site: 'https://www.cm-guimaraes.pt/',
  },

  {
    id: 'financas',
    icon: '💶',
    nome: 'Finanças — Guimarães 1',
    descricao:
      'Serviços tributários, IRS, NIF, impostos e assuntos fiscais.',
    morada:
      'Av. Conde de Margaride, 822 — 1.º, Guimarães',
    horario:
      'Atendimento ao público: segunda a sexta, 09h00–15h30.',
    telefone: '253540360',
    telefoneLabel: 'Serviço de Finanças',
    site: 'https://www.portaldasfinancas.gov.pt/',
  },

  {
    id: 'vimagua',
    icon: '💧',
    nome: 'Vimágua',
    descricao:
      'Água, saneamento, contratos, leituras, faturas e comunicação de ocorrências.',
    morada:
      'Guimarães: Rua do Rei Pegú, n.º 172, 4810-025 Guimarães\n\nVizela: Praça do Município, n.º 522',
    horario:
      'Guimarães: dias úteis 09h00–16h00\nVizela: dias úteis 09h00–15h30',
    telefone: '253439560',
    telefoneLabel: 'Atendimento geral',
    site: 'https://vimagua.pt/',
  },

  {
    id: 'vitrus',
    icon: '♻️',
    nome: 'VITRUS Ambiente',
    descricao:
      'Resíduos, limpeza urbana, estacionamento, recolhas e serviços ambientais de Guimarães.',
    morada:
      'Av. Cónego Gaspar Estaço, n.º 606, Oliveira do Castelo, 4810-266 Guimarães',
    horario:
      'Sede: segunda a sexta, 09h00–17h30.',
    telefone: '800209565',
    telefoneLabel: 'Linha gratuita',
    site: 'https://vitrusambiente.pt/',
  },

  {
    id: 'seguranca-social',
    icon: '👤',
    nome: 'Segurança Social',
    descricao:
      'Prestações sociais, NISS, contribuições, subsídios, pensões e outros serviços.',
    morada:
      'O atendimento presencial deve ser consultado e/ou agendado através dos canais oficiais.',
    horario:
      'Linha Segurança Social: dias úteis, 09h00–18h00.',
    telefone: '210545400',
    telefoneLabel: 'Linha Segurança Social',
    site: 'https://www.seg-social.pt/',
  },
];

export default function ServicosPublicosScreen() {
  const router = useRouter();

  const ligar = async (telefone: string) => {
    try {
      await Linking.openURL(`tel:${telefone}`);
    } catch (error) {
      console.log('Não foi possível iniciar a chamada:', error);
    }
  };

  const abrirSite = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.log('Não foi possível abrir o site:', error);
    }
  };

  const abrirMapa = async (morada: string) => {
    try {
      const url =
        `https://www.google.com/maps/search/?api=1&query=` +
        encodeURIComponent(morada);

      await Linking.openURL(url);
    } catch (error) {
      console.log('Não foi possível abrir o mapa:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.logo}>Serviços públicos</Text>

            <Text style={styles.subtitle}>
              Contactos e informações úteis da região
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
          <Text style={styles.introIcon}>🏛️</Text>

          <Text style={styles.introTitle}>
            Serviços públicos perto de si
          </Text>

          <Text style={styles.introText}>
            Encontre rapidamente moradas, horários e contactos de entidades
            públicas e serviços muito utilizados em Guimarães e na região.
          </Text>
        </View>

        <View style={styles.warning}>
          <Text style={styles.warningTitle}>
            ℹ️ Antes de se deslocar
          </Text>

          <Text style={styles.warningText}>
            Horários, necessidade de marcação e condições de atendimento
            podem variar. Quando disponível, utilize o botão do site oficial
            para confirmar a informação antes de se deslocar.
          </Text>
        </View>

        {SERVICOS.map((servico) => (
          <View key={servico.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Text style={styles.icon}>{servico.icon}</Text>
              </View>

              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>
                  {servico.nome}
                </Text>

                <Text style={styles.cardDescription}>
                  {servico.descricao}
                </Text>
              </View>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>
                📍 Morada
              </Text>

              <Text style={styles.detailText}>
                {servico.morada}
              </Text>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>
                🕐 Horário
              </Text>

              <Text style={styles.detailText}>
                {servico.horario}
              </Text>
            </View>

            {servico.telefone && (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>
                  ☎️ Telefone
                </Text>

                <Text style={styles.detailText}>
                  {servico.telefoneLabel}
                  {'\n'}
                  {servico.telefone}
                </Text>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.actionButton}
                onPress={() => abrirMapa(servico.morada)}
              >
                <Text style={styles.actionButtonText}>
                  📍 Mapa
                </Text>
              </TouchableOpacity>

              {servico.telefone && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.actionButton}
                  onPress={() => ligar(servico.telefone!)}
                >
                  <Text style={styles.actionButtonText}>
                    ☎️ Ligar
                  </Text>
                </TouchableOpacity>
              )}

              {servico.site && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.actionButton}
                  onPress={() => abrirSite(servico.site!)}
                >
                  <Text style={styles.actionButtonText}>
                    🌐 Site
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

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
    fontSize: 28,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 21,
    borderWidth: 1,
    borderColor: '#E2E7EC',
    marginBottom: 14,
  },

  introIcon: {
    fontSize: 40,
    marginBottom: 10,
  },

  introTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1D2733',
  },

  introText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#68727E',
    marginTop: 7,
  },

  warning: {
    backgroundColor: '#FFF8E8',
    borderRadius: 15,
    padding: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F1E2B8',
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8A681A',
    marginBottom: 4,
  },

  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#75643A',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E3E7EB',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  icon: {
    fontSize: 27,
  },

  cardHeaderText: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#27313D',
  },

  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#68727E',
    marginTop: 4,
  },

  detailBlock: {
    marginTop: 14,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F2',
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#59636F',
    marginBottom: 3,
  },

  detailText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#3F4B57',
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
    gap: 8,
  },

  actionButton: {
    backgroundColor: '#1677B8',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  footer: {
    alignItems: 'center',
    paddingTop: 20,
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