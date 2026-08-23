const ligarButton = document.getElementById('ligar');
const desligarButton = document.getElementById('desligar');
const statusElement = document.getElementById('status-ac');
const ipInput = document.getElementById('ac-ip');
const buscarIpButton = document.getElementById('buscar-ip');

const BACKEND_URLS = ['http://localhost:3002', 'http://127.0.0.1:3002'];

function atualizarStatus(texto, tipo = 'info') {
  if (!statusElement) return;
  statusElement.textContent = texto;
  statusElement.style.color = tipo === 'erro' ? '#ffd6d6' : '#ffffff';
}

async function fetchJson(url, options = {}, allowFailure = false) {
  const resposta = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const texto = await resposta.text();
  let dados = {};

  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch (erro) {
      dados = { raw: texto };
    }
  }

  if (!resposta.ok && !allowFailure) {
    throw new Error(`HTTP ${resposta.status}`);
  }

  return dados;
}

async function resolverBackend() {
  for (const base of BACKEND_URLS) {
    try {
      const resposta = await fetchJson(`${base}/api/ac/status`, { method: 'GET' }, true);
      if (resposta && resposta.status) {
        return base;
      }
    } catch (erro) {
      // tenta o próximo endereço
    }
  }

  return null;
}

async function buscarArCondicionado(ipManual = null) {
  const backendUrl = await resolverBackend();
  if (!backendUrl) {
    atualizarStatus('Backend local indisponível. Rode o servidor em http://localhost:3002.', 'erro');
    return null;
  }

  try {
    const url = ipManual ? `${backendUrl}/api/ac/scan?ip=${encodeURIComponent(ipManual)}` : `${backendUrl}/api/ac/scan`;
    const resposta = await fetchJson(url, { method: 'GET' }, true);
    if (resposta && resposta.device) {
      atualizarStatus(`Ar-condicionado encontrado em ${resposta.device.ip}`);
      return resposta.device;
    }

    if (resposta && resposta.mensagem) {
      atualizarStatus(resposta.mensagem, 'erro');
      return null;
    }

    atualizarStatus('Nenhum ar-condicionado respondeu na rede local.', 'erro');
    return null;
  } catch (erro) {
    atualizarStatus('Não foi possível consultar o backend local.', 'erro');
    return null;
  }
}

async function enviarComando(estado) {
  const backendUrl = await resolverBackend();
  if (!backendUrl) {
    atualizarStatus('Backend local indisponível. Rode o servidor em http://localhost:3002.', 'erro');
    return false;
  }

  try {
    const resposta = await fetchJson(`${backendUrl}/api/ac/control`, {
      method: 'POST',
      body: JSON.stringify({ power: estado ? 'on' : 'off' })
    });

    if (resposta && resposta.status) {
      atualizarStatus(`Ligado: ${resposta.status === 'on' ? 'Ligado' : 'Desligado'}`);
      return true;
    }

    atualizarStatus('Comando enviado, mas o backend respondeu sem status.', 'erro');
    return false;
  } catch (erro) {
    atualizarStatus('Não foi possível enviar o comando. Verifique se o backend está em http://localhost:3002.', 'erro');
    return false;
  }
}

async function ligarArCondicionado() {
  await enviarComando(true);
}

async function desligarArCondicionado() {
  await enviarComando(false);
}

ligarButton?.addEventListener('click', ligarArCondicionado);
desligarButton?.addEventListener('click', desligarArCondicionado);
buscarIpButton?.addEventListener('click', () => {
  const ip = ipInput?.value?.trim();
  if (!ip) {
    atualizarStatus('Informe o IP do ar-condicionado.', 'erro');
    return;
  }

  buscarArCondicionado(ip);
});

buscarArCondicionado();
