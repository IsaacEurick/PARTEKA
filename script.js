// URL do seu Google Apps Script (Webhook) atualizada
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxvLjJGRk7xXKLjNkBtexzcIxgVChFCC_aLOKbl3emJWstnz_kONVGN2UHp7T6mWW_NBg/exec';

const USERS_KEY = 'parteka_users';
const SESSION_KEY = 'parteka_logged_user';
const FUEL_KEY = 'parteka_fuel_records';
const VEHICLES_KEY = 'parteka_vehicles';
const POSTOS_KEY = 'parteka_postos';

// Função para buscar dados da nuvem em segundo plano
async function carregarDadosDaNuvem() {
    const abas = [
        { nome: 'veiculos', chave: VEHICLES_KEY },
        { nome: 'postos', chave: POSTOS_KEY },
        { nome: 'lancamentos', chave: FUEL_KEY },
        { nome: 'usuarios', chave: USERS_KEY }
    ];

    for (let aba of abas) {
        try {
            let resposta = await fetch(`${GOOGLE_SCRIPT_URL}?aba=${aba.nome}`);
            let dadosNuvem = await resposta.json();
            
            if (Array.isArray(dadosNuvem) && dadosNuvem.length > 0) {
                dadosNuvem = dadosNuvem.filter(item => item && (item.id !== undefined && item.id !== "" && item.id !== null));

                if (aba.nome === 'usuarios') {
                    let admExiste = dadosNuvem.some(u => Number(u.id) === 0);
                    if (!admExiste) {
                        dadosNuvem.unshift({
                            id: 0,
                            nome: "Administrador",
                            cpf: "000.000.000-00",
                            senha: "271281",
                            cargo: "👑 Dono",
                            aprovado: true
                        });
                    }
                }
                localStorage.setItem(aba.chave, JSON.stringify(dadosNuvem));
            }
        } catch (e) {
            console.error(`Erro ao carregar ${aba.nome} da nuvem:`, e);
        }
    }
}

// Botão de Sincronização na Tela de Login
async function recarregarDadosLogin() {
    const statusEl = document.getElementById('login-sync-status');
    if (statusEl) {
        statusEl.style.color = '#f59e0b';
        statusEl.innerText = '🔄 Atualizando dados da nuvem...';
    }

    try {
        await carregarDadosDaNuvem();
        if (statusEl) {
            statusEl.style.color = '#10b981';
            statusEl.innerText = '✅ Dados atualizados com sucesso!';
            setTimeout(() => { statusEl.innerText = ''; }, 3000);
        }
    } catch (e) {
        if (statusEl) {
            statusEl.style.color = '#ef4444';
            statusEl.innerText = '❌ Erro de conexão com a nuvem.';
        }
    }
}

// Botão de Sincronização Manual na Sidebar (Painel Interno)
async function sincronizarManualNuvem() {
    const statusEl = document.getElementById('sync-status');
    if (statusEl) {
        statusEl.style.color = '#f59e0b';
        statusEl.innerText = '🔄 Sincronizando...';
    }

    try {
        await carregarDadosDaNuvem();
        
        carregarTabelaAdm();
        carregarTabelaVeiculos();
        carregarTabelaPostos();
        carregarTabelaCombustivel();
        atualizarDatalists();

        if (statusEl) {
            statusEl.style.color = '#10b981';
            statusEl.innerText = '✅ Atualizado com sucesso!';
            setTimeout(() => { statusEl.innerText = ''; }, 3000);
        }
    } catch (e) {
        if (statusEl) {
            statusEl.style.color = '#ef4444';
            statusEl.innerText = '❌ Erro de conexão.';
        }
    }
}

// Sincronizar com a nuvem em segundo plano
async function sincronizarComNuvem(acao, aba, dados) {
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acao: acao, aba: aba, dados: dados })
        });
    } catch (erro) {
        console.error("Erro ao sincronizar com a nuvem:", erro);
    }
}

// Inicializar dados padrão e garantir o Administrador raiz com a senha 271281
function inicializarSistema() {
    let usuarios = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    let admIndex = usuarios.findIndex(u => Number(u.id) === 0);
    
    const adminPadrao = {
        id: 0,
        nome: "Administrador",
        cpf: "000.000.000-00",
        senha: "271281",
        cargo: "👑 Dono",
        aprovado: true
    };

    if (admIndex === -1) {
        usuarios.unshift(adminPadrao);
    } else {
        usuarios[admIndex].senha = "271281";
        usuarios[admIndex].nome = "Administrador";
        usuarios[admIndex].cargo = "👑 Dono";
        usuarios[admIndex].aprovado = true;
    }

    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
}

// Alternar entre as abas de Login e Cadastro de forma limpa
function switchTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const msg = document.getElementById('auth-msg');

    if (msg) msg.innerText = '';

    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();

    if (tab === 'login') {
        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
    } else {
        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabRegister) tabRegister.classList.add('active');
    }
}

function preencherPorId() {
    const idInput = document.getElementById('login-id');
    const nomeInput = document.getElementById('login-nome');
    if (!idInput || !nomeInput) return;

    const val = idInput.value.trim();
    if (val === "") {
        nomeInput.value = "";
        return;
    }

    const idNumerico = parseInt(val, 10);
    if (isNaN(idNumerico)) return;

    let usuarios = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const usuario = usuarios.find(u => Number(u.id) === idNumerico);

    if (usuario) {
        nomeInput.value = usuario.nome || "";
    } else {
        nomeInput.value = "";
    }
}

function preencherPorNome() {
    const nomeInput = document.getElementById('login-nome');
    const idInput = document.getElementById('login-id');
    if (!nomeInput || !idInput) return;

    const val = nomeInput.value.trim().toLowerCase();
    if (val === "") {
        idInput.value = "";
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const usuario = usuarios.find(u => u.nome && u.nome.toLowerCase() === val);

    if (usuario) {
        idInput.value = usuario.id !== undefined ? usuario.id : "";
    } else {
        idInput.value = "";
    }
}

function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11) return false;
    if (/^([0-9])\1+$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = 11 - (soma % 11);
    let digito1 = (resto === 10 || resto === 11) ? 0 : resto;
    if (digito1 !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = 11 - (soma % 11);
    let digito2 = (resto === 10 || resto === 11) ? 0 : resto;
    if (digito2 !== parseInt(cpf.charAt(10))) return false;

    return true;
}

// Cadastro blindado para celular e PC com ID Sequencial (1, 2, 3...)
async function fazerCadastro(event) {
    event.preventDefault();

    const nomeInput = document.getElementById('reg-nome');
    const cpfInput = document.getElementById('reg-cpf');
    const senhaInput = document.getElementById('reg-senha');
    const msg = document.getElementById('auth-msg');

    const nome = nomeInput ? nomeInput.value.trim() : '';
    const cpfBruto = cpfInput ? cpfInput.value.trim() : '';
    const senha = senhaInput ? senhaInput.value.trim() : '';

    const cpf = cpfBruto.replace(/\D/g, '');

    if (!validarCPF(cpf)) {
        if (msg) {
            msg.style.color = 'red';
            msg.innerText = 'Erro: O CPF digitado é inválido!';
        }
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const cpfExistente = usuarios.find(u => u.cpf && u.cpf.replace(/\D/g, '') === cpf);
    
    if (cpfExistente) {
        if (msg) {
            msg.style.color = 'red';
            msg.innerText = `Erro: Este CPF já está cadastrado no sistema!`;
        }
        return;
    }

    const idsValidos = usuarios.map(u => Number(u.id)).filter(id => !isNaN(id));
    const novoId = idsValidos.length > 0 ? Math.max(...idsValidos) + 1 : 1;

    const novoUsuario = {
        id: novoId,
        nome: nome,
        cpf: cpfBruto,
        senha: senha,
        cargo: "Aguardando Aprovação",
        aprovado: false,
        editando: false
    };

    usuarios.push(novoUsuario);
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    
    await sincronizarComNuvem('salvar', 'usuarios', novoUsuario);

    if (msg) {
        msg.style.color = 'green';
        msg.innerText = `Cadastro realizado com sucesso! Seu ID é: ${novoId}. Faça login após aprovação.`;
    }

    const regForm = document.getElementById('register-form');
    if (regForm) regForm.reset();
    setTimeout(() => switchTab('login'), 4000);
}

// Função de login protegida com trava absoluta contra autologin
function fazerLogin(event) {
    event.preventDefault();

    const idInput = document.getElementById('login-id');
    const nomeInput = document.getElementById('login-nome');
    const senhaInput = document.getElementById('login-senha');
    const msg = document.getElementById('auth-msg');

    const idVal = idInput ? idInput.value.trim() : '';
    const nomeVal = nomeInput ? nomeInput.value.trim() : '';
    const senhaVal = senhaInput ? senhaInput.value.trim() : '';

    if (idVal === "0" && senhaVal !== "271281") {
        if (msg) {
            msg.style.color = 'red';
            msg.innerText = 'Senha do Administrador incorreta!';
        }
        return;
    }

    if (senhaVal === "") {
        if (msg) {
            msg.style.color = 'red';
            msg.innerText = 'Digite a senha para entrar!';
        }
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    let usuarioEncontrado = null;

    if (idVal !== "") {
        const idNumerico = parseInt(idVal, 10);
        usuarioEncontrado = usuarios.find(u => Number(u.id) === idNumerico && String(u.senha) === String(senhaVal));
    } else if (nomeVal !== "") {
        usuarioEncontrado = usuarios.find(u => u.nome && u.nome.toLowerCase() === nomeVal.toLowerCase() && String(u.senha) === String(senhaVal));
    }

    if (!usuarioEncontrado) {
        if (msg) {
            msg.style.color = 'red';
            msg.innerText = 'ID, Nome ou senha incorretos!';
        }
        return;
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(usuarioEncontrado));
    verificarEstadoSessao();
}

function verificarEstadoSessao() {
    const usuarioLogado = JSON.parse(localStorage.getItem(SESSION_KEY));

    const authContainer = document.getElementById('auth-container');
    const waitingContainer = document.getElementById('waiting-container');
    const appContainer = document.getElementById('app-container');

    if (!usuarioLogado) {
        if (authContainer) authContainer.classList.remove('hidden');
        if (waitingContainer) waitingContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        return;
    }

    if (authContainer) authContainer.classList.add('hidden');

    const userIdNum = Number(usuarioLogado.id);
    if (userIdNum === 0 || usuarioLogado.aprovado === true || usuarioLogado.aprovado === "true") {
        if (waitingContainer) waitingContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        carregarPainelPrincipal(usuarioLogado);
    } else {
        if (waitingContainer) waitingContainer.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        const wName = document.getElementById('waiting-name');
        const wId = document.getElementById('waiting-id');
        if (wName) wName.innerText = usuarioLogado.nome || '';
        if (wId) wId.innerText = usuarioLogado.id || '';
    }
}

function carregarPainelPrincipal(user) {
    const dispName = document.getElementById('user-display-name');
    const dispId = document.getElementById('user-display-id');
    const dispCargo = document.getElementById('user-display-cargo');
    const welName = document.getElementById('welcome-name');

    if (dispName) dispName.innerText = user.nome || '';
    if (dispId) dispId.innerText = user.id !== undefined ? user.id : '';
    if (dispCargo) dispCargo.innerText = user.cargo || '';
    if (welName) welName.innerText = user.nome || '';

    const menuAdm = document.getElementById('menu-adm');
    const menuVeiculos = document.getElementById('menu-veiculos');
    const menuCombustivel = document.getElementById('menu-combustivel');
    const menuPostos = document.getElementById('menu-postos');
    const menuResumo = document.getElementById('menu-resumo');

    const userIdNum = Number(user.id);
    if (userIdNum === 0 || user.cargo === "👑 Dono") {
        if (menuAdm) menuAdm.classList.remove('hidden');
        if (menuVeiculos) menuVeiculos.classList.remove('hidden');
        if (menuCombustivel) menuCombustivel.classList.remove('hidden');
        if (menuPostos) menuPostos.classList.remove('hidden');
        if (menuResumo) menuResumo.classList.remove('hidden');
    } else {
        if (menuAdm) menuAdm.classList.add('hidden');
        if (menuVeiculos) menuVeiculos.classList.add('hidden');
        if (menuCombustivel) menuCombustivel.classList.add('hidden');
        if (menuPostos) menuPostos.classList.add('hidden');
        if (menuResumo) menuResumo.classList.add('hidden');
        mudarAbaPainelPorForca('inicio');
    }
}

// Gerenciamento de Veículos / Máquinas
async function adicionarVeiculo(event) {
    event.preventDefault();
    const modeloInput = document.getElementById('veiculo-modelo');
    const placaInput = document.getElementById('veiculo-placa');
    if (!modeloInput || !placaInput) return;

    const modelo = modeloInput.value.trim();
    const placa = placaInput.value.trim();

    let veiculoObj = { id: Date.now(), modelo, placa, editando: false };

    let veiculos = JSON.parse(localStorage.getItem(VEHICLES_KEY)) || [];
    veiculos.push(veiculoObj);
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(veiculos));

    await sincronizarComNuvem('salvar', 'veiculos', veiculoObj);

    alert('Veículo/Máquina cadastrado com sucesso!');
    event.target.reset();
    carregarTabelaVeiculos();
}

function carregarTabelaVeiculos() {
    let veiculos = JSON.parse(localStorage.getItem(VEHICLES_KEY)) || [];
    const tbody = document.getElementById('veiculos-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (veiculos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Nenhum veículo cadastrado ainda.</td></tr>`;
        return;
    }

    veiculos.forEach(v => {
        const tr = document.createElement('tr');
        if (v.editando) {
            tr.innerHTML = `
                <td><input type="text" id="edit-modelo-${v.id}" value="${v.modelo || ''}" style="padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-color);"></td>
                <td><input type="text" id="edit-placa-${v.id}" value="${v.placa || ''}" style="padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-color);"></td>
                <td>
                    <button class="btn-approve" onclick="salvarEdicaoVeiculo(${v.id})">Salvar</button>
                    <button class="btn-remove" onclick="cancelarEdicaoVeiculo(${v.id})">Cancelar</button>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td><strong>${v.modelo || ''}</strong></td>
                <td><code>${v.placa || ''}</code></td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-approve" onclick="ativarEdicaoVeiculo(${v.id})">Editar</button>
                        <button class="btn-remove" onclick="removerVeiculo(${v.id})">Excluir</button>
                    </div>
                </td>
            `;
        }
        tbody.appendChild(tr);
    });
}

function ativarEdicaoVeiculo(id) {
    let veiculos = JSON.parse(localStorage.getItem(VEHICLES_KEY)) || [];
    veiculos = veiculos.map(v => { if (v.id === id) v.editando = true; return v; });
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(veiculos));
    carregarTabelaVeiculos();
}

function cancelarEdicaoVeiculo(id) {
    let veiculos = JSON.parse(localStorage.getItem(VEHICLES_KEY)) || [];
    veiculos = veiculos.map(v => { if (v.id === id) v.editando = false; return v; });
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(veiculos));
    carregarTabelaVeiculos();
}

async function salvarEdicaoVeiculo(id) {
    const modEl = document.getElementById(`edit-modelo-${id}`);
    const plaEl = document.getElementById(`edit-placa-${id}`);
    if (!modEl || !plaEl) return;

    const novoModelo = modEl.value.trim();
    const novaPlaca = plaEl.value.trim();
    if (!novoModelo || !novaPlaca) { alert('Preencha o modelo e a placa!'); return; }

    let veiculos = JSON.parse(localStorage.getItem(VEHICLES_KEY)) || [];
    let veiculoAtualizado = null;

    veiculos = veiculos.map(v => {
        if (v.id === id) { 
            v.modelo = novoModelo; 
            v.placa = novaPlaca; 
            v.editando = false; 
            veiculoAtualizado = v;
        }
        return v;
    });

    localStorage.setItem(VEHICLES_KEY, JSON.stringify(veiculos));

    if (veiculoAtualizado) {
        await sincronizarComNuvem('editar', 'veiculos', veiculoAtualizado);
    }

    alert('Veículo atualizado com sucesso!');
    carregarTabelaVeiculos();
}

async function removerVeiculo(id) {
    if (confirm('Deseja excluir este veículo?')) {
        let veiculos = JSON.parse(localStorage.getItem(VEHICLES_KEY)) || [];
        veiculos = veiculos.filter(v => v.id !== id);
        localStorage.setItem(VEHICLES_KEY, JSON.stringify(veiculos));

        await sincronizarComNuvem('excluir', 'veiculos', { id: id });
        carregarTabelaVeiculos();
    }
}

// Gerenciamento de Postos
function limparCNPJ(valor) {
    return String(valor || '').replace(/\D/g, '');
}

async function consultarCNPJPosto() {
    const cnpjEl = document.getElementById('posto-cnpj');
    const statusEl = document.getElementById('posto-cnpj-status');
    if (!cnpjEl) return;
    const cnpj = limparCNPJ(cnpjEl.value);
    if (!cnpj) return;
    if (cnpj.length !== 14) {
        if (statusEl) statusEl.textContent = 'CNPJ deve conter 14 números.';
        return;
    }
    if (statusEl) statusEl.textContent = 'Consultando cadastro do CNPJ...';
    try {
        const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!resposta.ok) throw new Error('CNPJ não encontrado ou serviço indisponível.');
        const dados = await resposta.json();
        const razaoEl = document.getElementById('posto-razao-social');
        const nomeEl = document.getElementById('posto-nome');
        const cidadeEl = document.getElementById('posto-cidade');
        if (razaoEl) razaoEl.value = dados.razao_social || '';
        if (nomeEl) nomeEl.value = dados.nome_fantasia || dados.razao_social || '';
        if (cidadeEl) cidadeEl.value = [dados.municipio, dados.uf].filter(Boolean).join(' / ');
        if (statusEl) statusEl.textContent = 'Dados encontrados. Confira as informações antes de cadastrar.';
    } catch (erro) {
        if (statusEl) statusEl.textContent = `${erro.message} Você pode preencher os campos manualmente.`;
    }
}

async function adicionarPosto(event) {
    event.preventDefault();
    const cnpj = limparCNPJ(document.getElementById('posto-cnpj')?.value);
    const razaoSocial = document.getElementById('posto-razao-social')?.value.trim() || '';
    const nome = document.getElementById('posto-nome')?.value.trim() || '';
    const cidade = document.getElementById('posto-cidade')?.value.trim() || '';
    if (cnpj && cnpj.length !== 14) { alert('Informe um CNPJ válido com 14 números ou deixe o campo vazio.'); return; }
    if (!razaoSocial || !nome || !cidade) { alert('Preencha razão social, nome do posto e cidade.'); return; }

    const postoObj = { id: Date.now(), cnpj, razaoSocial, nome, cidade, editando: false };
    const postos = JSON.parse(localStorage.getItem(POSTOS_KEY)) || [];
    postos.push(postoObj);
    localStorage.setItem(POSTOS_KEY, JSON.stringify(postos));
    await sincronizarComNuvem('salvar', 'postos', postoObj);
    alert('Posto cadastrado com sucesso!');
    event.target.reset();
    const statusEl = document.getElementById('posto-cnpj-status');
    if (statusEl) statusEl.textContent = '';
    carregarTabelaPostos();
    atualizarDatalists();
    inicializarFiltrosResumo();
}

function carregarTabelaPostos() {
    const postos = JSON.parse(localStorage.getItem(POSTOS_KEY)) || [];
    const tbody = document.getElementById('postos-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (postos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Nenhum posto cadastrado ainda.</td></tr>`;
        return;
    }
    postos.forEach(p => {
        const tr = document.createElement('tr');
        if (p.editando) {
            tr.innerHTML = `
                <td><input type="text" id="edit-posto-cnpj-${p.id}" value="${p.cnpj || ''}" maxlength="14"></td>
                <td><input type="text" id="edit-posto-razao-${p.id}" value="${p.razaoSocial || p.razao_social || p.nome || ''}"></td>
                <td><input type="text" id="edit-posto-nome-${p.id}" value="${p.nome || ''}"></td>
                <td><input type="text" id="edit-posto-cidade-${p.id}" value="${p.cidade || ''}"></td>
                <td><button class="btn-approve" onclick="salvarEdicaoPosto(${p.id})">Salvar</button> <button class="btn-remove" onclick="cancelarEdicaoPosto(${p.id})">Cancelar</button></td>`;
        } else {
            tr.innerHTML = `
                <td><code>${p.cnpj || '-'}</code></td>
                <td>${p.razaoSocial || p.razao_social || '-'}</td>
                <td><strong>${p.nome || ''}</strong></td>
                <td>${p.cidade || '-'}</td>
                <td><div class="table-actions"><button class="btn-approve" onclick="ativarEdicaoPosto(${p.id})">Editar</button><button class="btn-remove" onclick="removerPosto(${p.id})">Excluir</button></div></td>`;
        }
        tbody.appendChild(tr);
    });
}

function ativarEdicaoPosto(id) {
    let postos = JSON.parse(localStorage.getItem(POSTOS_KEY)) || [];
    postos = postos.map(p => { if (String(p.id) === String(id)) p.editando = true; return p; });
    localStorage.setItem(POSTOS_KEY, JSON.stringify(postos));
    carregarTabelaPostos();
}

function cancelarEdicaoPosto(id) {
    let postos = JSON.parse(localStorage.getItem(POSTOS_KEY)) || [];
    postos = postos.map(p => { if (String(p.id) === String(id)) p.editando = false; return p; });
    localStorage.setItem(POSTOS_KEY, JSON.stringify(postos));
    carregarTabelaPostos();
}

async function salvarEdicaoPosto(id) {
    const cnpj = limparCNPJ(document.getElementById(`edit-posto-cnpj-${id}`)?.value);
    const razaoSocial = document.getElementById(`edit-posto-razao-${id}`)?.value.trim() || '';
    const nome = document.getElementById(`edit-posto-nome-${id}`)?.value.trim() || '';
    const cidade = document.getElementById(`edit-posto-cidade-${id}`)?.value.trim() || '';
    if (cnpj && cnpj.length !== 14) { alert('CNPJ deve conter 14 números.'); return; }
    if (!razaoSocial || !nome || !cidade) { alert('Preencha razão social, nome do posto e cidade.'); return; }
    let postos = JSON.parse(localStorage.getItem(POSTOS_KEY)) || [];
    let atualizado = null;
    postos = postos.map(p => {
        if (String(p.id) === String(id)) { Object.assign(p, { cnpj, razaoSocial, nome, cidade, editando: false }); atualizado = p; }
        return p;
    });
    localStorage.setItem(POSTOS_KEY, JSON.stringify(postos));
    if (atualizado) await sincronizarComNuvem('editar', 'postos', atualizado);
    alert('Posto atualizado com sucesso!');
    carregarTabelaPostos();
    atualizarDatalists();
    inicializarFiltrosResumo();
}

async function removerPosto(id) {
    if (confirm('Deseja excluir este posto?')) {
        let postos = JSON.parse(localStorage.getItem(POSTOS_KEY)) || [];
        postos = postos.filter(p => p.id !== id);
        localStorage.setItem(POSTOS_KEY, JSON.stringify(postos));

        await sincronizarComNuvem('excluir', 'postos', { id: id });
        carregarTabelaPostos();
    }
}

function calcularValorAbastecimento() {
    const tipo = document.getElementById('fuel-tipo')?.value;
    if (tipo !== 'Abastecimento') return;
    const litros = Number(document.getElementById('fuel-litros')?.value) || 0;
    const preco = Number(document.getElementById('fuel-valor-litro')?.value) || 0;
    const totalEl = document.getElementById('fuel-valor');
    if (totalEl) totalEl.value = litros > 0 && preco > 0 ? (litros * preco).toFixed(2) : '';
}

function verificarTipoLancamento() {
    const tipo = document.getElementById('fuel-tipo')?.value;
    const abastecimento = tipo === 'Abastecimento';
    const divLitros = document.getElementById('div-litros');
    const divPreco = document.getElementById('div-valor-litro');
    const divCombustivel = document.getElementById('div-tipo-combustivel');
    const inputLitros = document.getElementById('fuel-litros');
    const inputPreco = document.getElementById('fuel-valor-litro');
    const inputTotal = document.getElementById('fuel-valor');
    const ajuda = document.getElementById('fuel-calculo-ajuda');
    if (divLitros) divLitros.style.display = abastecimento ? 'block' : 'none';
    if (divPreco) divPreco.style.display = abastecimento ? 'block' : 'none';
    if (divCombustivel) divCombustivel.style.display = abastecimento ? 'flex' : 'none';
    if (inputLitros) { inputLitros.required = abastecimento; if (!abastecimento) inputLitros.value = '0'; }
    if (inputPreco) { inputPreco.required = abastecimento; if (!abastecimento) inputPreco.value = ''; }
    if (inputTotal) inputTotal.readOnly = abastecimento;
    if (ajuda) ajuda.textContent = abastecimento ? 'Calculado automaticamente: litros × valor por litro.' : 'Informe o valor total do serviço ou produto.';
    if (abastecimento) calcularValorAbastecimento();
}

function atualizarDatalists() {
    const listVeiculos = document.getElementById('lista-veiculos');
    if (listVeiculos) {
        listVeiculos.innerHTML = '';
        let veiculos = JSON.parse(localStorage.getItem(VEHICLES_KEY)) || [];
        veiculos.forEach(v => {
            const opt = document.createElement('option');
            opt.value = `${v.modelo || ''} - Placa: ${v.placa || ''}`;
            listVeiculos.appendChild(opt);
        });
    }

    const listPostos = document.getElementById('lista-postos');
    if (listPostos) {
        listPostos.innerHTML = '';
        let postos = JSON.parse(localStorage.getItem(POSTOS_KEY)) || [];
        postos.forEach(p => {
            const opt = document.createElement('option');
            opt.value = `${p.nome || ''} (${p.cidade || ''})`;
            listPostos.appendChild(opt);
        });
    }

    verificarTipoLancamento();
}

async function adicionarCombustivel(event) {
    event.preventDefault();
    const tipo = document.getElementById('fuel-tipo')?.value || 'Abastecimento';
    const data = document.getElementById('fuel-data')?.value || '';
    const veiculo = document.getElementById('fuel-veiculo')?.value.trim() || '';
    const posto = document.getElementById('fuel-posto')?.value.trim() || '';
    const litros = tipo === 'Abastecimento' ? (Number(document.getElementById('fuel-litros')?.value) || 0) : 0;
    const valorLitro = tipo === 'Abastecimento' ? (Number(document.getElementById('fuel-valor-litro')?.value) || 0) : 0;
    const valor = tipo === 'Abastecimento' ? Number((litros * valorLitro).toFixed(2)) : (Number(document.getElementById('fuel-valor')?.value) || 0);
    const tipoCombustivel = tipo === 'Abastecimento' ? (document.getElementById('fuel-combustivel')?.value || '') : '';
    const obs = document.getElementById('fuel-obs')?.value.trim() || '';
    if (!data || !veiculo) { alert('Preencha a data e o veículo/máquina.'); return; }
    if (tipo === 'Abastecimento' && (litros <= 0 || valorLitro <= 0)) { alert('Informe uma quantidade de litros e um valor por litro maiores que zero.'); return; }
    if (valor <= 0) { alert('O valor total deve ser maior que zero.'); return; }

    const registroObj = { id: Date.now(), tipo, tipoCombustivel, data, veiculo, posto, litros, valorLitro, valor, obs: obs || '-' };
    const registros = JSON.parse(localStorage.getItem(FUEL_KEY)) || [];
    registros.unshift(registroObj);
    localStorage.setItem(FUEL_KEY, JSON.stringify(registros));
    await sincronizarComNuvem('salvar', 'lancamentos', registroObj);
    alert('Lançamento registrado com sucesso!');
    event.target.reset();
    verificarTipoLancamento();
    carregarTabelaCombustivel();
    aplicarFiltrosResumo();
}

function carregarTabelaCombustivel() {
    let registros = JSON.parse(localStorage.getItem(FUEL_KEY)) || [];
    const tbody = document.getElementById('fuel-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (registros.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">Nenhum lançamento registrado ainda.</td></tr>`;
        return;
    }

    registros.forEach(r => {
        const valNum = Number(r.valor) || 0;
        const valorFormatado = valNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const badgeCor = r.tipo === 'Abastecimento' ? '#10b981' : '#f59e0b';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="background-color: ${badgeCor}; color: #000; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${r.tipo || ''}</span></td>
            <td>${r.data || ''}</td>
            <td><strong>${r.veiculo || ''}</strong></td>
            <td>${r.posto || '-'}</td>
            <td>${r.tipoCombustivel || '-'}</td>
            <td>${Number(r.litros) > 0 ? Number(r.litros).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' L' : '-'}</td>
            <td>${Number(r.valorLitro) > 0 ? Number(r.valorLitro).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '-'}</td>
            <td>${valorFormatado}</td>
            <td>${r.obs || '-'}</td>
            <td>
                <button class="btn-remove" onclick="removerCombustivel(${r.id})">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function removerCombustivel(id) {
    if (confirm('Deseja excluir este registro?')) {
        let registros = JSON.parse(localStorage.getItem(FUEL_KEY)) || [];
        registros = registros.filter(r => r.id !== id);
        localStorage.setItem(FUEL_KEY, JSON.stringify(registros));

        await sincronizarComNuvem('excluir', 'lancamentos', { id: id });
        carregarTabelaCombustivel();
    }
}

function inicializarFiltrosResumo() {
    let veiculos = JSON.parse(localStorage.getItem(VEHICLES_KEY)) || [];
    let selectV = document.getElementById('filtro-veiculo-select');
    if (selectV) {
        selectV.innerHTML = '<option value="">Todos os Veículos</option>';
        veiculos.forEach(v => {
            let val = `${v.modelo || ''} - Placa: ${v.placa || ''}`;
            selectV.innerHTML += `<option value="${val}">${val}</option>`;
        });
    }

    let postos = JSON.parse(localStorage.getItem(POSTOS_KEY)) || [];
    let selectP = document.getElementById('filtro-posto-select');
    if (selectP) {
        selectP.innerHTML = '<option value="">Todos os Postos</option>';
        postos.forEach(p => {
            let val = `${p.nome || ''} (${p.cidade || ''})`;
            selectP.innerHTML += `<option value="${val}">${val}</option>`;
        });
    }

    alternarCamposPeriodo();
}

function alternarCamposPeriodo() {
    const tipoPeriodoEl = document.getElementById('filtro-tipo-periodo');
    const grupoData = document.getElementById('grupo-data-especifica');
    const grupoMes = document.getElementById('grupo-mes-ano');
    const grupoAno = document.getElementById('grupo-ano');
    if (!tipoPeriodoEl) return;

    const tipoPeriodo = tipoPeriodoEl.value;
    if (grupoData) grupoData.classList.add('hidden');
    if (grupoMes) grupoMes.classList.add('hidden');
    if (grupoAno) grupoAno.classList.add('hidden');

    if (tipoPeriodo === 'diario' && grupoData) grupoData.classList.remove('hidden');
    if (tipoPeriodo === 'mensal' && grupoMes) grupoMes.classList.remove('hidden');
    if (tipoPeriodo === 'anual' && grupoAno) grupoAno.classList.remove('hidden');

    aplicarFiltrosResumo();
}

function limparFiltrosResumo() {
    const tp = document.getElementById('filtro-tipo-periodo');
    const dt = document.getElementById('filtro-data');
    const ms = document.getElementById('filtro-mes');
    const an = document.getElementById('filtro-ano');
    const fv = document.getElementById('filtro-veiculo-select');
    const fp = document.getElementById('filtro-posto-select');

    if (tp) tp.value = 'todos';
    if (dt) dt.value = '';
    if (ms) ms.value = '';
    if (an) an.value = '';
    if (fv) fv.value = '';
    if (fp) fp.value = '';
    alternarCamposPeriodo();
}

function aplicarFiltrosResumo() {
    let registros = JSON.parse(localStorage.getItem(FUEL_KEY)) || [];

    const tipoPeriodoEl = document.getElementById('filtro-tipo-periodo');
    const dataFiltroEl = document.getElementById('filtro-data');
    const mesFiltroEl = document.getElementById('filtro-mes');
    const anoFiltroEl = document.getElementById('filtro-ano');
    const veiculoFiltroEl = document.getElementById('filtro-veiculo-select');
    const postoFiltroEl = document.getElementById('filtro-posto-select');

    const tipoPeriodo = tipoPeriodoEl ? tipoPeriodoEl.value : 'todos';
    const dataFiltro = dataFiltroEl ? dataFiltroEl.value : '';
    const mesFiltro = mesFiltroEl ? mesFiltroEl.value : '';
    const anoFiltro = anoFiltroEl ? anoFiltroEl.value : '';
    const veiculoFiltro = veiculoFiltroEl ? veiculoFiltroEl.value : '';
    const postoFiltro = postoFiltroEl ? postoFiltroEl.value : '';

    let registrosFiltrados = registros.filter(r => {
        if (veiculoFiltro && r.veiculo !== veiculoFiltro) return false;
        if (postoFiltro && r.posto !== postoFiltro) return false;

        if (tipoPeriodo === 'diario' && dataFiltro) {
            if (r.data !== dataFiltro) return false;
        } else if (tipoPeriodo === 'mensal' && mesFiltro) {
            let mesRegistro = r.data ? r.data.substring(0, 7) : '';
            if (mesRegistro !== mesFiltro) return false;
        } else if (tipoPeriodo === 'anual' && anoFiltro) {
            let anoRegistro = r.data ? r.data.substring(0, 4) : '';
            if (anoRegistro !== anoFiltro) return false;
        }

        return true;
    });

    let totalLitrosGeral = 0;
    let totalValorGeral = 0;
    let resumoVeiculos = {};
    let resumoPostos = {};

    registrosFiltrados.forEach(r => {
        let litrosVal = parseFloat(r.litros) || 0;
        let valorVal = parseFloat(r.valor) || 0;

        totalLitrosGeral += litrosVal;
        totalValorGeral += valorVal;

        const veicKey = r.veiculo || 'Não informado';
        if (!resumoVeiculos[veicKey]) {
            resumoVeiculos[veicKey] = { litros: 0, valor: 0 };
        }
        resumoVeiculos[veicKey].litros += litrosVal;
        resumoVeiculos[veicKey].valor += valorVal;

        let postoNome = r.posto || 'Não informado';
        if (!resumoPostos[postoNome]) {
            resumoPostos[postoNome] = { litros: 0, valor: 0 };
        }
        resumoPostos[postoNome].litros += litrosVal;
        resumoPostos[postoNome].valor += valorVal;
    });

    const cardLitros = document.getElementById('card-total-litros');
    const cardValor = document.getElementById('card-total-valor');
    if (cardLitros) cardLitros.innerText = totalLitrosGeral.toFixed(2) + ' L';
    if (cardValor) cardValor.innerText = totalValorGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const tbodyVeiculos = document.getElementById('resumo-veiculos-body');
    if (tbodyVeiculos) {
        tbodyVeiculos.innerHTML = '';
        let chavesV = Object.keys(resumoVeiculos);
        if (chavesV.length === 0) {
            tbodyVeiculos.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Nenhum dado encontrado para os filtros selecionados.</td></tr>`;
        } else {
            chavesV.forEach(v => {
                let dados = resumoVeiculos[v];
                let valFmt = dados.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                tbodyVeiculos.innerHTML += `
                    <tr>
                        <td><strong>${v}</strong></td>
                        <td>${dados.litros > 0 ? dados.litros.toFixed(2) + ' L' : '-'}</td>
                        <td>${valFmt}</td>
                    </tr>
                `;
            });
        }
    }

    const tbodyPostos = document.getElementById('resumo-postos-body');
    if (tbodyPostos) {
        tbodyPostos.innerHTML = '';
        let chavesP = Object.keys(resumoPostos);
        if (chavesP.length === 0) {
            tbodyPostos.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Nenhum dado encontrado para os filtros selecionados.</td></tr>`;
        } else {
            chavesP.forEach(p => {
                let dados = resumoPostos[p];
                let valFmt = dados.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                tbodyPostos.innerHTML += `
                    <tr>
                        <td><strong>${p}</strong></td>
                        <td>${dados.litros > 0 ? dados.litros.toFixed(2) + ' L' : '-'}</td>
                        <td>${valFmt}</td>
                    </tr>
                `;
            });
        }
    }
}

function carregarTabelaAdm() {
    let usuarios = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    usuarios.forEach(u => {
        if (Number(u.id) === 0) return;

        const tr = document.createElement('tr');
        let acoesHtml = '';

        if (!u.aprovado || u.editando) {
            acoesHtml = `
                <div style="display: flex; gap: 8px; align-items: center;">
                    <select id="cargo-${u.id}">
                        <option value="👑 Dono" ${u.cargo === '👑 Dono' ? 'selected' : ''}>👑 Dono</option>
                        <option value="👷 Funcionarios" ${u.cargo === '👷 Funcionarios' ? 'selected' : ''}>👷 Funcionarios</option>
                        <option value="Outros" ${u.cargo === 'Outros' ? 'selected' : ''}>Outros</option>
                    </select>
                    <button class="btn-approve" onclick="aprovarUsuario(${u.id})">Salvar</button>
                    ${u.aprovado ? `<button class="btn-remove" onclick="cancelarEdicao(${u.id})">Cancelar</button>` : `<button class="btn-remove" onclick="removerUsuario(${u.id})">Remover</button>`}
                </div>
            `;
        } else {
            acoesHtml = `
                <div class="dropdown" id="dropdown-${u.id}">
                    <button class="dropbtn" onclick="toggleDropdown(event, ${u.id})">...</button>
                    <div class="dropdown-content">
                        <button onclick="ativarEdicao(${u.id})">✏️ Editar</button>
                        <button class="btn-delete-opt" onclick="removerUsuario(${u.id})">🗑️ Remover</button>
                    </div>
                </div>
            `;
        }

        tr.innerHTML = `
            <td><strong>#${u.id !== undefined ? u.id : ''}</strong></td>
            <td>${u.nome || ''}</td>
            <td><code>${u.cpf || ''}</code></td>
            <td><span style="color: ${u.aprovado ? 'green' : 'orange'}; font-weight: bold;">${u.cargo || ''}</span></td>
            <td>${acoesHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleDropdown(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => {
        if (d.id !== `dropdown-${id}`) d.classList.remove('show');
    });
    const dropdown = document.getElementById(`dropdown-${id}`);
    if (dropdown) dropdown.classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
    }
}

function ativarEdicao(id) {
    let usuarios = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    usuarios = usuarios.map(u => { if (u.id === id) u.editando = true; return u; });
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    carregarTabelaAdm();
}

function cancelarEdicao(id) {
    let usuarios = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    usuarios = usuarios.map(u => { if (u.id === id) u.editando = false; return u; });
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    carregarTabelaAdm();
}

async function aprovarUsuario(id) {
    const selectCargo = document.getElementById(`cargo-${id}`);
    const cargoEscolhido = selectCargo ? selectCargo.value : 'Funcionarios';

    let usuarios = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    let usuarioAtualizado = null;

    usuarios = usuarios.map(u => {
        if (u.id === id) { 
            u.aprovado = true; 
            u.cargo = cargoEscolhido; 
            u.editando = false; 
            usuarioAtualizado = u;
        }
        return u;
    });

    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));

    if (usuarioAtualizado) {
        await sincronizarComNuvem('editar', 'usuarios', usuarioAtualizado);
    }

    alert('Alteração salva com sucesso!');
    carregarTabelaAdm();
}

async function removerUsuario(id) {
    if (confirm(`Tem certeza que deseja remover o usuário ID: #${id}?`)) {
        let usuarios = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
        usuarios = usuarios.filter(u => u.id !== id);
        localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));

        await sincronizarComNuvem('excluir', 'usuarios', { id: id });
        alert('Removido com sucesso!');
        carregarTabelaAdm();
    }
}

function mudarAbaPainel(secao) {
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    document.querySelectorAll('.panel-section').forEach(sec => sec.classList.add('hidden'));

    if (secao === 'inicio') {
        const sec = document.getElementById('section-inicio');
        if (sec) sec.classList.remove('hidden');
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
    } else if (secao === 'adm-painel') {
        const sec = document.getElementById('section-adm-painel');
        if (sec) sec.classList.remove('hidden');
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
        carregarTabelaAdm();
    } else if (secao === 'veiculos') {
        const sec = document.getElementById('section-veiculos');
        if (sec) sec.classList.remove('hidden');
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
        carregarTabelaVeiculos();
    } else if (secao === 'combustivel') {
        const sec = document.getElementById('section-combustivel');
        if (sec) sec.classList.remove('hidden');
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
        carregarTabelaCombustivel();
        atualizarDatalists();
    } else if (secao === 'postos') {
        const sec = document.getElementById('section-postos');
        if (sec) sec.classList.remove('hidden');
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
        carregarTabelaPostos();
    } else if (secao === 'resumo') {
        const sec = document.getElementById('section-resumo');
        if (sec) sec.classList.remove('hidden');
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
        inicializarFiltrosResumo();
    }
}

function mudarAbaPainelPorForca(secao) {
    document.querySelectorAll('.panel-section').forEach(sec => sec.classList.add('hidden'));
    if (secao === 'inicio') {
        const sec = document.getElementById('section-inicio');
        if (sec) sec.classList.remove('hidden');
    }
}

function fazerLogout() {
    localStorage.removeItem(SESSION_KEY);
    verificarEstadoSessao();
}

window.onload = async function() {
    ['fuel-litros', 'fuel-valor-litro'].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.addEventListener('input', calcularValorAbastecimento);
    });
    const cnpjCampo = document.getElementById('posto-cnpj');
    if (cnpjCampo) cnpjCampo.addEventListener('input', () => {
        const numeros = limparCNPJ(cnpjCampo.value).slice(0, 14);
        cnpjCampo.value = numeros.length > 12 ? numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, '$1.$2.$3/$4-$5') : numeros.length > 8 ? numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, '$1.$2.$3/$4') : numeros.length > 5 ? numeros.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, '$1.$2.$3') : numeros.length > 2 ? numeros.replace(/^(\d{2})(\d{0,3}).*/, '$1.$2') : numeros;
    });
    localStorage.removeItem(SESSION_KEY);
    inicializarSistema();
    await carregarDadosDaNuvem(); 
    verificarEstadoSessao();
};