import { useRouter } from 'expo-router';

import { useEffect, useState } from 'react';

import {
  ActivityIndicator,

  Alert,

  Image,

  RefreshControl,

  ScrollView,

  StyleSheet,

  Text,

  TouchableOpacity,

  View,
} from 'react-native';

import { supabase } from '../supabase';

const MASTER_EMAIL = 'hgimigra@gmail.com';

type Pesquisa = { id: string; termo: string; regiao: string; resultados: number; criado_em: string; };

type Anuncio = {

id: string;

user_id: string | null;

titulo: string | null;

descricao: string | null;

tipo_anuncio: string | null;

categoria: string | null;

localidade: string | null;

preco: number | string | null;

preco_negociavel: boolean | null;

contato: string | null;

estado: string | null;

criado_em: string | null;

publicado_em: string | null;

dados_especificos: Record<string, any> | null;

};

export default function PainelScreen() {

const router = useRouter();

const [email, setEmail] = useState('');

const [autorizado, setAutorizado] = useState(false);

const [anuncios, setAnuncios] = useState<Anuncio[]>([]);

const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);

const [carregando, setCarregando] = useState(true);

const [atualizando, setAtualizando] = useState(false);

const [erro, setErro] = useState('');

const [processandoId, setProcessandoId] = useState<string | null>(null);

const [anunciosSelecionados, setAnunciosSelecionados] = useState<string[]>([]);

const [mostrarGestaoAnuncios, setMostrarGestaoAnuncios] = useState(true);

const [apagandoEmMassa, setApagandoEmMassa] = useState(false);

const [periodoEstatisticas, setPeriodoEstatisticas] = useState<

'hoje' | '7dias' | '30dias' | 'tudo'

>('tudo');

useEffect(() => {

verificarAcesso();

}, []);

async function verificarAcesso() {

setCarregando(true);

setErro('');

try {

const {

data: { session },

} = await supabase.auth.getSession();

if (!session?.user?.email) {

setEmail('');

setAutorizado(false);

return;

}

const emailAtual = session.user.email.trim().toLowerCase();

setEmail(emailAtual);

if (emailAtual !== MASTER_EMAIL.toLowerCase()) {

setAutorizado(false);

return;

}

setAutorizado(true);

await carregarAnuncios();

} catch (error: any) {

console.error('Erro ao verificar acesso:', error);

setErro(

error?.message ||

'Ocorreu um erro ao verificar o acesso ao Painel de Controlo.'

);

} finally {

setCarregando(false);

}

}

async function carregarAnuncios() {

setErro('');

const { data, error } = await supabase

.from('anuncios')

.select(

'id, user_id, titulo, descricao, tipo_anuncio, categoria, localidade, preco, preco_negociavel, contato, estado, criado_em, publicado_em, dados_especificos'

)

.order('criado_em', { ascending: false });

if (error) {

console.error('Erro ao carregar painel:', error);

setErro(

'Não foi possível carregar os anúncios do painel.\n\n' +

error.message

);

setAnuncios([]);

return;

}

setAnuncios((data as Anuncio[]) || []);

const { data: pesquisasData, error: pesquisasError } = await supabase

.from('pesquisas')

.select('id, termo, regiao, resultados, criado_em')

.order('criado_em', { ascending: false });

if (pesquisasError) {

  console.error('Erro ao carregar pesquisas:', pesquisasError);

  setPesquisas([]);

} else {

  setPesquisas((pesquisasData as Pesquisa[]) || []);

}

}

async function atualizarPainel() {

setAtualizando(true);

try {

await carregarAnuncios();

} finally {

setAtualizando(false);

}

}

function alternarSelecaoAnuncio(id: string) {

  setAnunciosSelecionados((atuais) => atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]);

}

function alternarSelecaoTodos() {

  setAnunciosSelecionados((atuais) => atuais.length === anuncios.length ? [] : anuncios.map((item) => item.id));

}

function confirmarExclusaoEmMassa() {
  const ids = anunciosSelecionados.filter((id) => anuncios.some((item) => item.id === id));

  if (!ids.length) {
    Alert.alert('Nenhum anúncio selecionado', 'Selecione um ou mais anúncios para retirar da publicação.');
    return;
  }

  Alert.alert(
    'Retirar anúncios da publicação',
    `O MASTER vai retirar ${ids.length} anúncio(s) da publicação. Os anúncios deixam de aparecer ao público, mas os registos ficam preservados na base de dados para evitar o bloqueio de relações associadas.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: `Retirar ${ids.length} anúncio(s)`,
        style: 'destructive',
        onPress: async () => {
          setApagandoEmMassa(true);
          try {
            // A eliminação física está a ser bloqueada por uma regra/ligação
            // da base de dados. Alterar o estado retira o anúncio do público
            // sem apagar dados relacionados nem afectar pedidos/orçamentos.
            const { data, error } = await supabase
              .from('anuncios')
              .update({ estado: 'rejeitado' })
              .in('id', ids)
              .select('id');

            if (error) throw error;

            const retirados = (data || []).map((item: any) => item.id as string);

            if (retirados.length !== ids.length) {
              await carregarAnuncios();
              setAnunciosSelecionados([]);
              Alert.alert(
                'Operação parcial',
                `O Supabase confirmou ${retirados.length} de ${ids.length} anúncios retirados. Verifique as permissões RLS do MASTER para UPDATE.`
              );
              return;
            }

            setAnuncios((atuais) =>
              atuais.map((item) =>
                retirados.includes(item.id) ? { ...item, estado: 'rejeitado' } : item
              )
            );
            setAnunciosSelecionados([]);
            Alert.alert(
              'Anúncios retirados da publicação',
              `${retirados.length} anúncio(s) deixaram de estar publicados. Os dados foram preservados na base de dados.`
            );
          } catch (error: any) {
            Alert.alert(
              'Não foi possível retirar os anúncios',
              error?.message ||
                'O Supabase recusou a operação. Confirme a política RLS de UPDATE exclusiva do MASTER.'
            );
          } finally {
            setApagandoEmMassa(false);
          }
        },
      },
    ]
  );
}

async function aprovarAnuncio(anuncio: Anuncio) {

Alert.alert(

'Aprovar anúncio',

`Tem certeza que deseja aprovar "${anuncio.titulo || 'este anúncio'}"?`,

[

{

text: 'Cancelar',

style: 'cancel',

},

{

text: 'Aprovar',

onPress: async () => {

await alterarEstado(anuncio, 'publicado');

},

},

]

);

}

async function reprovarAnuncio(anuncio: Anuncio) {

Alert.alert(

'Reprovar anúncio',

`Tem certeza que deseja reprovar "${anuncio.titulo || 'este anúncio'}"?`,

[

{

text: 'Cancelar',

style: 'cancel',

},

{

text: 'Reprovar',

style: 'destructive',

onPress: async () => {

await alterarEstado(anuncio, 'rejeitado');

},

},

]

);

}

async function alterarEstado(

anuncio: Anuncio,

novoEstado: 'publicado' | 'rejeitado'

) {

try {

setProcessandoId(anuncio.id);

const dadosAtualizacao: Record<string, any> = {

estado: novoEstado,

};

if (novoEstado === 'publicado') {

dadosAtualizacao.publicado_em = new Date().toISOString();

}

const { error } = await supabase

.from('anuncios')

.update(dadosAtualizacao)

.eq('id', anuncio.id)

.eq('estado', 'em_analise');

if (error) {

console.error('Erro ao alterar estado:', error);

Alert.alert(

'Não foi possível concluir',

error.message ||

'O Supabase não permitiu alterar o estado deste anúncio.'

);

return;

}

setAnuncios((listaAtual) =>

listaAtual.map((item) =>

item.id === anuncio.id

? {

...item,

estado: novoEstado,

publicado_em:

novoEstado === 'publicado'

? new Date().toISOString()

: item.publicado_em,

}

: item

)

);

Alert.alert(

novoEstado === 'publicado'

? 'Anúncio aprovado'

: 'Anúncio reprovado',

novoEstado === 'publicado'

? 'O anúncio foi aprovado e já pode ficar disponível no Conecta.'

: 'O anúncio foi reprovado e não será publicado.'

);

} catch (error: any) {

console.error(error);

Alert.alert(

'Erro',

error?.message ||

'Ocorreu um erro ao processar a moderação.'

);

} finally {

setProcessandoId(null);

}

}

function obterImagensAnuncio(anuncio: Anuncio): string[] {

  const imagens = anuncio.dados_especificos?.imagens;

  if (!Array.isArray(imagens)) return [];

  return imagens.filter(

    (url: unknown): url is string =>

      typeof url === 'string' && /^https?:\/\//i.test(url.trim())

  );

}

function formatarData(data: string | null) {

if (!data) {

return 'Data não informada';

}

const objeto = new Date(data);

if (Number.isNaN(objeto.getTime())) {

return data;

}

return objeto.toLocaleString('pt-PT', {

day: '2-digit',

month: '2-digit',

year: 'numeric',

hour: '2-digit',

minute: '2-digit',

});

}

function formatarPreco(preco: number | string | null) {

if (preco === null || preco === undefined || preco === '') {

return 'Não informado';

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

function obterDadosEvento(anuncio: Anuncio) {

if (

anuncio.tipo_anuncio !== 'Evento' ||

!anuncio.dados_especificos

) {

return null;

}

return anuncio.dados_especificos;

}

const pendentes = anuncios.filter(

(item) => item.estado === 'em_analise'

);

const aprovados = anuncios.filter(

(item) => item.estado === 'publicado'

);

const rejeitados = anuncios.filter(

(item) => item.estado === 'rejeitado'

);

const eventosPendentes = pendentes.filter(

(item) => item.tipo_anuncio === 'Evento'

);

/* ================================

   ESTATÍSTICAS

\================================ */

const agora = new Date();

function anuncioDentroDoPeriodo(anuncio: Anuncio) {

if (periodoEstatisticas === 'tudo') {

return true;

}

if (!anuncio.criado_em) {

return false;

}

const data = new Date(anuncio.criado_em);

if (Number.isNaN(data.getTime())) {

return false;

}

const inicio = new Date(agora);

inicio.setHours(0, 0, 0, 0);

if (periodoEstatisticas === '7dias') {

inicio.setDate(inicio.getDate() - 6);

}

if (periodoEstatisticas === '30dias') {

inicio.setDate(inicio.getDate() - 29);

}

return data >= inicio && data <= agora;

}

const anunciosEstatisticas =

anuncios.filter(anuncioDentroDoPeriodo);

const totalEstatisticas =

anunciosEstatisticas.length;

const publicadosEstatisticas =

anunciosEstatisticas.filter(

(item) => item.estado === 'publicado'

).length;

const pendentesEstatisticas =

anunciosEstatisticas.filter(

(item) => item.estado === 'em_analise'

).length;

const rejeitadosEstatisticas =

anunciosEstatisticas.filter(

(item) => item.estado === 'rejeitado'

).length;

const eventosEstatisticas =

anunciosEstatisticas.filter(

(item) => item.tipo_anuncio === 'Evento'

).length;

function contarPorRegiao(regiao: string) {

return anunciosEstatisticas.filter(

(item) =>

(item.localidade || '')

.toLowerCase()

.includes(regiao.toLowerCase())

).length;

}

const regioesEstatisticas = [

{

nome: 'Guimarães',

quantidade: contarPorRegiao('Guimarães'),

},

{

nome: 'Vizela',

quantidade: contarPorRegiao('Vizela'),

},

{

nome: 'Fafe',

quantidade: contarPorRegiao('Fafe'),

},

];

const categoriasEstatisticas =

Object.entries(

anunciosEstatisticas.reduce<Record<string, number>>(

(resultado, item) => {

const categoria =

(item.categoria || 'Sem categoria').trim() ||

'Sem categoria';

resultado[categoria] =

(resultado[categoria] || 0) + 1;

return resultado;

},

{}

)

)

.sort((a, b) => b[1] - a[1])

.slice(0, 10);

const tiposEstatisticas =

Object.entries(

anunciosEstatisticas.reduce<Record<string, number>>(

(resultado, item) => {

const tipo =

(item.tipo_anuncio || 'Sem tipo').trim() ||

'Sem tipo';

resultado[tipo] =

(resultado[tipo] || 0) + 1;

return resultado;

},

{}

)

)

.sort((a, b) => b[1] - a[1])

.slice(0, 10);

/* ================================

   ESTATÍSTICAS DE PROCURA

\================================ */

function pesquisaDentroDoPeriodo(pesquisa: Pesquisa) {

  if (periodoEstatisticas === 'tudo') return true;

  if (!pesquisa.criado_em) return false;

  const data = new Date(pesquisa.criado_em);

  if (Number.isNaN(data.getTime())) return false;

  const inicio = new Date(agora);

  inicio.setHours(0, 0, 0, 0);

  if (periodoEstatisticas === '7dias') inicio.setDate(inicio.getDate() - 6);

  if (periodoEstatisticas === '30dias') inicio.setDate(inicio.getDate() - 29);

  return data >= inicio && data <= agora;

}

const pesquisasEstatisticas = pesquisas.filter(pesquisaDentroDoPeriodo);

const totalPesquisasEstatisticas = pesquisasEstatisticas.length;

const totalResultadosPesquisas = pesquisasEstatisticas.reduce((total, pesquisa) => total + Number(pesquisa.resultados || 0), 0);

const pesquisasPorTermo = Object.entries(pesquisasEstatisticas.reduce<Record<string, number>>((resultado, pesquisa) => {

  const termo = (pesquisa.termo || 'Pesquisa sem termo').trim() || 'Pesquisa sem termo';

  resultado[termo] = (resultado[termo] || 0) + 1;

  return resultado;

}, {})).sort((a, b) => b[1] - a[1]).slice(0, 10);

const pesquisasPorRegiao = Object.entries(pesquisasEstatisticas.reduce<Record<string, number>>((resultado, pesquisa) => {

  const regiao = (pesquisa.regiao || 'Sem região').trim() || 'Sem região';

  resultado[regiao] = (resultado[regiao] || 0) + 1;

  return resultado;

}, {})).sort((a, b) => b[1] - a[1]);

const quantidadeTermoMaisPesquisado = pesquisasPorTermo.length ? pesquisasPorTermo[0][1] : 0;

/* ================================

   ACESSO

\================================ */

if (carregando) {

return (

<View style={styles.loadingScreen}>

<ActivityIndicator

size="large"

color="#1677B8"

/>

<Text style={styles.loadingText}>

A carregar Painel de Controlo...

</Text>

</View>

);

}

if (!email) {

return (

<View style={styles.deniedScreen}>

<Text style={styles.deniedIcon}>🔒</Text>

<Text style={styles.deniedTitle}>

Acesso restrito

</Text>

<Text style={styles.deniedText}>

É necessário iniciar sessão para aceder ao Painel de Controlo.

</Text>

<TouchableOpacity

style={styles.primaryButton}

onPress={() => router.push('/conta')}

activeOpacity={0.85}

>

<Text style={styles.primaryButtonText}>

Ir para a minha conta

</Text>

</TouchableOpacity>

<TouchableOpacity

style={styles.secondaryButton}

onPress={() => router.back()}

activeOpacity={0.85}

>

<Text style={styles.secondaryButtonText}>

Voltar

</Text>

</TouchableOpacity>

</View>

);

}

if (!autorizado) {

return (

<View style={styles.deniedScreen}>

<Text style={styles.deniedIcon}>🛡️</Text>

<Text style={styles.deniedTitle}>

Área exclusiva

</Text>

<Text style={styles.deniedText}>

Esta área é exclusiva do Administrador MASTER do Conecta Guimarães.

</Text>

<View style={styles.emailBox}>

<Text style={styles.emailLabel}>

Conta autenticada

</Text>

<Text style={styles.emailValue}>

{email}

</Text>

</View>

<TouchableOpacity

style={styles.secondaryButton}

onPress={() => router.back()}

activeOpacity={0.85}

>

<Text style={styles.secondaryButtonText}>

Voltar

</Text>

</TouchableOpacity>

</View>

);

}

/* ================================

   PAINEL

\================================ */

return (

<View style={styles.container}>

<ScrollView

showsVerticalScrollIndicator={false}

contentContainerStyle={styles.content}

refreshControl={

<RefreshControl

refreshing={atualizando}

onRefresh={atualizarPainel}

/>

}

>

<View style={styles.header}>

<View style={styles.headerTop}>

<View style={styles.headerTextArea}>

<Text style={styles.masterBadge}>

ADMINISTRADOR MASTER

</Text>

<Text style={styles.title}>

Painel de Controlo

</Text>

<Text style={styles.subtitle}>

Gestão administrativa do Conecta Guimarães.

</Text>

</View>

<TouchableOpacity

style={styles.closeButton}

onPress={() => router.back()}

activeOpacity={0.8}

>

<Text style={styles.closeButtonText}>

×

</Text>

</TouchableOpacity>

</View>

<View style={styles.masterBox}>

<Text style={styles.masterLabel}>

Conta MASTER

</Text>

<Text style={styles.masterEmail}>

{email}

</Text>

</View>

</View>

<View style={styles.warningBox}>

<Text style={styles.warningTitle}>

🛡️ Área exclusiva

</Text>

<Text style={styles.warningText}>

Aqui são tratados os anúncios enviados pelos utilizadores,

incluindo eventos. A aprovação coloca o conteúdo como

publicado. A reprovação impede a publicação.

</Text>

</View>

{erro ? (

<View style={styles.errorBox}>

<Text style={styles.errorTitle}>

Não foi possível carregar o painel

</Text>

<Text style={styles.errorText}>

{erro}

</Text>

<TouchableOpacity

style={styles.errorButton}

onPress={atualizarPainel}

activeOpacity={0.85}

>

<Text style={styles.errorButtonText}>

Tentar novamente

</Text>

</TouchableOpacity>

</View>

) : null}

{/* ================================

    CARDS ADMINISTRATIVOS

\================================ */}

<View style={styles.statisticsSection}>

  <View style={styles.sectionHeader}>

    <View style={styles.sectionHeaderText}>

      <Text style={styles.sectionTitle}>🗂️ Gestão total de anúncios</Text>

      <Text style={styles.sectionSubtitle}>Área exclusiva MASTER. Pode selecionar anúncios de qualquer estado e retirá-los da publicação.</Text>

    </View>

    <TouchableOpacity style={styles.periodButton} onPress={() => setMostrarGestaoAnuncios((v) => !v)}>

      <Text style={styles.periodButtonText}>{mostrarGestaoAnuncios ? 'Ocultar' : 'Mostrar'}</Text>

    </TouchableOpacity>

  </View>

  {mostrarGestaoAnuncios && <>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>

      <TouchableOpacity style={styles.periodButton} onPress={alternarSelecaoTodos}>

        <Text style={styles.periodButtonText}>{anunciosSelecionados.length === anuncios.length && anuncios.length ? 'Desmarcar todos' : 'Selecionar todos'} ({anuncios.length})</Text>

      </TouchableOpacity>

      <TouchableOpacity style={[styles.errorButton, (anunciosSelecionados.length === 0 || apagandoEmMassa) && { opacity: 0.45 }]} disabled={anunciosSelecionados.length === 0 || apagandoEmMassa} onPress={confirmarExclusaoEmMassa}>

        <Text style={styles.errorButtonText}>{apagandoEmMassa ? 'A excluir…' : `🗑️ Retirar selecionados (${anunciosSelecionados.length})`}</Text>

      </TouchableOpacity>

    </View>

    {anuncios.length === 0 ? <View style={styles.emptyBox}><Text style={styles.emptyText}>Não existem anúncios carregados.</Text></View> : anuncios.map((anuncio) => {

      const marcado = anunciosSelecionados.includes(anuncio.id);

      return <TouchableOpacity key={`gestao-${anuncio.id}`} style={[styles.moderationCard, marcado && { borderColor: '#C33B45', borderWidth: 2 }]} onPress={() => alternarSelecaoAnuncio(anuncio.id)} activeOpacity={0.8}>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>

          <View style={{ width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: marcado ? '#C33B45' : '#9AA4AF', backgroundColor: marcado ? '#C33B45' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{marcado ? '✓' : ''}</Text></View>

          <View style={{ flex: 1 }}>

            <Text style={styles.anuncioTitle}>{anuncio.titulo || 'Sem título'}</Text>

            <Text style={styles.metaText}>{anuncio.tipo_anuncio || 'Sem tipo'} · {anuncio.categoria || 'Sem categoria'}</Text>

            <Text style={styles.metaText}>{anuncio.localidade || 'Sem localidade'} · Estado: {anuncio.estado || 'desconhecido'}</Text>

            <Text style={styles.metaText}>ID: {anuncio.id}</Text>

          </View>

        </View>

      </TouchableOpacity>;

    })}

  </>}

</View>

<View style={styles.statsGrid}>

<View style={styles.statCard}>

<Text style={styles.statNumber}>

{pendentes.length}

</Text>

<Text style={styles.statLabel}>

⏳ Aguardam aprovação

</Text>

</View>

<View style={styles.statCard}>

<Text style={styles.statNumber}>

{aprovados.length}

</Text>

<Text style={styles.statLabel}>

✅ Aprovados

</Text>

</View>

<View style={styles.statCard}>

<Text style={styles.statNumber}>

{rejeitados.length}

</Text>

<Text style={styles.statLabel}>

❌ Rejeitados

</Text>

</View>

<View style={styles.statCard}>

<Text style={styles.statNumber}>

{eventosPendentes.length}

</Text>

<Text style={styles.statLabel}>

📅 Eventos pendentes

</Text>

</View>

</View>

{/* ================================

    ESTATÍSTICAS

\================================ */}

<View style={styles.statisticsSection}>

<View style={styles.sectionHeader}>

<View style={styles.sectionHeaderText}>

<Text style={styles.sectionTitle}>

📊 Estatísticas

</Text>

<Text style={styles.sectionSubtitle}>

Visão geral dos dados reais já registados no Conecta.

</Text>

</View>

</View>

<View style={styles.periodRow}>

{[

{ key: 'hoje', label: 'Hoje' },

{ key: '7dias', label: '7 dias' },

{ key: '30dias', label: '30 dias' },

{ key: 'tudo', label: 'Tudo' },

].map((item) => {

const ativo =

periodoEstatisticas === item.key;

return (

<TouchableOpacity

key={item.key}

style={[

styles.periodButton,

ativo && styles.periodButtonActive,

]}

onPress={() =>

setPeriodoEstatisticas(

item.key as typeof periodoEstatisticas

)

}

activeOpacity={0.85}

>

<Text

style={[

styles.periodButtonText,

ativo && styles.periodButtonTextActive,

]}

>

{item.label}

</Text>

</TouchableOpacity>

);

})}

</View>

<View style={styles.statsGrid}>

<View style={styles.statCard}>

<Text style={styles.statNumber}>

{totalEstatisticas}

</Text>

<Text style={styles.statLabel}>

📋 Total de anúncios

</Text>

</View>

<View style={styles.statCard}>

<Text style={styles.statNumber}>

{publicadosEstatisticas}

</Text>

<Text style={styles.statLabel}>

✅ Publicados

</Text>

</View>

<View style={styles.statCard}>

<Text style={styles.statNumber}>

{pendentesEstatisticas}

</Text>

<Text style={styles.statLabel}>

⏳ Em análise

</Text>

</View>

<View style={styles.statCard}>

<Text style={styles.statNumber}>

{rejeitadosEstatisticas}

</Text>

<Text style={styles.statLabel}>

❌ Rejeitados

</Text>

</View>

<View style={styles.statCard}>

<Text style={styles.statNumber}>

{eventosEstatisticas}

</Text>

<Text style={styles.statLabel}>

📅 Eventos

</Text>

</View>

</View>

/* ================================

    ESTATÍSTICAS DE PROCURA

\================================ */

<View style={styles.statisticsSection}>

  <View style={styles.sectionHeader}>

    <View style={styles.sectionHeaderText}>

      <Text style={styles.sectionTitle}>🔎 Estatísticas de procura</Text>

      <Text style={styles.sectionSubtitle}>Pesquisas realmente registadas no Supabase.</Text>

    </View>

  </View>

  <View style={styles.statsGrid}>

    <View style={styles.statCard}><Text style={styles.statNumber}>{totalPesquisasEstatisticas}</Text><Text style={styles.statLabel}>🔎 Pesquisas realizadas</Text></View>

    <View style={styles.statCard}><Text style={styles.statNumber}>{totalResultadosPesquisas}</Text><Text style={styles.statLabel}>📋 Resultados encontrados</Text></View>

    <View style={styles.statCard}><Text style={styles.statNumber}>{quantidadeTermoMaisPesquisado}</Text><Text style={styles.statLabel}>🏆 Pesquisa mais repetida</Text></View>

    <View style={styles.statCard}><Text style={styles.statNumber}>{pesquisasPorRegiao.length}</Text><Text style={styles.statLabel}>📍 Regiões com procura</Text></View>

  </View>

  <View style={styles.statisticsBlock}>

    <Text style={styles.statisticsBlockTitle}>🔥 Termos mais pesquisados</Text>

    {pesquisasPorTermo.length === 0 ? <Text style={styles.statisticsEmpty}>Ainda não existem pesquisas registadas neste período.</Text> : pesquisasPorTermo.map(([termo, quantidade]) => <View key={termo} style={styles.statisticsRow}><Text style={styles.statisticsRowLabel}>{termo}</Text><Text style={styles.statisticsRowValue}>{quantidade}</Text></View>)}

  </View>

  <View style={styles.statisticsBlock}>

    <Text style={styles.statisticsBlockTitle}>📍 Procura por região</Text>

    {pesquisasPorRegiao.length === 0 ? <Text style={styles.statisticsEmpty}>Ainda não existem pesquisas registadas neste período.</Text> : pesquisasPorRegiao.map(([regiao, quantidade]) => <View key={regiao} style={styles.statisticsRow}><Text style={styles.statisticsRowLabel}>{regiao}</Text><Text style={styles.statisticsRowValue}>{quantidade}</Text></View>)}

  </View>

  <View style={styles.statisticsNote}><Text style={styles.statisticsNoteText}>ℹ️ Os dados acima representam pesquisas efetivamente registadas pelos utilizadores no Supabase.</Text></View>

</View>

<View style={styles.statisticsBlock}>

<Text style={styles.statisticsBlockTitle}>

🌍 Por região

</Text>

{regioesEstatisticas.map((regiao) => (

<View

key={regiao.nome}

style={styles.statisticsRow}

>

<Text style={styles.statisticsRowLabel}>

{regiao.nome}

</Text>

<Text style={styles.statisticsRowValue}>

{regiao.quantidade}

</Text>

</View>

))}

</View>

<View style={styles.statisticsBlock}>

<Text style={styles.statisticsBlockTitle}>

📂 Por categoria

</Text>

{categoriasEstatisticas.length === 0 ? (

<Text style={styles.statisticsEmpty}>

Ainda não existem dados para este período.

</Text>

) : (

categoriasEstatisticas.map(

([categoria, quantidade]) => (

<View

key={categoria}

style={styles.statisticsRow}

>

<Text style={styles.statisticsRowLabel}>

{categoria}

</Text>

<Text style={styles.statisticsRowValue}>

{quantidade}

</Text>

</View>

)

)

)}

</View>

<View style={styles.statisticsBlock}>

<Text style={styles.statisticsBlockTitle}>

🏷️ Por tipo

</Text>

{tiposEstatisticas.length === 0 ? (

<Text style={styles.statisticsEmpty}>

Ainda não existem dados para este período.

</Text>

) : (

tiposEstatisticas.map(

([tipo, quantidade]) => (

<View

key={tipo}

style={styles.statisticsRow}

>

<Text style={styles.statisticsRowLabel}>

{tipo}

</Text>

<Text style={styles.statisticsRowValue}>

{quantidade}

</Text>

</View>

)

)

)}

</View>

<View style={styles.statisticsNote}>

<Text style={styles.statisticsNoteText}>

ℹ️ Os dados acima representam informações efetivamente registadas no Supabase.

</Text>

</View>

</View>

{/* ================================

    MODERAÇÃO

\================================ */}

<View style={styles.sectionHeader}>

<View style={styles.sectionHeaderText}>

<Text style={styles.sectionTitle}>

Aprovação e moderação

</Text>

<Text style={styles.sectionSubtitle}>

Serviços, produtos, lojas e eventos enviados pelos utilizadores.

</Text>

</View>

<TouchableOpacity

style={styles.refreshButton}

onPress={atualizarPainel}

disabled={atualizando}

activeOpacity={0.8}

>

<Text style={styles.refreshText}>

{atualizando ? '...' : '↻'}

</Text>

</TouchableOpacity>

</View>

{pendentes.length === 0 ? (

<View style={styles.emptyBox}>

<Text style={styles.emptyIcon}>

✅

</Text>

<Text style={styles.emptyTitle}>

Nenhum anúncio pendente

</Text>

<Text style={styles.emptyText}>

Quando um utilizador enviar um anúncio ou evento para análise, ele aparecerá aqui.

</Text>

</View>

) : (

pendentes.map((anuncio) => {

const dadosEvento =

obterDadosEvento(anuncio);

const processando =

processandoId === anuncio.id;

return (

<View

key={anuncio.id}

style={styles.moderationCard}

>

<View style={styles.cardTop}>

<View style={styles.cardTopLeft}>

<View

style={[

styles.statusBadge,

{

backgroundColor:

anuncio.estado === 'em_analise'

? '#FFF3D6'

: anuncio.estado === 'publicado'

? '#EAF6EF'

: '#FDECEC',

},

]}

>

<Text

style={[

styles.statusBadgeText,

{

color:

anuncio.estado === 'em_analise'

? '#805D12'

: anuncio.estado === 'publicado'

? '#167648'

: '#A22A2A',

},

]}

>

{anuncio.estado === 'em_analise'

? 'Pendente'

: anuncio.estado === 'publicado'

? 'Aprovado'

: 'Rejeitado'}

</Text>

</View>

{anuncio.tipo_anuncio ? (

<Text style={styles.typeText}>

{anuncio.tipo_anuncio}

</Text>

) : null}

</View>

</View>

<Text style={styles.anuncioTitle}>

{anuncio.titulo || 'Sem título'}

</Text>

<Text style={styles.metaText}>

{anuncio.categoria || 'Sem categoria'}

{anuncio.localidade

? ` • ${anuncio.localidade}`

: ''}

</Text>

<Text style={styles.dateText}>

Criado em {formatarData(anuncio.criado_em)}

</Text>

<View style={styles.separator} />

{obterImagensAnuncio(anuncio).length > 0 ? (

  <View style={styles.mediaSection}>

    <Text style={styles.fieldLabel}>Fotografias do anúncio</Text>

    <Text style={styles.mediaHint}>

      Confirme se as imagens correspondem ao anúncio antes de decidir.

    </Text>

    <ScrollView

      horizontal

      showsHorizontalScrollIndicator={false}

      contentContainerStyle={styles.mediaRow}

    >

      {obterImagensAnuncio(anuncio).map((url, indice) => (

        <View key={`${anuncio.id}-imagem-${indice}`} style={styles.mediaItem}>

          <Image

            source={{ uri: url }}

            style={styles.moderationImage}

            resizeMode="cover"

            accessibilityLabel={`Fotografia ${indice + 1} do anúncio`}

          />

          <Text style={styles.mediaCaption}>

            {indice === 0 ? 'Imagem principal' : `Fotografia ${indice + 1}`}

          </Text>

        </View>

      ))}

    </ScrollView>

  </View>

) : (

  <View style={styles.noMediaBox}>

    <Text style={styles.noMediaText}>

      Este anúncio não tem fotografias disponíveis para análise.

    </Text>

  </View>

)}

{anuncio.descricao ? (

<>

<Text style={styles.fieldLabel}>

Descrição

</Text>

<Text style={styles.description}>

{anuncio.descricao}

</Text>

</>

) : null}

{anuncio.contato ? (

<>

<Text style={styles.fieldLabel}>

Contacto

</Text>

<Text style={styles.fieldValue}>

{anuncio.contato}

</Text>

</>

) : null}

{anuncio.preco !== null &&

anuncio.preco !== undefined &&

anuncio.preco !== '' ? (

<>

<Text style={styles.fieldLabel}>

Preço

</Text>

<Text style={styles.fieldValue}>

{formatarPreco(anuncio.preco)}

</Text>

</>

) : null}

{anuncio.preco_negociavel ? (

<Text style={styles.negociavelText}>

Preço negociável

</Text>

) : null}

{dadosEvento ? (

<View style={styles.eventBox}>

<Text style={styles.eventBoxTitle}>

📅 Dados do evento

</Text>

{dadosEvento.data_evento ? (

<View style={styles.eventRow}>

<Text style={styles.eventLabel}>

Data

</Text>

<Text style={styles.eventValue}>

{String(dadosEvento.data_evento)}

</Text>

</View>

) : null}

{dadosEvento.hora_evento ? (

<View style={styles.eventRow}>

<Text style={styles.eventLabel}>

Hora

</Text>

<Text style={styles.eventValue}>

{String(dadosEvento.hora_evento)}

</Text>

</View>

) : null}

{dadosEvento.organizador ? (

<View style={styles.eventRow}>

<Text style={styles.eventLabel}>

Organizador

</Text>

<Text style={styles.eventValue}>

{String(dadosEvento.organizador)}

</Text>

</View>

) : null}

{dadosEvento.visibilidade ? (

<View style={styles.eventRow}>

<Text style={styles.eventLabel}>

Visibilidade

</Text>

<Text style={styles.eventValue}>

{dadosEvento.visibilidade === 'privado'

? 'Privado'

: 'Público'}

</Text>

</View>

) : null}

<View style={styles.responsibilityBox}>

<Text style={styles.responsibilityText}>

⚠️ O evento é de exclusiva responsabilidade do seu organizador/produtor.

</Text>

</View>

</View>

) : null}

<View style={styles.actionRow}>

<TouchableOpacity

style={[

styles.approveButton,

processando && styles.disabledButton,

]}

onPress={() =>

aprovarAnuncio(anuncio)

}

disabled={processando}

activeOpacity={0.85}

>

{processando ? (

<ActivityIndicator

size="small"

color="#FFFFFF"

/>

) : (

<Text style={styles.approveButtonText}>

✓ Aprovar

</Text>

)}

</TouchableOpacity>

<TouchableOpacity

style={[

styles.rejectButton,

processando && styles.disabledButton,

]}

onPress={() =>

reprovarAnuncio(anuncio)

}

disabled={processando}

activeOpacity={0.85}

>

<Text style={styles.rejectButtonText}>

✕ Reprovar

</Text>

</TouchableOpacity>

</View>

</View>

);

})

)}

<View style={styles.footerNotice}>

<Text style={styles.footerTitle}>

Painel MASTER

</Text>

<Text style={styles.footerText}>

As decisões tomadas aqui alteram o estado real dos anúncios no Supabase.

</Text>

</View>

<TouchableOpacity

style={styles.backButton}

onPress={() => router.back()}

activeOpacity={0.85}

>

<Text style={styles.backButtonText}>

Voltar

</Text>

</TouchableOpacity>

<View style={styles.bottomSpace} />

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

padding: 20,

paddingBottom: 40,

},

loadingScreen: {

flex: 1,

backgroundColor: '#F7F8FA',

alignItems: 'center',

justifyContent: 'center',

padding: 30,

},

loadingText: {

marginTop: 12,

fontSize: 16,

color: '#68727E',

},

deniedScreen: {

flex: 1,

backgroundColor: '#F7F8FA',

alignItems: 'center',

justifyContent: 'center',

padding: 24,

},

deniedIcon: {

fontSize: 54,

marginBottom: 18,

},

deniedTitle: {

fontSize: 28,

fontWeight: '800',

color: '#1D2733',

textAlign: 'center',

marginBottom: 10,

},

deniedText: {

fontSize: 16,

lineHeight: 23,

color: '#68727E',

textAlign: 'center',

maxWidth: 420,

marginBottom: 22,

},

emailBox: {

width: '100%',

maxWidth: 500,

backgroundColor: '#FFFFFF',

borderWidth: 1,

borderColor: '#DDE2E7',

borderRadius: 16,

padding: 16,

marginBottom: 18,

},

emailLabel: {

fontSize: 13,

color: '#68727E',

marginBottom: 5,

},

emailValue: {

fontSize: 16,

fontWeight: '700',

color: '#1D2733',

},

header: {

backgroundColor: '#FFFFFF',

borderRadius: 22,

borderWidth: 1,

borderColor: '#E1E5E9',

padding: 20,

marginBottom: 14,

},

headerTop: {

flexDirection: 'row',

alignItems: 'flex-start',

justifyContent: 'space-between',

},

headerTextArea: {

flex: 1,

paddingRight: 10,

},

masterBadge: {

alignSelf: 'flex-start',

backgroundColor: '#EAF6EF',

color: '#167648',

fontSize: 12,

fontWeight: '800',

paddingHorizontal: 10,

paddingVertical: 6,

borderRadius: 10,

overflow: 'hidden',

marginBottom: 10,

},

title: {

fontSize: 29,

fontWeight: '800',

color: '#1D2733',

},

subtitle: {

fontSize: 15,

lineHeight: 21,

color: '#68727E',

marginTop: 6,

},

closeButton: {

width: 42,

height: 42,

borderRadius: 21,

backgroundColor: '#F0F2F5',

alignItems: 'center',

justifyContent: 'center',

},

closeButtonText: {

fontSize: 28,

lineHeight: 30,

color: '#4E5964',

fontWeight: '500',

},

masterBox: {

backgroundColor: '#F7F8FA',

borderRadius: 14,

padding: 14,

marginTop: 18,

},

masterLabel: {

fontSize: 12,

color: '#68727E',

marginBottom: 4,

},

masterEmail: {

fontSize: 15,

fontWeight: '700',

color: '#1D2733',

},

warningBox: {

backgroundColor: '#FFF8E7',

borderWidth: 1,

borderColor: '#F0D89A',

borderRadius: 16,

padding: 16,

marginBottom: 16,

},

warningTitle: {

fontSize: 16,

fontWeight: '800',

color: '#805D12',

marginBottom: 5,

},

warningText: {

fontSize: 14,

lineHeight: 21,

color: '#6E5A2B',

},

errorBox: {

backgroundColor: '#FDECEC',

borderWidth: 1,

borderColor: '#E8B7B7',

borderRadius: 16,

padding: 16,

marginBottom: 16,

},

errorTitle: {

fontSize: 16,

fontWeight: '800',

color: '#A22A2A',

marginBottom: 6,

},

errorText: {

fontSize: 14,

lineHeight: 21,

color: '#7D3030',

marginBottom: 12,

},

errorButton: {

alignSelf: 'flex-start',

backgroundColor: '#FFFFFF',

borderWidth: 1,

borderColor: '#D9A5A5',

borderRadius: 10,

paddingHorizontal: 14,

paddingVertical: 9,

},

errorButtonText: {

color: '#A22A2A',

fontWeight: '800',

},

statsGrid: {

flexDirection: 'row',

flexWrap: 'wrap',

justifyContent: 'space-between',

marginBottom: 20,

},

statCard: {

width: '48.5%',

backgroundColor: '#FFFFFF',

borderWidth: 1,

borderColor: '#E1E5E9',

borderRadius: 18,

padding: 16,

marginBottom: 10,

},

statNumber: {

fontSize: 30,

fontWeight: '800',

color: '#1677B8',

marginBottom: 4,

},

statLabel: {

fontSize: 13,

lineHeight: 18,

color: '#68727E',

},

statisticsSection: {

marginBottom: 20,

},

periodRow: {

flexDirection: 'row',

flexWrap: 'wrap',

marginBottom: 14,

},

periodButton: {

backgroundColor: '#FFFFFF',

borderWidth: 1,

borderColor: '#DDE2E7',

borderRadius: 10,

paddingHorizontal: 13,

paddingVertical: 9,

marginRight: 8,

marginBottom: 8,

},

periodButtonActive: {

backgroundColor: '#1677B8',

borderColor: '#1677B8',

},

periodButtonText: {

color: '#50616F',

fontSize: 13,

fontWeight: '700',

},

periodButtonTextActive: {

color: '#FFFFFF',

},

statisticsBlock: {

backgroundColor: '#FFFFFF',

borderWidth: 1,

borderColor: '#E1E5E9',

borderRadius: 18,

padding: 16,

marginBottom: 12,

},

statisticsBlockTitle: {

fontSize: 16,

fontWeight: '800',

color: '#1D2733',

marginBottom: 10,

},

statisticsRow: {

flexDirection: 'row',

alignItems: 'center',

justifyContent: 'space-between',

paddingVertical: 9,

borderBottomWidth: 1,

borderBottomColor: '#EEF1F4',

},

statisticsRowLabel: {

flex: 1,

fontSize: 14,

color: '#384452',

paddingRight: 12,

},

statisticsRowValue: {

minWidth: 32,

textAlign: 'right',

fontSize: 15,

fontWeight: '800',

color: '#1677B8',

},

statisticsEmpty: {

fontSize: 14,

color: '#68727E',

},

statisticsNote: {

backgroundColor: '#EAF4FB',

borderRadius: 14,

padding: 13,

},

statisticsNoteText: {

fontSize: 12,

lineHeight: 18,

color: '#50616F',

},

sectionHeader: {

flexDirection: 'row',

alignItems: 'center',

justifyContent: 'space-between',

marginBottom: 14,

},

sectionHeaderText: {

flex: 1,

paddingRight: 10,

},

sectionTitle: {

fontSize: 22,

fontWeight: '800',

color: '#1D2733',

},

sectionSubtitle: {

fontSize: 14,

lineHeight: 20,

color: '#68727E',

marginTop: 4,

},

refreshButton: {

width: 44,

height: 44,

borderRadius: 22,

backgroundColor: '#EAF4FB',

alignItems: 'center',

justifyContent: 'center',

},

refreshText: {

color: '#1677B8',

fontSize: 26,

fontWeight: '800',

},

emptyBox: {

backgroundColor: '#FFFFFF',

borderWidth: 1,

borderColor: '#DDE2E7',

borderRadius: 18,

padding: 24,

alignItems: 'center',

marginBottom: 16,

},

emptyIcon: {

fontSize: 38,

marginBottom: 10,

},

emptyTitle: {

fontSize: 19,

fontWeight: '800',

color: '#1D2733',

textAlign: 'center',

marginBottom: 7,

},

emptyText: {

fontSize: 14,

lineHeight: 21,

color: '#68727E',

textAlign: 'center',

},

mediaSection: {

  marginBottom: 12,

},

mediaHint: {

  fontSize: 13,

  lineHeight: 19,

  color: '#68727E',

  marginBottom: 10,

},

mediaRow: {

  alignItems: 'flex-start',

  paddingVertical: 4,

  gap: 12,

},

mediaItem: {

  width: 150,

  alignItems: 'center',

},

moderationImage: {

  width: 146,

  height: 132,

  borderRadius: 12,

  backgroundColor: '#E8EDF2',

  borderWidth: 1,

  borderColor: '#DDE2E7',

},

mediaCaption: {

  fontSize: 12,

  fontWeight: '700',

  color: '#68727E',

  marginTop: 5,

  textAlign: 'center',

},

noMediaBox: {

  backgroundColor: '#FFF8E7',

  borderRadius: 10,

  padding: 11,

  marginBottom: 10,

},

noMediaText: {

  color: '#805D12',

  fontSize: 13,

  lineHeight: 19,

},

moderationCard: {

backgroundColor: '#FFFFFF',

borderWidth: 1,

borderColor: '#DDE2E7',

borderRadius: 20,

padding: 18,

marginBottom: 16,

},

cardTop: {

flexDirection: 'row',

alignItems: 'center',

justifyContent: 'space-between',

marginBottom: 10,

},

cardTopLeft: {

flexDirection: 'row',

alignItems: 'center',

flexWrap: 'wrap',

flex: 1,

},

statusBadge: {

borderRadius: 10,

paddingHorizontal: 10,

paddingVertical: 6,

marginRight: 8,

marginBottom: 4,

},

statusBadgeText: {

fontSize: 12,

fontWeight: '800',

},

typeText: {

fontSize: 13,

fontWeight: '700',

color: '#68727E',

marginBottom: 4,

},

anuncioTitle: {

fontSize: 21,

fontWeight: '800',

color: '#1D2733',

marginBottom: 5,

},

metaText: {

fontSize: 14,

color: '#1677B8',

fontWeight: '700',

},

dateText: {

fontSize: 13,

color: '#68727E',

marginTop: 5,

},

separator: {

height: 1,

backgroundColor: '#E6E9ED',

marginVertical: 15,

},

fieldLabel: {

fontSize: 12,

fontWeight: '800',

color: '#68727E',

marginTop: 9,

marginBottom: 3,

},

fieldValue: {

fontSize: 15,

fontWeight: '700',

color: '#1D2733',

},

description: {

fontSize: 15,

lineHeight: 22,

color: '#384452',

},

negociavelText: {

fontSize: 13,

fontWeight: '700',

color: '#167648',

marginTop: 6,

},

eventBox: {

backgroundColor: '#F7F9FC',

borderWidth: 1,

borderColor: '#DCE5EE',

borderRadius: 16,

padding: 15,

marginTop: 16,

},

eventBoxTitle: {

fontSize: 16,

fontWeight: '800',

color: '#1D2733',

marginBottom: 10,

},

eventRow: {

marginBottom: 9,

},

eventLabel: {

fontSize: 12,

fontWeight: '700',

color: '#68727E',

marginBottom: 2,

},

eventValue: {

fontSize: 15,

fontWeight: '700',

color: '#1D2733',

},

responsibilityBox: {

backgroundColor: '#FFF8E7',

borderRadius: 12,

padding: 11,

marginTop: 8,

},

responsibilityText: {

fontSize: 12,

lineHeight: 18,

color: '#6E5A2B',

fontWeight: '600',

},

actionRow: {

flexDirection: 'row',

marginTop: 18,

},

approveButton: {

flex: 1,

minHeight: 52,

borderRadius: 13,

backgroundColor: '#CDA64A',

alignItems: 'center',

justifyContent: 'center',

marginRight: 6,

},

approveButtonText: {

color: '#FFFFFF',

fontSize: 16,

fontWeight: '800',

},

rejectButton: {

flex: 1,

minHeight: 52,

borderRadius: 13,

backgroundColor: '#F0F2F5',

borderWidth: 1,

borderColor: '#D9DEE4',

alignItems: 'center',

justifyContent: 'center',

marginLeft: 6,

},

rejectButtonText: {

color: '#A22A2A',

fontSize: 16,

fontWeight: '800',

},

disabledButton: {

opacity: 0.55,

},

footerNotice: {

backgroundColor: '#EAF4FB',

borderRadius: 16,

padding: 16,

marginTop: 4,

marginBottom: 16,

},

footerTitle: {

fontSize: 15,

fontWeight: '800',

color: '#1677B8',

marginBottom: 4,

},

footerText: {

fontSize: 13,

lineHeight: 19,

color: '#50616F',

},

primaryButton: {

width: '100%',

maxWidth: 500,

height: 54,

borderRadius: 14,

backgroundColor: '#1677B8',

alignItems: 'center',

justifyContent: 'center',

marginTop: 8,

},

primaryButtonText: {

color: '#FFFFFF',

fontSize: 16,

fontWeight: '800',

},

secondaryButton: {

width: '100%',

maxWidth: 500,

height: 54,

borderRadius: 14,

borderWidth: 1,

borderColor: '#1677B8',

alignItems: 'center',

justifyContent: 'center',

marginTop: 12,

},

secondaryButtonText: {

color: '#1677B8',

fontSize: 16,

fontWeight: '800',

},

backButton: {

height: 54,

borderRadius: 14,

backgroundColor: '#FFFFFF',

borderWidth: 1,

borderColor: '#DDE2E7',

alignItems: 'center',

justifyContent: 'center',

marginTop: 8,

},

backButtonText: {

color: '#1D2733',

fontSize: 16,

fontWeight: '800',

},

bottomSpace: {

height: 20,

},

});
