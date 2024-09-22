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
            // Acessa o modelo generativo
            const model = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(promptText);

            console.log('Resultado da API:', JSON.stringify(result, null, 2)); // Exibe a resposta completa para inspeção

            const candidates = result?.response?.candidates;
            if (candidates && candidates.length > 0) {
                // Verifique se o conteúdo desejado está em 'output'
                const text = candidates[0]?.output || candidates[0]?.text || ''; // Verifica as possíveis chaves que contêm a resposta

                if (typeof text === 'string' && text.trim()) {
                    try {
                        const resultadoJSON = JSON.parse(text);
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
