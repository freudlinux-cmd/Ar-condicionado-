# Ar condicionado do Freud

Projeto simples para controlar um ar-condicionado via interface web local, com backend em Node.js.

## Visão geral

Este projeto foi pensado como uma interface local para ligar e desligar um ar-condicionado, com tentativa de detecção na rede local e fallback seguro por backend.

## Funcionalidades

- interface em HTML/CSS/JS
- busca de dispositivos na rede local
- suporte a IP manual do ar-condicionado
- backend em Node.js para evitar problemas de CORS
- status visual na tela
- botão de ligar/desligar

## Estrutura do projeto

- `index.html` — interface principal
- `style.css` — estilos da página
- `script.js` — lógica do frontend
- `server.js` — servidor local em Node
- `package.json` — scripts do projeto

## Como executar

1. Abra o terminal na pasta do projeto.
2. Instale as dependências, se necessário.
3. Inicie o backend:

```bash
npm start
```

4. Acesse no navegador:

```bash
http://localhost:3002
```

## Observações importantes

Este projeto funciona como uma interface local para dispositivos que realmente exponham algum tipo de API HTTP na rede e estejam conectados à mesma rede do computador.

Nem todos os ar-condicionados LG ou de outras marcas expõem essa API de forma pública e acessível, então o reconhecimento depende do aparelho e da configuração da rede.

## Tecnologias

- HTML
- CSS
- JavaScript
- Node.js

## Licença

Este projeto é apenas para uso educacional e demonstração.
