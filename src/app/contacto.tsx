import { send } from '@emailjs/react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const EMAILJS_SERVICE_ID = 'service_r7uvjht';
const EMAILJS_TEMPLATE_ID = 'template_e0jdge9';
const EMAILJS_PUBLIC_KEY = 'AwaTW_46yWh1V8t6Z';

export default function ContactoScreen() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviarMensagem = async () => {
    const nomeLimpo = nome.trim();
    const telefoneLimpo = telefone.trim();
    const emailLimpo = email.trim();
    const assuntoLimpo = assunto.trim();
    const mensagemLimpa = mensagem.trim();

    if (!nomeLimpo) {
      Alert.alert('Campo obrigatório', 'Por favor, indique o seu nome.');
      return;
    }

    if (!telefoneLimpo) {
      Alert.alert(
        'Campo obrigatório',
        'Por favor, indique o seu número de telefone.',
      );
      return;
    }

    if (!emailLimpo) {
      Alert.alert(
        'Campo obrigatório',
        'Por favor, indique o seu endereço de e-mail.',
      );
      return;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValido.test(emailLimpo)) {
      Alert.alert(
        'E-mail inválido',
        'Por favor, introduza um endereço de e-mail válido.',
      );
      return;
    }

    if (!assuntoLimpo) {
      Alert.alert(
        'Campo obrigatório',
        'Por favor, indique o assunto do contacto.',
      );
      return;
    }

    if (!mensagemLimpa) {
      Alert.alert(
        'Campo obrigatório',
        'Por favor, escreva a sua mensagem.',
      );
      return;
    }

    if (enviando) {
      return;
    }

    try {
      setEnviando(true);

      await send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          name: nomeLimpo,
          nome: nomeLimpo,
          telefone: telefoneLimpo,
          email: emailLimpo,
          assunto: assuntoLimpo,
          mensagem: mensagemLimpa,
        },
        {
          publicKey: EMAILJS_PUBLIC_KEY,
        },
      );

      setNome('');
      setTelefone('');
      setEmail('');
      setAssunto('');
      setMensagem('');

      setEnviado(true);
    } catch (error) {
      console.log('Erro ao enviar contacto pelo EmailJS:', error);

      Alert.alert(
        'Não foi possível enviar',
        'Ocorreu um problema ao enviar a sua mensagem. Por favor, tente novamente dentro de alguns instantes.',
      );
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.successContent}
        >
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successIcon}>✓</Text>
            </View>

            <Text style={styles.successTitle}>
              Mensagem enviada!
            </Text>

            <Text style={styles.successText}>
              Obrigado pelo seu contacto. Recebemos a sua mensagem com
              sucesso.
            </Text>

            <Text style={styles.successText}>
              A nossa equipa irá analisar o seu pedido e responder assim que
              possível.
            </Text>

            <View style={styles.successInfo}>
              <Text style={styles.successInfoIcon}>💙</Text>

              <Text style={styles.successInfoText}>
                Obrigado por entrar em contacto com o Conecta Guimarães.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.primaryButton}
              onPress={() => setEnviado(false)}
            >
              <Text style={styles.primaryButtonText}>
                Enviar nova mensagem
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>
                ← Voltar
              </Text>
            </TouchableOpacity>
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.logo}>
              Fale connosco
            </Text>

            <Text style={styles.subtitle}>
              Entre em contacto com a equipa do Conecta Guimarães
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>
              ×
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroIcon}>
            💬
          </Text>

          <Text style={styles.heroTitle}>
            Estamos aqui para ajudar
          </Text>

          <Text style={styles.heroText}>
            Tem uma dúvida, sugestão, encontrou algum problema ou quer falar
            com a nossa equipa? Preencha o formulário abaixo.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Envie-nos uma mensagem
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>
            Nome
          </Text>

          <TextInput
            style={styles.input}
            placeholder="O seu nome"
            placeholderTextColor="#9AA2AA"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
            editable={!enviando}
          />

          <Text style={styles.label}>
            Telefone
          </Text>

          <TextInput
            style={styles.input}
            placeholder="O seu número de telefone"
            placeholderTextColor="#9AA2AA"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            editable={!enviando}
          />

          <Text style={styles.label}>
            E-mail
          </Text>

          <TextInput
            style={styles.input}
            placeholder="O seu endereço de e-mail"
            placeholderTextColor="#9AA2AA"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!enviando}
          />

          <Text style={styles.label}>
            Assunto
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Qual é o assunto?"
            placeholderTextColor="#9AA2AA"
            value={assunto}
            onChangeText={setAssunto}
            editable={!enviando}
          />

          <Text style={styles.label}>
            Mensagem
          </Text>

          <TextInput
            style={styles.messageInput}
            placeholder="Escreva aqui a sua questão ou dúvida..."
            placeholderTextColor="#9AA2AA"
            value={mensagem}
            onChangeText={setMensagem}
            multiline
            textAlignVertical="top"
            editable={!enviando}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.primaryButton,
              enviando && styles.primaryButtonDisabled,
            ]}
            onPress={enviarMensagem}
            disabled={enviando}
          >
            {enviando ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.primaryButtonText}>
                  A enviar...
                </Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>
                Enviar mensagem
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.formNote}>
            A sua mensagem será enviada diretamente para a equipa do
            Conecta Guimarães.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>
            💡
          </Text>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Sugestões
            </Text>

            <Text style={styles.infoText}>
              Tem uma ideia para melhorar o Conecta? Quer sugerir uma nova
              funcionalidade ou serviço? Envie-nos a sua sugestão.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>
            ⚠️
          </Text>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Problemas
            </Text>

            <Text style={styles.infoText}>
              Encontrou um erro, anúncio com problema ou alguma informação
              incorreta? Avise-nos através deste formulário.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>
            🤝
          </Text>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Parcerias
            </Text>

            <Text style={styles.infoText}>
              É profissional, empresa ou entidade e quer colaborar com o
              Conecta Guimarães? Fale connosco.
            </Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>
            🔒 Privacidade
          </Text>

          <Text style={styles.noticeText}>
            Os dados fornecidos neste formulário serão utilizados apenas para
            responder ao seu contacto.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            ← Voltar
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Conecta Guimarães
          </Text>

          <Text style={styles.footerSubtext}>
            Guimarães • Vizela • Fafe
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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

  successContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  logo: {
    fontSize: 29,
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

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E7EC',
    marginBottom: 26,
  },

  heroIcon: {
    fontSize: 42,
    marginBottom: 10,
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D2733',
  },

  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#68727E',
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 14,
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E7EC',
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#27313D',
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#DCE2E8',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#27313D',
  },

  messageInput: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: '#DCE2E8',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    color: '#27313D',
  },

  primaryButton: {
    backgroundColor: '#1677B8',
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 50,
  },

  primaryButtonDisabled: {
    opacity: 0.75,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  formNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8A949E',
    textAlign: 'center',
    marginTop: 12,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#E6E9ED',
  },

  infoIcon: {
    fontSize: 28,
    width: 42,
  },

  infoContent: {
    flex: 1,
    paddingLeft: 8,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#27313D',
  },

  infoText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#68727E',
    marginTop: 4,
  },

  notice: {
    backgroundColor: '#EAF4FB',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 22,
  },

  noticeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1677B8',
    marginBottom: 5,
  },

  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4F6575',
  },

  backButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE2E7',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    color: '#1677B8',
    fontSize: 15,
    fontWeight: '800',
  },

  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E7EC',
    alignItems: 'center',
  },

  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  successIcon: {
    fontSize: 42,
    fontWeight: '800',
    color: '#2E9B57',
  },

  successTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#1D2733',
    textAlign: 'center',
  },

  successText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#68727E',
    textAlign: 'center',
    marginTop: 10,
  },

  successInfo: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4FB',
    borderRadius: 14,
    padding: 14,
    marginTop: 22,
  },

  successInfoIcon: {
    fontSize: 22,
    marginRight: 10,
  },

  successInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#4F6575',
  },

  footer: {
    alignItems: 'center',
    paddingTop: 25,
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