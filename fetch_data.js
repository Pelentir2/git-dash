const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Carrega as variáveis de ambiente que o GitHub Actions vai injetar (ou do arquivo .env se estiver rodando local)
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID; // Ex: act_123456789

if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    console.error("ERRO: As variáveis FB_ACCESS_TOKEN e FB_AD_ACCOUNT_ID precisam estar configuradas.");
    process.exit(1);
}

// URL da API Graph do Facebook
const API_VERSION = 'v19.0';
const URL = `https://graph.facebook.com/${API_VERSION}/${AD_ACCOUNT_ID}/insights`;

// Definimos as métricas que queremos puxar (gastos, cliques, cpc, etc) e o período
const params = {
    access_token: ACCESS_TOKEN,
    fields: 'campaign_name,spend,impressions,clicks,cpc,cpm,ctr,reach,actions,cost_per_action_type', 
    level: 'campaign', // Puxar dados a nível de campanha
    date_preset: 'last_30d', // Período: últimos 30 dias (pode mudar para 'maximum', 'this_month', etc)
};

async function fetchFacebookData() {
    try {
        console.log("Buscando dados no Facebook Ads...");
        const response = await axios.get(URL, { params });
        
        const data = response.data.data;
        
        console.log(`Sucesso! ${data.length} campanhas encontradas.`);
        
        // Salva os dados num arquivo JSON dentro da pasta 'data'
        const dir = path.join(__dirname, 'data');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        
        const filePath = path.join(dir, 'campaign_data.json');
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`Dados salvos com sucesso em ${filePath}`);
        
    } catch (error) {
        console.error("Erro ao buscar dados da API:");
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

fetchFacebookData();
