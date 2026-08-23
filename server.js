const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3002;
const ROOT_DIR = __dirname;
let estadoAtual = 'off';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function enviarJSON(res, codigo, objeto) {
  const payload = JSON.stringify(objeto);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(payload);
}

function servirArquivo(res, arquivo) {
  const arquivoFinal = path.join(ROOT_DIR, arquivo);

  fs.readFile(arquivoFinal, (erro, conteudo) => {
    if (erro) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado');
      return;
    }

    const ext = path.extname(arquivoFinal).toLowerCase();
    const tipo = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': tipo });
    res.end(conteudo);
  });
}

function coletarSubredes() {
  const subredes = new Set();
  const interfaces = os.networkInterfaces();

  Object.values(interfaces).forEach((itens) => {
    itens.forEach((item) => {
      if (item.family !== 'IPv4' || item.internal) return;
      const partes = item.address.split('.');
      if (partes.length !== 4) return;
      const base = `${partes[0]}.${partes[1]}.${partes[2]}`;
      for (let i = 1; i <= 60; i += 1) {
        subredes.add(`${base}.${i}`);
      }
    });
  });

  return Array.from(subredes);
}

function pareceDeviceAC(payload) {
  const texto = JSON.stringify(payload || {}).toLowerCase();
  const padroes = [
    /ac|clima|air|conditioner|hvac|cool|ar-cond|ar cond/i,
    /power|state|temperatura|fan|mode|ligado|desligado|on|off/i,
    /lg|controller|device|setpoint|temp/i
  ];

  const ac = padroes[0].test(texto);
  const status = padroes[1].test(texto) || padroes[2].test(texto);
  return ac && status;
}

function verificarDispositivo(ip, manual = false) {
  return new Promise((resolve) => {
    const endpoints =[
      '/status',
      '/api/status',
      '/api/ac/status',
      '/ac/status',
      '/device',
      '/api/device',
      '/v1/status',
      '/aircon',
      '/api/aircon',
      '/api/airconditioner',
      '/api/ac',
      '/api/aircon/status',
      '/api/airconditioner/status'
    ];

    let indice = 0;

    function tentarProximo() {
      if (indice >= endpoints.length) {
        resolve(null);
        return;
      }

      const endpoint = endpoints[indice];
      indice += 1;

      const url = `http://${ip}${endpoint}`;
      const pedido = http.get(url, { timeout: 2000 }, (resposta) => {
        let corpo = '';
        resposta.on('data', (chunk) => {
          corpo += chunk.toString();
        });

        resposta.on('end', () => {
          if (resposta.statusCode < 200 || resposta.statusCode >= 300) {
            tentarProximo();
            return;
          }

          let dados = null;
          try {
            dados = JSON.parse(corpo);
          } catch (erro) {
            dados = { raw: corpo };
          }

          if (manual || pareceDeviceAC(dados)) {
            resolve({ ip, endpoint, dados, manual });
            return;
          }

          tentarProximo();
        });
      });

      pedido.on('error', () => tentarProximo());
      pedido.on('timeout', () => {
        pedido.destroy();
        tentarProximo();
      });
    }

    tentarProximo();
  });
}

async function procurarDeviceAC(ipManual = null) {
  if (ipManual) {
    const encontrado = await verificarDispositivo(ipManual, true);
    return encontrado || null;
  }

  const subredes = coletarSubredes();
  const tentativas = [];
  const listaUnica = [...new Set(subredes)];

  for (const ip of listaUnica) {
    tentativas.push(verificarDispositivo(ip));
  }

  const resultados = await Promise.all(tentativas);
  const encontrado = resultados.find(Boolean);
  return encontrado || null;
}

const servidor = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const caminho = url.pathname;

  if (caminho === '/api/ac/status') {
    enviarJSON(res, 200, { status: estadoAtual, device: 'local-backend' });
    return;
  }

  if (caminho === '/api/ac/control') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const novoEstado = payload.power === 'on' ? 'on' : 'off';
        estadoAtual = novoEstado;
        enviarJSON(res, 200, { status: estadoAtual });
      } catch (erro) {
        enviarJSON(res, 400, { erro: 'Payload inválido' });
      }
    });
    return;
  }

  if (caminho === '/api/ac/scan') {
    const ipManual = url.searchParams.get('ip');
    const encontrado = await procurarDeviceAC(ipManual || null);
    if (encontrado) {
      enviarJSON(res, 200, { device: encontrado });
      return;
    }

    enviarJSON(res, 404, { device: null, mensagem: 'Nenhum ar-condicionado encontrado' });
    return;
  }

  if (caminho === '/' || caminho === '/index.html') {
    servirArquivo(res, 'index.html');
    return;
  }

  const arquivo = caminho === '/' ? 'index.html' : caminho.replace(/^\//, '');
  servirArquivo(res, arquivo);
});

servidor.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor local pronto em http://localhost:${PORT}`);
  console.log(`Também acessível na rede local na porta ${PORT}`);
});
