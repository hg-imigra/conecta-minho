import AsyncStorage from '@react-native-async-storage/async-storage';



import { useLocalSearchParams, useRouter } from 'expo-router';



import { useEffect, useMemo, useState } from 'react';







import {
  ActivityIndicator,

  FlatList,

  Keyboard,

  StyleSheet,

  Text,

  TextInput,

  TouchableOpacity,

  View,
} from 'react-native';







import { supabase } from '../supabase';







type Anuncio = {

  id: string;

  titulo: string;

  descricao: string | null;

  categoria: string | null;

  localidade: string | null;

  preco: number | null;

  preco_negociavel: boolean | null;

  tipo_anuncio: string | null;

};







const CHAVE_REGIAO = '@conecta_regiao';







function normalizarTexto(valor: string | null | undefined) {

  return (valor || '')

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .toLowerCase()

    .trim();

}

/**
 * Identifica anúncios exclusivos do Conecta Privé para nunca os mostrar
 * na pesquisa geral. A verificação usa apenas os campos de classificação,
 * sem alterar ou eliminar registos do Supabase.
 */
function anuncioEhPrive(anuncio: Pick<Anuncio, 'tipo_anuncio' | 'categoria'>) {
  const tipo = normalizarTexto(anuncio.tipo_anuncio);
  const categoria = normalizarTexto(anuncio.categoria);

  return (
    tipo.includes('prive') ||
    tipo.includes('adulto +18') ||
    tipo.includes('adulto 18+') ||
    categoria.includes('entretenimento adulto') ||
    categoria.includes('adulto +18') ||
    categoria.includes('adulto 18+')
  );
}








function categoriaPertenceAoGrupo(

  categoria: string | null,

  grupo: string

) {

  const categoriaNormalizada = normalizarTexto(categoria);

  const grupoNormalizado = normalizarTexto(grupo);







  if (!categoriaNormalizada) {

    return false;

  }







  if (!grupoNormalizado) {

    return true;

  }







  /*

   * CATEGORIAS PRINCIPAIS

   *

   * Estes grupos permitem que:

   *

   * "Para a sua casa"

   * encontre Eletricista, Canalizador, Obras, Limpeza,

   * Jardim, Eletrodomésticos, etc.

   *

   * "Para o seu carro"

   * encontre Automóveis, Oficinas, Mecânica, Pneus, etc.

   *

   * "Para o seu animal"

   * encontre Pet sitter, Animais, Veterinário, etc.

   */



  const grupos: Record<string, string[]> = {

    casa: [

      'casa',

      'obras',

      'obra',

      'remodelacoes',

      'remodelacao',

      'eletricista',

      'eletricidade',

      'canalizador',

      'canalizacao',

      'eletrodomesticos',

      'eletrodomestico',

      'reparacao de eletrodomesticos',

      'limpeza',

      'limpezas',

      'jardim',

      'jardinagem',

      'jardineiro',

      'pintura',

      'pintor',

      'carpinteiro',

      'carpintaria',

      'serralheiro',

      'serralharia',

      'pedreiro',

      'construcao',

      'construção',

      'mudancas',

      'mudancas e transportes',

      'lavandarias',

      'lavandaria',

      'decoracao',

      'decoracao de interiores',

      'climatizacao',

      'ar condicionado',

      'canalizacao',

    ],







    automoveis: [

      'automoveis',

      'automovel',

      'automoveis',

      'carro',

      'carros',

      'oficina',

      'oficinas',

      'mecanica',

      'mecanico',

      'mecanicos',

      'pneus',

      'pneus e rodas',

      'eletricista auto',

      'eletricista automovel',

      'bate chapa',

      'bate-chapa',

      'chaparia',

      'pintura automovel',

      'detalhe automovel',

      'detailing',

      'lavagem automovel',

      'lavagem de carros',

      'pecas auto',

      'pecas automovel',

      'reboque',

      'reboques',

      'motociclos',

      'motas',

      'motocicleta',

      'stand automovel',

      'stands',

      'transportes automoveis',

    ],







    pet: [

      'pet',

      'pets',

      'animais',

      'animal',

      'pet sitter',

      'petsitter',

      'babysitter de animais',

      'veterinario',

      'veterinaria',

      'clinica veterinaria',

      'banho e tosa',

      'banho e tosquia',

      'tosquia',

      'tosa',

      'dog walker',

      'passeador de caes',

      'passeio de caes',

      'hotel para animais',

      'hospedagem de animais',

      'treinador de animais',

      'adestrador',

      'loja de animais',

      'alimentacao animal',

    ],







    informatica: [

      'informatica',

      'tecnico informatico',

      'tecnico de informatica',

      'computadores',

      'computador',

      'reparacao de computadores',

      'reparacao informatica',

      'assistencia informatica',

      'tecnologia',

      'programacao',

      'web',

      'desenvolvimento web',

    ],







    advocacia: [

      'advocacia',

      'advogado',

      'advogada',

      'jurista',

      'consultoria juridica',

      'servicos juridicos',

    ],







    transportes: [

      'transportes',

      'transporte',

      'motorista',

      'mudancas',

      'entregas',

      'estafeta',

      'reboque',

      'reboques',

    ],







    jardinagem: [

      'jardim',

      'jardinagem',

      'jardineiro',

      'manutencao de jardins',

      'poda',

      'podas',

    ],







    lavandarias: [

      'lavandaria',

      'lavandarias',

      'lavagem',

      'engomadoria',

      'limpeza de roupas',

    ],







    oficinas: [

      'oficina',

      'oficinas',

      'mecanica',

      'mecanico',

      'pneus',

      'pneus e rodas',

      'bate chapa',

      'bate-chapa',

      'chaparia',

      'pintura automovel',

      'reparacao automovel',

      'reparacao de carros',

    ],







    comprasVendas: [

      'compras e vendas',

      'compras-vendas',

      'classificados',

      'venda',

      'vendas',

      'compra',

      'compras',

      'produto',

      'produtos',

      'usados',

      'segunda mao',

    ],







    eventos: [

      'eventos',

      'evento',

      'festas',

      'festa',

      'aniversarios',

      'casamentos',

      'entretenimento',

      'animacao',

    ],







    comunidade: [

      'comunidade',

      'associacao',

      'associacoes',

      'voluntariado',

      'solidariedade',

      'apoio',

    ],







    negocios: [

      'negocios',

      'negocio',

      'empresa',

      'empresas',

      'comercio',

      'comercio local',

      'loja',

      'restaurante',

      'cafe',

      'servicos',

    ],







    babysitter: [

      'babysitter',

      'baby sitter',

      'cuidadora',

      'cuidador',

      'criancas',

      'crianças',

    ],







    petSitter: [

      'pet sitter',

      'petsitter',

      'animais',

      'pet',

    ],







    manicure: [

      'manicure',

      'pedicure',

      'unhas',

      'nail designer',

      'estetica',

    ],







    fotografia: [

      'fotografo',

      'fotografia',

      'fotografa',

      'video',

      'videografo',

      'filmagem',

    ],







    jardinagemEspecialidade: [

      'jardineiro',

      'jardinagem',

      'jardim',

      'manutencao de jardins',

    ],







    costura: [

      'costureira',

      'costureiro',

      'costura',

      'alfaiate',

      'arranjos de roupa',

      'confeccao',

    ],







    explicador: [

      'explicador',

      'explicadora',

      'explicacoes',

      'explicacao',

      'aulas',

      'professor',

      'professora',

      'formacao',

    ],







    obras: [

      'obras',

      'obra',

      'remodelacoes',

      'remodelacao',

      'construcao',

      'pedreiro',

      'pintor',

      'carpinteiro',

      'serralheiro',

    ],







    eletricista: [

      'eletricista',

      'eletricidade',

      'instalacoes eletricas',

    ],







    canalizador: [

      'canalizador',

      'canalizacao',

      'aguas',

      'canos',

    ],







    eletrodomesticos: [

      'eletrodomesticos',

      'eletrodomestico',

      'reparacao de eletrodomesticos',

      'assistencia tecnica',

    ],

  };







  const termos = grupos[grupoNormalizado];







  if (!termos) {

    /*

     * Para categorias que não pertencem a um grupo especial,

     * fazemos correspondência direta na categoria do anúncio.

     */

    return categoriaNormalizada.includes(grupoNormalizado);

  }







  return termos.some((termo) => {

    const termoNormalizado = normalizarTexto(termo);







    return (

      categoriaNormalizada === termoNormalizado ||

      categoriaNormalizada.includes(termoNormalizado) ||

      termoNormalizado.includes(categoriaNormalizada)

    );

  });

}







function obterTituloDoFiltro(categoria: string) {

  const nomes: Record<string, string> = {

    casa: 'Para a sua casa',

    automoveis: 'Para o seu carro',

    pet: 'Para o seu animal',

    informatica: 'Informática',

    advocacia: 'Advocacia',

    transportes: 'Transportes',

    jardinagem: 'Jardinagem',

    lavandarias: 'Lavandarias',

    oficinas: 'Oficinas',

    'compras-vendas': 'Compras e vendas',

    negocios: 'Negócios',

    eventos: 'Eventos',

    comunidade: 'Comunidade',

    babysitter: 'Babysitter',

    'pet-sitter': 'Pet sitter',

    manicure: 'Manicure',

    fotografia: 'Fotografia',

    jardinagemEspecialidade: 'Jardinagem',

    costura: 'Costura',

    explicador: 'Explicador',

    obras: 'Obras e remodelações',

    eletricista: 'Eletricista',

    canalizador: 'Canalizador',

    eletrodomesticos: 'Reparação de eletrodomésticos',

  };







  return nomes[categoria] || categoria;

}







export default function PesquisarScreen() {

  const router = useRouter();







  const params = useLocalSearchParams<{

    categoria?: string | string[];

  }>();







  const categoriaParam = Array.isArray(params.categoria)

    ? params.categoria[0]

    : params.categoria || '';







  const categoriaFiltro = normalizarTexto(categoriaParam);







  const [pesquisa, setPesquisa] = useState('');

  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);

  const [loading, setLoading] = useState(true);

  const [erro, setErro] = useState('');

  const [regiaoSelecionada, setRegiaoSelecionada] = useState('Guimarães');







  useEffect(() => {

    carregarRegiaoEAnuncios();

  }, []);







  async function carregarRegiaoEAnuncios() {

    setLoading(true);

    setErro('');







    try {

      const regiaoSalva = await AsyncStorage.getItem(CHAVE_REGIAO);







      const regiao =

        regiaoSalva === 'Guimarães' ||

        regiaoSalva === 'Vizela' ||

        regiaoSalva === 'Fafe'

          ? regiaoSalva

          : 'Guimarães';







      setRegiaoSelecionada(regiao);







      await carregarAnuncios(regiao);

    } catch (error) {

      console.log('Erro ao carregar região:', error);

      setErro('Não foi possível carregar os anúncios.');

      setAnuncios([]);

      setLoading(false);

    }

  }







  async function carregarAnuncios(regiao?: string) {

    setLoading(true);

    setErro('');







    const regiaoAtual = regiao || regiaoSelecionada || 'Guimarães';







    const { data, error } = await supabase

      .from('anuncios')

      .select(

        'id, titulo, descricao, categoria, localidade, preco, preco_negociavel, tipo_anuncio'

      )

      .eq('estado', 'publicado')

      .order('publicado_em', { ascending: false });







    if (error) {

      console.log('Erro ao carregar anúncios:', error);

      setErro('Não foi possível carregar os anúncios.');

      setAnuncios([]);

      setLoading(false);

      return;

    }







    const anunciosDaRegiao = ((data as Anuncio[]) || [])
      // Separação defensiva: o Privé nunca entra nos resultados gerais.
      .filter((anuncio) => !anuncioEhPrive(anuncio))
      .filter((anuncio) => {

      const localidade = normalizarTexto(anuncio.localidade);

      const regiaoNormalizada = normalizarTexto(regiaoAtual);







      return (

        localidade === regiaoNormalizada ||

        localidade.includes(regiaoNormalizada) ||

        regiaoNormalizada.includes(localidade)

      );

    });







    setAnuncios(anunciosDaRegiao);

    setLoading(false);

  }







  async function pesquisar() {

    Keyboard.dismiss();







    /*

     * Os anúncios publicados já foram carregados.

     * A filtragem é feita localmente para podermos combinar:

     *

     * 1. região escolhida na Home

     * 2. categoria escolhida na Home

     * 3. termo digitado pelo utilizador

     *

     * sem alterar a estrutura existente do Supabase.

     */







    setLoading(true);

    setErro('');







    await carregarAnuncios();







    const termo = pesquisa.trim();







    if (!termo) {

      setLoading(false);

      return;

    }







    const { error } = await supabase

      .from('pesquisas')

      .insert({

        termo,

        regiao: regiaoSelecionada,

        resultados: anunciosFiltrados.length,

      });







    if (error) {

      console.log('Erro ao registar pesquisa:', error);

    }







    setLoading(false);

  }







  function limparPesquisa() {

    setPesquisa('');

  }







  function voltar() {

    router.back();

  }







  function formatarPreco(

    preco: number | null,

    negociavel: boolean | null

  ) {

    if (preco === null || preco === undefined) {

      return negociavel ? 'Negociável' : 'Preço sob consulta';

    }







    const valor = Number(preco).toLocaleString('pt-PT', {

      style: 'currency',

      currency: 'EUR',

    });







    return negociavel ? `${valor} · Negociável` : valor;

  }







  function abrirAnuncio(id: string) {

    router.push({

      pathname: '/anuncio',

      params: { id },

    });

  }







  const anunciosFiltrados = useMemo(() => {

    let resultado = [...anuncios];







    /*

     * PRIMEIRO:

     * aplica o filtro de categoria vindo da Home.

     */







    if (categoriaFiltro) {

      resultado = resultado.filter((anuncio) =>

        categoriaPertenceAoGrupo(

          anuncio.categoria,

          categoriaFiltro

        )

      );

    }







    /*

     * DEPOIS:

     * aplica o termo digitado pelo utilizador.

     *

     * Aqui podemos pesquisar pelo título, descrição,

     * categoria ou localidade.

     */







    const termo = normalizarTexto(pesquisa);







    if (termo) {

      resultado = resultado.filter((anuncio) => {

        const texto = [

          anuncio.titulo,

          anuncio.descricao,

          anuncio.categoria,

          anuncio.localidade,

          anuncio.tipo_anuncio,

        ]

          .filter(Boolean)

          .map((item) => normalizarTexto(item))

          .join(' ');







        return texto.includes(termo);

      });

    }







    return resultado;

  }, [anuncios, categoriaFiltro, pesquisa]);







  function renderAnuncio({ item }: { item: Anuncio }) {

    return (

      <View style={styles.card}>

        <Text style={styles.cardTitle}>{item.titulo}</Text>







        <Text style={styles.category}>

          {item.tipo_anuncio || 'Anúncio'} ·{' '}

          {item.categoria || 'Sem categoria'}

        </Text>







        {item.localidade ? (

          <Text style={styles.location}>

            📍 {item.localidade}

          </Text>

        ) : null}







        <Text style={styles.price}>

          {formatarPreco(item.preco, item.preco_negociavel)}

        </Text>







        {item.descricao ? (

          <Text style={styles.description} numberOfLines={3}>

            {item.descricao}

          </Text>

        ) : null}







        <TouchableOpacity

          style={styles.detailsButton}

          onPress={() => abrirAnuncio(item.id)}

          activeOpacity={0.85}

        >

          <Text style={styles.detailsButtonText}>

            Ver anúncio

          </Text>

        </TouchableOpacity>

      </View>

    );

  }







  const tituloTela = categoriaFiltro

    ? obterTituloDoFiltro(categoriaFiltro)

    : 'Pesquisar';







  return (

    <View style={styles.container}>

      <TouchableOpacity

        style={styles.backButton}

        onPress={voltar}

        activeOpacity={0.8}

      >

        <Text style={styles.backButtonText}>‹ Voltar</Text>

      </TouchableOpacity>







      <Text style={styles.title}>{tituloTela}</Text>







      <Text style={styles.subtitle}>

        {categoriaFiltro

          ? `Encontre anúncios relacionados com ${tituloTela.toLowerCase()} no Conecta Guimarães.`

          : 'Encontre anúncios, profissionais e serviços no Conecta Guimarães.'}

      </Text>







      <View style={styles.regionBadge}>

        <Text style={styles.regionBadgeIcon}>📍</Text>







        <Text style={styles.regionBadgeText}>

          Região: {regiaoSelecionada}

        </Text>

      </View>







      {categoriaFiltro ? (

        <View style={styles.filterBadge}>

          <Text style={styles.filterBadgeIcon}>✓</Text>







          <Text style={styles.filterBadgeText}>

            Filtro: {tituloTela}

          </Text>

        </View>

      ) : null}







      <View style={styles.searchRow}>

        <TextInput

          style={styles.input}

          placeholder="O que procura?"

          placeholderTextColor="#777"

          value={pesquisa}

          onChangeText={setPesquisa}

          onSubmitEditing={pesquisar}

          returnKeyType="search"

          autoCapitalize="none"

          autoCorrect={false}

        />







        <TouchableOpacity

          style={styles.searchButton}

          onPress={pesquisar}

          disabled={loading}

          activeOpacity={0.85}

        >

          <Text style={styles.searchButtonText}>

            Pesquisar

          </Text>

        </TouchableOpacity>

      </View>







      {pesquisa.trim() ? (

        <TouchableOpacity

          style={styles.clearButton}

          onPress={limparPesquisa}

          activeOpacity={0.8}

        >

          <Text style={styles.clearButtonText}>

            Limpar pesquisa

          </Text>

        </TouchableOpacity>

      ) : null}







      {loading ? (

        <View style={styles.centerMessage}>

          <ActivityIndicator

            size="large"

            color="#1677B8"

          />







          <Text style={styles.messageText}>

            A carregar anúncios...

          </Text>

        </View>

      ) : erro ? (

        <View style={styles.centerMessage}>

          <Text style={styles.errorText}>{erro}</Text>







          <TouchableOpacity

            style={styles.retryButton}

            onPress={carregarRegiaoEAnuncios}

            activeOpacity={0.85}

          >

            <Text style={styles.retryButtonText}>

              Tentar novamente

            </Text>

          </TouchableOpacity>

        </View>

      ) : (

        <FlatList

          data={anunciosFiltrados}

          keyExtractor={(item) => item.id}

          renderItem={renderAnuncio}

          showsVerticalScrollIndicator={false}

          contentContainerStyle={

            anunciosFiltrados.length === 0

              ? styles.emptyList

              : styles.listContent

          }

          ListHeaderComponent={

            anunciosFiltrados.length > 0 ? (

              <Text style={styles.resultsTitle}>

                {anunciosFiltrados.length === 1

                  ? '1 anúncio encontrado'

                  : `${anunciosFiltrados.length} anúncios encontrados`}

              </Text>

            ) : null

          }

          ListEmptyComponent={

            <View style={styles.centerMessage}>

              <Text style={styles.emptyTitle}>

                Nenhum anúncio encontrado

              </Text>







              <Text style={styles.messageText}>

                {categoriaFiltro

                  ? `Ainda não existem anúncios publicados para ${tituloTela.toLowerCase()} em ${regiaoSelecionada}.`

                  : pesquisa.trim()

                  ? `Não encontramos anúncios para "${pesquisa}" em ${regiaoSelecionada}.`

                  : `Ainda não existem anúncios publicados em ${regiaoSelecionada}.`}

              </Text>







              {categoriaFiltro ? (

                <TouchableOpacity

                  style={styles.allButton}

                  onPress={() =>

                    router.push('/pesquisar')

                  }

                  activeOpacity={0.85}

                >

                  <Text style={styles.allButtonText}>

                    Ver todos os anúncios

                  </Text>

                </TouchableOpacity>

              ) : null}

            </View>

          }

        />

      )}

    </View>

  );

}







const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#F7F8FA',

    paddingHorizontal: 20,

    paddingTop: 24,

  },







  backButton: {

    alignSelf: 'flex-start',

    paddingVertical: 5,

    paddingHorizontal: 2,

    marginBottom: 8,

  },







  backButtonText: {

    fontSize: 16,

    fontWeight: '700',

    color: '#1677B8',

  },







  title: {

    fontSize: 30,

    fontWeight: '800',

    color: '#1D2733',

    marginBottom: 8,

  },







  subtitle: {

    fontSize: 16,

    lineHeight: 23,

    color: '#68727E',

    marginBottom: 12,

  },







  regionBadge: {

    alignSelf: 'flex-start',

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#EAF4FB',

    borderRadius: 20,

    paddingHorizontal: 12,

    paddingVertical: 8,

    marginBottom: 14,

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







  filterBadge: {

    alignSelf: 'flex-start',

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#EAF4FB',

    borderRadius: 20,

    paddingHorizontal: 12,

    paddingVertical: 8,

    marginBottom: 14,

  },







  filterBadgeIcon: {

    fontSize: 15,

    fontWeight: '800',

    color: '#1677B8',

    marginRight: 6,

  },







  filterBadgeText: {

    fontSize: 13,

    fontWeight: '800',

    color: '#1677B8',

  },







  searchRow: {

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 8,

  },







  input: {

    flex: 1,

    height: 54,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,

    borderColor: '#DDE2E7',

    borderRadius: 14,

    paddingHorizontal: 15,

    fontSize: 16,

    color: '#1D2733',

  },







  searchButton: {

    height: 54,

    paddingHorizontal: 16,

    borderRadius: 14,

    backgroundColor: '#1677B8',

    alignItems: 'center',

    justifyContent: 'center',

    marginLeft: 8,

  },







  searchButtonText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',

  },







  clearButton: {

    alignSelf: 'flex-start',

    paddingVertical: 8,

    paddingHorizontal: 4,

    marginBottom: 8,

  },







  clearButtonText: {

    color: '#1677B8',

    fontSize: 14,

    fontWeight: '700',

  },







  resultsTitle: {

    fontSize: 15,

    fontWeight: '800',

    color: '#59636F',

    marginBottom: 12,

    marginTop: 4,

  },







  listContent: {

    paddingTop: 8,

    paddingBottom: 30,

  },







  emptyList: {

    flexGrow: 1,

    justifyContent: 'center',

    paddingBottom: 80,

  },







  card: {

    backgroundColor: '#FFFFFF',

    borderRadius: 18,

    padding: 18,

    marginBottom: 14,

    borderWidth: 1,

    borderColor: '#E3E7EB',

  },







  cardTitle: {

    fontSize: 20,

    fontWeight: '800',

    color: '#1D2733',

    marginBottom: 7,

  },







  category: {

    fontSize: 14,

    color: '#1677B8',

    fontWeight: '700',

    marginBottom: 7,

  },







  location: {

    fontSize: 15,

    color: '#68727E',

    marginBottom: 8,

  },







  price: {

    fontSize: 18,

    fontWeight: '800',

    color: '#1D2733',

    marginBottom: 8,

  },







  description: {

    fontSize: 15,

    lineHeight: 21,

    color: '#68727E',

    marginBottom: 14,

  },







  detailsButton: {

    height: 48,

    borderRadius: 12,

    backgroundColor: '#1677B8',

    alignItems: 'center',

    justifyContent: 'center',

  },







  detailsButtonText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',

  },







  centerMessage: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 20,

  },







  messageText: {

    fontSize: 16,

    lineHeight: 22,

    color: '#68727E',

    textAlign: 'center',

    marginTop: 10,

  },







  emptyTitle: {

    fontSize: 20,

    fontWeight: '800',

    color: '#1D2733',

    textAlign: 'center',

  },







  errorText: {

    fontSize: 16,

    lineHeight: 22,

    color: '#B42318',

    textAlign: 'center',

    marginBottom: 15,

  },







  retryButton: {

    height: 48,

    paddingHorizontal: 20,

    borderRadius: 12,

    backgroundColor: '#1677B8',

    alignItems: 'center',

    justifyContent: 'center',

  },







  retryButtonText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',

  },







  allButton: {

    height: 48,

    paddingHorizontal: 20,

    borderRadius: 12,

    backgroundColor: '#1677B8',

    alignItems: 'center',

    justifyContent: 'center',

    marginTop: 18,

  },







  allButtonText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',

  },

});