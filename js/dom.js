// Função para lidar com o menu
function toggleMenu() {
    const nav = document.querySelector('nav');
    nav.classList.toggle('active');
}

// Função para mostrar uma mensagem de carregamento
function mostrarCarregando() {
    const container = document.getElementById('perguntasContainer');
    container.innerHTML = ''; // Limpa qualquer conteúdo anterior
    const carregandoDiv = document.createElement('div');
    carregandoDiv.id = 'carregando';
    carregandoDiv.innerHTML = '<p>Gerando pergunta(s)...</p>';
    carregandoDiv.style.textAlign = 'center';
    carregandoDiv.style.fontSize = '18px';
    carregandoDiv.style.padding = '20px';
    carregandoDiv.style.fontStyle = 'italic';
    container.appendChild(carregandoDiv);
}

// Função para remover a mensagem de carregamento
function removerCarregando() {
    const carregandoDiv = document.getElementById('carregando');
    if (carregandoDiv) {
        carregandoDiv.remove();
    }
}

// Variável global para armazenar perguntas geradas
const perguntasExistentes = new Set(); // Usamos um Set para verificar duplicatas

// Função para atualizar o HTML com as perguntas e alternativas
function atualizarInterface(pergunta, alternativas, explicacao, index, vestibular) {
    const container = document.getElementById('perguntasContainer');

    const divPergunta = document.createElement('div');
    divPergunta.classList.add('bloco-questao'); // Adiciona a classe de animação

    setTimeout(() => {
        divPergunta.classList.add('visible'); // Ativa a animação após adição ao DOM
    }, 100); // Pequeno delay para a animação iniciar

    const perguntaElem = document.createElement('h2');
    perguntaElem.innerText = `${vestibular}: ${pergunta}`;
    divPergunta.appendChild(perguntaElem);

    const ulAlternativas = document.createElement('ul');

    alternativas.forEach((alt, idx) => {
        const li = document.createElement('li');
        li.innerText = `${idx + 1}. ${alt.Text}`;
        li.addEventListener('click', function () {
            const alternativasLi = ulAlternativas.querySelectorAll('li');
            alternativasLi.forEach(item => item.classList.remove('selecionada'));
            li.classList.add('selecionada');
            perguntasGeradas[index].alternativaSelecionada = alt;

            // Animação de zoom ao clicar na alternativa
            li.style.transition = "transform 0.2s ease";
            li.style.transform = "scale(1.05)";
            setTimeout(() => {
                li.style.transform = "scale(1)";
            }, 200);
        });
        ulAlternativas.appendChild(li);
    });

    divPergunta.appendChild(ulAlternativas);

    const botaoVerResposta = document.createElement('button');
    botaoVerResposta.innerText = 'Ver Resposta';
    botaoVerResposta.classList.add('ver-resposta');
    botaoVerResposta.addEventListener('click', function () {
        if (!perguntasGeradas[index].alternativaSelecionada) {
            alert('Por favor, selecione uma alternativa.');
            return;
        }

        const alternativasLi = ulAlternativas.querySelectorAll('li');
        alternativasLi.forEach((li, idx) => {
            if (alternativas[idx].correct) {
                li.classList.add('correct'); // Alternativa correta recebe a classe 'correct'
            } else {
                li.classList.add('incorrect'); // Alternativa incorreta recebe a classe 'incorrect'
            }

            li.style.pointerEvents = 'none'; // Desativa o clique nas alternativas
        });

        botaoVerResposta.disabled = true; // Desativa o botão após o clique

        const divExplicacao = document.createElement('div');
        divExplicacao.classList.add('resposta', 'fade-in');
        divExplicacao.innerHTML = `<strong>Explicação:</strong> ${explicacao}`;
        divPergunta.appendChild(divExplicacao);
    });

    divPergunta.appendChild(botaoVerResposta);
    container.appendChild(divPergunta);
}

// Função para lidar com o clique no botão "Gerar Pergunta"
document.getElementById('gerarPergunta').addEventListener('click', async function () {
    const dificuldade = document.getElementById('difficulty').value;
    const tema = document.getElementById('tema').value;
    const vestibular = document.getElementById('vestibular').value;
    const quantidade = document.getElementById('quantidadePerguntas').value;

    mostrarCarregando(); // Mostra a mensagem de carregamento

    try {
        const response = await fetch('https://cesio.vercel.app/api/gerarPergunta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dificuldade, tema, quantidade, vestibular })
        });

        if (!response.ok) throw new Error('Erro na requisição');

        const resultado = await response.json();

        removerCarregando(); // Remove a mensagem de carregamento

        const container = document.getElementById('perguntasContainer');
        container.innerHTML = ''; // Limpa perguntas anteriores

        if (Array.isArray(resultado)) {
            perguntasGeradas = resultado.map((perguntaData, index) => {
                // Verifica se a pergunta já foi exibida
                if (!perguntasExistentes.has(perguntaData.pergunta)) {
                    perguntasExistentes.add(perguntaData.pergunta); // Armazena a pergunta para evitar repetição
                    atualizarInterface(perguntaData.pergunta, perguntaData.alternativas, perguntaData.explicacao, index);
                    return {
                        pergunta: perguntaData.pergunta,
                        alternativas: perguntaData.alternativas,
                        explicacao: perguntaData.explicacao,
                        alternativaSelecionada: null,
                    };
                } else {
                    console.log('Pergunta repetida ignorada:', perguntaData.pergunta);
                }
            }).filter(Boolean); // Remove valores "undefined" no caso de perguntas repetidas
        }
    } catch (error) {
        removerCarregando(); // Remove a mensagem de carregamento em caso de erro
        alert('Erro ao gerar pergunta. Tente novamente.');
        console.error('Erro:', error);
    }
});
