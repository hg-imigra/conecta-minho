import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../supabase';
/**
 * Alertas compatíveis com a aplicação nativa e com a versão web.
 * No navegador, Alert.alert não apresenta sempre a mensagem como no telemóvel.
 */
function mostrarAlerta(
  titulo: string,
  mensagem?: string,
  botoes?: Array<{ text?: string; onPress?: () => void }>
) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
    }
    botoes?.[0]?.onPress?.();
    return;
  }
  Alert.alert(titulo, mensagem, botoes);
}
type Campo = {
  chave: string;
  label: string;
  placeholder: string;
  tipo?: 'text' | 'number';
  teclado?: 'default' | 'numeric' | 'phone-pad';
};
const TIPOS_ANUNCIO = [
  'Serviço profissional',
  'Produto para venda',
  'Automóvel',
  'Imóvel',
  'Loja ou negócio',
  'Evento',
  'Emprego / vaga',
];
const CAMPOS_ESPECIFICOS: Record<string, Campo[]> = {
  'Serviço profissional': [
    {
      chave: 'nome_profissional',
      label: 'Nome / empresa',
      placeholder: 'Ex.: Eletricista Guimarães',
    },
    {
      chave: 'experiencia',
      label: 'Experiência',
      placeholder: 'Ex.: 10 anos de experiência',
    },
    {
      chave: 'zona_atendimento',
      label: 'Zona de atendimento',
      placeholder: 'Ex.: Guimarães, Vizela e Fafe',
    },
  ],
  'Produto para venda': [
    {
      chave: 'marca',
      label: 'Marca',
      placeholder: 'Ex.: Apple',
    },
    {
      chave: 'modelo',
      label: 'Modelo',
      placeholder: 'Ex.: iPhone 15',
    },
    {
      chave: 'estado_produto',
      label: 'Estado',
      placeholder: 'Ex.: Novo / usado',
    },
    {
      chave: 'tempo_uso',
      label: 'Tempo de uso',
      placeholder: 'Ex.: 1 ano',
    },
  ],
  Automóvel: [
    {
      chave: 'marca',
      label: 'Marca',
      placeholder: 'Ex.: Peugeot',
    },
    {
      chave: 'modelo',
      label: 'Modelo',
      placeholder: 'Ex.: 5008',
    },
    {
      chave: 'ano',
      label: 'Ano',
      placeholder: 'Ex.: 2022',
      tipo: 'number',
      teclado: 'numeric',
    },
    {
      chave: 'quilometragem',
      label: 'Quilometragem',
      placeholder: 'Ex.: 125000',
      tipo: 'number',
      teclado: 'numeric',
    },
    {
      chave: 'combustivel',
      label: 'Combustível',
      placeholder: 'Ex.: Gasolina',
    },
    {
      chave: 'caixa',
      label: 'Caixa',
      placeholder: 'Ex.: Manual',
    },
    {
      chave: 'cor',
      label: 'Cor',
      placeholder: 'Ex.: Preto',
    },
    {
      chave: 'matricula',
      label: 'Finais da matrícula',
      placeholder: 'Ex.: 42-XP',
    },
    {
      chave: 'carroceria',
      label: 'Carroçaria',
      placeholder: 'Ex.: Citadino',
    },
    {
      chave: 'portas',
      label: 'Portas',
      placeholder: 'Ex.: 5',
      tipo: 'number',
      teclado: 'numeric',
    },
  ],
  Imóvel: [
    {
      chave: 'tipo_imovel',
      label: 'Tipo de imóvel',
      placeholder: 'Ex.: Apartamento',
    },
    {
      chave: 'finalidade',
      label: 'Finalidade',
      placeholder: 'Ex.: Venda / arrendamento',
    },
    {
      chave: 'quartos',
      label: 'Quartos',
      placeholder: 'Ex.: 3',
      tipo: 'number',
      teclado: 'numeric',
    },
    {
      chave: 'casas_banho',
      label: 'Casas de banho',
      placeholder: 'Ex.: 2',
      tipo: 'number',
      teclado: 'numeric',
    },
    {
      chave: 'area',
      label: 'Área',
      placeholder: 'Ex.: 120 m²',
    },
    {
      chave: 'estado_imovel',
      label: 'Estado',
      placeholder: 'Ex.: Novo / usado',
    },
    {
      chave: 'garagem',
      label: 'Garagem',
      placeholder: 'Ex.: Sim / não',
    },
  ],
  'Loja ou negócio': [
    {
      chave: 'nome_negocio',
      label: 'Nome do negócio',
      placeholder: 'Ex.: Café Central',
    },
    {
      chave: 'atividade',
      label: 'Atividade',
      placeholder: 'Ex.: Restauração',
    },
    {
      chave: 'horario',
      label: 'Horário',
      placeholder: 'Ex.: Segunda a sábado, 09h às 19h',
    },
    {
      chave: 'experiencia_negocio',
      label: 'Informações adicionais',
      placeholder: 'Ex.: Negócio em funcionamento',
    },
  ],
  Evento: [
    {
      chave: 'data_evento',
      label: 'Data do evento',
      placeholder: 'Ex.: 20/10/2026',
    },
    {
      chave: 'hora_evento',
      label: 'Hora',
      placeholder: 'Ex.: 21:00',
    },
    {
      chave: 'local_evento',
      label: 'Local',
      placeholder: 'Ex.: Multiusos de Guimarães',
    },
    {
      chave: 'organizador',
      label: 'Organizador',
      placeholder: 'Nome do organizador',
    },
    {
      chave: 'tipo_evento',
      label: 'Tipo de evento',
      placeholder: 'Ex.: Festa, concerto, feira...',
    },
  ],
  'Emprego / vaga': [
    {
      chave: 'empresa',
      label: 'Empresa',
      placeholder: 'Nome da empresa',
    },
    {
      chave: 'cargo',
      label: 'Cargo / função',
      placeholder: 'Ex.: Técnico de manutenção',
    },
    {
      chave: 'tipo_contrato',
      label: 'Tipo de contrato',
      placeholder: 'Ex.: Contrato sem termo',
    },
    {
      chave: 'regime',
      label: 'Regime',
      placeholder: 'Ex.: Presencial / híbrido / remoto',
    },
    {
      chave: 'salario',
      label: 'Salário',
      placeholder: 'Ex.: 1.200 €',
    },
    {
      chave: 'experiencia',
      label: 'Experiência exigida',
      placeholder: 'Ex.: 2 anos',
    },
    {
      chave: 'formacao',
      label: 'Formação',
      placeholder: 'Ex.: 12.º ano',
    },
    {
      chave: 'candidatura',
      label: 'Como candidatar-se',
      placeholder: 'Ex.: Enviar CV por e-mail',
    },
  ],
};
export default function PublicarScreen() {
  const router = useRouter();
  const [tipoAnuncio, setTipoAnuncio] = useState(
    'Serviço profissional'
  );
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [localidade, setLocalidade] = useState('Guimarães');
  const [preco, setPreco] = useState('');
  const [precoNegociavel, setPrecoNegociavel] = useState(false);
  const [contato, setContato] = useState('');
  const [camposEspecificos, setCamposEspecificos] =
    useState<Record<string, string>>({});
  const [publicando, setPublicando] = useState(false);
  const [sucessoVisivel, setSucessoVisivel] = useState(false);
  const [imagensSelecionadas, setImagensSelecionadas] =
    useState<ImagePicker.ImagePickerAsset[]>([]);
  function alterarTipo(novoTipo: string) {
    setTipoAnuncio(novoTipo);
    setCamposEspecificos({});
    setSeletorAberto(false);
  }
  function alterarCampoEspecifico(
    chave: string,
    valor: string
  ) {
    setCamposEspecificos((anterior) => ({
      ...anterior,
      [chave]: valor,
    }));
  }
  async function obterCoordenadasLocalidade() {
    const localidadeLimpa = localidade.trim();
    if (!localidadeLimpa) return null;
    // Expo Location não disponibiliza geocoding em todos os navegadores.
    // Na web usamos o serviço público Nominatim; no nativo mantemos Expo Location.
    if (Platform.OS === 'web') {
      try {
        const consulta = encodeURIComponent(`${localidadeLimpa}, Portugal`);
        const resposta = await fetch(
          `https\://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${consulta}`,
          { headers: { Accept: 'application/json' } }
        );
        if (resposta.ok) {
          const resultados = await resposta.json();
          if (Array.isArray(resultados) && resultados.length > 0) {
            const latitude = Number(resultados[0].lat);
            const longitude = Number(resultados[0].lon);
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
              return { latitude, longitude };
            }
          }
        }
      } catch (error) {
        console.warn('Geocoding web indisponível:', error);
      }
      // Fallback para localidades centrais da área de serviço do Conecta Minho.
      const chave = localidadeLimpa.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const coordenadasConhecidas: Record<string, { latitude: number; longitude: number }> = {
        'guimaraes': { latitude: 41.4425, longitude: -8.2918 },
        'vizela': { latitude: 41.3909, longitude: -8.3085 },
        'fafe': { latitude: 41.4505, longitude: -8.1727 },
        'braga': { latitude: 41.5454, longitude: -8.4265 },
        'felgueiras': { latitude: 41.3681, longitude: -8.1939 },
        'celorico de basto': { latitude: 41.3868, longitude: -8.0005 },
        'cabeceiras de basto': { latitude: 41.5144, longitude: -7.9894 },
      };
      return coordenadasConhecidas[chave] ?? null;
    }
    try {
      const resultados = await Location.geocodeAsync(`${localidadeLimpa}, Portugal`);
      if (!resultados || resultados.length === 0) return null;
      return {
        latitude: resultados[0].latitude,
        longitude: resultados[0].longitude,
      };
    } catch (error) {
      console.log('Erro ao obter coordenadas da localidade:', error);
      return null;
    }
  }
  async function selecionarImagens() {
    try {
      const permissao =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        mostrarAlerta(
          'Permissão necessária',
          'Autorize o acesso às fotografias para adicionar imagens ao anúncio.'
        );
        return;
      }
      const restantes = 5 - imagensSelecionadas.length;
      if (restantes <= 0) {
        mostrarAlerta(
          'Limite atingido',
          'Pode adicionar no máximo 5 fotografias.'
        );
        return;
      }
      const resultado =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: restantes,
          quality: 0.8,
        });
      if (resultado.canceled) return;
      const novas = resultado.assets.filter(
        (asset) => asset.type === 'image'
      );
      setImagensSelecionadas((atuais) => {
        const combinadas = [...atuais, ...novas];
        const unicas = combinadas.filter(
          (imagem, indice, lista) =>
            lista.findIndex(
              (item) => item.uri === imagem.uri
            ) === indice
        );
        return unicas.slice(0, 5);
      });
    } catch (error: any) {
      mostrarAlerta(
        'Erro ao seleccionar fotografias',
        error?.message ||
          'Não foi possível abrir a galeria de fotografias.'
      );
    }
  }
  function removerImagem(uri: string) {
    setImagensSelecionadas((atuais) =>
      atuais.filter((imagem) => imagem.uri !== uri)
    );
  }
  async function carregarImagensNoSupabase(userId: string) {
    const urls: string[] = [];
    for (let i = 0; i < imagensSelecionadas.length; i++) {
      const imagem = imagensSelecionadas[i];
      const resposta = await fetch(imagem.uri);
      if (!resposta.ok) {
        throw new Error(
          `Não foi possível ler a fotografia ${i + 1}.`
        );
      }
      const bytes = await resposta.arrayBuffer();
      if (bytes.byteLength === 0) {
        throw new Error(
          `A fotografia ${i + 1} está vazia ou não pôde ser lida.`
        );
      }
      const mimeOriginal = imagem.mimeType?.toLowerCase();
      const mimeType =
        mimeOriginal === 'image/png' ||
        mimeOriginal === 'image/webp' ||
        mimeOriginal === 'image/jpeg'
          ? mimeOriginal
          : 'image/jpeg';
      const extensao =
        mimeType === 'image/png'
          ? 'png'
          : mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';
      const caminho =
        `${userId}/${Date.now()}-${i}.${extensao}`;
      const { error: erroUpload } = await supabase.storage
        .from('fotografias-anuncios')
        .upload(caminho, bytes, {
          contentType: mimeType,
          upsert: false,
        });
      if (erroUpload) {
        throw erroUpload;
      }
      const { data } = supabase.storage
        .from('fotografias-anuncios')
        .getPublicUrl(caminho);
      urls.push(data.publicUrl);
    }
    return urls;
  }
  async function publicarAnuncio() {
    if (
      imagensSelecionadas.length < 2 ||
      imagensSelecionadas.length > 5
    ) {
      mostrarAlerta(
        'Fotografias obrigatórias',
        'Adicione pelo menos 2 fotografias e no máximo 5 antes de publicar.'
      );
      return;
    }
    if (!titulo.trim()) {
      mostrarAlerta(
        'Falta o título',
        'Escreva um título para o anúncio.'
      );
      return;
    }
    if (!descricao.trim()) {
      mostrarAlerta(
        'Falta a descrição',
        'Escreva uma descrição do anúncio.'
      );
      return;
    }
    if (!categoria.trim()) {
      mostrarAlerta(
        'Falta a categoria',
        'Indique a categoria do anúncio.'
      );
      return;
    }
    if (!localidade.trim()) {
      mostrarAlerta(
        'Falta a localidade',
        'Indique a localidade.'
      );
      return;
    }
    const camposObrigatorios =
      CAMPOS_ESPECIFICOS[tipoAnuncio] || [];
    for (const campo of camposObrigatorios) {
      const experienciaOpcional =
        tipoAnuncio === 'Serviço profissional' &&
        campo.chave === 'experiencia';
      if (
        !experienciaOpcional &&
        !camposEspecificos[campo.chave]?.trim()
      ) {
        mostrarAlerta(
          'Campo em falta',
          `Preencha o campo "${campo.label}".`
        );
        return;
      }
    }
    setPublicando(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        mostrarAlerta(
          'É necessário iniciar sessão',
          'Entre na sua conta antes de publicar um anúncio.'
        );
        router.push('/conta');
        return;
      }
      const precoNumerico = preco.trim()
        ? Number(preco.replace(',', '.'))
        : null;
      if (
        preco.trim() &&
        (precoNumerico === null ||
          !Number.isFinite(precoNumerico))
      ) {
        mostrarAlerta(
          'Preço inválido',
          'Introduza apenas um valor numérico para o preço.'
        );
        return;
      }
      const coordenadas =
        await obterCoordenadasLocalidade();
      if (!coordenadas) {
        mostrarAlerta(
          'Localidade não encontrada',
          'Não foi possível localizar essa localidade. Verifique se escreveu correctamente e tente novamente.'
        );
        return;
      }
      const urlsImagens =
        await carregarImagensNoSupabase(user.id);
      const dadosEspecificos = {
        tipo: tipoAnuncio,
        ...camposEspecificos,
        imagens: urlsImagens,
        criado_em: new Date().toISOString(),
      };
      const { data: anuncioCriado, error } = await supabase
        .from('anuncios')
        .insert({
          user_id: user.id,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          tipo_anuncio: tipoAnuncio,
          categoria: categoria.trim(),
          localidade: localidade.trim(),
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
          preco: precoNumerico,
          preco_negociavel: precoNegociavel,
          contato: contato.trim() || null,
          estado: 'em_analise',
          dados_especificos: dadosEspecificos,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (!anuncioCriado?.id) {
        throw new Error('O anúncio foi guardado, mas não foi possível obter o seu identificador.');
      }
      // A notificação é enviada depois de o anúncio ficar guardado.
      // Uma falha na notificação não invalida a gravação do anúncio.
      const { error: erroNotificacao } = await supabase.functions.invoke(
        'notificar-novo-anuncio',
        { body: { anuncio_id: anuncioCriado.id } }
      );
      if (erroNotificacao) {
        console.error('O anúncio foi guardado, mas a notificação falhou:', erroNotificacao);
      }
      // A confirmação dentro da aplicação evita a transição problemática
      // entre window.alert() e router.replace() na versão web.
      setSucessoVisivel(true);
    } catch (error: any) {
      console.error(
        'Erro ao publicar anúncio:',
        error
      );
      mostrarAlerta(
        'Não foi possível publicar',
        error?.message ||
          'Ocorreu um erro ao enviar o anúncio. Tente novamente.'
      );
    } finally {
      setPublicando(false);
    }
  }
  const camposAtuais =
    CAMPOS_ESPECIFICOS[tipoAnuncio] || [];
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Publicar anúncio
        </Text>
        <Text style={styles.subtitle}>
          Publique gratuitamente no Conecta Minho.
        </Text>
        <Text style={styles.label}>
          O que pretende anunciar?
        </Text>
        <Pressable
          style={styles.typeSelector}
          onPress={() => setSeletorAberto(true)}
        >
          <View style={styles.typeSelectorText}>
            <Text style={styles.typeSelectorTitle}>
              {tipoAnuncio}
            </Text>
            <Text style={styles.typeSelectorHint}>
              Escolha o tipo de anúncio
            </Text>
          </View>
          <Text style={styles.selectorArrow}>▼</Text>
        </Pressable>
        <Modal
          visible={seletorAberto}
          transparent
          animationType="fade"
          onRequestClose={() => setSeletorAberto(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Tipo de anúncio
                </Text>
                <Pressable
                  onPress={() => setSeletorAberto(false)}
                  style={styles.modalClose}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {TIPOS_ANUNCIO.map((tipo) => {
                  const ativo = tipo === tipoAnuncio;
                  return (
                    <Pressable
                      key={tipo}
                      style={[
                        styles.typeOption,
                        ativo && styles.typeOptionActive,
                      ]}
                      onPress={() => alterarTipo(tipo)}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          ativo && styles.typeOptionTextActive,
                        ]}
                      >
                        {tipo}
                      </Text>
                      {ativo ? (
                        <Text style={styles.typeOptionCheck}>
                          ✓
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
        <Text style={styles.label}>
          Nome / título do anúncio *
        </Text>
        <TextInput
          style={styles.input}
          placeholder={
            tipoAnuncio === 'Emprego / vaga'
              ? 'Ex.: Técnico de manutenção'
              : tipoAnuncio === 'Automóvel'
              ? 'Ex.: Peugeot 5008 GT'
              : tipoAnuncio === 'Imóvel'
              ? 'Ex.: Apartamento T3 em Guimarães'
              : 'Ex.: Reparação de máquinas de lavar'
          }
          placeholderTextColor="#8A94A6"
          value={titulo}
          onChangeText={setTitulo}
        />
        <Text style={styles.label}>Categoria *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: Construção, informática, turismo..."
          placeholderTextColor="#8A94A6"
          value={categoria}
          onChangeText={setCategoria}
        />
        <Text style={styles.label}>Localidade *</Text>
        <TextInput
          style={styles.input}
          placeholder="Guimarães"
          placeholderTextColor="#8A94A6"
          value={localidade}
          onChangeText={setLocalidade}
        />
        {camposAtuais.length > 0 && (
          <View style={styles.dynamicSection}>
            <Text style={styles.dynamicTitle}>
              Dados específicos
            </Text>
            <Text style={styles.dynamicSubtitle}>
              Estes campos aparecem de acordo com o tipo de anúncio escolhido.
            </Text>
            {camposAtuais.map((campo) => {
              const opcional =
                tipoAnuncio === 'Serviço profissional' &&
                campo.chave === 'experiencia';
              return (
                <View key={campo.chave}>
                  <Text style={styles.label}>
                    {campo.label}{opcional ? '' : ' *'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={campo.placeholder}
                    placeholderTextColor="#8A94A6"
                    value={camposEspecificos[campo.chave] || ''}
                    onChangeText={(valor) =>
                      alterarCampoEspecifico(
                        campo.chave,
                        valor
                      )
                    }
                    keyboardType={campo.teclado || 'default'}
                  />
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.imagesCard}>
          <Text style={styles.imagesTitle}>
            Fotografias do anúncio *
          </Text>
          <Text style={styles.imagesHint}>
            Adicione entre 2 e 5 fotografias reais do produto, serviço ou trabalhos realizados. A primeira será a imagem principal.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesRow}
          >
            {imagensSelecionadas.map((imagem, indice) => (
              <View
                key={imagem.uri}
                style={styles.imagePreviewWrap}
              >
                <Image
                  source={{ uri: imagem.uri }}
                  style={styles.imagePreview}
                />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => removerImagem(imagem.uri)}
                  accessibilityLabel={`Remover fotografia ${indice + 1}`}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </Pressable>
                <Text style={styles.imageNumber}>
                  {indice === 0 ? 'Principal' : `Foto ${indice + 1}`}
                </Text>
              </View>
            ))}
            {imagensSelecionadas.length < 5 ? (
              <Pressable
                style={styles.addImageButton}
                onPress={selecionarImagens}
              >
                <Text style={styles.addImagePlus}>＋</Text>
                <Text style={styles.addImageText}>Adicionar</Text>
              </Pressable>
            ) : null}
          </ScrollView>
          <Text style={styles.imagesCounter}>
            {imagensSelecionadas.length}/5 fotografias · mínimo 2
          </Text>
        </View>
        <Text style={styles.label}>Descrição *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descreva o que está a anunciar..."
          placeholderTextColor="#8A94A6"
          value={descricao}
          onChangeText={setDescricao}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.label}>Preço</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: 250"
          placeholderTextColor="#8A94A6"
          value={preco}
          onChangeText={setPreco}
          keyboardType="decimal-pad"
        />
        <Pressable
          style={styles.checkboxRow}
          onPress={() =>
            setPrecoNegociavel(!precoNegociavel)
          }
        >
          <View
            style={[
              styles.checkbox,
              precoNegociavel && styles.checkboxActive,
            ]}
          >
            {precoNegociavel && (
              <Text style={styles.check}>✓</Text>
            )}
          </View>
          <Text style={styles.checkboxText}>
            Preço negociável
          </Text>
        </Pressable>
        <Text style={styles.label}>Contacto *</Text>
        <TextInput
          style={styles.input}
          placeholder="Telefone, WhatsApp ou e-mail"
          placeholderTextColor="#8A94A6"
          value={contato}
          onChangeText={setContato}
          keyboardType="default"
        />
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            🔎 Antes de publicar
          </Text>
          <Text style={styles.infoText}>
            O anúncio será enviado para análise.
            Só ficará visível no Conecta Minho
            depois de ser aprovado.
          </Text>
        </View>
        <Pressable
          style={[
            styles.publishButton,
            publicando && styles.publishButtonDisabled,
          ]}
          onPress={publicarAnuncio}
          disabled={publicando}
        >
          {publicando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.publishText}>
              Publicar anúncio
            </Text>
          )}
        </Pressable>
        <Pressable
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={publicando}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={sucessoVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setSucessoVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Anúncio enviado!</Text>
            <Text style={styles.successMessage}>
              O seu anúncio foi enviado para análise. Depois de aprovado,
              ficará disponível no Conecta Minho.
            </Text>
            <Pressable
              style={styles.successButton}
              onPress={() => {
                setSucessoVisivel(false);
                router.replace('/');
              }}
            >
              <Text style={styles.successButtonText}>Ir para o início</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1D2733',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#68727E',
    marginBottom: 26,
    lineHeight: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D2733',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 14,
    minHeight: 54,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1D2733',
  },
  textArea: {
    minHeight: 130,
    paddingTop: 15,
  },
  typeSelector: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1677B8',
    borderRadius: 14,
    minHeight: 66,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeSelectorText: {
    flex: 1,
  },
  typeSelectorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1D2733',
  },
  typeSelectorHint: {
    fontSize: 12,
    color: '#68727E',
    marginTop: 3,
  },
  selectorArrow: {
    fontSize: 16,
    color: '#1677B8',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '80%',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1D2733',
  },
  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 27,
    color: '#59636F',
    lineHeight: 30,
  },
  typeOption: {
    minHeight: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 8,
    backgroundColor: '#F7F8FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeOptionActive: {
    backgroundColor: '#EAF4FB',
    borderWidth: 1,
    borderColor: '#1677B8',
  },
  typeOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#35404B',
  },
  typeOptionTextActive: {
    color: '#1677B8',
  },
  typeOptionCheck: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1677B8',
    marginLeft: 10,
  },
  dynamicSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 16,
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#E3E8ED',
  },
  dynamicTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D2733',
  },
  dynamicSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#68727E',
    marginTop: 4,
    marginBottom: 3,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#AAB4C0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#1677B8',
    borderColor: '#1677B8',
  },
  check: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  checkboxText: {
    fontSize: 16,
    color: '#1D2733',
  },
  infoBox: {
    backgroundColor: '#EAF5FC',
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16658F',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#36566A',
  },
  publishButton: {
    minHeight: 58,
    borderRadius: 15,
    backgroundColor: '#1677B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  imagesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9E2EA',
    padding: 16,
    marginBottom: 20,
  },
  imagesTitle: {
    color: '#172033',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  imagesHint: {
    color: '#626B78',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  imagesRow: {
    alignItems: 'flex-start',
    gap: 12,
  },
  imagePreviewWrap: {
    width: 112,
    alignItems: 'center',
  },
  imagePreview: {
    width: 108,
    height: 108,
    borderRadius: 12,
    backgroundColor: '#E8EDF2',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 7,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#172033',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
  },
  imageNumber: {
    color: '#626B78',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  addImageButton: {
    width: 108,
    height: 108,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#177DBA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F9FD',
  },
  addImagePlus: {
    color: '#177DBA',
    fontSize: 30,
    fontWeight: '700',
  },
  addImageText: {
    color: '#177DBA',
    fontSize: 13,
    fontWeight: '800',
  },
  imagesCounter: {
    color: '#177DBA',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  cancelButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#5C6672',
    fontSize: 16,
    fontWeight: '700',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 26,
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  successIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: '#E4F7EC',
    color: '#16834A',
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 58,
    marginBottom: 16,
  },
  successTitle: {
    color: '#1D2733',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  successMessage: {
    color: '#59636F',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 22,
  },
  successButton: {
    minHeight: 52,
    width: '100%',
    borderRadius: 13,
    backgroundColor: '#1677B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
