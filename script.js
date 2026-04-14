// Variáveis Globais
let campaignsData = [];
let performanceChartInstance = null;

// Formatações Moeda e Número
const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val) => new Intl.NumberFormat('pt-BR').format(val);
const formatPercent = (val) => Number(val).toFixed(2) + '%';

document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

// Helper para encontrar valores de Ações baseados no action_type do Facebook
function getActionValue(actionsArray, types) {
    if (!actionsArray || !Array.isArray(actionsArray)) return 0;
    
    let total = 0;
    actionsArray.forEach(action => {
        if (types.includes(action.action_type)) {
            total += parseFloat(action.value || 0);
        }
    });
    return total;
}

// O Facebook tem vários nomes para Mensagens: messages, onsite_conversion.messaging_conversation_started_7d, etc.
const MSG_TYPES = ['messages', 'onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.messaging_first_reply'];
// Visita na página de destino
const LPV_TYPES = ['landing_page_view'];

async function loadData() {
    try {
        const response = await fetch('data/campaign_data.json');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        campaignsData = await response.json();
        
        // Pós-processamento dos dados para adicionar os campos de ações consolidados
        campaignsData.forEach(camp => {
            camp.total_messages = getActionValue(camp.actions, MSG_TYPES);
            camp.total_lpv = getActionValue(camp.actions, LPV_TYPES);
            
            // Custo por Ação
            camp.cost_per_message = camp.total_messages > 0 ? (parseFloat(camp.spend) / camp.total_messages) : 0;
            camp.cost_per_lpv = camp.total_lpv > 0 ? (parseFloat(camp.spend) / camp.total_lpv) : 0;
            
            // Tratamento de alcance
            camp.reach_num = parseInt(camp.reach || 0, 10);
        });
        
        updateKPIs(campaignsData);
        updateTable(campaignsData);
        renderChart(campaignsData);
        
    } catch (error) {
        console.error("Falha ao carregar dados:", error);
        document.getElementById('table-body').innerHTML = `
            <tr><td colspan="8" style="text-align: center; color: #ff5252;">Aguardando primeira execução do robô com as novas métricas. Role a Action no GitHub para gerar o novo arquivo de dados!</td></tr>
        `;
    }
}

function updateKPIs(data) {
    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0;
    let totalMessages = 0, totalLpv = 0;
    
    data.forEach(camp => {
        totalSpend += parseFloat(camp.spend || 0);
        totalImpressions += parseInt(camp.impressions || 0, 10);
        totalClicks += parseInt(camp.clicks || 0, 10);
        totalReach += parseInt(camp.reach || 0, 10);
        totalMessages += camp.total_messages;
        totalLpv += camp.total_lpv;
    });

    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCostMessage = totalMessages > 0 ? (totalSpend / totalMessages) : 0;
    const avgCostLpv = totalLpv > 0 ? (totalSpend / totalLpv) : 0;

    // Atualiza a tela
    document.getElementById('kpi-messages').innerText = formatNumber(totalMessages);
    document.getElementById('kpi-cost-message').innerText = formatCurrency(avgCostMessage);
    
    document.getElementById('kpi-lpv').innerText = formatNumber(totalLpv);
    document.getElementById('kpi-cost-lpv').innerText = formatCurrency(avgCostLpv);
    
    document.getElementById('kpi-reach').innerText = formatNumber(totalReach);
    document.getElementById('kpi-impressions').innerText = formatNumber(totalImpressions);
    document.getElementById('kpi-ctr').innerText = formatPercent(avgCtr);
    document.getElementById('kpi-spend').innerText = formatCurrency(totalSpend);
}

function updateTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Nenhuma campanha encontrada.</td></tr>`;
        return;
    }

    data.forEach(camp => {
        const tr = document.createElement('tr');
        const name = camp.campaign_name.length > 35 ? camp.campaign_name.substring(0, 35) + '...' : camp.campaign_name;

        tr.innerHTML = `
            <td><strong>${name}</strong></td>
            <td>${formatCurrency(camp.spend || 0)}</td>
            <td>${formatNumber(camp.reach_num || 0)}</td>
            <td>${formatNumber(camp.impressions || 0)}</td>
            <td style="color: #10b981; font-weight: 600;">${formatNumber(camp.total_messages || 0)}</td>
            <td>${formatCurrency(camp.cost_per_message || 0)}</td>
            <td style="color: #4cc9f0; font-weight: 600;">${formatNumber(camp.total_lpv || 0)}</td>
            <td>${formatCurrency(camp.cost_per_lpv || 0)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderChart(data) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    if (performanceChartInstance) performanceChartInstance.destroy();

    // Top 10 campanhas
    const sortedData = [...data].sort((a,b) => parseFloat(b.spend||0) - parseFloat(a.spend||0)).slice(0, 10);

    const labels = sortedData.map(c => {
        let nameParts = c.campaign_name.split(':');
        return nameParts[nameParts.length - 1].substring(0, 15).trim() + '...';
    });

    const spendData = sortedData.map(c => parseFloat(c.spend || 0));
    const msgData = sortedData.map(c => c.total_messages);
    const clicksData = sortedData.map(c => parseInt(c.clicks || 0, 10));

    Chart.defaults.color = '#8d95af';
    Chart.defaults.font.family = "'Inter', sans-serif";

    performanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Investimento (R$)',
                    data: spendData,
                    backgroundColor: 'rgba(67, 97, 238, 0.7)',
                    borderColor: '#4361ee',
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: 'Mensagens',
                    data: msgData,
                    type: 'line',
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y2'
                },
                {
                    label: 'Cliques Totais',
                    data: clicksData,
                    type: 'line',
                    backgroundColor: '#4cc9f0',
                    borderColor: '#4cc9f0',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    type: 'linear', display: true, position: 'left',
                    title: { display: true, text: 'Investimento (R$)' }
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Cliques' }
                },
                y2: {
                    type: 'linear', display: false, position: 'right', // Ocultamos a grid/eixo para não poluir, pega carona no y1
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}
