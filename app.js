// Ações de teste (gratuitas)
const tickersReais = ['PETR4', 'VALE3', 'ITUB4', 'MGLU3'];

// Cache para evitar perda de dados
let ultimosDados = [];

async function buscarDadosReais() {
    try {
        console.log("🔍 Buscando dados REAIS...", new Date().toLocaleTimeString());
        
        mostrarLoading();

        // URL SEM token (ações de teste) - inclui fundamental e dividends
        const url = `https://brapi.dev/api/quote/${tickersReais.join(',')}?range=1d&interval=1d&fundamental=true`;
        
        const resposta = await fetch(url);
        
        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status}`);
        }
        
        const dados = await resposta.json();
        console.log("📦 Dados brutos da API:", dados);

        if (dados.results && dados.results.length > 0) {
            // Guarda no cache
            ultimosDados = dados.results;
            
            // Processa e mostra os dados
            processarDados(dados.results);
        }

    } catch (erro) {
        console.error("❌ Erro:", erro);
        
        // Se tem cache, usa ele
        if (ultimosDados.length > 0) {
            processarDados(ultimosDados);
            mostrarMensagem('⚠️ Usando dados em cache', 'warning');
        } else {
            mostrarErro(erro.message);
        }
    }
}

function processarDados(dados) {
    // Tabela 1: Dividendos
    desenharTabelaDividendos(dados);
    
    // Tabela 2: Valorização
    desenharTabelaValorizacao(dados);
    
    // Atualiza timestamps
    const agora = new Date();
    document.getElementById('timestamp-dividendos').textContent = 
        `${agora.toLocaleTimeString('pt-BR')} • Dados REAIS`;
    document.getElementById('timestamp-valorizacao').textContent = 
        `${agora.toLocaleTimeString('pt-BR')} • Dados REAIS`;
    
    // Mostra status das ações
    const tickersComDY = dados.filter(item => item.dividendYield > 0).map(item => item.symbol);
    if (tickersComDY.length === 0) {
        mostrarMensagem(
            'ℹ️ API não retornou dividend yields. Mostrando apenas preços e variações.',
            'info'
        );
    }
}

function desenharTabelaDividendos(dados) {
    const elemento = document.getElementById('tabela-dividendos');
    if (!elemento) return;
    
    elemento.innerHTML = "";
    
    // Tenta ordenar por dividendYield, se disponível
    const ordenados = [...dados].sort((a, b) => {
        const dyA = a.dividendYield ? parseFloat(a.dividendYield) : 0;
        const dyB = b.dividendYield ? parseFloat(b.dividendYield) : 0;
        return dyB - dyA;
    });
    
    ordenados.forEach((item, index) => {
        // TRATAMENTO CORRETO DO DIVIDEND YIELD
        let dy = 0;
        let dyDisplay = "N/A";
        
        // Tenta diferentes fontes de dividend yield
        if (item.dividendYield) {
            dy = parseFloat(item.dividendYield);
            // Converte decimal para percentual se necessário
            dyDisplay = dy < 1 ? (dy * 100).toFixed(2) + '%' : dy.toFixed(2) + '%';
        } else if (item.dividendsData && item.dividendsData.dividendYield) {
            dy = parseFloat(item.dividendsData.dividendYield);
            dyDisplay = dy.toFixed(2) + '%';
        } else {
            // Se não tem dividend yield, mostra "N/A" em vez de 0%
            dyDisplay = "<span style='color: #848d97;'>N/A</span>";
        }
        
        // Preço
        const preco = (item.regularMarketPrice || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        // Nome da empresa
        const nome = item.longName ? item.longName.split(' ')[0] : 
                    item.shortName ? item.shortName.split(' ')[0] : 
                    item.symbol;

        // Tendência baseada na variação
        const variacao = item.regularMarketChangePercent || 0;
        const tendenciaIcon = variacao > 0 ? '▲' : variacao < 0 ? '▼' : '—';
        const tendenciaColor = variacao > 0 ? '#00d1b2' : variacao < 0 ? '#ff6b6b' : '#848d97';

        elemento.innerHTML += `
            <tr>
                <td>${(index + 1).toString().padStart(2, '0')}</td>
                <td>${nome}</td>
                <td><span class="ticker">${item.symbol}</span></td>
                <td>${preco}</td>
                <td style="color: #4dabf7; font-size: 16px; font-weight: 700;">${dyDisplay}</td>
                <td style="color: ${tendenciaColor};">${tendenciaIcon}</td>
            </tr>
        `;
    });
}

function desenharTabelaValorizacao(dados) {
    const elemento = document.getElementById('tabela-valorizacao');
    if (!elemento) return;
    
    elemento.innerHTML = "";
    
    // Ordena por variação (maiores altas primeiro)
    const ordenados = [...dados].sort((a, b) => 
        (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0)
    );
    
    ordenados.forEach((item, index) => {
        const variacao = item.regularMarketChangePercent || 0;
        const preco = (item.regularMarketPrice || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        const corVariacao = variacao >= 0 ? '#00d1b2' : '#ff6b6b';
        const simboloVariacao = variacao >= 0 ? '▲' : '▼';
        
        const nome = item.longName ? item.longName.split(' ')[0] : 
                    item.shortName ? item.shortName.split(' ')[0] : 
                    item.symbol;

        // Gráfico proporcional à variação
        const alturaBase = Math.min(Math.abs(variacao) * 5, 30); // Limita a 30px
        const corGrafico = variacao >= 0 ? '#00d1b2' : '#ff6b6b';

        elemento.innerHTML += `
            <tr>
                <td>${(index + 1).toString().padStart(2, '0')}</td>
                <td>${nome}</td>
                <td><span class="ticker">${item.symbol}</span></td>
                <td>${preco}</td>
                <td style="color: ${corVariacao}; font-size: 16px; font-weight: 700;">
                    ${simboloVariacao} ${Math.abs(variacao).toFixed(2)}%
                </td>
                <td>
                    <div style="display: flex; align-items: flex-end; gap: 2px; height: 30px;">
                        <div style="width: 12px; height: ${alturaBase}px; background: ${corGrafico}; border-radius: 2px;"></div>
                        <div style="width: 12px; height: ${alturaBase * 0.8}px; background: ${corGrafico}80; border-radius: 2px;"></div>
                        <div style="width: 12px; height: ${alturaBase * 0.6}px; background: ${corGrafico}60; border-radius: 2px;"></div>
                    </div>
                </td>
            </tr>
        `;
    });
}

// Funções auxiliares (loading, erro, mensagem)
function mostrarLoading() {
    const loadingHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 30px;">
                <div class="loading-spinner"></div>
            </td>
        </tr>
    `;
    
    document.getElementById('tabela-dividendos').innerHTML = loadingHTML;
    document.getElementById('tabela-valorizacao').innerHTML = loadingHTML;
}

function mostrarErro(mensagem) {
    const erroHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 30px; color: #ff6b6b;">
                <i class="fas fa-exclamation-triangle"></i> Erro: ${mensagem}
            </td>
        </tr>
    `;
    
    document.getElementById('tabela-dividendos').innerHTML = erroHTML;
    document.getElementById('tabela-valorizacao').innerHTML = erroHTML;
}

function mostrarMensagem(texto, tipo) {
    let elemento = document.getElementById('status-mensagem');
    if (!elemento) {
        elemento = document.createElement('div');
        elemento.id = 'status-mensagem';
        elemento.style.cssText = `
            text-align: center;
            padding: 8px 16px;
            margin: 10px auto;
            max-width: 1400px;
            border-radius: 30px;
            font-size: 13px;
        `;
        document.querySelector('.container').parentNode.insertBefore(elemento, document.querySelector('.container'));
    }
    
    const cores = {
        success: '#00d1b2',
        warning: '#ffc107',
        error: '#ff6b6b',
        info: '#4dabf7'
    };
    
    elemento.style.backgroundColor = `${cores[tipo]}20`;
    elemento.style.color = cores[tipo];
    elemento.style.border = `1px solid ${cores[tipo]}`;
    elemento.innerHTML = texto;
}

// Adiciona spinner CSS
const style = document.createElement('style');
style.textContent = `
    .loading-spinner {
        border: 3px solid #21262d;
        border-top: 3px solid #4dabf7;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Inicia
document.addEventListener('DOMContentLoaded', () => {
    buscarDadosReais();
    setInterval(buscarDadosReais, 30000); // Atualiza a cada 30s
});