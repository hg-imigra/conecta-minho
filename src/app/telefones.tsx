import { router } from 'expo-router';
import {
    Linking,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type Contact = {
  nome: string;
  numero: string;
  descricao?: string;
  destaque?: boolean;
};

type Grupo = {
  titulo: string;
  simbolo: string;
  items: Contact[];
};

const contactos: Grupo[] = [
  {
    titulo: 'Emergência',
    simbolo: '🚨',
    items: [
      {
        nome: 'Número Europeu de Emergência',
        numero: '112',
        descricao: 'Emergência médica, incêndios e segurança',
        destaque: true,
      },
    ],
  },
  {
    titulo: 'Saúde',
    simbolo: '🏥',
    items: [
      {
        nome: 'Hospital Senhora da Oliveira',
        numero: '253 540 330',
        descricao: 'Guimarães',
      },
      {
        nome: 'Saúde 24',
        numero: '808 24 24 24',
        descricao: 'Linha de Saúde',
      },
    ],
  },
  {
    titulo: 'Segurança',
    simbolo: '🛡️',
    items: [
      {
        nome: 'PSP de Guimarães',
        numero: '253 600 830',
        descricao: 'Polícia de Segurança Pública',
      },
      {
        nome: 'GNR de Guimarães',
        numero: '253 422 570',
        descricao: 'Guarda Nacional Republicana',
      },
      {
        nome: 'Polícia Municipal',
        numero: '253 421 222',
        descricao: 'Guimarães',
      },
      {
        nome: 'Bombeiros Voluntários de Guimarães',
        numero: '253 515 444',
        descricao: 'Emergência e socorro',
      },
      {
        nome: 'Bombeiros Voluntários de Caldas das Taipas',
        numero: '253 576 114',
        descricao: 'Caldas das Taipas',
      },
    ],
  },
  {
    titulo: 'Serviços municipais',
    simbolo: '🏛️',
    items: [
      {
        nome: 'Câmara Municipal de Guimarães',
        numero: '253 421 200',
        descricao: 'Atendimento municipal',
      },
      {
        nome: 'Proteção Civil Municipal',
        numero: '253 421 212',
        descricao: 'Guimarães',
      },
      {
        nome: 'Vimágua',
        numero: '253 439 560',
        descricao: 'Águas e saneamento',
      },
      {
        nome: 'Vitrus',
        numero: '253 424 740',
        descricao: 'Serviços urbanos',
      },
    ],
  },
  {
    titulo: 'Outros contactos',
    simbolo: '☎️',
    items: [
      {
        nome: 'Cruz Vermelha Portuguesa',
        numero: '253 412 522',
        descricao: 'Delegação de Guimarães',
      },
      {
        nome: 'Guimarães Turismo',
        numero: '253 421 221',
        descricao: 'Informações turísticas',
      },
      {
        nome: 'Multiusos de Guimarães',
        numero: '253 520 300',
        descricao: 'Eventos e informações',
      },
      {
        nome: 'Estação de Caminhos de Ferro',
        numero: '707 210 220',
        descricao: 'Informações ferroviárias',
      },
    ],
  },
];

function limparNumero(numero: string) {
  return numero.replace(/\s/g, '');
}

async function ligar(numero: string) {
  const url = `tel:${limparNumero(numero)}`;

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.log('Não foi possível iniciar a chamada:', error);
  }
}

export default function TelefonesScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* CABEÇALHO */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              Telefones úteis
            </Text>

            <Text style={styles.headerSubtitle}>
              Contactos importantes de Guimarães e região
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* INTRODUÇÃO */}
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Text style={styles.introIconText}>☎</Text>
            </View>

            <View style={styles.introText}>
              <Text style={styles.introTitle}>
                Contactos importantes
              </Text>

              <Text style={styles.introDescription}>
                Encontre rapidamente números de emergência,
                saúde, segurança e serviços públicos.
              </Text>
            </View>
          </View>

          {/* GRUPOS */}
          {contactos.map((grupo) => (
            <View
              key={grupo.titulo}
              style={styles.section}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Text style={styles.sectionIconText}>
                    {grupo.simbolo}
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>
                  {grupo.titulo}
                </Text>
              </View>

              {grupo.items.map((contacto) => (
                <View
                  key={`${grupo.titulo}-${contacto.nome}`}
                  style={[
                    styles.contactCard,
                    contacto.destaque && styles.emergencyCard,
                  ]}
                >
                  <View style={styles.contactInfo}>
                    <Text
                      style={[
                        styles.contactName,
                        contacto.destaque &&
                          styles.emergencyName,
                      ]}
                    >
                      {contacto.nome}
                    </Text>

                    {contacto.descricao ? (
                      <Text style={styles.contactDescription}>
                        {contacto.descricao}
                      </Text>
                    ) : null}

                    <Text
                      style={[
                        styles.contactNumber,
                        contacto.destaque &&
                          styles.emergencyNumber,
                      ]}
                    >
                      {contacto.numero}
                    </Text>
                  </View>

                  <Pressable
                    style={[
                      styles.callButton,
                      contacto.destaque &&
                        styles.emergencyCallButton,
                    ]}
                    onPress={() => ligar(contacto.numero)}
                  >
                    <Text style={styles.callIcon}>☎</Text>

                    <Text style={styles.callButtonText}>
                      Ligar
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ))}

          {/* RODAPÉ */}
          <View style={styles.footerCard}>
            <Text style={styles.footerIcon}>ⓘ</Text>

            <Text style={styles.footerText}>
              Os contactos apresentados destinam-se a
              facilitar o acesso a serviços importantes em
              Guimarães e região.
            </Text>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },

  backButtonText: {
    fontSize: 34,
    lineHeight: 38,
    color: '#111827',
    fontWeight: '400',
    marginTop: -4,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#6B7280',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  introIconText: {
    fontSize: 25,
    color: '#2563EB',
    fontWeight: '700',
  },

  introText: {
    flex: 1,
  },

  introTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 3,
  },

  introDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
  },

  section: {
    marginBottom: 22,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  sectionIconText: {
    fontSize: 18,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  emergencyCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },

  contactInfo: {
    flex: 1,
    paddingRight: 10,
  },

  contactName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  emergencyName: {
    color: '#9A3412',
  },

  contactDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },

  contactNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 7,
    letterSpacing: 0.2,
  },

  emergencyNumber: {
    color: '#EA580C',
  },

  callButton: {
    minWidth: 78,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emergencyCallButton: {
    backgroundColor: '#EA580C',
  },

  callIcon: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 6,
  },

  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  footerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 14,
    marginTop: 2,
  },

  footerIcon: {
    fontSize: 20,
    color: '#6B7280',
  },

  footerText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },
});