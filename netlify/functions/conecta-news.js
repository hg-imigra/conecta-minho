const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const CIDADES = {
  guimaraes: "Guimarães",
  "guimarães": "Guimarães",
  vizela: "Vizela",
  fafe: "Fafe",
};

function descodificar(texto = "") {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCodePoint(Number(n))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16))
    )
    .replace(/\s+/g, " ")
    .trim();
}

function obterTag(xml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,
    "i"
  );
  const resultado = xml.match(regex);
  return resultado ? descodificar(resultado[1]) : "";
}

function obterLink(xml) {
  const link = obterTag(xml, "link");
  if (link) return link;

  const match = xml.match(/<link[^>]*href=["']([^"']+)["']/i);
  return match ? match[1] : "";
}

function dataLegivel(valor) {
  if (!valor) return "";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";

  return data.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function obterFeed(cidade, consulta) {
  const url =
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(consulta) +
    "&hl=pt-PT&gl=PT&ceid=PT:pt-150";

  const resposta = await fetch(url, {
    headers: {
      "User-Agent": "ConectaMinho/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!resposta.ok) {
    throw new Error(`Google News respondeu com HTTP ${resposta.status}`);
  }

  const xml = await resposta.text();
  const blocos = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];

  return blocos.map((bloco, indice) => {
    const titulo = obterTag(bloco, "title");
    const resumo = obterTag(bloco, "description");
    const link = obterLink(bloco);
    const fonte = obterTag(bloco, "source") || "Google News";
    const dataOriginal = obterTag(bloco, "pubDate");

    return {
      id: `${cidade}-${indice}-${titulo}`,
      titulo,
      resumo,
      data: dataLegivel(dataOriginal),
      fonte,
      link,
      url: link,
      dataOriginal,
    };
  }).filter((item) => item.titulo && item.link);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        status: "error",
        message: "Método não permitido.",
      }),
    };
  }

  const parametro =
    event.queryStringParameters?.cidade ||
    event.queryStringParameters?.regiao ||
    "Guimarães";

  const cidade = CIDADES[parametro.toLowerCase()];

  if (!cidade) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        status: "error",
        message: "Região inválida. Escolha Guimarães, Vizela ou Fafe.",
      }),
    };
  }

  const consultas = [
    `${cidade} Portugal`,
    `site:ominho.pt ${cidade}`,
    `site:diariodominho.pt ${cidade}`,
  ];

  const resultados = await Promise.allSettled(
    consultas.map((consulta) => obterFeed(cidade, consulta))
  );

  const noticias = [];
  const ids = new Set();

  for (const resultado of resultados) {
    if (resultado.status !== "fulfilled") continue;

    for (const noticia of resultado.value) {
      const chave = noticia.titulo.toLowerCase();

      if (!ids.has(chave)) {
        ids.add(chave);
        noticias.push(noticia);
      }
    }
  }

  noticias.sort((a, b) => {
    const dataA = new Date(a.dataOriginal || 0).getTime() || 0;
    const dataB = new Date(b.dataOriginal || 0).getTime() || 0;
    return dataB - dataA;
  });

  return {
    statusCode: 200,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=300",
    },
    body: JSON.stringify({
      status: "ok",
      cidade,
      items: noticias.slice(0, 20),
    }),
  };
};