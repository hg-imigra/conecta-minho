
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

function resposta(statusCode, dados, extras = {}) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "no-store",
      ...extras,
    },
    body: statusCode === 204 ? "" : JSON.stringify(dados),
  };
}

function descodificar(texto = "") {
  return String(texto)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => {
      const numero = Number(n);
      return numero <= 0x10ffff
        ? String.fromCodePoint(numero)
        : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      const numero = parseInt(n, 16);
      return numero <= 0x10ffff
        ? String.fromCodePoint(numero)
        : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function obterTag(xml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}\\s*>`,
    "i"
  );

  const resultado = xml.match(regex);
  return resultado ? descodificar(resultado[1]) : "";
}

function obterLink(xml) {
  const link = obterTag(xml, "link");
  if (link) return link;

  const match = xml.match(
    /<link\b[^>]*href=["']([^"']+)["']/i
  );

  return match ? descodificar(match[1]) : "";
}

function dataLegivel(valor) {
  if (!valor) return "";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";

  return data.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  });
}

async function obterFeed(cidade, consulta) {
  const url =
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(consulta) +
    "&hl=pt-PT&gl=PT&ceid=PT:pt-150";

  const respostaFeed = await fetch(url, {
    headers: {
      "User-Agent": "ConectaMinho/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!respostaFeed.ok) {
    throw new Error(
      `Google News respondeu com HTTP ${respostaFeed.status}`
    );
  }

  const xml = await respostaFeed.text();

  if (!xml.trim() || !/<(?:rss|feed)\b/i.test(xml)) {
    throw new Error("O Google News não devolveu um feed RSS válido.");
  }

  const blocos =
    xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];

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
    return resposta(204, {});
  }

  if (event.httpMethod !== "GET") {
    return resposta(405, {
      status: "error",
      message: "Método não permitido.",
    });
  }

  const parametro =
    event.queryStringParameters?.cidade ||
    event.queryStringParameters?.regiao ||
    "Guimarães";

  const cidade = CIDADES[String(parametro).toLowerCase().trim()];

  if (!cidade) {
    return resposta(400, {
      status: "error",
      message: "Região inválida. Escolha Guimarães, Vizela ou Fafe.",
    });
  }

  try {
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
    const erros = [];

    for (let i = 0; i < resultados.length; i++) {
      const resultado = resultados[i];

      if (resultado.status === "rejected") {
        erros.push({
          consulta: consultas[i],
          erro: String(resultado.reason?.message || resultado.reason),
        });
        continue;
      }

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

    if (noticias.length === 0) {
      console.error("Conecta News: nenhum resultado.", {
        cidade,
        erros,
      });

      return resposta(
        502,
        {
          status: "error",
          cidade,
          items: [],
          message: "Não foi possível obter notícias neste momento.",
          diagnostico: erros,
        },
        { "Cache-Control": "no-store" }
      );
    }

    if (erros.length > 0) {
      console.warn("Conecta News: algumas consultas falharam.", {
        cidade,
        erros,
      });
    }

    return resposta(
      200,
      {
        status: "ok",
        cidade,
        items: noticias.slice(0, 20),
      },
      { "Cache-Control": "public, max-age=300" }
    );
  } catch (erro) {
    console.error("Erro inesperado no Conecta News:", erro);

    return resposta(500, {
      status: "error",
      message: "O serviço de notícias encontrou um erro interno.",
    });
  }
};
