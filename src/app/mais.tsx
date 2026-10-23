import { useRouter } from "expo-router";

import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../supabase";

type Regiao = "Guimarães" | "Vizela" | "Fafe";
type CidadeMobilidade = "Guimarães" | "Fafe" | "Vizela";
type CategoriaLazer =
  | "Todos"
  | "Parques e jardins"
  | "Piscinas"
  | "Pavilhões e multiusos"
  | "Desporto público"
  | "Parques infantis"
  | "Atividades para famílias";
type LocalLazer = {
  cidade: CidadeMobilidade;
  categoria: Exclude<CategoriaLazer, "Todos">;
  nome: string;
  endereco: string;
  telefone?: string;
  horario?: string;
  observacao?: string;
};

const CIDADES_MOBILIDADE: CidadeMobilidade[] = ["Guimarães", "Fafe", "Vizela"];

const CATEGORIAS_LAZER: {
  icone: string;
  nome: Exclude<CategoriaLazer, "Todos">;
}[] = [
  { icone: "🌳", nome: "Parques e jardins" },
  { icone: "🏊", nome: "Piscinas" },
  { icone: "🏟️", nome: "Pavilhões e multiusos" },
  { icone: "🏋️", nome: "Desporto público" },
  { icone: "🛝", nome: "Parques infantis" },
  { icone: "👨‍👩‍👧‍👦", nome: "Atividades para famílias" },
];

// Diretório local inicial com moradas de fontes municipais/oficiais.
// A lista pode ser ampliada sem alterar os restantes módulos da página.
const LOCAIS_LAZER: LocalLazer[] = [
  {
    cidade: "Guimarães",
    categoria: "Pavilhões e multiusos",
    nome: "Multiusos de Guimarães",
    endereco: "Alameda Cidade de Lisboa, Creixomil, 4835-037 Guimarães",
    telefone: "253 520 300",
    observacao: "Equipamento municipal para eventos, desporto e atividades.",
  },
  {
    cidade: "Guimarães",
    categoria: "Piscinas",
    nome: "Complexo de Piscinas de Guimarães",
    endereco: "Alameda dos Desportos, Candoso São Tiago, 4835-235 Guimarães",
    telefone: "253 423 200",
    observacao: "Confirme horários e condições de acesso antes da visita.",
  },
  {
    cidade: "Guimarães",
    categoria: "Parques e jardins",
    nome: "Parque da Cidade de Guimarães",
    endereco: "Parque da Cidade, Guimarães",
    observacao: "Espaço verde para passeios e atividades ao ar livre.",
  },
  {
    cidade: "Fafe",
    categoria: "Piscinas",
    nome: "Piscina Municipal de Fafe",
    endereco: "Rua Professor Manuel José Costa, 4820-282 Fafe",
    telefone: "253 700 420",
    horario:
      "Manhã: segunda a sábado, 08:00–13:00. Tarde: segunda a sexta, 15:00–21:00; sábado, 15:00–18:00.",
    observacao: "Os horários podem variar devido a aulas e atividades.",
  },
  {
    cidade: "Fafe",
    categoria: "Parques e jardins",
    nome: "Parque da Cidade de Fafe",
    endereco: "Parque da Cidade, Fafe",
    observacao:
      "Confirme no local eventuais alterações de acesso ou funcionamento.",
  },
  {
    cidade: "Fafe",
    categoria: "Desporto público",
    nome: "Instalações Desportivas Municipais de Fafe",
    endereco: "Rua Professor Manuel José Costa, 4820-282 Fafe",
    telefone: "253 700 420",
    observacao:
      "Consulte a Câmara Municipal para confirmar a instalação e atividade pretendidas.",
  },
  {
    cidade: "Vizela",
    categoria: "Parques e jardins",
    nome: "Parque das Termas e Marginal Ribeirinha",
    endereco: "Rua Dr. Abílio Torres, 4815-000 Vizela",
    telefone: "253 489 630",
    observacao: "Espaço de lazer e passeio junto à zona termal e ribeirinha.",
  },
  {
    cidade: "Vizela",
    categoria: "Desporto público",
    nome: "Campo Municipal de Santo Adrião",
    endereco: "Badinhão, 4815-000 Santo Adrião, Vizela",
    telefone: "253 489 630",
    observacao: "Equipamento desportivo municipal.",
  },
  {
    cidade: "Vizela",
    categoria: "Atividades para famílias",
    nome: "Parque das Termas de Vizela",
    endereco: "Rua Dr. Abílio Torres, 4815-000 Vizela",
    telefone: "253 489 630",
    observacao: "Espaço para passeios e atividades ao ar livre.",
  },
];

type LinhaTransporte = {
  cidade: CidadeMobilidade;
  numero: string;
  nome: string;
  operador: string;
  percurso: string;
  paragens: string[];
  horarios: { uteis: string[]; sabados: string[]; domingos: string[] };
  nota?: string;
  fonteUrl?: string;
};

// Horários programados transcritos de documentos oficiais consultados em outubro de 2026.
// Não são previsões nem dados em tempo real. Para linhas sem horário atual confirmado,
// não inventamos partidas.
const LINHAS_TRANSPORTE: LinhaTransporte[] = [
  {
    cidade: "Guimarães",
    numero: "003",
    nome: "Linha Cidade",
    operador: "Guimabus",
    percurso: "Via Azurém e Madre Deus",
    paragens: [
      "Central de Camionagem (Alameda)",
      "Conde Margaride",
      "Universidade",
      "S. Pedro de Azurém",
      "Largo Madre Deus",
      "Paço dos Duques",
      "Câmara Municipal",
      "Campo da Feira",
      "Estação CP Guimarães",
      "Hospital",
      "GuimarãeShopping",
    ],
    horarios: {
      uteis: [
        "07:00",
        "07:20",
        "07:40",
        "08:00",
        "08:20",
        "08:40",
        "09:00",
        "09:20",
        "09:40",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:40",
        "17:00",
        "17:20",
        "17:40",
        "18:00",
        "18:20",
        "18:40",
        "19:00",
        "19:20",
        "20:00",
      ],
      sabados: [
        "07:00",
        "07:40",
        "08:20",
        "09:00",
        "09:40",
        "10:20",
        "11:00",
        "11:40",
        "12:20",
        "13:00",
        "13:40",
        "14:20",
        "15:00",
        "15:40",
        "16:20",
        "17:00",
        "17:40",
        "18:20",
        "19:00",
        "19:40",
      ],
      domingos: [
        "07:00",
        "07:40",
        "08:20",
        "09:00",
        "09:40",
        "10:20",
        "11:00",
        "11:40",
        "12:20",
        "13:00",
        "13:40",
        "14:20",
        "15:00",
        "15:40",
        "16:20",
        "17:00",
        "17:40",
        "18:20",
        "19:00",
        "19:40",
      ],
    },
    fonteUrl: "https://guimabus.pt/horarios-linhas/",
    nota: "Partidas da Central de Camionagem. Horário programado publicado pela Guimabus; confirme alterações operacionais.",
  },
  {
    cidade: "Guimarães",
    numero: "004",
    nome: "Linha Cidade",
    operador: "Guimabus",
    percurso: "Via Toural e EB23 João de Meira",
    paragens: [
      "Central de Camionagem (Alameda)",
      "Conde Margaride",
      "Paio Galvão",
      "Toural",
      "Centro Cultural Vila Flor",
      "Estação CP Guimarães",
      "Campo da Feira",
      "EB23 João de Meira",
      "Universidade",
      "Bombeiros",
      "Hospital",
    ],
    horarios: {
      uteis: [
        "07:10",
        "07:30",
        "07:50",
        "08:10",
        "08:30",
        "08:50",
        "09:10",
        "09:30",
        "09:50",
        "10:15",
        "10:45",
        "11:15",
        "11:45",
        "12:15",
        "12:45",
        "13:15",
        "13:45",
        "14:15",
        "14:45",
        "15:15",
        "15:45",
        "16:20",
        "16:50",
        "17:10",
        "17:30",
        "17:50",
        "18:10",
        "18:30",
        "18:50",
        "19:10",
        "19:40",
        "20:20",
      ],
      sabados: [
        "07:20",
        "08:00",
        "08:40",
        "09:20",
        "10:00",
        "10:40",
        "11:20",
        "12:00",
        "12:40",
        "13:20",
        "14:00",
        "14:40",
        "15:20",
        "16:00",
        "16:40",
        "17:20",
        "18:00",
        "18:40",
        "19:20",
        "20:00",
      ],
      domingos: [
        "07:20",
        "08:00",
        "08:40",
        "09:20",
        "10:00",
        "10:40",
        "11:20",
        "12:00",
        "12:40",
        "13:20",
        "14:00",
        "14:40",
        "15:20",
        "16:00",
        "16:40",
        "17:20",
        "18:00",
        "18:40",
        "19:20",
        "20:00",
      ],
    },
    fonteUrl: "https://guimabus.pt/horarios-linhas/",
    nota: "Partidas da Central de Camionagem. Horário programado publicado pela Guimabus; confirme alterações operacionais.",
  },
  {
    cidade: "Guimarães",
    numero: "005",
    nome: "Circular Creixomil – Multiusos",
    operador: "Guimabus",
    percurso:
      "S. Gonçalo, Hospital, Creixomil, Multiusos, Mercado Municipal e GuimarãeShopping",
    paragens: [
      "S. Gonçalo",
      "Estádio",
      "Avenida de Londres",
      "Hospital",
      "Rotunda dos Cuteleiros",
      "EB23 D. Afonso Henriques",
      "Alto da Bandeira",
      "Casa do Povo de Creixomil",
      "Capela de Nossa Senhora da Luz",
      "Paço",
      "S. Miguel",
      "Alameda do Multiusos",
      "Alminhas do Salgueiral",
      "Cruz de Pedra",
      "Fornos da Cruz de Pedra",
      "Mercado Municipal",
      "Feira de Guimarães",
      "GuimarãeShopping",
      "Conde Margaride",
      "S. Gonçalo",
    ],
    horarios: {
      uteis: [
        "07:00",
        "07:30",
        "08:00",
        "08:30",
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
        "17:00",
        "17:30",
        "18:00",
        "18:30",
        "19:00",
        "19:30",
      ],
      sabados: [
        "07:30",
        "08:30",
        "09:30",
        "10:30",
        "11:30",
        "12:30",
        "13:30",
        "14:30",
        "15:30",
        "16:30",
        "17:30",
        "18:30",
        "19:30",
      ],
      domingos: [
        "07:30",
        "08:30",
        "09:30",
        "10:30",
        "11:30",
        "12:30",
        "13:30",
        "14:30",
        "15:30",
        "16:30",
        "17:30",
        "18:30",
        "19:30",
      ],
    },
    fonteUrl:
      "https://guimabus.pt/wp-content/uploads/2026/04/horario-dn-guimabus-linha-005.pdf",
    nota: "Horário publicado em abril de 2026. Dias úteis: partidas de 30 em 30 minutos; sábados, domingos e feriados: partidas de hora a hora.",
  },
  {
    cidade: "Vizela",
    numero: "181",
    nome: "Guimarães – S. Paio de Vizela",
    operador: "Guimabus",
    percurso: "Via Penteeiros",
    paragens: [
      "Central de Camionagem de Guimarães",
      "Centro Cultural Vila Flor",
      "Estação CP Guimarães",
      "Tabuadelo",
      "Penteeiros",
      "Gémeos",
      "S. Paio de Vizela (Igreja)",
    ],
    horarios: { uteis: [], sabados: [], domingos: [] },
    fonteUrl: "https://guimabus.pt/horarios-linhas/",
    nota: "A linha e o percurso estão publicados pela Guimabus. As partidas variam consoante dias úteis, calendário escolar, sábados e feriados; para não mostrar uma hora errada, consulte o quadro específico da linha.",
  },
  {
    cidade: "Vizela",
    numero: "187",
    nome: "Guimarães – S. Paio de Vizela",
    operador: "Guimabus",
    percurso: "Via Calvos",
    paragens: ["Guimarães", "Calvos", "S. Paio de Vizela"],
    horarios: { uteis: [], sabados: [], domingos: [] },
    fonteUrl: "https://guimabus.pt/horarios-linhas/",
    nota: "Linha publicada pela Guimabus. Os horários dependem do sentido e do tipo de dia; confirme o quadro da linha antes de viajar.",
  },
  {
    cidade: "Fafe",
    numero: "TUF",
    nome: "Transportes Urbanos de Fafe",
    operador: "Município de Fafe",
    percurso: "Circuito urbano de Fafe",
    paragens: ["Circuito urbano de Fafe"],
    horarios: { uteis: [], sabados: [], domingos: [] },
    fonteUrl: "https://cm-fafe.pt/servicos/mobilidade-transportes",
    nota: "A página municipal disponibiliza um documento de horários cujo ficheiro acessível está datado de abril de 2018. Não reproduzimos essas partidas como se fossem atuais.",
  },
];

type PublicService = {
  nome: string;
  tipo: string;
  endereco: string;
  telefone?: string;
  email?: string;
  horario?: string;
  observacao?: string;
};

type NewsItem = {
  id: string;
  titulo: string;
  resumo: string;
  data: string;
  fonte: string;
};

type Anuncio = {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo_anuncio?: string | null;
  categoria?: string | null;
  localidade?: string | null;
  preco?: number | string | null;
  preco_negociavel?: boolean | null;
  contato?: string | null;
};

type VagaEmpregoLocal = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  categoria: string | null;
  localidade: string | null;
  publicado_em: string | null;
  dados_especificos: {
    empresa?: string | null;
    tipo_contrato?: string | null;
    regime?: string | null;
    salario?: string | null;
    contacto?: string | null;
    email?: string | null;
    candidatura?: string | null;
  } | null;
};

const REGIOES: Regiao[] = ["Guimarães", "Vizela", "Fafe"];

const SERVICOS_PUBLICOS: Record<Regiao, PublicService[]> = {
  Guimarães: [
    {
      nome: "Câmara Municipal de Guimarães",
      tipo: "Câmara Municipal",
      endereco: "Largo Cónego José Maria Gomes, 4804-534 Guimarães",
      telefone: "253 421 200",
      email: "geral@cm-guimaraes.pt",
    },
    {
      nome: "AIMA / CLAIM Guimarães",
      tipo: "Apoio a migrantes",
      endereco:
        "Câmara Municipal de Guimarães, Largo Cónego José Maria Gomes, 4804-534 Guimarães",
      email: "claim@cm-guimaraes.pt",
      observacao:
        "CLAIM de Guimarães. Para atendimento AIMA presencial, consulte também a Loja AIMA de Braga.",
    },
    {
      nome: "AIMA – Loja de Braga",
      tipo: "AIMA",
      endereco: "Rua dos Granjinhos, 6, 4700-996 Braga",
      telefone: "217 115 000",
      horario: "Dias úteis, 08:30–19:00. Linha geral AIMA: 08:00–20:00.",
      observacao: "Atendimento AIMA regional para a área do Minho.",
    },
    {
      nome: "Registos de Guimarães – IRN",
      tipo: "IRN",
      endereco: "Rua da Ramada, n.º 357, 4810-445 Guimarães",
      telefone: "253 421 040",
      email: "registos.guimaraes@irn.mj.pt",
      horario: "Dias úteis, 09:00–16:00.",
    },
    {
      nome: "Registo Civil de Guimarães – IRN",
      tipo: "IRN",
      endereco: "Rua da Ramada, 365, 4810-445 Guimarães",
      telefone: "253 418 836",
      email: "civil.guimaraes@irn.mj.pt",
      horario: "Dias úteis, 09:00–16:00.",
    },
    {
      nome: "Hospital Nossa Senhora da Oliveira",
      tipo: "Saúde",
      endereco: "Rua dos Cutileiros, 114, 4835-044 Creixomil, Guimarães",
      telefone: "253 540 330",
    },
    {
      nome: "USF Urgezes",
      tipo: "Centro de Saúde",
      endereco: "Urgezes, Guimarães",
      telefone: "253 520 710",
    },
    {
      nome: "USF Guimarães",
      tipo: "Centro de Saúde",
      endereco: "Guimarães",
      telefone: "253 421 340",
    },
    {
      nome: "Tribunal Judicial da Comarca de Guimarães",
      tipo: "Tribunal",
      endereco: "Palácio da Justiça, Praça da Mumadona, 4810-279 Guimarães",
      telefone: "253 423 950",
      email: "guimaraes.judicial@tribunais.org.pt",
    },
    {
      nome: "Juízos Centrais / Cível / Criminal",
      tipo: "Tribunal",
      endereco: "Rua dos Cutileiros, Creixomil, 4835-044 Guimarães",
      telefone: "253 439 530",
    },
    {
      nome: "Vimágua – Atendimento Guimarães",
      tipo: "Águas",
      endereco: "Guimarães",
      telefone: "253 439 560",
      email: "vimagua@vimagua.pt",
      horario: "Atendimento presencial: 09:00–16:00.",
    },
  ],

  Vizela: [
    {
      nome: "Câmara Municipal de Vizela",
      tipo: "Câmara Municipal",
      endereco: "Praça do Município, n.º 522, 4815-013 Vizela",
      telefone: "253 489 630",
      email: "geral@cm-vizela.pt",
      horario:
        "Segunda a sexta, 09:00–12:30 e 14:00–17:30. Balcão Único/Tesouraria: 09:00–12:30 e 14:00–16:30.",
    },
    {
      nome: "AIMA – Loja de Braga",
      tipo: "AIMA",
      endereco: "Rua dos Granjinhos, 6, 4700-996 Braga",
      telefone: "217 115 000",
      horario: "Dias úteis, 08:30–19:00. Linha geral AIMA: 08:00–20:00.",
      observacao:
        "Não existe uma Loja AIMA local confirmada em Vizela. Esta é a referência regional indicada.",
    },
    {
      nome: "Conservatória do Registo Civil / Predial de Vizela",
      tipo: "IRN",
      endereco: "Praceta 19 de Março, 76, S. Miguel Caldas, 4815-646 Vizela",
      telefone: "253 489 470",
      observacao: "Horário não confirmado. Confirme antes da deslocação.",
    },
    {
      nome: "Centro de Saúde / USF Phisys",
      tipo: "Centro de Saúde",
      endereco: "Largo das Teixugueiras, 7, Vizela",
      telefone: "253 589 057 / 253 589 058",
    },
    {
      nome: "USF Novos Rumos",
      tipo: "Centro de Saúde",
      endereco: "Largo das Teixugueiras, 7, Vizela",
      telefone: "253 589 054 / 253 589 055",
    },
    {
      nome: "Tribunal Judicial da Comarca de Guimarães",
      tipo: "Tribunal",
      endereco: "Palácio da Justiça, Praça da Mumadona, 4810-279 Guimarães",
      telefone: "253 423 950",
      observacao: "Vizela integra a área territorial da Comarca de Guimarães.",
    },
    {
      nome: "Vimágua – Atendimento Vizela",
      tipo: "Águas",
      endereco: "Vizela",
      telefone: "253 439 560",
      email: "vimagua@vimagua.pt",
      horario: "Atendimento presencial: 09:00–15:30.",
    },
  ],

  Fafe: [
    {
      nome: "Câmara Municipal de Fafe",
      tipo: "Câmara Municipal",
      endereco: "Avenida 5 de Outubro, 4824-501 Fafe",
      telefone: "253 700 400",
      horario:
        "Segunda: 09:00–19:00. Terça a quinta: 09:00–17:00. Sexta: 09:00–12:30.",
    },
    {
      nome: "AIMA – Loja de Braga",
      tipo: "AIMA",
      endereco: "Rua dos Granjinhos, 6, 4700-996 Braga",
      telefone: "217 115 000",
      horario: "Dias úteis, 08:30–19:00. Linha geral AIMA: 08:00–20:00.",
      observacao:
        "Não existe uma Loja AIMA local confirmada em Fafe. Esta é a referência regional indicada.",
    },
    {
      nome: "Conservatória do Registo Civil de Fafe",
      tipo: "IRN",
      endereco:
        "Praça José Florêncio Soares / Praça 25 de Abril, 22, 4820-148 Fafe",
      telefone: "253 599 792",
      horario: "Segunda a sexta, 09:00–16:00.",
    },
    {
      nome: "Centro de Saúde de Fafe",
      tipo: "Centro de Saúde",
      endereco: "Rua José Ribeiro Vieira de Castro, 4820-273 Fafe",
      telefone: "253 490 850",
      horario: "Segunda a sexta, 08:00–20:00. Sábado, 09:00–13:00.",
    },
    {
      nome: "USF Sentinela",
      tipo: "Centro de Saúde",
      endereco: "Fafe",
      telefone: "253 490 864",
    },
    {
      nome: "USF Nós e Vós",
      tipo: "Centro de Saúde",
      endereco: "Fafe",
      telefone: "253 490 862",
    },
    {
      nome: "USF Novo Cuidar",
      tipo: "Centro de Saúde",
      endereco: "Fafe",
      telefone: "253 490 863",
    },
    {
      nome: "Tribunal Judicial da Comarca de Fafe",
      tipo: "Tribunal",
      endereco:
        "Palácio da Justiça, Praça José Florêncio Soares, 4820-148 Fafe",
      telefone: "253 700 940",
      email: "fafe.judicial@tribunais.org.pt",
      horario: "Segunda a sexta, 09:00–12:30 e 13:30–16:00.",
    },
    {
      nome: "Águas de Fafe",
      tipo: "Águas",
      endereco: "Largo 1.º de Dezembro, 4820-141 Fafe",
      telefone: "253 700 020",
      email: "geral@aguasdefafe.pt",
    },
  ],
};

const TELEFONES: Record<
  Regiao,
  { nome: string; numero: string; tipo: string }[]
> = {
  Guimarães: [
    {
      nome: "Emergência",
      numero: "112",
      tipo: "Emergência",
    },
    {
      nome: "SNS 24",
      numero: "808 24 24 24",
      tipo: "Saúde",
    },
    {
      nome: "Centro de Informação Antivenenos",
      numero: "800 250 250",
      tipo: "Saúde",
    },
    {
      nome: "Bombeiros Voluntários de Guimarães",
      numero: "253 515 444",
      tipo: "Bombeiros",
    },
    {
      nome: "PSP Guimarães",
      numero: "253 600 830",
      tipo: "Polícia",
    },
    {
      nome: "GNR Guimarães",
      numero: "253 422 570",
      tipo: "Segurança",
    },
    {
      nome: "Hospital Nossa Senhora da Oliveira",
      numero: "253 540 330",
      tipo: "Saúde",
    },
    {
      nome: "Proteção Civil Municipal",
      numero: "253 421 212",
      tipo: "Proteção Civil",
    },
    {
      nome: "Polícia Municipal",
      numero: "253 421 222",
      tipo: "Polícia Municipal",
    },
  ],

  Vizela: [
    {
      nome: "Emergência",
      numero: "112",
      tipo: "Emergência",
    },
    {
      nome: "SNS 24",
      numero: "808 24 24 24",
      tipo: "Saúde",
    },
    {
      nome: "Bombeiros Voluntários de Vizela",
      numero: "253 489 100",
      tipo: "Bombeiros",
    },
    {
      nome: "GNR Vizela",
      numero: "253 481 261",
      tipo: "Segurança",
    },
    {
      nome: "Câmara Municipal de Vizela",
      numero: "253 489 630",
      tipo: "Câmara Municipal",
    },
    {
      nome: "USF Phisys",
      numero: "253 589 057",
      tipo: "Saúde",
    },
    {
      nome: "USF Novos Rumos",
      numero: "253 589 054",
      tipo: "Saúde",
    },
  ],

  Fafe: [
    {
      nome: "Emergência",
      numero: "112",
      tipo: "Emergência",
    },
    {
      nome: "SNS 24",
      numero: "808 24 24 24",
      tipo: "Saúde",
    },
    {
      nome: "Bombeiros Voluntários de Fafe",
      numero: "253 598 111",
      tipo: "Bombeiros",
    },
    {
      nome: "Hospital São José",
      numero: "253 700 300",
      tipo: "Saúde",
    },
    {
      nome: "Centro de Saúde de Fafe",
      numero: "253 490 850",
      tipo: "Saúde",
    },
    {
      nome: "GNR Fafe",
      numero: "253 490 890",
      tipo: "Segurança",
    },
    {
      nome: "Câmara Municipal de Fafe",
      numero: "253 700 400",
      tipo: "Câmara Municipal",
    },
    {
      nome: "Águas de Fafe",
      numero: "253 700 020",
      tipo: "Águas",
    },
  ],
};

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const abrirLink = async (url: string) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.log("Não foi possível abrir o link:", error);
  }
};

const ligar = async (numero: string) => {
  const telefone = numero.split("/")[0].replace(/[^0-9+]/g, "");

  await abrirLink(`tel:${telefone}`);
};

const abrirMapa = async (endereco: string) => {
  await abrirLink(
    "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(endereco),
  );
};

const buscarForaDoConecta = async (cidade: Regiao) => {
  const consulta = `profissionais e serviços perto de ${cidade}, Portugal`;

  await abrirLink(
    "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(consulta),
  );
};

const decodeHtml = (value: string) =>
  value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .trim();

const xmlTag = (item: string, tag: string) => {
  const match = item.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );

  return match ? decodeHtml(match[1]) : "";
};

const formatarData = (data: string) => {
  if (!data) return "";

  const date = new Date(data);

  if (Number.isNaN(date.getTime())) {
    return data;
  }

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const extrairResumo = (texto: string) => {
  const limpo = decodeHtml(texto);

  if (!limpo) {
    return "Sem resumo disponível.";
  }

  return limpo.length <= 220 ? limpo : `${limpo.slice(0, 217).trim()}...`;
};

const preco = (valor: number | string | null | undefined) => {
  if (valor === null || valor === undefined || valor === "") {
    return "";
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return String(valor);
  }

  return `${numero.toFixed(2).replace(".", ",")} €`;
};

// Impede que uma fonte RSS deixe a interface presa indefinidamente.
const fetchComTimeout = async (url: string, timeoutMs = 4500) => {
  return await Promise.race([
    fetch(url),
    new Promise<Response>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error("A fonte de notícias demorou demasiado a responder."),
          ),
        timeoutMs,
      );
    }),
  ]);
};

export default function MaisScreen() {
  const router = useRouter();

  const [modalEmpregos, setModalEmpregos] = useState(false);

  const [vagasEmpregoLocal, setVagasEmpregoLocal] = useState<
    VagaEmpregoLocal[]
  >([]);

  const [carregandoVagasEmprego, setCarregandoVagasEmprego] = useState(false);

  const [erroVagasEmprego, setErroVagasEmprego] = useState("");

  const [modalTelefones, setModalTelefones] = useState(false);

  const [modalNoticias, setModalNoticias] = useState(false);

  const [modalServicos, setModalServicos] = useState(false);

  const [modalPerto, setModalPerto] = useState(false);

  const [modalTransportes, setModalTransportes] = useState(false);

  const [modalLazer, setModalLazer] = useState(false);

  const [regiaoTransportes, setRegiaoTransportes] =
    useState<CidadeMobilidade>("Guimarães");

  const [pesquisaTransportes, setPesquisaTransportes] = useState("");
  const [linhaSelecionada, setLinhaSelecionada] = useState<string>("");
  const [diaSelecionado, setDiaSelecionado] = useState<
    "uteis" | "sabados" | "domingos"
  >("uteis");

  const [regiaoLazer, setRegiaoLazer] = useState<CidadeMobilidade>("Guimarães");

  const [categoriaLazer, setCategoriaLazer] = useState<CategoriaLazer>("Todos");

  const [modalContacto, setModalContacto] = useState(false);

  const [regiao, setRegiao] = useState<Regiao>("Guimarães");

  const [regiaoNoticias, setRegiaoNoticias] = useState<Regiao>("Guimarães");

  const [regiaoServicos, setRegiaoServicos] = useState<Regiao>("Guimarães");

  const [regiaoPerto, setRegiaoPerto] = useState<Regiao>("Guimarães");

  const [noticias, setNoticias] = useState<Record<Regiao, NewsItem[]>>({
    Guimarães: [],
    Vizela: [],
    Fafe: [],
  });

  const [carregandoNoticias, setCarregandoNoticias] = useState(false);

  const [erroNoticias, setErroNoticias] = useState("");

  const [profissionais, setProfissionais] = useState<Anuncio[]>([]);

  const [carregandoPerto, setCarregandoPerto] = useState(false);

  const [erroPerto, setErroPerto] = useState("");

  const [nomeContacto, setNomeContacto] = useState("");

  const [emailContacto, setEmailContacto] = useState("");

  const [mensagemContacto, setMensagemContacto] = useState("");

  const [enviandoContacto, setEnviandoContacto] = useState(false);

  const [sucessoContacto, setSucessoContacto] = useState(false);

  const [tipoContacto, setTipoContacto] = useState("Relato de erro");

  const carregarNoticias = async (cidadeSolicitada?: Regiao) => {
    setCarregandoNoticias(true);
    setErroNoticias("");

    try {
      const cidadesParaCarregar = cidadeSolicitada
        ? [cidadeSolicitada]
        : REGIOES;
      const resultados = await Promise.all(
        cidadesParaCarregar.map(async (cidade) => {
          // A função Netlify consulta o Google News e fontes locais alternativas no servidor,
          // evitando os bloqueios CORS do navegador.
          const endpoint = `/.netlify/functions/conecta-news?cidade=${encodeURIComponent(cidade)}`;
          const resposta = await fetchComTimeout(endpoint, 12000);
          if (!resposta.ok)
            throw new Error(`Conecta News HTTP ${resposta.status}`);
          const dados = await resposta.json();
          const itens: NewsItem[] = (
            Array.isArray(dados?.items) ? dados.items : []
          )
            .slice(0, 12)
            .map((item: any, index: number) => ({
              id: `${cidade}-${index}-${String(
                item.titulo || item.title || "noticia"
              )}`,
              titulo: decodeHtml(
                String(item.titulo || item.title || "Notícia local")
              ),
              resumo: extrairResumo(
                String(
                  item.resumo || item.description || item.content || ""
                ),
              ),
              data: formatarData(
                String(
                  item.data || item.pubDate || item.published || item.dataOriginal || ""
                ),
              ),
              fonte: decodeHtml(
                String(
                  item.fonte || item.source || item.author || "Notícia local"
                ),
              ),
            }))
            .filter((item: NewsItem) => Boolean(item.titulo));
          return { cidade, itens };
        }),
      );

      const novoEstado: Record<Regiao, NewsItem[]> = { ...noticias };
      resultados.forEach((resultado) => {
        novoEstado[resultado.cidade] = resultado.itens;
      });
      setNoticias(novoEstado);
      if (resultados.every((resultado) => resultado.itens.length === 0)) {
        throw new Error(
          "Não foram encontradas notícias locais agora. Tente novamente.",
        );
      }
    } catch (error) {
      console.log("Erro ao carregar Conecta News:", error);
      setErroNoticias(
        "Não foi possível carregar as notícias locais. Tente novamente dentro de momentos.",
      );
    } finally {
      setCarregandoNoticias(false);
    }
  };

  const carregarPertoDeSi = async (cidade: Regiao) => {
    setCarregandoPerto(true);
    setErroPerto("");

    try {
      const { data, error } = await supabase
        .from("anuncios")
        .select(
          "id,user_id,titulo,descricao,tipo_anuncio,categoria,localidade,preco,preco_negociavel,contato,estado,criado_em,publicado_em,dados_especificos",
        )
        .eq("estado", "publicado")
        .order("publicado_em", {
          ascending: false,
        })
        .limit(100);

      if (error) {
        throw error;
      }

      const cidadeNormalizada = normalizar(cidade);

      const publicados = (data || []) as Anuncio[];

      const daCidade = publicados.filter((anuncio) => {
        const localidade = normalizar(anuncio.localidade || "");

        const tipo = normalizar(anuncio.tipo_anuncio || "");

        return localidade.includes(cidadeNormalizada) && tipo !== "evento";
      });

      const profissionaisCidade = daCidade.filter((anuncio) => {
        const tipo = normalizar(anuncio.tipo_anuncio || "");

        return (
          tipo.includes("profissional") ||
          tipo.includes("servico") ||
          tipo.includes("classificado")
        );
      });

      setProfissionais(
        profissionaisCidade.length ? profissionaisCidade : daCidade,
      );
    } catch (error) {
      console.log("Erro ao carregar profissionais:", error);

      setErroPerto("Não foi possível carregar os profissionais neste momento.");

      setProfissionais([]);
    } finally {
      setCarregandoPerto(false);
    }
  };

  const enviarContacto = async () => {
    if (
      !nomeContacto.trim() ||
      !emailContacto.trim() ||
      !mensagemContacto.trim()
    ) {
      Alert.alert(
        "Campos obrigatórios",
        "Preencha o nome, o email e a mensagem.",
      );

      return;
    }

    if (!emailContacto.includes("@")) {
      Alert.alert("Email inválido", "Introduza um endereço de email válido.");

      return;
    }

    setEnviandoContacto(true);

    try {
      const resposta = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service_id: "service_r7uvjht",

            template_id: "template_e0jdge9",

            user_id: "AwaTW_46yWh1V8t6Z",

            template_params: {
              name: nomeContacto.trim(),

              email: emailContacto.trim(),

              message:
                "Assunto: " + tipoContacto + "\n\n" + mensagemContacto.trim(),

              nome: nomeContacto.trim(),

              from_name: nomeContacto.trim(),

              reply_to: emailContacto.trim(),

              user_name: nomeContacto.trim(),

              user_email: emailContacto.trim(),

              mensagem:
                "Assunto: " + tipoContacto + "\n\n" + mensagemContacto.trim(),
            },
          }),
        },
      );

      const texto = await resposta.text();

      if (!resposta.ok) {
        throw new Error(texto || `Erro ${resposta.status}`);
      }

      setNomeContacto("");
      setEmailContacto("");
      setMensagemContacto("");
      setSucessoContacto(true);
    } catch (error: any) {
      console.log("Erro EmailJS:", error);

      Alert.alert(
        "Não foi possível enviar",
        `Ocorreu um erro ao enviar a mensagem.\n\n${
          error?.message || String(error)
        }`,
      );
    } finally {
      setEnviandoContacto(false);
    }
  };

  useEffect(() => {
    if (modalNoticias && noticias[regiaoNoticias].length === 0) {
      carregarNoticias(regiaoNoticias);
    }
  }, [modalNoticias]);

  const carregarVagasEmpregoLocal = async () => {
    setCarregandoVagasEmprego(true);
    setErroVagasEmprego("");

    try {
      const { data, error } = await supabase
        .from("anuncios")
        .select(
          "id,titulo,descricao,categoria,localidade,publicado_em,dados_especificos",
        )
        .eq("estado", "publicado")
        .eq("tipo_anuncio", "Emprego")
        .order("publicado_em", { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      setVagasEmpregoLocal((data || []) as VagaEmpregoLocal[]);
    } catch (error) {
      console.log("Erro ao carregar empregos locais:", error);
      setErroVagasEmprego(
        "Não foi possível carregar as vagas locais. Tente novamente.",
      );
      setVagasEmpregoLocal([]);
    } finally {
      setCarregandoVagasEmprego(false);
    }
  };

  useEffect(() => {
    if (modalEmpregos) {
      carregarVagasEmpregoLocal();
    }
  }, [modalEmpregos]);

  useEffect(() => {
    if (modalPerto) {
      carregarPertoDeSi(regiaoPerto);
    }
  }, [modalPerto, regiaoPerto]);

  const abrirLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.log("Não foi possível abrir o link:", error);
      Alert.alert(
        "Não foi possível abrir",
        "Verifique a ligação à internet e tente novamente.",
      );
    }
  };

  const abrirNavegacao = (
    local: LocalLazer,
    app: "waze" | "google" | "apple",
  ) => {
    const destino = encodeURIComponent(`${local.nome}, ${local.endereco}`);
    const url =
      app === "waze"
        ? `https://waze.com/ul?q=${destino}&navigate=yes`
        : app === "google"
          ? `https://www.google.com/maps/dir/?api=1&destination=${destino}`
          : `https://maps.apple.com/?daddr=${destino}`;
    void abrirLink(url);
  };

  const mostrarDetalhesLocal = (local: LocalLazer) => {
    const linhas = [
      local.endereco,
      local.telefone ? `Contacto: ${local.telefone}` : "",
      local.horario ? `Horário: ${local.horario}` : "",
      local.observacao || "",
    ].filter(Boolean);

    const detalhes = linhas.join("\n\n");

    // Alert.alert não apresenta diálogos no navegador. Na versão web,
    // usamos o diálogo nativo do browser e permitimos abrir a navegação.
    if (typeof window !== "undefined") {
      const abrir = window.confirm(
        `${local.nome}\n\n${detalhes}\n\nQueres abrir a navegação no Google Maps?`,
      );
      if (abrir) {
        void abrirNavegacao(local, "google");
      }
      return;
    }

    Alert.alert(local.nome, detalhes, [
      { text: "Fechar", style: "cancel" },
      { text: "Waze", onPress: () => abrirNavegacao(local, "waze") },
      { text: "Google Maps", onPress: () => abrirNavegacao(local, "google") },
      { text: "Apple Maps", onPress: () => abrirNavegacao(local, "apple") },
    ]);
  };

  const abrirUber = async () => {
    try {
      await Linking.openURL("uber://?action=setPickup");
    } catch {
      await abrirLink(
        "https://m.uber.com/ul/?action=setPickup&pickup=my_location",
      );
    }
  };

  const abrirBolt = async () => {
    try {
      await Linking.openURL("bolt://");
    } catch {
      await abrirLink("https://bolt.eu/pt-pt/");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroGlowOne} />

          <View style={styles.heroGlowTwo} />

          <View style={styles.heroTextArea}>
            <Text style={styles.heroTitle}>Mais no Conecta Minho</Text>

            <Text style={styles.heroSubtitle}>
              Tudo o que precisas,
              {"\n"}
              mais perto de ti.
            </Text>

            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>Descobre tudo num só lugar</Text>
            </View>
          </View>

          {/* Ilustração leve de mapa e serviços — sem imagens externas */}
          <View style={styles.heroIllustration}>
            <View style={styles.heroMapCard}>
              <View style={styles.heroMapRoadHorizontal} />
              <View style={styles.heroMapRoadVertical} />
              <View style={styles.heroMapRoadDiagonal} />
              <View style={styles.heroMapPin}>
                <Text style={styles.heroMapPinText}>⌖</Text>
              </View>
            </View>
            <View style={[styles.heroServiceBubble, styles.heroServiceHome]}>
              <Text style={styles.heroServiceIcon}>⌂</Text>
            </View>
            <View
              style={[styles.heroServiceBubble, styles.heroServiceTransport]}
            >
              <Text style={styles.heroServiceIcon}>↗</Text>
            </View>
            <View style={[styles.heroServiceBubble, styles.heroServiceLocal]}>
              <Text style={styles.heroServiceIcon}>＋</Text>
            </View>
            <View style={styles.heroSpark}>
              <Text style={styles.heroSparkText}>✦</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* ACESSO RÁPIDO */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Acesso rápido</Text>

            <Text style={styles.sectionSubtitle}>
              Tudo o que você mais utiliza no Conecta.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/pesquisar")}
          >
            <Text style={styles.seeAll}>Ver tudo ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          {/* PESQUISAR */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.quickCard}
            onPress={() => router.push("/pesquisar")}
          >
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>🔎</Text>
            </View>

            <Text style={styles.quickTitle}>Pesquisar</Text>

            <Text style={styles.quickDescription}>
              Encontre anúncios e serviços.
            </Text>
          </TouchableOpacity>

          {/* PROFISSIONAIS */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.quickCard}
            onPress={() => router.push("/profissionais")}
          >
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>👨‍🔧</Text>
            </View>

            <Text style={styles.quickTitle}>Profissionais</Text>

            <Text style={styles.quickDescription}>
              Encontre profissionais disponíveis.
            </Text>
          </TouchableOpacity>

          {/* PUBLICAR */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.quickCard}
            onPress={() => router.push("/publicar")}
          >
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>＋</Text>
            </View>

            <Text style={styles.quickTitle}>Publicar anúncio</Text>

            <Text style={styles.quickDescription}>
              Divulgue o seu serviço ou produto.
            </Text>
          </TouchableOpacity>

          {/* MENSAGENS */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.quickCard}
            onPress={() => router.push("/mensagens")}
          >
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>💬</Text>
            </View>

            <Text style={styles.quickTitle}>Mensagens</Text>

            <Text style={styles.quickDescription}>
              Aceda às suas conversas.
            </Text>
          </TouchableOpacity>

          {/* CONTA */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.quickCard}
            onPress={() => router.push("/conta")}
          >
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>👤</Text>
            </View>

            <Text style={styles.quickTitle}>Minha conta</Text>

            <Text style={styles.quickDescription}>
              Gerir o seu perfil e conta.
            </Text>
          </TouchableOpacity>
        </View>

        {/* MOBILIDADE E LAZER — NOVOS ACESSOS, SEM ALTERAR OS EXISTENTES */}
        <View style={styles.sectionHeaderNoButton}>
          <Text style={styles.sectionTitle}>Mobilidade e lazer</Text>
          <Text style={styles.sectionSubtitle}>
            Transportes, espaços para a família e viagens.
          </Text>
        </View>

        <View style={styles.servicesGrid}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.serviceCard, styles.serviceBlue]}
            onPress={() => setModalTransportes(true)}
          >
            <View style={[styles.serviceIconBox, styles.serviceIconBlue]}>
              <Text style={styles.serviceIcon}>🚌</Text>
            </View>
            <View style={styles.serviceTextArea}>
              <Text style={styles.serviceTitle}>Transportes</Text>
              <Text style={styles.serviceDescription}>
                Horários e pesquisa de autocarros.
              </Text>
            </View>
            <Text style={styles.externalIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.serviceCard, styles.serviceGreen]}
            onPress={() => setModalLazer(true)}
          >
            <View style={[styles.serviceIconBox, styles.serviceIconGreen]}>
              <Text style={styles.serviceIcon}>🌳</Text>
            </View>
            <View style={styles.serviceTextArea}>
              <Text style={styles.serviceTitle}>Lazer e Família</Text>
              <Text style={styles.serviceDescription}>
                Parques, piscinas e espaços desportivos.
              </Text>
            </View>
            <Text style={styles.externalIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.serviceCard, styles.serviceDark]}
            onPress={abrirUber}
          >
            <View style={[styles.serviceIconBox, styles.serviceIconDark]}>
              <Text style={styles.serviceIcon}>🚘</Text>
            </View>
            <View style={styles.serviceTextArea}>
              <Text style={styles.serviceTitle}>Pedir Uber</Text>
              <Text style={styles.serviceDescription}>
                Abrir a aplicação ou o serviço online.
              </Text>
            </View>
            <Text style={styles.externalIcon}>↗</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.serviceCard, styles.serviceOrange]}
            onPress={abrirBolt}
          >
            <View style={[styles.serviceIconBox, styles.serviceIconOrange]}>
              <Text style={styles.serviceIcon}>🚕</Text>
            </View>
            <View style={styles.serviceTextArea}>
              <Text style={styles.serviceTitle}>Pedir Bolt</Text>
              <Text style={styles.serviceDescription}>
                Abrir a aplicação ou o serviço online.
              </Text>
            </View>
            <Text style={styles.externalIcon}>↗</Text>
          </TouchableOpacity>
        </View>

        {/* SERVIÇOS ÚTEIS */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Serviços úteis</Text>

            <Text style={styles.sectionSubtitle}>
              Acessos importantes para o dia a dia.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => abrirLink("https://www.portaldasfinancas.gov.pt/")}
          >
            <Text style={styles.seeAll}>Ver todos ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesGrid}>
          {/* FINANÇAS */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.serviceCard, styles.serviceGreen]}
            onPress={() => abrirLink("https://www.portaldasfinancas.gov.pt/")}
          >
            <View style={[styles.serviceIconBox, styles.serviceIconGreen]}>
              <Text style={styles.serviceIcon}>💶</Text>
            </View>

            <View style={styles.serviceTextArea}>
              <Text style={styles.serviceTitle}>Finanças</Text>

              <Text style={styles.serviceDescription}>
                Acesso ao Portal das Finanças
              </Text>
            </View>

            <Text style={styles.externalIcon}>↗</Text>
          </TouchableOpacity>

          {/* SEGURANÇA SOCIAL */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.serviceCard, styles.serviceYellow]}
            onPress={() => abrirLink("https://www.seg-social.pt/")}
          >
            <View style={[styles.serviceIconBox, styles.serviceIconYellow]}>
              <Text style={styles.serviceIcon}>🏛️</Text>
            </View>

            <View style={styles.serviceTextArea}>
              <Text style={styles.serviceTitle}>Segurança Social</Text>

              <Text style={styles.serviceDescription}>
                Acesso à Segurança Social
              </Text>
            </View>

            <Text style={styles.externalIcon}>↗</Text>
          </TouchableOpacity>

          {/* EMPREGOS */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.serviceCard, styles.servicePurple]}
            onPress={() => setModalEmpregos(true)}
          >
            <View style={[styles.serviceIconBox, styles.serviceIconPurple]}>
              <Text style={styles.serviceIcon}>💼</Text>
            </View>

            <View style={styles.serviceTextArea}>
              <Text style={styles.serviceTitle}>Empregos</Text>

              <Text style={styles.serviceDescription}>
                Oportunidades e ofertas
              </Text>
            </View>

            <Text style={styles.externalIcon}>↗</Text>
          </TouchableOpacity>

          {/* TELEFONES */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.serviceCard, styles.serviceRed]}
            onPress={() => setModalTelefones(true)}
          >
            <View style={[styles.serviceIconBox, styles.serviceIconRed]}>
              <Text style={styles.serviceIcon}>☎️</Text>
            </View>

            <View style={styles.serviceTextArea}>
              <Text style={styles.serviceTitle}>Telefones úteis</Text>

              <Text style={styles.serviceDescription}>
                Contactos importantes
              </Text>
            </View>

            <Text style={styles.externalIcon}>↗</Text>
          </TouchableOpacity>
        </View>

        {/* GUIMARÃES E REGIÃO */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Guimarães e região</Text>

            <Text style={styles.sectionSubtitle}>
              Informação e novidades perto de si.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/eventos")}
          >
            <Text style={styles.seeAll}>Ver todos ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.regionGrid}>
          {/* EVENTOS */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.regionCard}
            onPress={() => router.push("/eventos")}
          >
            <View style={styles.regionIconBox}>
              <Text style={styles.regionIcon}>📅</Text>
            </View>

            <Text style={styles.regionTitle}>Eventos</Text>

            <Text style={styles.regionDescription}>
              Descubra o que acontece na região.
            </Text>
          </TouchableOpacity>

          {/* NOTÍCIAS */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.regionCard}
            onPress={() => setModalNoticias(true)}
          >
            <View style={styles.regionIconBox}>
              <Text style={styles.regionIcon}>📰</Text>
            </View>

            <Text style={styles.regionTitle}>Conecta News</Text>

            <Text style={styles.regionDescription}>
              Informação e novidades locais.
            </Text>
          </TouchableOpacity>

          {/* TEMPO */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.regionCard}
            onPress={() => router.push("/tempo")}
          >
            <View style={styles.regionIconBox}>
              <Text style={styles.regionIcon}>🌤️</Text>
            </View>

            <Text style={styles.regionTitle}>Tempo</Text>

            <Text style={styles.regionDescription}>
              Previsão meteorológica.
            </Text>
          </TouchableOpacity>

          {/* PLACAR */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.regionCard}
            onPress={() => router.push("/placar")}
          >
            <View style={styles.regionIconBox}>
              <Text style={styles.regionIcon}>⚽</Text>
            </View>

            <Text style={styles.regionTitle}>Placar</Text>

            <Text style={styles.regionDescription}>Resultados e jogos.</Text>
          </TouchableOpacity>
        </View>

        {/* AJUDA E CONTACTO */}
        <View style={styles.sectionHeaderNoButton}>
          <Text style={styles.sectionTitle}>Ajuda e contacto</Text>

          <Text style={styles.sectionSubtitle}>
            Estamos aqui quando precisar.
          </Text>
        </View>

        {/* FALE CONNOSCO */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.helpCard}
          onPress={() => {
            setSucessoContacto(false);
            setModalContacto(true);
          }}
        >
          <View style={[styles.helpIconBox, styles.helpBlue]}>
            <Text style={styles.helpIcon}>📞</Text>
          </View>

          <View style={styles.helpInfo}>
            <Text style={styles.helpTitle}>Fale connosco</Text>

            <Text style={styles.helpDescription}>
              Entre em contacto com o Conecta.
            </Text>
          </View>

          <Text style={styles.helpArrow}>›</Text>
        </TouchableOpacity>

        {/* SERVIÇOS PÚBLICOS */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.helpCard}
          onPress={() => setModalServicos(true)}
        >
          <View style={[styles.helpIconBox, styles.helpYellow]}>
            <Text style={styles.helpIcon}>🏛️</Text>
          </View>

          <View style={styles.helpInfo}>
            <Text style={styles.helpTitle}>Serviços públicos</Text>

            <Text style={styles.helpDescription}>
              AIMA, IRN, saúde, tribunais, câmaras e águas.
            </Text>
          </View>

          <Text style={styles.helpArrow}>›</Text>
        </TouchableOpacity>

        {/* PERTO DE SI */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.helpCard}
          onPress={() => setModalPerto(true)}
        >
          <View style={[styles.helpIconBox, styles.helpRed]}>
            <Text style={styles.helpIcon}>📍</Text>
          </View>

          <View style={styles.helpInfo}>
            <Text style={styles.helpTitle}>Perto de si</Text>

            <Text style={styles.helpDescription}>
              Encontre profissionais e serviços publicados no Conecta.
            </Text>
          </View>

          <Text style={styles.helpArrow}>›</Text>
        </TouchableOpacity>

        {/* ÁREA EXCLUSIVA */}
        <View style={styles.sectionHeaderNoButton}>
          <Text style={styles.sectionTitle}>Área exclusiva</Text>

          <Text style={styles.sectionSubtitle}>
            Um espaço reservado para maiores de 18 anos.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.priveCard}
          onPress={() => router.push("/prive")}
        >
          <View style={styles.priveBadge}>
            <Text style={styles.priveLock}>🔒</Text>

            <Text style={styles.priveAge}>18+</Text>
          </View>

          <View style={styles.priveInfo}>
            <View style={styles.priveTitleRow}>
              <Text style={styles.priveTitle}>Conecta Privé</Text>

              <View style={styles.privateTag}>
                <Text style={styles.privateTagText}>PRIVADO</Text>
              </View>
            </View>

            <Text style={styles.priveDescription}>
              Área exclusiva para maiores de 18 anos.
            </Text>
          </View>

          <Text style={styles.priveArrow}>›</Text>
        </TouchableOpacity>

        {/* RODAPÉ */}
        <View style={styles.footer}>
          <View style={styles.footerWaveOne} />

          <View style={styles.footerWaveTwo} />

          <View style={styles.footerContent}>
            <Text style={styles.footerBrand}>Conecta Minho</Text>

            <Text style={styles.footerCities}>Guimarães · Vizela · Fafe</Text>
          </View>
        </View>

        {/* MODAL EMPREGOS */}
        <Modal
          visible={modalEmpregos}
          transparent
          animationType="slide"
          onRequestClose={() => setModalEmpregos(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Empregos</Text>

                  <Text style={styles.modalSubtitle}>
                    Escolha onde pretende procurar oportunidades.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setModalEmpregos(false)}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.jobsSectionHeading}>
                  <Text style={styles.jobsSectionTitle}>
                    Vagas no Conecta Minho
                  </Text>
                  <Text style={styles.jobsSectionSubtitle}>
                    Oportunidades publicadas na própria aplicação.
                  </Text>
                </View>

                {carregandoVagasEmprego ? (
                  <View style={styles.jobsLoading}>
                    <ActivityIndicator size="small" color="#1677B8" />
                    <Text style={styles.jobsStatusText}>
                      A carregar vagas locais...
                    </Text>
                  </View>
                ) : erroVagasEmprego ? (
                  <View style={styles.jobsEmptyCard}>
                    <Text style={styles.jobsStatusText}>
                      {erroVagasEmprego}
                    </Text>
                    <TouchableOpacity
                      style={styles.jobsRetryButton}
                      onPress={carregarVagasEmpregoLocal}
                    >
                      <Text style={styles.jobsRetryText}>Tentar novamente</Text>
                    </TouchableOpacity>
                  </View>
                ) : vagasEmpregoLocal.length === 0 ? (
                  <View style={styles.jobsEmptyCard}>
                    <Text style={styles.jobsEmptyIcon}>💼</Text>
                    <Text style={styles.jobsEmptyTitle}>
                      Ainda não há vagas publicadas
                    </Text>
                    <Text style={styles.jobsStatusText}>
                      Quando uma vaga for aprovada e publicada, aparecerá aqui
                      automaticamente.
                    </Text>
                  </View>
                ) : (
                  vagasEmpregoLocal.map((vaga) => {
                    const dados = vaga.dados_especificos || {};
                    const detalhes = [
                      dados.empresa,
                      vaga.localidade,
                      dados.tipo_contrato,
                      dados.regime,
                      dados.salario,
                    ].filter(
                      (item) =>
                        typeof item === "string" && item.trim().length > 0,
                    );

                    return (
                      <View key={vaga.id} style={styles.localJobCard}>
                        <View style={styles.localJobIcon}>
                          <Text style={styles.localJobIconText}>💼</Text>
                        </View>
                        <View style={styles.localJobInfo}>
                          <Text style={styles.localJobTitle}>
                            {vaga.titulo || "Vaga de emprego"}
                          </Text>
                          {detalhes.length > 0 && (
                            <Text style={styles.localJobMeta}>
                              {detalhes.join(" • ")}
                            </Text>
                          )}
                          {!!vaga.categoria && (
                            <Text style={styles.localJobCategory}>
                              {vaga.categoria}
                            </Text>
                          )}
                          {!!vaga.descricao && (
                            <Text style={styles.localJobDescription}>
                              {vaga.descricao.length > 180
                                ? `${vaga.descricao.slice(0, 177).trim()}...`
                                : vaga.descricao}
                            </Text>
                          )}
                          {(dados.candidatura ||
                            dados.email ||
                            dados.contacto) && (
                            <TouchableOpacity
                              style={styles.localJobApplyButton}
                              onPress={() => {
                                const destino = (
                                  dados.candidatura || ""
                                ).trim();
                                const email = (dados.email || "").trim();
                                const contacto = (dados.contacto || "").trim();
                                if (destino) {
                                  abrirLink(destino);
                                } else if (email) {
                                  abrirLink(`mailto:${email}`);
                                } else if (contacto) {
                                  abrirLink(
                                    `tel:${contacto.replace(/[^+0-9]/g, "")}`,
                                  );
                                }
                              }}
                            >
                              <Text style={styles.localJobApplyText}>
                                Candidatar-me / Contactar
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}

                <View style={styles.jobsExternalHeading}>
                  <Text style={styles.jobsSectionTitle}>
                    Plataformas externas
                  </Text>
                  <Text style={styles.jobsSectionSubtitle}>
                    Continue a procurar oportunidades noutros portais.
                  </Text>
                </View>

                {[
                  [
                    "🟢",
                    "SAPO Emprego",
                    "Ofertas de emprego e oportunidades profissionais.",
                    "https://emprego.sapo.pt/",
                  ],
                  [
                    "🏛️",
                    "IEFP Online",
                    "Emprego, formação e serviços do IEFP.",
                    "https://iefponline.iefp.pt/",
                  ],
                  [
                    "💼",
                    "Net-Empregos",
                    "Pesquisa de ofertas de emprego em Portugal.",
                    "https://www.net-empregos.com/",
                  ],
                ].map(([icone, titulo, descricao, url]) => (
                  <TouchableOpacity
                    key={titulo}
                    style={styles.choiceCard}
                    onPress={() => abrirLink(url)}
                  >
                    <View style={styles.choiceIcon}>
                      <Text style={styles.choiceEmoji}>{icone}</Text>
                    </View>

                    <View style={styles.choiceInfo}>
                      <Text style={styles.choiceTitle}>{titulo}</Text>

                      <Text style={styles.choiceDescription}>{descricao}</Text>
                    </View>

                    <Text style={styles.choiceArrow}>↗</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL TELEFONES */}
        <Modal
          visible={modalTelefones}
          transparent
          animationType="slide"
          onRequestClose={() => setModalTelefones(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Telefones úteis</Text>

                  <Text style={styles.modalSubtitle}>
                    Contactos importantes da região.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setModalTelefones(false)}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cityTabs}>
                {REGIOES.map((cidade) => (
                  <TouchableOpacity
                    key={cidade}
                    style={[
                      styles.cityTab,
                      regiao === cidade && styles.cityTabActive,
                    ]}
                    onPress={() => setRegiao(cidade)}
                  >
                    <Text
                      style={[
                        styles.cityTabText,
                        regiao === cidade && styles.cityTabTextActive,
                      ]}
                    >
                      {cidade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={styles.modalScroll}>
                {TELEFONES[regiao].map((telefone) => (
                  <View
                    key={`${telefone.nome}-${telefone.numero}`}
                    style={styles.phoneCard}
                  >
                    <View style={styles.phoneIconBox}>
                      <Text style={styles.phoneIcon}>☎️</Text>
                    </View>

                    <View style={styles.phoneInfo}>
                      <Text style={styles.phoneTitle}>{telefone.nome}</Text>

                      <Text style={styles.phoneType}>{telefone.tipo}</Text>

                      <Text style={styles.phoneNumber}>{telefone.numero}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => ligar(telefone.numero)}
                    >
                      <Text style={styles.callButtonText}>Ligar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL NOTÍCIAS */}
        <Modal
          visible={modalNoticias}
          transparent
          animationType="slide"
          onRequestClose={() => setModalNoticias(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Conecta News</Text>

                  <Text style={styles.modalSubtitle}>
                    Principais notícias de Guimarães, Vizela e Fafe.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setModalNoticias(false)}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cityTabs}>
                {REGIOES.map((cidade) => (
                  <TouchableOpacity
                    key={cidade}
                    style={[
                      styles.cityTab,
                      regiaoNoticias === cidade && styles.cityTabActive,
                    ]}
                    onPress={() => {
                      setRegiaoNoticias(cidade);
                      setErroNoticias("");
                      if (noticias[cidade].length === 0) {
                        carregarNoticias(cidade);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.cityTabText,
                        regiaoNoticias === cidade && styles.cityTabTextActive,
                      ]}
                    >
                      {cidade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => carregarNoticias(regiaoNoticias)}
                disabled={carregandoNoticias}
              >
                {carregandoNoticias ? (
                  <ActivityIndicator size="small" color="#1677B8" />
                ) : (
                  <Text style={styles.refreshButtonText}>
                    ↻ Atualizar Conecta News
                  </Text>
                )}
              </TouchableOpacity>

              <ScrollView style={styles.modalScroll}>
                {carregandoNoticias && noticias[regiaoNoticias].length === 0 ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#1677B8" />

                    <Text style={styles.loadingText}>
                      A carregar notícias...
                    </Text>
                  </View>
                ) : null}

                {erroNoticias ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>
                      Não foi possível atualizar
                    </Text>

                    <Text style={styles.errorText}>{erroNoticias}</Text>

                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => carregarNoticias(regiaoNoticias)}
                    >
                      <Text style={styles.retryButtonText}>
                        Tentar novamente
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {noticias[regiaoNoticias].map((noticia) => (
                  <View key={noticia.id} style={styles.newsCard}>
                    <View style={styles.newsTop}>
                      <Text style={styles.newsSource}>{noticia.fonte}</Text>

                      <Text style={styles.newsDate}>{noticia.data}</Text>
                    </View>

                    <Text style={styles.newsTitle}>{noticia.titulo}</Text>

                    <Text style={styles.newsSummary}>{noticia.resumo}</Text>
                  </View>
                ))}
              </ScrollView>

              <Text style={styles.newsDisclaimer}>
                Atualização diária baseada em fontes de notícias disponíveis
                publicamente.
              </Text>
            </View>
          </View>
        </Modal>

        {/* MODAL SERVIÇOS PÚBLICOS */}
        <Modal
          visible={modalServicos}
          transparent
          animationType="slide"
          onRequestClose={() => setModalServicos(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Serviços públicos</Text>

                  <Text style={styles.modalSubtitle}>
                    AIMA, IRN, saúde, tribunais, câmaras e águas.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setModalServicos(false)}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cityTabs}>
                {REGIOES.map((cidade) => (
                  <TouchableOpacity
                    key={cidade}
                    style={[
                      styles.cityTab,
                      regiaoServicos === cidade && styles.cityTabActive,
                    ]}
                    onPress={() => setRegiaoServicos(cidade)}
                  >
                    <Text
                      style={[
                        styles.cityTabText,
                        regiaoServicos === cidade && styles.cityTabTextActive,
                      ]}
                    >
                      {cidade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={styles.modalScroll}>
                {SERVICOS_PUBLICOS[regiaoServicos].map((servico, index) => (
                  <View
                    key={`${servico.nome}-${index}`}
                    style={styles.publicServiceCard}
                  >
                    <View style={styles.publicServiceHeader}>
                      <View style={styles.publicServiceIcon}>
                        <Text style={styles.publicServiceEmoji}>🏛️</Text>
                      </View>

                      <View style={styles.publicServiceTitleArea}>
                        <Text style={styles.publicServiceType}>
                          {servico.tipo}
                        </Text>

                        <Text style={styles.publicServiceName}>
                          {servico.nome}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.publicServiceInfo}>
                      <Text style={styles.publicServiceLabel}>Morada</Text>

                      <Text style={styles.publicServiceValue}>
                        {servico.endereco}
                      </Text>

                      {servico.horario ? (
                        <>
                          <Text style={styles.publicServiceLabel}>Horário</Text>

                          <Text style={styles.publicServiceValue}>
                            {servico.horario}
                          </Text>
                        </>
                      ) : null}

                      {servico.telefone ? (
                        <>
                          <Text style={styles.publicServiceLabel}>
                            Telefone
                          </Text>

                          <Text style={styles.publicServiceValue}>
                            {servico.telefone}
                          </Text>
                        </>
                      ) : null}

                      {servico.email ? (
                        <>
                          <Text style={styles.publicServiceLabel}>Email</Text>

                          <Text style={styles.publicServiceValue}>
                            {servico.email}
                          </Text>
                        </>
                      ) : null}

                      {servico.observacao ? (
                        <View style={styles.publicServiceNote}>
                          <Text style={styles.publicServiceNoteText}>
                            {servico.observacao}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.publicServiceButtons}>
                      {servico.telefone ? (
                        <TouchableOpacity
                          style={styles.smallActionBlue}
                          onPress={() => ligar(servico.telefone!)}
                        >
                          <Text style={styles.smallActionBlueText}>
                            ☎ Ligar
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.smallActionMap}
                        onPress={() => abrirMapa(servico.endereco)}
                      >
                        <Text style={styles.smallActionMapText}>📍 Mapa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL PERTO DE SI */}
        <Modal
          visible={modalPerto}
          transparent
          animationType="slide"
          onRequestClose={() => setModalPerto(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Perto de si</Text>

                  <Text style={styles.modalSubtitle}>
                    Profissionais e serviços publicados no Conecta.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setModalPerto(false)}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cityTabs}>
                {REGIOES.map((cidade) => (
                  <TouchableOpacity
                    key={cidade}
                    style={[
                      styles.cityTab,
                      regiaoPerto === cidade && styles.cityTabActive,
                    ]}
                    onPress={() => setRegiaoPerto(cidade)}
                  >
                    <Text
                      style={[
                        styles.cityTabText,
                        regiaoPerto === cidade && styles.cityTabTextActive,
                      ]}
                    >
                      {cidade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => carregarPertoDeSi(regiaoPerto)}
                disabled={carregandoPerto}
              >
                {carregandoPerto ? (
                  <ActivityIndicator size="small" color="#1677B8" />
                ) : (
                  <Text style={styles.refreshButtonText}>
                    ↻ Atualizar profissionais
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.externalSearchButton}
                activeOpacity={0.8}
                onPress={() => buscarForaDoConecta(regiaoPerto)}
              >
                <Text style={styles.externalSearchButtonIcon}>📍</Text>

                <View style={styles.externalSearchButtonTextArea}>
                  <Text style={styles.externalSearchButtonTitle}>
                    Buscar também fora do Conecta
                  </Text>

                  <Text style={styles.externalSearchButtonDescription}>
                    Ver profissionais e serviços próximos no mapa.
                  </Text>
                </View>

                <Text style={styles.externalSearchButtonArrow}>↗</Text>
              </TouchableOpacity>

              <ScrollView style={styles.modalScroll}>
                {carregandoPerto && profissionais.length === 0 ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#1677B8" />

                    <Text style={styles.loadingText}>
                      A procurar profissionais...
                    </Text>
                  </View>
                ) : null}

                {erroPerto ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>
                      Não foi possível carregar
                    </Text>

                    <Text style={styles.errorText}>{erroPerto}</Text>
                  </View>
                ) : null}

                {!carregandoPerto &&
                !erroPerto &&
                profissionais.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>👨‍🔧</Text>

                    <Text style={styles.emptyTitle}>
                      Ainda não há profissionais
                    </Text>

                    <Text style={styles.emptyText}>
                      Não existem profissionais ou serviços publicados para{" "}
                      {regiaoPerto}.
                    </Text>
                  </View>
                ) : null}

                {profissionais.map((anuncio) => (
                  <View key={anuncio.id} style={styles.professionalCard}>
                    <View style={styles.professionalTop}>
                      <View style={styles.professionalIcon}>
                        <Text style={styles.professionalEmoji}>👨‍🔧</Text>
                      </View>

                      <View style={styles.professionalMain}>
                        <Text style={styles.professionalTitle}>
                          {anuncio.titulo}
                        </Text>

                        <Text style={styles.professionalCategory}>
                          {anuncio.categoria ||
                            anuncio.tipo_anuncio ||
                            "Profissional"}
                        </Text>
                      </View>
                    </View>

                    {anuncio.localidade ? (
                      <Text style={styles.professionalLocation}>
                        📍 {anuncio.localidade}
                      </Text>
                    ) : null}

                    {anuncio.descricao ? (
                      <Text style={styles.professionalDescription}>
                        {anuncio.descricao}
                      </Text>
                    ) : null}

                    {anuncio.preco !== null &&
                    anuncio.preco !== undefined &&
                    anuncio.preco !== "" ? (
                      <Text style={styles.professionalPrice}>
                        {anuncio.preco_negociavel
                          ? `${preco(anuncio.preco)} · negociável`
                          : preco(anuncio.preco)}
                      </Text>
                    ) : null}

                    <View style={styles.professionalButtons}>
                      {anuncio.contato ? (
                        <TouchableOpacity
                          style={styles.smallActionBlue}
                          onPress={() => ligar(anuncio.contato!)}
                        >
                          <Text style={styles.smallActionBlueText}>
                            ☎ Contactar
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.smallActionMap}
                        onPress={() =>
                          abrirMapa(
                            `${anuncio.titulo}, ${
                              anuncio.localidade || regiaoPerto
                            }, Portugal`,
                          )
                        }
                      >
                        <Text style={styles.smallActionMapText}>📍 Mapa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL FALE CONNOSCO */}
        <Modal
          visible={modalContacto}
          transparent
          animationType="slide"
          onRequestClose={() => !enviandoContacto && setModalContacto(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Fale connosco</Text>

                  <Text style={styles.modalSubtitle}>
                    Envie-nos a sua mensagem.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => !enviandoContacto && setModalContacto(false)}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
              >
                {sucessoContacto ? (
                  <View
                    style={{
                      margin: 20,
                      padding: 24,
                      borderRadius: 18,
                      backgroundColor: "#EAF8EF",
                      borderWidth: 1,
                      borderColor: "#B9E7C8",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 42, marginBottom: 12 }}>✓</Text>
                    <Text
                      style={{
                        fontSize: 22,
                        lineHeight: 28,
                        fontWeight: "900",
                        color: "#176B3A",
                        textAlign: "center",
                        marginBottom: 10,
                      }}
                    >
                      Mensagem enviada com sucesso!
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        lineHeight: 23,
                        color: "#285A3B",
                        textAlign: "center",
                      }}
                    >
                      Recebemos a sua mensagem. Obrigado por entrar em contacto
                      com o Conecta Minho.
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setModalContacto(false)}
                      style={{
                        marginTop: 22,
                        paddingVertical: 13,
                        paddingHorizontal: 28,
                        borderRadius: 12,
                        backgroundColor: "#187BB9",
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 15,
                          fontWeight: "800",
                        }}
                      >
                        Fechar
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Assunto</Text>
                    {[
                      { titulo: "Relatar um erro", valor: "Relato de erro" },
                      { titulo: "Enviar um elogio", valor: "Elogio" },
                      { titulo: "Dar uma sugestao", valor: "Sugestao" },
                      { titulo: "Esclarecer duvidas", valor: "Duvida" },
                    ].map((opcao) => (
                      <TouchableOpacity
                        key={opcao.valor}
                        disabled={enviandoContacto}
                        onPress={() => setTipoContacto(opcao.valor)}
                        style={{
                          padding: 12,
                          marginBottom: 8,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor:
                            tipoContacto === opcao.valor
                              ? "#187BB9"
                              : "#D7DEE5",
                          backgroundColor:
                            tipoContacto === opcao.valor
                              ? "#EAF4FC"
                              : "#FFFFFF",
                        }}
                      >
                        <Text
                          style={{
                            color: "#233044",
                            fontWeight:
                              tipoContacto === opcao.valor ? "800" : "500",
                          }}
                        >
                          {tipoContacto === opcao.valor ? "[x] " : ""}
                          {opcao.titulo}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <Text style={styles.inputLabel}>Nome</Text>

                    <TextInput
                      value={nomeContacto}
                      onChangeText={setNomeContacto}
                      placeholder="O seu nome"
                      placeholderTextColor="#9AA3AC"
                      style={styles.input}
                      editable={!enviandoContacto}
                    />

                    <Text style={styles.inputLabel}>Email</Text>

                    <TextInput
                      value={emailContacto}
                      onChangeText={setEmailContacto}
                      placeholder="seuemail@exemplo.com"
                      placeholderTextColor="#9AA3AC"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                      editable={!enviandoContacto}
                    />

                    <Text style={styles.inputLabel}>Mensagem</Text>

                    <TextInput
                      value={mensagemContacto}
                      onChangeText={setMensagemContacto}
                      placeholder="Escreva a sua mensagem..."
                      placeholderTextColor="#9AA3AC"
                      multiline
                      textAlignVertical="top"
                      style={[styles.input, styles.inputMessage]}
                      editable={!enviandoContacto}
                    />

                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        enviandoContacto && styles.sendButtonDisabled,
                      ]}
                      onPress={enviarContacto}
                      disabled={enviandoContacto}
                    >
                      {enviandoContacto ? (
                        <>
                          <ActivityIndicator size="small" color="#FFFFFF" />

                          <Text style={styles.sendButtonText}>A enviar...</Text>
                        </>
                      ) : (
                        <Text style={styles.sendButtonText}>
                          Enviar mensagem
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL TRANSPORTES */}
        <Modal
          visible={modalTransportes}
          transparent
          animationType="slide"
          onRequestClose={() => setModalTransportes(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Transportes</Text>
                  <Text style={styles.modalSubtitle}>
                    Pesquise linhas e consulte horários publicados.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setModalTransportes(false)}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cityTabs}>
                {CIDADES_MOBILIDADE.map((cidade) => (
                  <TouchableOpacity
                    key={cidade}
                    style={[
                      styles.cityTab,
                      regiaoTransportes === cidade && styles.cityTabActive,
                    ]}
                    onPress={() => {
                      setRegiaoTransportes(cidade);
                      setPesquisaTransportes("");
                      setLinhaSelecionada("");
                    }}
                  >
                    <Text
                      style={[
                        styles.cityTabText,
                        regiaoTransportes === cidade &&
                          styles.cityTabTextActive,
                      ]}
                    >
                      {cidade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.transportSearchWrap}>
                <Text style={styles.transportSearchIcon}>⌕</Text>
                <TextInput
                  style={styles.transportSearchInput}
                  value={pesquisaTransportes}
                  onChangeText={(texto) => {
                    setPesquisaTransportes(texto);
                    const termo = normalizar(texto.trim());
                    if (!termo) {
                      setLinhaSelecionada("");
                      return;
                    }
                    const correspondencias = LINHAS_TRANSPORTE.filter(
                      (linha) =>
                        linha.cidade === regiaoTransportes &&
                        normalizar(
                          `${linha.numero} ${linha.nome} ${linha.percurso} ${linha.paragens.join(" ")}`,
                        ).includes(termo),
                    );
                    setLinhaSelecionada(
                      correspondencias.length === 1
                        ? correspondencias[0].numero
                        : "",
                    );
                  }}
                  placeholder="Pesquisar linha, destino ou paragem"
                  placeholderTextColor="#7C8792"
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {!!pesquisaTransportes && (
                  <TouchableOpacity onPress={() => setPesquisaTransportes("")}>
                    <Text style={styles.transportClearSearch}>×</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                style={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
              >
                {!pesquisaTransportes.trim() ? (
                  <View style={styles.transportEmptyState}>
                    <Text style={styles.transportEmptyTitle}>
                      Que linha procura?
                    </Text>
                    <Text style={styles.transportEmptyText}>
                      Escreva o número (por exemplo, 003 ou 181), o destino ou
                      uma paragem. Mostraremos os resultados para{" "}
                      {regiaoTransportes}.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.transportSectionLabel}>
                      RESULTADOS DA PESQUISA
                    </Text>
                    {LINHAS_TRANSPORTE.filter((linha) => {
                      if (linha.cidade !== regiaoTransportes) return false;
                      const termo = normalizar(pesquisaTransportes);
                      return normalizar(
                        `${linha.numero} ${linha.nome} ${linha.percurso} ${linha.paragens.join(" ")}`,
                      ).includes(termo);
                    }).map((linha) => (
                      <TouchableOpacity
                        key={`${linha.cidade}-${linha.numero}`}
                        style={[
                          styles.transportLineCard,
                          linhaSelecionada === linha.numero &&
                            styles.transportLineCardActive,
                        ]}
                        onPress={() => setLinhaSelecionada(linha.numero)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.transportLineNumber}>
                          <Text style={styles.transportLineNumberText}>
                            {linha.numero}
                          </Text>
                        </View>
                        <View style={styles.transportLineInfo}>
                          <Text style={styles.transportLineTitle}>
                            {linha.nome}
                          </Text>
                          <Text style={styles.transportLineDescription}>
                            {linha.percurso}
                          </Text>
                          <Text style={styles.transportLineOperator}>
                            {linha.operador}
                          </Text>
                        </View>
                        <Text style={styles.transportLineChevron}>
                          {linhaSelecionada === linha.numero ? "✓" : "›"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {LINHAS_TRANSPORTE.filter((linha) => {
                      if (linha.cidade !== regiaoTransportes) return false;
                      const termo = normalizar(pesquisaTransportes);
                      return normalizar(
                        `${linha.numero} ${linha.nome} ${linha.percurso} ${linha.paragens.join(" ")}`,
                      ).includes(termo);
                    }).length === 0 && (
                      <View style={styles.transportEmptyState}>
                        <Text style={styles.transportEmptyTitle}>
                          Linha não encontrada
                        </Text>
                        <Text style={styles.transportEmptyText}>
                          Não temos esta linha no diretório atual de{" "}
                          {regiaoTransportes}. Experimente outro número ou
                          pesquise pelo destino.
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {(() => {
                  const linha = pesquisaTransportes.trim()
                    ? LINHAS_TRANSPORTE.find(
                        (item) =>
                          item.cidade === regiaoTransportes &&
                          item.numero === linhaSelecionada,
                      )
                    : undefined;
                  if (!linha) return null;
                  const horarios = linha.horarios[diaSelecionado];
                  return (
                    <View style={styles.transportDetailCard}>
                      <Text style={styles.transportDetailEyebrow}>
                        DETALHES DA LINHA
                      </Text>
                      <Text style={styles.transportDetailTitle}>
                        {linha.numero} · {linha.nome}
                      </Text>
                      <Text style={styles.transportDetailDescription}>
                        {linha.percurso}
                      </Text>

                      <Text style={styles.transportSubheading}>
                        Paragens principais
                      </Text>
                      <View style={styles.transportStopsWrap}>
                        {linha.paragens.map((paragem, index) => (
                          <View
                            key={`${linha.cidade}-${linha.numero}-${index}-${paragem}`}
                            style={styles.transportStopChip}
                          >
                            <Text style={styles.transportStopText}>
                              {paragem}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <Text style={styles.transportSubheading}>
                        Partidas programadas
                      </Text>
                      {horarios.length > 0 ? (
                        <>
                          <View style={styles.transportDayTabs}>
                            {(
                              [
                                { key: "uteis", label: "Dias úteis" },
                                { key: "sabados", label: "Sábados" },
                                { key: "domingos", label: "Dom./feriados" },
                              ] as const
                            ).map((dia) => (
                              <TouchableOpacity
                                key={dia.key}
                                style={[
                                  styles.transportDayChip,
                                  diaSelecionado === dia.key &&
                                    styles.transportDayChipActive,
                                ]}
                                onPress={() => setDiaSelecionado(dia.key)}
                              >
                                <Text
                                  style={[
                                    styles.transportDayChipText,
                                    diaSelecionado === dia.key &&
                                      styles.transportDayChipTextActive,
                                  ]}
                                >
                                  {dia.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <Text style={styles.transportDeparturesLabel}>
                            Saída da{" "}
                            {linha.numero === "005"
                              ? "paragem S. Gonçalo"
                              : "Central de Camionagem (Alameda)"}
                          </Text>
                          <View style={styles.transportTimesGrid}>
                            {horarios.map((hora) => (
                              <View key={hora} style={styles.transportTimeChip}>
                                <Text style={styles.transportTimeText}>
                                  {hora}
                                </Text>
                              </View>
                            ))}
                          </View>
                          <Text style={styles.transportTimetableNote}>
                            {linha.nota}
                          </Text>
                        </>
                      ) : (
                        <View style={styles.transportNotice}>
                          <Text style={styles.transportNoticeTitle}>
                            Horário detalhado não validado para apresentação
                            aqui
                          </Text>
                          <Text style={styles.transportNoticeText}>
                            {linha.nota}
                          </Text>
                          <TouchableOpacity
                            style={styles.transportOfficialButton}
                            onPress={() =>
                              abrirLink(
                                linha.fonteUrl ||
                                  "https://guimabus.pt/horarios-linhas/",
                              )
                            }
                          >
                            <Text style={styles.transportOfficialButtonText}>
                              Consultar fonte oficial atualizada ↗
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.transportRefreshButton}
                        onPress={() =>
                          abrirLink(
                            linha.fonteUrl ||
                              "https://guimabus.pt/horarios-linhas/",
                          )
                        }
                      >
                        <Text style={styles.transportRefreshButtonText}>
                          Verificar avisos do operador ↗
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
                <Text style={styles.transportFooterNote}>
                  Os horários apresentados são programados, não previsões em
                  tempo real. Antes de viajar, confirme eventuais alterações
                  oficiais.
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL LAZER E FAMÍLIA */}
        <Modal
          visible={modalLazer}
          transparent
          animationType="slide"
          onRequestClose={() => setModalLazer(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Lazer e Família</Text>
                  <Text style={styles.modalSubtitle}>
                    Descubra espaços e atividades perto de si.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setModalLazer(false)}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cityTabs}>
                {CIDADES_MOBILIDADE.map((cidade) => (
                  <TouchableOpacity
                    key={cidade}
                    style={[
                      styles.cityTab,
                      regiaoLazer === cidade && styles.cityTabActive,
                    ]}
                    onPress={() => {
                      setRegiaoLazer(cidade);
                      setCategoriaLazer("Todos");
                    }}
                  >
                    <Text
                      style={[
                        styles.cityTabText,
                        regiaoLazer === cidade && styles.cityTabTextActive,
                      ]}
                    >
                      {cidade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={styles.modalScroll}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.lazerCategoryRow}
                >
                  {(
                    [
                      "Todos",
                      ...CATEGORIAS_LAZER.map((item) => item.nome),
                    ] as CategoriaLazer[]
                  ).map((categoria) => (
                    <TouchableOpacity
                      key={categoria}
                      style={[
                        styles.lazerCategoryChip,
                        categoriaLazer === categoria &&
                          styles.lazerCategoryChipActive,
                      ]}
                      onPress={() => setCategoriaLazer(categoria)}
                    >
                      <Text
                        style={[
                          styles.lazerCategoryChipText,
                          categoriaLazer === categoria &&
                            styles.lazerCategoryChipTextActive,
                        ]}
                      >
                        {categoria}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {LOCAIS_LAZER.filter(
                  (local) =>
                    local.cidade === regiaoLazer &&
                    (categoriaLazer === "Todos" ||
                      local.categoria === categoriaLazer),
                ).map((local) => (
                  <TouchableOpacity
                    key={`${local.cidade}-${local.nome}`}
                    style={styles.choiceCard}
                    activeOpacity={0.8}
                    onPress={() => mostrarDetalhesLocal(local)}
                  >
                    <View style={styles.choiceIcon}>
                      <Text style={styles.choiceEmoji}>
                        {CATEGORIAS_LAZER.find(
                          (item) => item.nome === local.categoria,
                        )?.icone || "📍"}
                      </Text>
                    </View>
                    <View style={styles.choiceInfo}>
                      <Text style={styles.choiceTitle}>{local.nome}</Text>
                      <Text style={styles.choiceDescription}>
                        {local.categoria}
                      </Text>
                      <Text
                        style={[styles.choiceDescription, { marginTop: 4 }]}
                      >
                        {local.endereco}
                      </Text>
                      <Text style={styles.localDetailsHint}>
                        Toque para ver detalhes e abrir a navegação
                      </Text>
                    </View>
                    <Text style={styles.choiceArrow}>›</Text>
                  </TouchableOpacity>
                ))}

                {LOCAIS_LAZER.filter(
                  (local) =>
                    local.cidade === regiaoLazer &&
                    (categoriaLazer === "Todos" ||
                      local.categoria === categoriaLazer),
                ).length === 0 && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>
                      Estamos a atualizar esta categoria
                    </Text>
                    <Text style={styles.emptyText}>
                      Ainda não temos locais verificados nesta categoria para{" "}
                      {regiaoLazer}. Não apresentamos moradas inventadas.
                    </Text>
                  </View>
                )}
                <Text style={styles.lazerDisclaimer}>
                  Os dados são apresentados dentro do Conecta Minho. Confirme
                  horários e condições junto da entidade responsável antes da
                  deslocação.
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 42,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },

  /* HERO */

  hero: {
    minHeight: 204,
    borderRadius: 28,
    backgroundColor: "#116EAD",
    overflow: "hidden",
    position: "relative",
    marginBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  heroGlowOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#0D5FA0",
    right: -65,
    top: -70,
  },

  heroGlowTwo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#258FD2",
    left: -45,
    bottom: -75,
  },

  heroTextArea: {
    width: "64%",
    zIndex: 2,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "900",
    maxWidth: 290,
    letterSpacing: -0.5,
  },

  heroSubtitle: {
    color: "#EAF6FF",
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: "600",
    marginTop: 8,
  },

  heroTag: {
    alignSelf: "flex-start",
    maxWidth: 225,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 16,
    shadowColor: "#063D68",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  heroTagText: {
    color: "#126BA8",
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "800",
  },

  heroIllustration: {
    position: "absolute",
    right: 15,
    bottom: 13,
    width: 142,
    height: 132,
    zIndex: 1,
  },

  heroMapCard: {
    position: "absolute",
    right: 7,
    bottom: 3,
    width: 105,
    height: 104,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
    transform: [{ rotate: "-8deg" }],
  },

  heroMapRoadHorizontal: {
    position: "absolute",
    left: -8,
    top: 37,
    width: 125,
    height: 9,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.62)",
    transform: [{ rotate: "-12deg" }],
  },

  heroMapRoadVertical: {
    position: "absolute",
    left: 45,
    top: -8,
    width: 8,
    height: 125,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.48)",
    transform: [{ rotate: "23deg" }],
  },

  heroMapRoadDiagonal: {
    position: "absolute",
    left: -4,
    top: 68,
    width: 125,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(112,220,218,0.85)",
    transform: [{ rotate: "-34deg" }],
  },

  heroMapPin: {
    position: "absolute",
    left: 37,
    top: 28,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#7AD9D2",
  },

  heroMapPinText: {
    color: "#126BA8",
    fontSize: 24,
    lineHeight: 27,
    fontWeight: "900",
  },

  heroServiceBubble: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "rgba(122,217,210,0.95)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  heroServiceHome: {
    left: 3,
    top: 22,
  },

  heroServiceTransport: {
    right: 0,
    top: 7,
  },

  heroServiceLocal: {
    left: 15,
    bottom: 0,
  },

  heroServiceIcon: {
    color: "#126BA8",
    fontSize: 23,
    lineHeight: 27,
    fontWeight: "900",
  },

  heroSpark: {
    position: "absolute",
    left: 32,
    top: 0,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  heroSparkText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },

  closeButton: {
    position: "absolute",
    right: 13,
    top: 13,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  closeButtonText: {
    color: "#1677B8",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "500",
    marginTop: -2,
  },

  /* TÍTULOS */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 8,
  },

  sectionHeaderNoButton: {
    marginTop: 24,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
    color: "#1D2733",
    letterSpacing: -0.25,
  },

  sectionSubtitle: {
    color: "#727C87",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 3,
  },

  seeAll: {
    color: "#1677B8",
    fontSize: 12.5,
    fontWeight: "900",
    marginLeft: 8,
    marginBottom: 2,
  },

  /* ACESSO RÁPIDO */

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  quickCard: {
    width: "31.7%",
    minHeight: 146,
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#DCE6EE",
    paddingHorizontal: 13,
    paddingVertical: 14,
    marginBottom: 13,
    shadowColor: "#244B65",
    shadowOpacity: 0.035,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  quickIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  quickIcon: {
    fontSize: 24,
  },

  quickTitle: {
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: "900",
    color: "#1F2A36",
  },

  quickDescription: {
    fontSize: 10.5,
    lineHeight: 14,
    color: "#737D87",
    marginTop: 4,
  },

  /* SERVIÇOS ÚTEIS */

  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  serviceCard: {
    width: "48.5%",
    minHeight: 91,
    borderRadius: 17,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },

  serviceBlue: {
    backgroundColor: "#EAF4FB",
    borderColor: "#C8E1F1",
  },

  serviceDark: {
    backgroundColor: "#EEF0F3",
    borderColor: "#D7DCE2",
  },

  serviceOrange: {
    backgroundColor: "#FFF0E5",
    borderColor: "#F4D2B8",
  },

  serviceGreen: {
    backgroundColor: "#EAF9EF",
    borderColor: "#BCEACB",
  },

  serviceYellow: {
    backgroundColor: "#FFF8E6",
    borderColor: "#F1DFAB",
  },

  servicePurple: {
    backgroundColor: "#F3ECFF",
    borderColor: "#DCC9FA",
  },

  serviceRed: {
    backgroundColor: "#FFF0F1",
    borderColor: "#F4C7CB",
  },

  serviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  serviceIconBlue: {
    backgroundColor: "#D0EAFB",
  },

  serviceIconDark: {
    backgroundColor: "#DCE1E7",
  },

  serviceIconOrange: {
    backgroundColor: "#FFE0C8",
  },

  serviceIconGreen: {
    backgroundColor: "#C9F3D7",
  },

  serviceIconYellow: {
    backgroundColor: "#FFEAB0",
  },

  serviceIconPurple: {
    backgroundColor: "#E3D2FF",
  },

  serviceIconRed: {
    backgroundColor: "#FFD6DA",
  },

  serviceIcon: {
    fontSize: 21,
  },

  serviceTextArea: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },

  serviceTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    color: "#27313D",
  },

  serviceDescription: {
    fontSize: 10,
    lineHeight: 13,
    color: "#68727E",
    marginTop: 2,
  },

  externalIcon: {
    position: "absolute",
    right: 8,
    bottom: 7,
    fontSize: 15,
    fontWeight: "900",
    color: "#1677B8",
  },

  /* REGIÃO */

  regionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  regionCard: {
    width: "23.6%",
    minHeight: 126,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCE6EE",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 13,
    shadowColor: "#244B65",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  regionIconBox: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  regionIcon: {
    fontSize: 23,
  },

  regionTitle: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "900",
    color: "#27313D",
    textAlign: "center",
  },

  regionDescription: {
    fontSize: 9.5,
    lineHeight: 12,
    color: "#737D87",
    textAlign: "center",
    marginTop: 3,
  },

  /* AJUDA */

  helpCard: {
    minHeight: 72,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E1E6EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
  },

  helpIconBox: {
    width: 47,
    height: 47,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  helpBlue: {
    backgroundColor: "#E3F1FF",
  },

  helpYellow: {
    backgroundColor: "#FFF4D6",
  },

  helpRed: {
    backgroundColor: "#FFE5E7",
  },

  helpIcon: {
    fontSize: 22,
  },

  helpInfo: {
    flex: 1,
    minWidth: 0,
  },

  helpTitle: {
    fontSize: 15.5,
    lineHeight: 19,
    fontWeight: "900",
    color: "#27313D",
  },

  helpDescription: {
    fontSize: 11.5,
    lineHeight: 16,
    color: "#737D87",
    marginTop: 2,
  },

  helpArrow: {
    color: "#1677B8",
    fontSize: 29,
    marginLeft: 8,
  },

  /* PRIVÉ */

  priveCard: {
    minHeight: 88,
    backgroundColor: "#FFFDFE",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#EFCFD7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 20,
  },

  priveBadge: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#F9E8EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#F0D5DB",
  },

  priveLock: {
    fontSize: 19,
    lineHeight: 21,
  },

  priveAge: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "900",
    color: "#65404C",
    marginTop: 1,
  },

  priveInfo: {
    flex: 1,
    minWidth: 0,
  },

  priveTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  priveTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
    color: "#3B3035",
  },

  privateTag: {
    backgroundColor: "#F6E7EA",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 7,
  },

  privateTagText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#704653",
  },

  priveDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#7B7075",
    marginTop: 3,
  },

  priveArrow: {
    fontSize: 30,
    color: "#7B5964",
    marginLeft: 8,
  },

  /* RODAPÉ */

  footer: {
    minHeight: 96,
    marginTop: 18,
    marginHorizontal: 0,
    marginBottom: 8,
    backgroundColor: "#EAF5FC",
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D5EAF7",
    paddingVertical: 18,
  },

  footerWaveOne: {
    display: "none",
  },

  footerWaveTwo: {
    display: "none",
  },

  footerContent: {
    zIndex: 2,
    alignItems: "center",
    paddingBottom: 0,
  },

  footerBrand: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.1,
    color: "#164E75",
  },

  footerCities: {
    fontSize: 12,
    color: "#55788F",
    marginTop: 5,
  },

  /* MODAIS */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#F7F8FA",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    minHeight: "55%",
    overflow: "hidden",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E9ED",
  },

  modalHeaderText: {
    flex: 1,
    paddingRight: 10,
  },

  modalTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    color: "#27313D",
  },

  modalSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    color: "#737D87",
    marginTop: 3,
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    color: "#1677B8",
    fontSize: 26,
    lineHeight: 29,
    fontWeight: "500",
    marginTop: -2,
  },

  modalScroll: {
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 25,
  },

  jobsSectionHeading: {
    marginHorizontal: 2,
    marginBottom: 10,
    marginTop: 2,
  },

  jobsExternalHeading: {
    marginHorizontal: 2,
    marginTop: 14,
    marginBottom: 10,
  },

  jobsSectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#27313D",
  },

  jobsSectionSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: "#737D87",
    marginTop: 3,
  },

  jobsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E6EB",
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    gap: 9,
  },

  jobsStatusText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#737D87",
    flexShrink: 1,
  },

  jobsEmptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E6EB",
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
  },

  jobsEmptyIcon: {
    fontSize: 25,
    marginBottom: 7,
  },

  jobsEmptyTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#27313D",
    textAlign: "center",
    marginBottom: 5,
  },

  jobsRetryButton: {
    marginTop: 10,
    backgroundColor: "#EAF4FB",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  jobsRetryText: {
    color: "#1677B8",
    fontSize: 12,
    fontWeight: "800",
  },

  localJobCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8F0",
    borderRadius: 16,
    padding: 12,
    marginBottom: 9,
  },

  localJobIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  localJobIconText: {
    fontSize: 21,
  },

  localJobInfo: {
    flex: 1,
    minWidth: 0,
  },

  localJobTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    color: "#27313D",
  },

  localJobMeta: {
    fontSize: 11,
    lineHeight: 16,
    color: "#1677B8",
    fontWeight: "700",
    marginTop: 4,
  },

  localJobCategory: {
    fontSize: 10,
    color: "#737D87",
    marginTop: 4,
  },

  localJobDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: "#596572",
    marginTop: 6,
  },

  localJobApplyButton: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF4FB",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 9,
  },

  localJobApplyText: {
    color: "#1677B8",
    fontSize: 11,
    fontWeight: "900",
  },

  choiceCard: {
    minHeight: 74,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E6EB",
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    marginBottom: 9,
  },

  choiceIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  choiceEmoji: {
    fontSize: 22,
  },

  choiceInfo: {
    flex: 1,
    minWidth: 0,
  },

  choiceTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#27313D",
  },

  choiceDescription: {
    fontSize: 10.5,
    lineHeight: 15,
    color: "#737D87",
    marginTop: 3,
  },

  choiceArrow: {
    fontSize: 22,
    color: "#1677B8",
    marginLeft: 8,
  },

  cityTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 7,
  },

  cityTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E6EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  cityTabActive: {
    backgroundColor: "#1677B8",
    borderColor: "#1677B8",
  },

  cityTabText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#68727E",
  },

  cityTabTextActive: {
    color: "#FFFFFF",
  },

  refreshButton: {
    alignSelf: "flex-end",
    marginHorizontal: 16,
    marginTop: 5,
    marginBottom: 2,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
  },

  refreshButtonText: {
    color: "#1677B8",
    fontSize: 10.5,
    fontWeight: "900",
  },

  externalSearchButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C8E1F1",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  externalSearchButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EAF4FB",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 20,
    marginRight: 10,
    overflow: "hidden",
  },

  externalSearchButtonTextArea: {
    flex: 1,
    minWidth: 0,
  },

  externalSearchButtonTitle: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "900",
    color: "#27313D",
  },

  externalSearchButtonDescription: {
    fontSize: 10,
    lineHeight: 14,
    color: "#737D87",
    marginTop: 2,
  },

  externalSearchButtonArrow: {
    color: "#1677B8",
    fontSize: 22,
    fontWeight: "900",
    marginLeft: 8,
  },

  phoneCard: {
    minHeight: 78,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E6EB",
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    marginBottom: 9,
  },

  phoneIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFE5E7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  phoneIcon: {
    fontSize: 20,
  },

  phoneInfo: {
    flex: 1,
    minWidth: 0,
  },

  phoneTitle: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "900",
    color: "#27313D",
  },

  phoneType: {
    fontSize: 9.5,
    color: "#1677B8",
    fontWeight: "800",
    marginTop: 2,
  },

  phoneNumber: {
    fontSize: 12,
    color: "#27313D",
    fontWeight: "800",
    marginTop: 4,
  },

  callButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#1677B8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  callButtonText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "900",
  },

  transportSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#F0F4F7",
    borderWidth: 1,
    borderColor: "#E0E6EC",
  },
  transportSearchIcon: { fontSize: 24, color: "#1677B8", marginRight: 8 },
  transportSearchInput: {
    flex: 1,
    color: "#27313D",
    fontSize: 12,
    paddingVertical: 8,
  },
  transportClearSearch: {
    color: "#1677B8",
    fontSize: 23,
    paddingHorizontal: 5,
  },
  transportSectionLabel: {
    color: "#7A8590",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginHorizontal: 15,
    marginTop: 4,
    marginBottom: 8,
  },
  transportLineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E6EC",
    borderRadius: 13,
    padding: 10,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  transportLineCardActive: {
    borderColor: "#1677B8",
    backgroundColor: "#F1F8FD",
  },
  transportLineNumber: {
    minWidth: 44,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#E8F3FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  transportLineNumberText: {
    color: "#126BA7",
    fontSize: 13,
    fontWeight: "900",
  },
  transportLineInfo: { flex: 1 },
  transportLineTitle: { color: "#27313D", fontSize: 12, fontWeight: "900" },
  transportLineDescription: {
    color: "#65717D",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  transportLineOperator: {
    color: "#1677B8",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
  },
  transportLineChevron: {
    color: "#1677B8",
    fontSize: 21,
    fontWeight: "800",
    paddingHorizontal: 5,
  },
  transportEmptyState: {
    padding: 18,
    marginHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
  },
  transportEmptyTitle: { fontSize: 13, fontWeight: "900", color: "#27313D" },
  transportEmptyText: {
    fontSize: 11,
    color: "#65717D",
    textAlign: "center",
    marginTop: 5,
  },
  transportDetailCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE4EB",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  transportDetailEyebrow: {
    color: "#1677B8",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  transportDetailTitle: {
    color: "#27313D",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },
  transportDetailDescription: {
    color: "#65717D",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  transportSubheading: {
    color: "#27313D",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 7,
  },
  transportStopsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  transportStopChip: {
    backgroundColor: "#F1F5F8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  transportStopText: { color: "#4D5965", fontSize: 9, fontWeight: "600" },
  transportDayTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  transportDayChip: {
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 8,
    backgroundColor: "#F0F4F7",
    borderWidth: 1,
    borderColor: "#DCE4EB",
  },
  transportDayChipActive: {
    backgroundColor: "#1677B8",
    borderColor: "#1677B8",
  },
  transportDayChipText: { color: "#53606D", fontSize: 9, fontWeight: "800" },
  transportDayChipTextActive: { color: "#FFFFFF" },
  transportDeparturesLabel: {
    color: "#65717D",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 7,
  },
  transportTimesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  transportTimeChip: {
    minWidth: 52,
    alignItems: "center",
    backgroundColor: "#E8F3FB",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  transportTimeText: { color: "#126BA7", fontSize: 11, fontWeight: "900" },
  transportTimetableNote: {
    color: "#65717D",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
  },
  transportOfficialButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: "#1677B8",
    marginTop: 10,
  },
  transportOfficialButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  transportRefreshButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 5,
  },
  transportRefreshButtonText: {
    color: "#1677B8",
    fontSize: 10,
    fontWeight: "900",
  },
  transportFooterNote: {
    color: "#7A8590",
    fontSize: 9,
    lineHeight: 14,
    textAlign: "center",
    marginHorizontal: 18,
    marginTop: 6,
    marginBottom: 18,
  },

  transportSourceLabel: {
    color: "#65717D",
    fontSize: 10,
    marginTop: 8,
    fontWeight: "700",
  },
  transportLiveNote: {
    color: "#8A6D2F",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 5,
  },
  lazerCategoryRow: {
    paddingBottom: 10,
    paddingTop: 2,
    paddingRight: 6,
  },
  lazerCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCE3E9",
    backgroundColor: "#FFFFFF",
    marginRight: 7,
  },
  lazerCategoryChipActive: {
    backgroundColor: "#1677B8",
    borderColor: "#1677B8",
  },
  lazerCategoryChipText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#53606D",
  },
  lazerCategoryChipTextActive: {
    color: "#FFFFFF",
  },
  localDetailsHint: {
    fontSize: 10,
    lineHeight: 14,
    color: "#1677B8",
    fontWeight: "800",
    marginTop: 6,
  },

  transportNotice: {
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F1DFAB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  transportNoticeTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#79672E",
    marginBottom: 4,
  },

  transportNoticeText: {
    fontSize: 10.5,
    lineHeight: 15,
    color: "#79672E",
  },

  lazerDisclaimer: {
    fontSize: 10,
    lineHeight: 15,
    color: "#737D87",
    textAlign: "center",
    paddingHorizontal: 8,
    paddingTop: 3,
    paddingBottom: 16,
  },

  newsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E6EB",
    padding: 13,
    marginBottom: 10,
  },

  newsTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  newsSource: {
    fontSize: 9.5,
    color: "#1677B8",
    fontWeight: "900",
    flex: 1,
  },

  newsDate: {
    fontSize: 9,
    color: "#8A949E",
    marginLeft: 8,
  },

  newsTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "900",
    color: "#27313D",
  },

  newsSummary: {
    fontSize: 10.5,
    lineHeight: 15,
    color: "#737D87",
    marginTop: 5,
  },

  newsDisclaimer: {
    fontSize: 9,
    lineHeight: 13,
    color: "#8A949E",
    textAlign: "center",
    paddingHorizontal: 18,
    paddingBottom: 15,
    paddingTop: 5,
  },

  publicServiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E1E6EB",
    padding: 13,
    marginBottom: 10,
  },

  publicServiceHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  publicServiceIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFF4D6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  publicServiceEmoji: {
    fontSize: 21,
  },

  publicServiceTitleArea: {
    flex: 1,
    minWidth: 0,
  },

  publicServiceType: {
    fontSize: 9.5,
    color: "#1677B8",
    fontWeight: "900",
    textTransform: "uppercase",
  },

  publicServiceName: {
    fontSize: 14,
    lineHeight: 18,
    color: "#27313D",
    fontWeight: "900",
    marginTop: 2,
  },

  publicServiceInfo: {
    marginTop: 10,
  },

  publicServiceLabel: {
    fontSize: 9.5,
    color: "#8A949E",
    fontWeight: "900",
    marginTop: 5,
  },

  publicServiceValue: {
    fontSize: 10.5,
    lineHeight: 15,
    color: "#4C5661",
    marginTop: 2,
  },

  publicServiceNote: {
    backgroundColor: "#FFF8E6",
    borderRadius: 11,
    padding: 9,
    marginTop: 8,
  },

  publicServiceNoteText: {
    fontSize: 10,
    lineHeight: 14,
    color: "#79672E",
  },

  publicServiceButtons: {
    flexDirection: "row",
    marginTop: 11,
  },

  smallActionBlue: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: "#1677B8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  smallActionBlueText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "900",
  },

  smallActionMap: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: "#EAF4FB",
    borderWidth: 1,
    borderColor: "#C8E1F1",
    alignItems: "center",
    justifyContent: "center",
  },

  smallActionMapText: {
    color: "#1677B8",
    fontSize: 10.5,
    fontWeight: "900",
  },

  professionalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1E6EB",
    padding: 13,
    marginBottom: 10,
  },

  professionalTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  professionalIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  professionalEmoji: {
    fontSize: 23,
  },

  professionalMain: {
    flex: 1,
  },

  professionalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#27313D",
  },

  professionalCategory: {
    fontSize: 10.5,
    color: "#1677B8",
    fontWeight: "800",
    marginTop: 2,
  },

  professionalLocation: {
    fontSize: 10.5,
    color: "#68727E",
    marginTop: 9,
  },

  professionalDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: "#737D87",
    marginTop: 6,
  },

  professionalPrice: {
    fontSize: 12,
    color: "#1677B8",
    fontWeight: "900",
    marginTop: 7,
  },

  professionalButtons: {
    flexDirection: "row",
    marginTop: 11,
  },

  inputLabel: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#27313D",
    marginBottom: 5,
    marginTop: 3,
  },

  input: {
    minHeight: 47,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DDE3E8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    color: "#27313D",
    fontSize: 12.5,
    marginBottom: 11,
  },

  inputMessage: {
    minHeight: 125,
    paddingTop: 12,
    paddingBottom: 12,
  },

  sendButton: {
    minHeight: 49,
    borderRadius: 14,
    backgroundColor: "#1677B8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 4,
  },

  sendButtonDisabled: {
    opacity: 0.65,
  },

  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  loadingBox: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  loadingText: {
    fontSize: 12,
    color: "#737D87",
    marginTop: 10,
  },

  errorBox: {
    backgroundColor: "#FFF0F1",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F4C7CB",
    padding: 13,
    marginTop: 10,
    marginBottom: 10,
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#8D3540",
  },

  errorText: {
    fontSize: 10.5,
    lineHeight: 15,
    color: "#8D3540",
    marginTop: 4,
  },

  retryButton: {
    alignSelf: "flex-start",
    marginTop: 9,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  retryButtonText: {
    color: "#8D3540",
    fontSize: 10,
    fontWeight: "900",
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E1E6EB",
    padding: 24,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 15,
  },

  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#27313D",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#737D87",
    textAlign: "center",
    marginTop: 5,
  },
});
