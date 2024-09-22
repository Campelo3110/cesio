import { GoogleGenerativeAI } from '@google/generative-ai'; // Import em vez de require

// Usar a variável de ambiente para a chave da API (continua no código conforme solicitado)
const apiKey = "AIzaSyBc1V0aD1WeeRfFtcC8stNPFvxMYL7P4O8";
const genAI = new GoogleGenerativeAI(apiKey);

// Função para manipular o corpo da requisição
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Função para lidar com a rota /gerarPergunta
async function gerarPerguntaHandler(req, res, body) {
    const { dificuldade, tema, quantidade } = body;
    const numPerguntas = Math.min(Math.max(parseInt(quantidade, 10), 1), 10);

    const perguntasGeradas = [];

    for (let i = 0; i < numPerguntas; i++) {
        const promptText = `Gere uma pergunta sobre o tema ${tema} com dificuldade ${dificuldade}, 4 alternativas de resposta, e uma explicação da correta. Retorne no formato JSON com a seguinte estrutura:
        {
          "question": "Pergunta",
          "answers": [
            { "Text": "alternativa 1", "correct": "boolean" },
            { "Text": "alternativa 2", "correct": "boolean" },
            { "Text": "alternativa 3", "correct": "boolean" },
            { "Text": "alternativa 4", "correct": "boolean" }
          ],
          "explicacao": "Explicação da resposta correta"
        }`;

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(promptText);

            // Verifique se a resposta está no formato esperado
            if (result && result.response && result.response.text) {
                const text = result.response.text;

                // Verifique se a resposta parece ser JSON
                if (text.startsWith('{') || text.startsWith('[')) {
                    try {
                        const resultadoJSON = JSON.parse(text);
                        perguntasGeradas.push({
                            pergunta: resultadoJSON.question,
                            alternativas: resultadoJSON.answers,
                            explicacao: resultadoJSON.explicacao
                        });
                    } catch (jsonError) {
                        console.error('Erro ao parsear JSON retornado:', jsonError);
                        res.status(500).json({ error: 'Erro ao processar o JSON da API', details: jsonError.message });
                        return;
                    }
                } else {
                    console.error('Resposta da API não está no formato JSON:', text);
                    res.status(500).json({ error: 'Resposta da API não está no formato JSON' });
                    return;
                }
            } else {
                res.status(500).json({ error: 'Resposta da API inválida' });
                return;
            }
        } catch (error) {
            console.error('Erro ao gerar pergunta:', error);
            res.status(500).json({ error: 'Erro no servidor', details: error.message });
            return;
        }
    }

    // Enviar todas as perguntas geradas
    res.status(200).json(perguntasGeradas);
}

export default async function handler(req, res) {
    // Tratando preflight requests (solicitações OPTIONS)
    if (req.method === 'OPTIONS') {
        res.status(204)
            .setHeader('Access-Control-Allow-Origin', '*')
            .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            .setHeader('Access-Control-Allow-Headers', 'Content-Type')
            .end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/gerarPergunta') {
        try {
            const body = await parseRequestBody(req);
            await gerarPerguntaHandler(req, res, body);
        } catch (error) {
            res.status(400).json({ error: 'Erro ao processar o corpo da requisição' });
        }
    } else if (req.method === 'GET' && req.url === '/') {
        res.status(200).send('Servidor está funcionando');
    } else {
        res.status(404).send('Rota não encontrada');
    }
}
