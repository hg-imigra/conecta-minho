import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supabase';

type Anuncio = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  localidade: string | null;
  preco: number | null;
  preco_negociavel: boolean | null;
  tipo_anuncio: string | null;
  dados_especificos: Record<string, unknown> | null;
};

export default function AnunciosAnuncianteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; nome?: string }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const nomeParam = Array.isArray(params.nome) ? params.nome[0] : params.nome;
  const nome = nomeParam || 'Anunciante Conecta';
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      if (!userId) {
        setErro('Não foi possível identificar o anunciante.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setErro('');
      try {
        const { data, error } = await supabase
          .from('anuncios')
          .select('id, user_id, titulo, descricao, categoria, localidade, preco, preco_negociavel, tipo_anuncio, dados_especificos')
          .eq('user_id', userId)
          .eq('estado', 'publicado')
          .order('criado_em', { ascending: false });
        if (error) throw error;
        // Separação obrigatória: esta montra mostra apenas anúncios comuns.
        // Os perfis Privé nunca podem aparecer na página pública do anunciante comum.
        const comuns = ((data || []) as Anuncio[]).filter((item) => {
          const tipo = String(item.tipo_anuncio || '').toLocaleLowerCase('pt-PT');
          const dados = item.dados_especificos || {};
          return !Boolean(dados.submissao_prive) &&
            !tipo.includes('adulto') &&
            !tipo.includes('privé') &&
            !tipo.includes('prive');
        });
        if (ativo) setAnuncios(comuns);
      } catch (e: any) {
        console.error('Erro ao carregar anúncios do anunciante:', e);
        if (ativo) setErro('Não foi possível carregar os anúncios deste anunciante.');
      } finally {
        if (ativo) setLoading(false);
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [userId]);

  function preco(anuncio: Anuncio) {
    const dados = anuncio.dados_especificos || {};
    const candidatos = [anuncio.preco, dados.preco, dados.preco_valor, dados.valor_preco, dados.precoAnuncio, dados.preco_anuncio, dados.valor];
    const encontrado = candidatos.find((v) => v !== null && v !== undefined && String(v).trim() !== '');
    if (encontrado !== undefined) {
      const numero = typeof encontrado === 'number' ? encontrado : Number(String(encontrado).replace(/[^0-9,.-]/g, '').replace(',', '.'));
      if (Number.isFinite(numero) && numero >= 0) {
        const valor = numero.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
        return anuncio.preco_negociavel ? `${valor} · Negociável` : valor;
      }
      const texto = String(encontrado).trim();
      if (texto && !/^sob consulta$/i.test(texto)) return texto;
    }
    return anuncio.preco_negociavel ? 'Preço negociável' : 'Preço sob consulta';
  }

  function imagem(anuncio: Anuncio) {
    const imagens = anuncio.dados_especificos?.imagens;
    if (Array.isArray(imagens)) {
      const primeira = imagens.find((v): v is string => typeof v === 'string' && v.trim().length > 0);
      if (primeira) return primeira;
    }
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/pesquisar'); }} activeOpacity={0.75}>
          <Text style={styles.backText}>‹  Voltar</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{nome.trim().charAt(0).toUpperCase() || 'A'}</Text></View>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>MONTRA DO ANUNCIANTE</Text>
            <Text style={styles.title}>{nome}</Text>
            <Text style={styles.subtitle}>Anúncios comuns publicados desta conta</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.stateBox}><ActivityIndicator size="large" color="#1677B8" /><Text style={styles.stateText}>A carregar anúncios...</Text></View>
        ) : erro ? (
          <View style={styles.stateBox}><Text style={styles.errorText}>{erro}</Text></View>
        ) : anuncios.length === 0 ? (
          <View style={styles.stateBox}><Text style={styles.emptyTitle}>Ainda não há anúncios activos</Text><Text style={styles.stateText}>Este anunciante não tem outros anúncios publicados neste momento.</Text></View>
        ) : (
          <>
            <Text style={styles.count}>{anuncios.length} {anuncios.length === 1 ? 'anúncio activo' : 'anúncios activos'}</Text>
            {anuncios.map((anuncio) => {
              const foto = imagem(anuncio);
              return (
                <TouchableOpacity key={anuncio.id} style={styles.card} onPress={() => router.push({ pathname: '/anuncio', params: { id: anuncio.id } })} activeOpacity={0.84}>
                  {foto ? <Image source={{ uri: foto }} style={styles.photo} resizeMode="cover" /> : <View style={styles.noPhoto}><Text style={styles.noPhotoIcon}>▧</Text><Text style={styles.noPhotoText}>Sem fotografia</Text></View>}
                  <View style={styles.cardBody}>
                    <Text style={styles.category}>{anuncio.categoria || anuncio.tipo_anuncio || 'Anúncio'}</Text>
                    <Text style={styles.cardTitle}>{anuncio.titulo}</Text>
                    {anuncio.localidade ? <Text style={styles.location}>⌖ {anuncio.localidade}</Text> : null}
                    <Text style={styles.price}>{preco(anuncio)}</Text>
                    {anuncio.descricao ? <Text style={styles.description} numberOfLines={2}>{anuncio.descricao}</Text> : null}
                    <Text style={styles.openText}>Ver anúncio  ›</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F6FB' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 10, marginBottom: 8 },
  backText: { color: '#1677B8', fontSize: 15, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E3EAF1', padding: 16, marginBottom: 20 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#E1F1FF', alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  avatarText: { color: '#0878C9', fontSize: 24, fontWeight: '900' },
  headerText: { flex: 1 },
  eyebrow: { color: '#1677B8', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  title: { color: '#102A43', fontSize: 20, fontWeight: '900' },
  subtitle: { color: '#718091', fontSize: 12, marginTop: 4 },
  count: { color: '#40556D', fontSize: 14, fontWeight: '800', marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E3EAF1', overflow: 'hidden', marginBottom: 14 },
  photo: { width: '100%', height: 190, backgroundColor: '#E8EDF2' },
  noPhoto: { width: '100%', height: 130, backgroundColor: '#EAF1F7', alignItems: 'center', justifyContent: 'center' },
  noPhotoIcon: { fontSize: 32, color: '#8A9BAC' },
  noPhotoText: { color: '#718091', fontSize: 12, marginTop: 4 },
  cardBody: { padding: 16 },
  category: { color: '#1677B8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6 },
  cardTitle: { color: '#102A43', fontSize: 18, fontWeight: '900', marginBottom: 7 },
  location: { color: '#687888', fontSize: 13, marginBottom: 8 },
  price: { color: '#075985', fontSize: 17, fontWeight: '900', marginBottom: 8 },
  description: { color: '#526273', fontSize: 13, lineHeight: 19 },
  openText: { color: '#0879C9', fontSize: 14, fontWeight: '900', marginTop: 13, textAlign: 'right' },
  stateBox: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E3EAF1' },
  stateText: { color: '#718091', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  emptyTitle: { color: '#102A43', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  errorText: { color: '#B42318', fontSize: 14, textAlign: 'center' },
});
