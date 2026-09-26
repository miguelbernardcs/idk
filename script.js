// ===== CONFIGURAÇÃO (personalize aqui) =====
import { initializeApp } from "firebase/app";
import {
    getDatabase, ref, push, onChildAdded,
    get, set, child, update, onValue
} from "firebase/database";

const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "meu-chat.firebaseapp.com",
    databaseURL: "https://meu-chat-default-rtdb.firebaseio.com",
    projectId: "meu-chat",
    storageBucket: "meu-chat.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};

// ⬇️ PERSONALIZE AQUI
const NOME_DO_CHAT = "Meu Chat";
const EMOJI = "💬";
const GRUPOS = ["Geral", "Trabalho", "Estudos", "Família"];

// ===== APLICAR PERSONALIZAÇÃO =====
document.getElementById("tituloChat").textContent = NOME_DO_CHAT;
document.getElementById("tituloChatHeader").textContent = NOME_DO_CHAT;
document.querySelector(".logo").textContent = EMOJI;
document.title = NOME_DO_CHAT;

// ===== ESTADO =====
let nome = "";
let grupoAtual = "";
let recebendoHistorico = true;
let meusAmigos = [];
let db, messagesRef, usuariosRef, amigosRef;
let unsubChat = null;
let unsubAmigos = null;

// ===== ELEMENTOS =====
const $nome       = document.getElementById("telaNome");
const $criarSenha = document.getElementById("telaCriarSenha");
const $senha      = document.getElementById("telaSenha");
const $grupos     = document.getElementById("telaGrupos");
const $chat       = document.getElementById("telaChat");
const $msgs       = document.getElementById("mensagens");
const $entrada    = document.getElementById("entrada");
const $painelAmigos = document.getElementById("painelAmigos");

// ===== INICIALIZAÇÃO =====
const app = initializeApp(firebaseConfig);
db = getDatabase(app);
messagesRef = ref(db, "messages");
usuariosRef = ref(db, "usuarios");
amigosRef = ref(db, "amigos");

// ===== 1º PASSO: NOME =====
async function confirmarNome() {
    const nomeInput = document.getElementById("inputNome").value.trim();
    const erro = document.getElementById("erroNome");

    if (!nomeInput) {
        erro.textContent = "Digite um nome.";
        return;
    }

    nome = nomeInput;
    const snapshot = await get(child(usuariosRef, nome));

    if (snapshot.exists()) {
        document.getElementById("nomeSenha").textContent = nome;
        $nome.classList.add("oculto");
        $senha.classList.remove("oculto");
        document.getElementById("inputSenha").focus();
    } else {
        document.getElementById("nomeCriar").textContent = nome;
        $nome.classList.add("oculto");
        $criarSenha.classList.remove("oculto");
        document.getElementById("inputNovaSenha").focus();
    }
}

document.getElementById("inputNome").addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmarNome();
});

// ===== 2A: CRIAR SENHA =====
async function criarSenha() {
    const nova = document.getElementById("inputNovaSenha").value;
    const confirmar = document.getElementById("inputConfirmarSenha").value;
    const erro = document.getElementById("erroCriarSenha");

    if (nova.length < 4) {
        erro.textContent = "Mínimo 4 caracteres.";
        return;
    }
    if (nova !== confirmar) {
        erro.textContent = "As senhas não conferem.";
        return;
    }

    await set(child(usuariosRef, nome), { senha: nova });
    mostrarGrupos();
}

document.getElementById("inputNovaSenha").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("inputConfirmarSenha").focus();
});
document.getElementById("inputConfirmarSenha").addEventListener("keydown", (e) => {
    if (e.key === "Enter") criarSenha();
});

// ===== 2B: DIGITAR SENHA =====
async function confirmarSenha() {
    const digitada = document.getElementById("inputSenha").value;
    const erro = document.getElementById("erroSenha");

    const snapshot = await get(child(usuariosRef, nome));
    if (!snapshot.exists()) {
        erro.textContent = "Nome não encontrado.";
        return;
    }

    if (digitada === snapshot.val().senha) {
        mostrarGrupos();
    } else {
        erro.textContent = "Senha incorreta.";
    }
}

document.getElementById("inputSenha").addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmarSenha();
});

// ===== 3º PASSO: GRUPO =====
function mostrarGrupos() {
    $criarSenha.classList.add("oculto");
    $senha.classList.add("oculto");
    $grupos.classList.remove("oculto");
    renderizarGrupos();
}

function renderizarGrupos() {
    const lista = document.getElementById("listaGrupos");
    lista.innerHTML = "";
    GRUPOS.forEach((g) => {
        const btn = document.createElement("button");
        btn.className = "btn-grupo";
        btn.textContent = g;
        btn.onclick = () => entrarNoGrupo(g);
        lista.appendChild(btn);
    });
}

function entrarNoGrupo(grupo) {
    grupoAtual = grupo;
    $grupos.classList.add("oculto");
    $chat.classList.remove("oculto");
    document.getElementById("meuNome").textContent = `${nome} • ${grupo}`;
    document.getElementById("tituloChatHeader").textContent = grupo;
    $entrada.focus();
    iniciarChat();
    carregarAmigos();
}

function mudarGrupo() {
    $chat.classList.add("oculto");
    $grupos.classList.remove("oculto");
    renderizarGrupos();
}

// ===== AMIGOS =====
function carregarAmigos() {
    if (unsubAmigos) unsubAmigos();

    const meuAmigosRef = child(amigosRef, nome);
    unsubAmigos = onValue(meuAmigosRef, (snapshot) => {
        const dados = snapshot.val();
        meusAmigos = dados ? Object.keys(dados) : [];
        renderizarListaAmigos();
    });
}

function renderizarListaAmigos() {
    const lista = document.getElementById("listaAmigos");
    lista.innerHTML = "";

    if (meusAmigos.length === 0) {
        lista.innerHTML = `<p style="color:var(--texto-suave);font-size:0.85rem;">Nenhum amigo ainda.</p>`;
        return;
    }

    meusAmigos.forEach((amigo) => {
        const div = document.createElement("div");
        div.className = "amigo-item";
        div.innerHTML = `<span>⭐ ${amigo}</span>
                         <button class="remover" onclick="removerAmigo('${amigo}')">✕</button>`;
        lista.appendChild(div);
    });
}

function abrirAmigos() {
    $painelAmigos.classList.remove("oculto");
    carregarAmigos();
}

function fecharAmigos() {
    $painelAmigos.classList.add("oculto");
    if (unsubAmigos) { unsubAmigos(); unsubAmigos = null; }
}

async function adicionarAmigo() {
    const nomeAmigo = document.getElementById("inputAmigo").value.trim();
    if (!nomeAmigo) return;

    if (nomeAmigo === nome) {
        alert("Não pode adicionar a si mesmo.");
        return;
    }

    const meuAmigosRef = child(amigosRef, nome);
    await update(meuAmigosRef, { [nomeAmigo]: true });
    document.getElementById("inputAmigo").value = "";
}

async function removerAmigo(nomeAmigo) {
    const meuAmigosRef = child(amigosRef, nome);
    await update(meuAmigosRef, { [nomeAmigo]: null });
}

document.getElementById("inputAmigo").addEventListener("keydown", (e) => {
    if (e.key === "Enter") adicionarAmigo();
});

// ===== CHAT (corrigido) =====
function iniciarChat() {
    if (unsubChat) unsubChat();

    $msgs.innerHTML = `<div class="msg-sistema" id="placeholder">
        <span>👋</span><p>Bem-vindo! Suas mensagens aparecerão aqui.</p>
    </div>`;
    recebendoHistorico = true;

    unsubChat = onChildAdded(messagesRef, (snapshot) => {
        const dados = snapshot.val();
        if (dados.grupo === grupoAtual) {
            renderizarMensagem(dados);
        }
    });
}

function renderizarMensagem(dados) {
    const placeholder = document.getElementById("placeholder");
    if (placeholder) placeholder.remove();

    const div = document.createElement("div");
    const ehAmigo = meusAmigos.includes(dados.nome);
    const badge = ehAmigo ? `<span class="amigo-badge">⭐</span>` : "";

    if (dados.tipo === "imagem") {
        div.className = `msg ${dados.nome === nome ? "msg-propria" : "msg-outra"}`;
        div.innerHTML = `<div class="msg-autor">${dados.nome}${badge}</div>
                         <img class="msg-img" src="${dados.base64}" alt="imagem">`;
    } else if (dados.tipo === "texto") {
        div.className = `msg ${dados.nome === nome ? "msg-propria" : "msg-outra"}`;
        div.innerHTML = `<div class="msg-autor">${dados.nome}${badge}</div>
                         <div class="msg-texto">${escapeHtml(dados.texto)}</div>`;
    } else {
        div.className = "msg-sistema";
        div.textContent = dados;
    }

    if (recebendoHistorico) div.classList.add("historico");
    $msgs.appendChild(div);
    $msgs.scrollTop = $msgs.scrollHeight;

    if (recebendoHistorico && $msgs.children.length >= 5) {
        recebendoHistorico = false;
    }
}

function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

// ===== ENVIAR =====
function enviar() {
    const texto = $entrada.value.trim();
    if (!texto) return;
    push(messagesRef, {
        tipo: "texto", nome, texto,
        grupo: grupoAtual,
        timestamp: Date.now()
    });
    $entrada.value = "";
}

function enviarImagem(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        push(messagesRef, {
            tipo: "imagem", nome, base64: e.target.result,
            grupo: grupoAtual,
            timestamp: Date.now()
        });
    };
    reader.readAsDataURL(file);
    inputEl.value = "";
}

$entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enviar();
});   
