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
// Função para lidar com a rota /gerarPergunta
async function gerarPerguntaHandler(req, res, body) {
    const { dificuldade, tema, quantidade } = body;
    const numPerguntas = Math.min(Math.max(parseInt(quantidade, 10), 1), 10);
    const perguntasGeradas = [];
    const perguntasExistentes = new Set(); // Set para verificar duplicatas

    for (let i = 0; i < numPerguntas; i++) {
        let perguntaValida = false;
        let tentativa = 0;

        while (!perguntaValida && tentativa < 10) { // Limita a 10 tentativas para evitar loops longos
            tentativa++;

            const promptText = `
                Gere uma pergunta sobre o tema ${tema} com dificuldade ${dificuldade}, 4 alternativas de resposta, 
                e uma explicação da correta. Retorne no formato JSON com a seguinte estrutura(não é necessário especificar que o arquivo está em JSON):
                {
                    "question": "Pergunta",
                    "answers": [
                        { "Text": "alternativa 1", "correct": "boolean" },
                        { "Text": "alternativa 2", "correct": "boolean" },
                        { "Text": "alternativa 3", "correct": "boolean" },
                        { "Text": "alternativa 4", "correct": "boolean" }
                    ],
                    "explicacao": "Explicação da resposta correta"
                }
            `;

            try {
                // Acessa o modelo generativo
                const model = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent(promptText);
                const candidates = result?.response?.candidates;

                if (candidates && candidates.length > 0) {
                    const text = candidates[0]?.output || candidates[0]?.text || '';

                    if (typeof text === 'string' && text.trim()) {
                        const resultadoJSON = JSON.parse(text);

                        // Verifica se a pergunta já foi gerada antes
                        if (!perguntasExistentes.has(resultadoJSON.question)) {
                            perguntasExistentes.add(resultadoJSON.question); // Armazena a pergunta única
                            perguntasGeradas.push({
                                pergunta: resultadoJSON.question,
                                alternativas: resultadoJSON.answers,
                                explicacao: resultadoJSON.explicacao
                            });
                            perguntaValida = true; // Sai do loop de tentativa
                        } else {
                            console.log('Pergunta repetida, tentando gerar outra...');
                        }
                    } else {
                        console.error('Resposta da API não está no formato esperado:', text);
                    }
                } else {
                    console.error('Nenhum candidato válido encontrado.');
                }
            } catch (error) {
                console.error('Erro ao gerar pergunta:', error.message);
                res.status(500).json({ error: 'Erro no servidor', details: error.message });
                return;
            }
        }
    }

    // Se o número de perguntas geradas for o esperado, responde com sucesso
    if (perguntasGeradas.length === numPerguntas) {
        res.status(200).json(perguntasGeradas);
    } else {
        res.status(500).json({ error: 'Não foi possível gerar perguntas únicas suficientes' });
    }
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
