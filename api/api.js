import { GoogleGenerativeAI } from '@google/generative-ai';

// Chave da API (é recomendado usar variáveis de ambiente em produção)
const apiKey = process.env.GOOGLE_API_KEY;
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
    const perguntasExistentes = new Set();
    
    for (let i = 0; i < numPerguntas; i++) {
        const promptText = `Gere uma pergunta(sem ser repetidas) sobre o tema ${tema} com dificuldade ${dificuldade}, 4 alternativas de resposta, e uma explicação da correta. Retorne no formato JSON com a seguinte estrutura (não é necessário especificar que o arquivo está em JSON):
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
            const model = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(promptText);

            console.log('Resultado da API:', JSON.stringify(result, null, 2));

            const candidates = result?.response?.candidates;
            if (candidates && candidates.length > 0) {
                // Acesse o conteúdo correto dentro da estrutura da resposta
                const text = candidates[0]?.content?.parts[0]?.text || '';

                if (typeof text === 'string' && text.trim()) {
                    try {
                        const resultadoJSON = JSON.parse(text); // Agora o JSON correto está aqui
                        perguntasGeradas.push({
                            pergunta: resultadoJSON.question,
                            alternativas: resultadoJSON.answers,
                            explicacao: resultadoJSON.explicacao
                        });
                    } catch (jsonError) {
                        console.error('Erro ao parsear JSON retornado:', jsonError, 'Resposta:', text);
                        res.status(500).json({ error: 'Erro ao processar o JSON da API', details: jsonError.message });
                        return;
                    }
                } else {
                    console.error('Resposta da API não está no formato JSON:', text);
                    res.status(500).json({ error: 'Resposta da API não está no formato JSON' });
                    return;
                }
            } else {
                console.error('Nenhum candidato encontrado na resposta da API.');
                res.status(500).json({ error: 'Nenhuma resposta válida foi encontrada.' });
                return;
            }
        } catch (error) {
            console.error('Erro ao gerar pergunta:', error, 'Prompt:', promptText);
            res.status(500).json({ error: 'Erro no servidor', details: error.message });
            return;
        }
    }

    // Enviar todas as perguntas geradas
    res.status(200).json(perguntasGeradas);
}


// Função principal de tratamento de requisições
export default async function handler(req, res) {
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
    } else if (req.method === 'GET') {
        res.status(200).send('Servidor está funcionando');
    } else {
        res.status(404).send('Rota não encontrada');
    }
}
