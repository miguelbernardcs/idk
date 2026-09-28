import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getDatabase, ref, push, onChildAdded, 
    get, set, child, update, onValue, query, orderByChild, equalTo, remove, onDisconnect 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCxH1cHvQGzclxy82xTLylyt_s1hm63E84",
    authDomain: "whattsapp-2-d75f2.firebaseapp.com",
    databaseURL: "https://whattsapp-2-d75f2-default-rtdb.firebaseio.com",
    projectId: "whattsapp-2-d75f2",
    storageBucket: "whattsapp-2-d75f2.firebasestorage.app",
    messagingSenderId: "381309225011",
    appId: "1:381309225011:web:a0559ccbc8ee592c707b46",
    measurementId: "G-MQ374PRBNE"
};

// CORTAR A PARTIR DAQUI (LINHA 16):
const NOME_DO_CHAT = "PoĹux";
// Guardamos o código do seu SVG nesta variável:
const LOGO_SVG = 'data:image/svg+xml,<svg xmlns="http://w3.org" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌟</text></svg>';
let GRUPOS = ["Geral", "Trabalho", "Estudos", "Família"];


document.getElementById("tituloChat").textContent = NOME_DO_CHAT;
document.getElementById("tituloChatHeaderSidebar").textContent = NOME_DO_CHAT;
document.querySelector(".logo").textContent = LOGO_SVG;
document.title = NOME_DO_CHAT;
// APAGAR ATÉ AQUI (LINHA 31)


let idConta = localStorage.getItem("chat_id_conta") || "";
let nome = "";
let grupoAtual = "";
let recebendoHistorico = true;
let meusAmigos = [];
let mensagensNaoLidas = {};
let db, messagesRef, usuariosRef, amigosRef, canaisRef, presencaRef;
let unsubChat = null;
let unsubAmigos = null;
let unsubGlobalNotif = null;

const $nome = document.getElementById("telaNome");
const $criarSenha = document.getElementById("telaCriarSenha");
const $senha = document.getElementById("telaSenha");
const $appContainer = document.getElementById("appContainer");
const $msgs = document.getElementById("mensagens");
const $entrada = document.getElementById("entrada");
const $painelAmigos = document.getElementById("painelAmigos");

const app = initializeApp(firebaseConfig);
db = getDatabase(app);
messagesRef = ref(db, "messages");
usuariosRef = ref(db, "usuarios");
amigosRef = ref(db, "amigos");
canaisRef = ref(db, "canais");
presencaRef = ref(db, "presenca");

window.addEventListener("DOMContentLoaded", async () => {
    if (window.innerWidth <= 768) {
        const btnMenu = document.getElementById("btnMenuMobile");
        if (btnMenu) btnMenu.style.display = "block";
    }
    if (idConta) {
        try {
            const snapshot = await get(child(usuariosRef, idConta));
            if (snapshot.exists()) {
                const dadosUser = snapshot.val();
                nome = dadosUser.nome;
                mostrarGrupos();
            } else {
                localStorage.removeItem("chat_id_conta");
                idConta = "";
            }
        } catch (e) {
            nome = localStorage.getItem("chat_nome_cache") || "";
            if (nome) mostrarGrupos();
        }
    }
});

let modalCallback = null;

function abrirModalPersonalizado({ icone, titulo, mensagem, tipo, placeholder = "" }) {
    return new Promise((resolve) => {
        const modal = document.getElementById("modalCustomizado");
        if (!modal) { resolve(tipo === "prompt" ? "" : true); return; }
        
        document.getElementById("modalIcone").textContent = icone || "💬";
        document.getElementById("modalTitulo").textContent = titulo;
        document.getElementById("modalMensagem").textContent = mensagem;
        
        const input = document.getElementById("modalInput");
        const btnCancelar = document.getElementById("modalBtnCancelar");
        
        if (tipo === "prompt") {
            input.classList.remove("oculto");
            input.value = "";
            input.placeholder = placeholder;
            btnCancelar.classList.remove("oculto");
            setTimeout(() => input.focus(), 50);
        } else if (tipo === "confirm") {
            input.classList.add("oculto");
            btnCancelar.classList.remove("oculto");
        } else {
            input.classList.add("oculto");
            btnCancelar.classList.add("oculto");
        }

        modal.classList.remove("oculto");
        modalCallback = resolve;
    });
}

window.fecharModalCustomizado = function(resultado) {
    const modal = document.getElementById("modalCustomizado");
    const input = document.getElementById("modalInput");
    
    let valor = true;
    if (input && !input.classList.contains("oculto")) {
        valor = resultado ? input.value : null;
    } else {
        valor = resultado;
    }

    if (modal) modal.classList.add("oculto");
    if (modalCallback) {
        modalCallback(valor);
        modalCallback = null;
    }
};

window.atualizarFotoPerfil = async function(inputEl) {
    const file = inputEl.files[0];
    if (!file || !idConta) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Foto = e.target.result;
        try {
            await update(child(usuariosRef, idConta), { fotoPerfil: base64Foto });
            aplicarFotoPerfilNaInterface(base64Foto);
            await abrirModalPersonalizado({ icone: "✅", titulo: "Sucesso", mensagem: "Foto de perfil atualizada!", tipo: "alert" });
        } catch (err) {
            await abrirModalPersonalizado({ icone: "❌", titulo: "Erro", mensagem: "Não foi possível atualizar a foto.", tipo: "alert" });
        }
    };
    reader.readAsDataURL(file);
    inputEl.value = "";
};

function aplicarFotoPerfilNaInterface(base64) {
    const imgEl = document.getElementById("minhaFotoPerfil");
    const placeholderEl = document.getElementById("minhaFotoPlaceholder");
    if (imgEl && placeholderEl) {
        if (base64) {
            imgEl.src = base64;
            imgEl.classList.remove("oculta", "oculto");
            placeholderEl.classList.add("oculta", "oculto");
        } else {
            imgEl.classList.add("oculto");
            placeholderEl.classList.remove("oculto");
        }
    }
}

window.abrirMenuConta = async function() {
    const escolha = await abrirModalPersonalizado({
        icone: "⚙️",
        titulo: "Opções de Conta",
        mensagem: "Escolhe uma opção:\n1. Digita 'Mudar' para alterar o teu nome\n2. Digita 'Deletar' para apagar a tua conta",
        tipo: "prompt",
        placeholder: "Mudar ou Deletar"
    });

    if (!escolha) return;
    const op = escolha.trim().toLowerCase();

    if (op === "mudar") {
        const novoNomeInput = await abrirModalPersonalizado({
            icone: "✏️",
            titulo: "Mudar Nome de Utilizador",
            mensagem: "Digite o novo nome pretendido:",
            tipo: "prompt",
            placeholder: "Novo nome..."
        });

        if (!novoNomeInput || !novoNomeInput.trim()) return;
        const novoNome = novoNomeInput.trim().toLowerCase();

        if (novoNome === nome) {
            await abrirModalPersonalizado({ icone: "⚠️", titulo: "Aviso", mensagem: "Esse já é o teu nome atual.", tipo: "alert" });
            return;
        }

        try {
            const snapTodos = await get(usuariosRef);
            let emUso = false;
            if (snapTodos.exists()) {
                snapTodos.forEach((childSnap) => {
                    if (childSnap.key !== idConta && childSnap.val().nome === novoNome) {
                        emUso = true;
                    }
                });
            }

            if (emUso) {
                await abrirModalPersonalizado({ icone: "❌", titulo: "Indisponível", mensagem: "Este nome já está em uso por outro utilizador!", tipo: "alert" });
                return;
            }

            await remove(child(presencaRef, nome));
            await update(child(usuariosRef, idConta), { nome: novoNome });
            
            nome = novoNome;
            localStorage.setItem("chat_nome_cache", nome);
            const meuNomeEl = document.getElementById("meuNome");
            if (meuNomeEl) meuNomeEl.textContent = `${nome} ⚙️`;
            
            await abrirModalPersonalizado({ icone: "✅", titulo: "Sucesso", mensagem: "Nome alterado com sucesso!", tipo: "alert" });
            location.reload();
        } catch (e) {
            await abrirModalPersonalizado({ icone: "❌", titulo: "Erro", mensagem: "Erro ao atualizar o nome.", tipo: "alert" });
        }

    } else if (op === "deletar") {
        const confirmarDel = await abrirModalPersonalizado({
            icone: "⚠️",
            titulo: "Eliminar Conta",
            mensagem: "Tens a certeza absoluta? Esta ação apaga os teus dados de acesso permanentemente.",
            tipo: "confirm"
        });

        if (confirmarDel) {
            try {
                await remove(child(usuariosRef, idConta));
                await remove(child(amigosRef, idConta));
                await remove(child(presencaRef, nome));
                localStorage.removeItem("chat_id_conta");
                localStorage.removeItem("chat_nome_cache");
                await abrirModalPersonalizado({ icone: "🗑️", titulo: "Conta Apagada", mensagem: "A tua conta foi eliminada.", tipo: "alert" });
                location.reload();
            } catch (e) {
                await abrirModalPersonalizado({ icone: "❌", titulo: "Erro", mensagem: "Erro ao eliminar a conta.", tipo: "alert" });
            }
        }
    }
};

window.toggleSidebar = function() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.toggle("ativa");
};

window.alternarTema = function() {
    document.body.classList.toggle("light-theme");
};

window.sairDaConta = function() {
    localStorage.removeItem("chat_id_conta");
    localStorage.removeItem("chat_nome_cache");
    location.reload();
};

function pedirPermissaoNotificacao() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function tocarSom() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
}

function mostrarNotificacao(titulo, corpo) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(titulo, { body: corpo });
    }
}

function notificar(dados) {
    if (dados.nome && dados.nome.toLowerCase() === nome) return;
    tocarSom();
    if (!document.hasFocus()) {
        const corpo = dados.tipo === "imagem"
            ? `${dados.nome} enviou uma imagem no grupo ${dados.grupo}`
            : `${dados.nome} (${dados.grupo}): ${dados.texto}`;
        mostrarNotificacao(NOME_DO_CHAT, corpo);
    }
}

function iniciarOuvinteGlobal() {
    if (unsubGlobalNotif) unsubGlobalNotif();
    unsubGlobalNotif = onChildAdded(messagesRef, (snapshot) => {
        const dados = snapshot.val();
        if (!dados || !dados.grupo) return;
        if (dados.nome && dados.nome.toLowerCase() !== nome && dados.grupo !== grupoAtual) {
            mensagensNaoLidas[dados.grupo] = true;
            carregarCanaisDinâmicos();
        }
        notificar(dados);
    });
}

window.confirmarNome = async function() {
    const inputEl = document.getElementById("inputNome");
    const erro = document.getElementById("erroNome");
    if (!inputEl) return;
    const nomeInput = inputEl.value.trim();
    if (!nomeInput) { if (erro) erro.textContent = "Digite um nome."; return; }
    const nomeProcurado = nomeInput.toLowerCase();

    try {
        const snapshot = await get(usuariosRef);
        let contaEncontradaId = null;

        if (snapshot.exists()) {
            snapshot.forEach((childSnap) => {
                if (childSnap.val().nome === nomeProcurado) {
                    contaEncontradaId = childSnap.key;
                }
            });
        }

        if (contaEncontradaId) {
            idConta = contaEncontradaId;
            nome = nomeProcurado;
            const nomeSenhaEl = document.getElementById("nomeSenha");
            if (nomeSenhaEl) nomeSenhaEl.textContent = nomeInput;
            if ($nome)$nome.classList.add("oculto");
            if ($senha)$senha.classList.remove("oculto");
            const inputSenha = document.getElementById("inputSenha");
            if (inputSenha) inputSenha.focus();
        } else {
            window.tempNovoNome = nomeProcurado;
            const nomeCriarEl = document.getElementById("nomeCriar");
            if (nomeCriarEl) nomeCriarEl.textContent = nomeInput;
            if ($nome)$nome.classList.add("oculto");
            if ($criarSenha)$criarSenha.classList.remove("oculto");
            const inputNovaSenha = document.getElementById("inputNovaSenha");
            if (inputNovaSenha) inputNovaSenha.focus();
        }
    } catch (e) {
        if (erro) erro.textContent = "Erro de conexão.";
    }
};

window.criarSenha = async function() {
    const nova = document.getElementById("inputNovaSenha")?.value || "";
    const confirmar = document.getElementById("inputConfirmarSenha")?.value || "";
    const erro = document.getElementById("erroCriarSenha");
    if (nova.length < 4) { if (erro) erro.textContent = "Mínimo 4 caracteres."; return; }
    if (nova !== confirmar) { if (erro) erro.textContent = "As senhas não conferem."; return; }

    try {
        const novoRef = push(usuariosRef);
        idConta = novoRef.key;
        nome = window.tempNovoNome;

        await set(novoRef, { nome: nome, senha: nova, fotoPerfil: "" });
        localStorage.setItem("chat_id_conta", idConta);
        localStorage.setItem("chat_nome_cache", nome);
        mostrarGrupos();
    } catch (e) { if (erro) erro.textContent = "Erro ao salvar."; }
};

window.confirmarSenha = async function() {
    const digitada = document.getElementById("inputSenha")?.value || "";
    const erro = document.getElementById("erroSenha");
    try {
        const snapshot = await get(child(usuariosRef, idConta));
        if (!snapshot.exists()) { if (erro) erro.textContent = "Conta não encontrada."; return; }
        if (digitada === snapshot.val().senha) {
            nome = snapshot.val().nome;
            localStorage.setItem("chat_id_conta", idConta);
            localStorage.setItem("chat_nome_cache", nome);
            mostrarGrupos();
        } else { if (erro) erro.textContent = "Senha incorreta."; }
    } catch (e) { if (erro) erro.textContent = "Erro."; }
};

document.getElementById("inputNome")?.addEventListener("keydown", (e) => { if (e.key === "Enter") window.confirmarNome(); });
document.getElementById("inputNovaSenha")?.addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("inputConfirmarSenha")?.focus(); });
document.getElementById("inputConfirmarSenha")?.addEventListener("keydown", (e) => { if (e.key === "Enter") window.criarSenha(); });
document.getElementById("inputSenha")?.addEventListener("keydown", (e) => { if (e.key === "Enter") window.confirmarSenha(); });

async function mostrarGrupos() {
    if ($nome)$nome.classList.add("oculto");
    if ($criarSenha)$criarSenha.classList.add("oculto");
    if ($senha)$senha.classList.add("oculto");
    if ($appContainer)$appContainer.classList.remove("oculto");
    
    const meuNomeEl = document.getElementById("meuNome");
    if (meuNomeEl) meuNomeEl.textContent = `${nome} ⚙️`;

    try {
        const snap = await get(child(usuariosRef, idConta));
        if (snap.exists() && snap.val().fotoPerfil) {
            aplicarFotoPerfilNaInterface(snap.val().fotoPerfil);
        }
    } catch (e) {}

    carregarCanaisDinâmicos();
    iniciarPresenca();
    iniciarOuvinteGlobal();
}

function carregarCanaisDinâmicos() {
    onValue(canaisRef, (snapshot) => {
        const customCanais = snapshot.val() ? Object.keys(snapshot.val()) : [];
        const todosCanais = [...new Set([...GRUPOS, ...customCanais])];
        renderizarListaCanais(todosCanais);
        if (!grupoAtual && todosCanais.length > 0) {
            entrarNoGrupo(todosCanais[0]);
        }
    });
}

function renderizarListaCanais(canais) {
    const lista = document.getElementById("listaGrupos");
    if (!lista) return;
    lista.innerHTML = "";
    canais.forEach((g) => {
        const btn = document.createElement("button");
        btn.className = "btn-grupo";
        if (g === grupoAtual) btn.classList.add("ativo");
        
        let htmlTexto = `<span># ${g}</span>`;
        if (mensagensNaoLidas[g] && g !== grupoAtual) {
            htmlTexto += `<span class="badge-novo">Novo</span>`;
        }
        btn.innerHTML = htmlTexto;
        btn.onclick = () => {
            entrarNoGrupo(g);
            if (window.innerWidth <= 768) toggleSidebar();
        };
        lista.appendChild(btn);
    });
}

window.abrirCriarCanal = async function() {
    const nomeNovo = await abrirModalPersonalizado({
        icone: "➕",
        titulo: "Criar Novo Canal",
        mensagem: "Digite o nome para o novo canal:",
        tipo: "prompt",
        placeholder: "Ex: Jogos, Filmes..."
    });

    if (!nomeNovo || !nomeNovo.trim()) return;
    const formatado = nomeNovo.trim().toLowerCase().replace(/\s+/g, '-');
    await set(child(canaisRef, formatado), true);
};

function entrarNoGrupo(grupo) {
    grupoAtual = grupo;
    const tituloHeader = document.getElementById("tituloChatHeader");
    if (tituloHeader) tituloHeader.textContent = `# ${grupo}`;
    mensagensNaoLidas[grupo] = false;
    carregarCanaisDinâmicos();
    if ($entrada)$entrada.focus();
    pedirPermissaoNotificacao();
    iniciarChat();
    carregarAmigos();
}

function iniciarPresenca() {
    const meuPresencaRef = child(presencaRef, nome);
    set(meuPresencaRef, "online");
    onDisconnect(meuPresencaRef).set("offline");
    
    onValue(presencaRef, (snapshot) => {
        const dados = snapshot.val() || {};
        const listaOnline = document.getElementById("listaOnline");
        if (!listaOnline) return;
        listaOnline.innerHTML = "";
        
        Object.keys(dados).forEach(u => {
            const status = dados[u];
            const div = document.createElement("div");
            div.className = "usuario-online-item";
            
            if (status === "online") {
                div.innerHTML = `<div class="ponto-verde"></div><span>${u}</span>`;
            } else {
                div.innerHTML = `<div class="ponto-vermelho"></div><span>${u} (offline)</span>`;
            }
            listaOnline.appendChild(div);
        });
    });
}

function carregarAmigos() {
    if (unsubAmigos) unsubAmigos();
    unsubAmigos = onValue(child(amigosRef, idConta), (snapshot) => {
        const dados = snapshot.val();
        meusAmigos = dados ? Object.keys(dados) : [];
        renderizarListaAmigos();
    });
}

function renderizarListaAmigos() {
    const lista = document.getElementById("listaAmigos");
    if (!lista) return;
    lista.innerHTML = "";
    if (meusAmigos.length === 0) {
        lista.innerHTML = `<p style="color:var(--texto-suave);font-size:0.85rem;">Nenhum amigo ainda.</p>`;
        return;
    }
    meusAmigos.forEach((amigo) => {
        const div = document.createElement("div");
        div.className = "amigo-item";
        div.innerHTML = `<span>⭐ ${escapeHtml(amigo)}</span>
                         <button class="remover" onclick="removerAmigo('${escapeHtml(amigo)}')">✕</button>`;
        lista.appendChild(div);
    });
}

window.abrirAmigos = () => { if ($painelAmigos)$painelAmigos.classList.remove("oculto"); carregarAmigos(); };
window.fecharAmigos = () => { if ($painelAmigos)$painelAmigos.classList.add("oculto"); if (unsubAmigos) { unsubAmigos(); unsubAmigos = null; } };

window.adicionarAmigo = async function() {
    const inputEl = document.getElementById("inputAmigo");
    if (!inputEl) return;
    const nomeAmigo = inputEl.value.trim().toLowerCase();
    if (!nomeAmigo) return;

    if (nomeAmigo === nome) {
        await abrirModalPersonalizado({ icone: "⚠️", titulo: "Aviso", mensagem: "Você não pode adicionar a si mesmo.", tipo: "alert" });
        return;
    }

    try {
        const snapshot = await get(usuariosRef);
        let existe = false;
        if (snapshot.exists()) {
            snapshot.forEach((childSnap) => {
                if (childSnap.val().nome === nomeAmigo) existe = true;
            });
        }

        if (!existe) {
            await abrirModalPersonalizado({ icone: "❌", titulo: "Erro", mensagem: "Este usuário não existe!", tipo: "alert" });
            return;
        }
        await update(child(amigosRef, idConta), { [nomeAmigo]: true });
        inputEl.value = "";
    } catch (e) {
        await abrirModalPersonalizado({ icone: "❌", titulo: "Erro", mensagem: "Erro ao verificar o usuário.", tipo: "alert" });
    }
};

window.removerAmigo = async (amigo) => {
    await update(child(amigosRef, idConta), { [amigo]: null });
};

document.getElementById("inputAmigo")?.addEventListener("keydown", (e) => { if (e.key === "Enter") window.adicionarAmigo(); });

function iniciarChat() {
    if (unsubChat) unsubChat();
    if ($msgs) {$msgs.innerHTML = `<div class="msg-sistema" id="placeholder"><span>👋</span><p>Bem-vindo ao canal #${escapeHtml(grupoAtual)}!</p></div>`;
    }
    recebendoHistorico = true;

    const mensagensGrupoQuery = query(messagesRef, orderByChild("grupo"), equalTo(grupoAtual));
    unsubChat = onChildAdded(mensagensGrupoQuery, async (snapshot) => {
        await renderizarMensagem(snapshot.key, snapshot.val());
    });
}

function formatarHora(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function buscarFotoUsuario(nomeUtilizador) {
    try {
        const snapshot = await get(usuariosRef);
        if (snapshot.exists()) {
            let foto = "";
            snapshot.forEach((childSnap) => {
                const dados = childSnap.val();
                if (dados.nome === nomeUtilizador && dados.fotoPerfil) {
                    foto = dados.fotoPerfil;
                }
            });
            return foto;
        }
    } catch (e) {}
    return "";
}

async function renderizarMensagem(idMsg, dados) {
    if (!$msgs) return;
    const placeholder = document.getElementById("placeholder");
    if (placeholder) placeholder.remove();
    if (document.getElementById(`msg-${idMsg}`)) return;

    const div = document.createElement("div");
    const autorMin = dados.nome ? dados.nome.toLowerCase() : "";
    const ehAmigo = meusAmigos.includes(autorMin);
    const badge = ehAmigo ? `<span class="amigo-badge">⭐</span>` : "";
    const nomeEscapado = escapeHtml(dados.nome);
    const inicial = dados.nome ? dados.nome.charAt(0).toUpperCase() : "?";
    const horaFormatada = formatarHora(dados.timestamp);
    const ehMinha = autorMin === nome;

    div.className = `msg ${ehMinha ? "msg-propria" : "msg-outra"}`;
    div.id = `msg-${idMsg}`;

    const fotoUrl = await buscarFotoUsuario(autorMin);
    let avatarHtml = `<div class="msg-avatar">${inicial}</div>`;
    if (fotoUrl) {
        avatarHtml = `<img class="msg-avatar-img" src="${fotoUrl}" alt="Avatar">`;
    }

    const cabecalhoHtml = `
        <div class="msg-cabecalho">
            ${avatarHtml}
            <div class="msg-autor">${nomeEscapado}${badge}</div>
            ${ehMinha ? `<button class="btn-apagar" onclick="apagarMensagem('${idMsg}')" title="Apagar">🗑️</button>` : ''}
        </div>
    `;

    if (dados.tipo === "imagem") {
        div.innerHTML = `${cabecalhoHtml}<img class="msg-img" src="${escapeHtml(dados.base64)}" alt="imagem"><div class="msg-hora">${horaFormatada}</div>`;
    } else if (dados.tipo === "texto") {
        div.innerHTML = `${cabecalhoHtml}<div class="msg-texto">${escapeHtml(dados.texto)}</div><div class="msg-hora">${horaFormatada}</div>`;
    } else {
        div.className = "msg-sistema";
        div.textContent = dados;
    }

    if (recebendoHistorico) div.classList.add("historico");
    $msgs.appendChild(div);
    $msgs.scrollTop =$msgs.scrollHeight;

    if (recebendoHistorico && $msgs.children.length >= 5) recebendoHistorico = false;
}

window.apagarMensagem = async function(idMsg) {
    const confirmar = await abrirModalPersonalizado({
        icone: "🗑️",
        titulo: "Apagar Mensagem",
        mensagem: "Tens a certeza que pretendes apagar esta mensagem?",
        tipo: "confirm"
    });

    if (confirmar) {
        try {
            await remove(child(messagesRef, idMsg));
            document.getElementById(`msg-${idMsg}`)?.remove();
        } catch (e) {
            console.error(e);
        }
    }
};

function escapeHtml(texto) {
    if (!texto) return "";
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

window.enviar = function() {
    if (!$entrada) return;
    const texto = $entrada.value.trim();
    if (!texto || !grupoAtual) return;
    push(messagesRef, { tipo: "texto", nome, texto, grupo: grupoAtual, timestamp: Date.now() });
    $entrada.value = "";
};

window.enviarImagem = function(inputEl) {
    const file = inputEl.files[0];
    if (!file || !grupoAtual) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        push(messagesRef, { tipo: "imagem", nome, base64: e.target.result, grupo: grupoAtual, timestamp: Date.now() });
    };
    reader.readAsDataURL(file);
    inputEl.value = "";
};

$entrada?.addEventListener("keydown", (e) => { if (e.key === "Enter") window.enviar(); });
