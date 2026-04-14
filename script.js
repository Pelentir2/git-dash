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

async function loadData() {
    try {
        // Busca os dados do JSON gerado pelo GitHub Actions
        const response = await fetch('data/campaign_data.json');
        if (!response.ok) {
            throw new Error(`Erro: ${response.status}`);
        }
        
        campaignsData = await response.json();
        
        updateKPIs(campaignsData);
        updateTable(campaignsData);
        renderChart(campaignsData);
        
    } catch (error) {
        console.error("Falha ao carregar dados:", error);
        document.getElementById('table-body').innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #ff5252;">
                    Aviso: O arquivo data/campaign_data.json não foi encontrado. <br>
                    O robô do GitHub precisa rodar pelo menos uma vez para criar esse arquivo.
                </td>
            </tr>`;
    }
}

function updateKPIs(data) {
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    
    // Algumas métricas como CPC ou CPM médias precisam ser ponderadas mas para simplificar vamos fazer médias simples ou calculadas:
    data.forEach(camp => {
        totalSpend += parseFloat(camp.spend || 0);
        totalImpressions += parseInt(camp.impressions || 0, 10);
        totalClicks += parseInt(camp.clicks || 0, 10);
    });

    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? (totalSpend / totalClicks) : 0;
    const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

    // Atualiza a tela
    document.getElementById('kpi-spend').innerText = formatCurrency(totalSpend);
    document.getElementById('kpi-impressions').innerText = formatNumber(totalImpressions);
    document.getElementById('kpi-clicks').innerText = formatNumber(totalClicks);
    document.getElementById('kpi-ctr').innerText = formatPercent(avgCtr);
    document.getElementById('kpi-cpc').innerText = formatCurrency(avgCpc);
    document.getElementById('kpi-cpm').innerText = formatCurrency(avgCpm);
}

function updateTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhuma campanha encontrada neste período.</td></tr>`;
        return;
    }

    data.forEach(camp => {
        const tr = document.createElement('tr');
        
        const name = camp.campaign_name.length > 40 ? camp.campaign_name.substring(0, 40) + '...' : camp.campaign_name;

        tr.innerHTML = `
            <td><strong>${name}</strong></td>
            <td>${formatCurrency(camp.spend || 0)}</td>
            <td>${formatNumber(camp.impressions || 0)}</td>
            <td>${formatNumber(camp.clicks || 0)}</td>
            <td><span style="color: #4cc9f0;">${formatPercent(camp.ctr || 0)}</span></td>
            <td>${formatCurrency(camp.cpc || 0)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderChart(data) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    // Destrói o gráfico anterior caso esteja atualizando
    if (performanceChartInstance) {
        performanceChartInstance.destroy();
    }

    // Prepara os dados limitando as top 10 campanhas com maior gasto para o gráfico não virar bagunça
    const sortedData = [...data].sort((a,b) => parseFloat(b.spend||0) - parseFloat(a.spend||0)).slice(0, 10);

    const labels = sortedData.map(c => {
        let nameParts = c.campaign_name.split(':');
        return nameParts[nameParts.length - 1].substring(0, 15).trim() + '...';
    });

    const spendData = sortedData.map(c => parseFloat(c.spend || 0));
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
                    label: 'Cliques',
                    data: clicksData,
                    type: 'line',
                    backgroundColor: '#4cc9f0',
                    borderColor: '#4cc9f0',
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: '#181b28',
                    pointBorderColor: '#4cc9f0',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 17, 26, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Investimento'
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Cliques'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}
