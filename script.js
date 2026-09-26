// ===== CONFIGURAÇÃO =====
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onChildAdded, query, orderByChild, limitToLast } from "firebase/database";

const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "meu-chat.firebaseapp.com",
    databaseURL: "https://meu-chat-default-rtdb.firebaseio.com",
    projectId: "meu-chat",
    storageBucket: "meu-chat.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};

const SENHA = "minhasenha123";

// ===== ESTADO =====
let nome = "";
let recebendoHistorico = true;
let db, messagesRef;

// ===== ELEMENTOS =====
const $login   = document.getElementById("telaLogin");
const $nome    = document.getElementById("telaNome");
const $chat    = document.getElementById("telaChat");
const $msgs    = document.getElementById("mensagens");
const $entrada = document.getElementById("entrada");

// ===== LOGIN =====
function tentarLogin() {
    const senha = document.getElementById("inputSenha").value;
    const erro = document.getElementById("erroLogin");

    if (senha === SENHA) {
        $login.classList.add("oculto");
        $nome.classList.remove("oculto");
        document.getElementById("inputNome").focus();
    } else {
        erro.textContent = "Senha incorreta. Tente novamente.";
    }
}

document.getElementById("inputSenha").addEventListener("keydown", (e) => {
    if (e.key === "Enter") tentarLogin();
});

// ===== NOME =====
async function confirmarNome() {
    const nomeInput = document.getElementById("inputNome").value.trim();
    const erro = document.getElementById("erroNome");

    if (!nomeInput) {
        erro.textContent = "Digite um nome.";
        return;
    }

    // Verifica se o nome já foi usado
    const jaUsado = await verificarNome(nomeInput);
    if (jaUsado) {
        const s = prompt(`⚠️ "${nomeInput}" já está em uso.\nDigite a senha para usar o mesmo nome:`);
        if (s !== SENHA) {
            erro.textContent = "Nome em uso. Escolha outro ou digite a senha.";
            return;
        }
    }

    nome = nomeInput;
    document.getElementById("meuNome").textContent = nome;
    $nome.classList.add("oculto");
    $chat.classList.remove("oculto");
    $entrada.focus();
    iniciarChat();
}

document.getElementById("inputNome").addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmarNome();
});

async function verificarNome(nomeCandidato) {
    return new Promise((resolve) => {
        const q = query(messagesRef, orderByChild("nome"), limitToLast(20));
        let encontrado = false;
        const unsub = onChildAdded(q, (snapshot) => {
            if (snapshot.val().nome === nomeCandidato) encontrado = true;
        });
        setTimeout(() => { unsub(); resolve(encontrado); }, 800);
    });
}

// ===== CHAT =====
function iniciarChat() {
    onChildAdded(messagesRef, (snapshot) => {
        const dados = snapshot.val();
        renderizarMensagem(dados);
    });
}

function renderizarMensagem(dados) {
    // Remove placeholder
    const placeholder = document.getElementById("placeholder");
    if (placeholder) placeholder.remove();

    const div = document.createElement("div");

    if (dados.tipo === "imagem") {
        div.className = `msg ${dados.nome === nome ? "msg-propria" : "msg-outra"}`;
        div.innerHTML = `<div class="msg-autor">${dados.nome}</div>
                         <img class="msg-img" src="${dados.base64}" alt="imagem">`;
    } else if (dados.tipo === "texto") {
        div.className = `msg ${dados.nome === nome ? "msg-propria" : "msg-outra"}`;
        div.innerHTML = `<div class="msg-autor">${dados.nome}</div>
                         <div class="msg-texto">${escapeHtml(dados.texto)}</div>`;
    } else {
        // Mensagem de sistema (entrou/saiu)
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
        tipo: "texto",
        nome: nome,
        texto: texto,
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
            tipo: "imagem",
            nome: nome,
            base64: e.target.result,
            timestamp: Date.now()
        });
    };
    reader.readAsDataURL(file);
    inputEl.value = "";
}

$entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enviar();
});

// ===== INICIALIZAÇÃO =====
const app = initializeApp(firebaseConfig);
db = getDatabase(app);
messagesRef = ref(db, "messages");   
