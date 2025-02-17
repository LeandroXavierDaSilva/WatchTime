    // Restante do seu código JavaScript...

    // Função para atualizar a média
    const atualizarMedia = () => {
        const somaAvaliacoes = comentarios.reduce((total, comentario) => total + comentario.avaliacao, 0);
        const media = comentarios.length > 0 ? somaAvaliacoes / comentarios.length : 0;
        document.getElementById('valorMedia').innerText = media.toFixed(2);
    }

    // Chame a função para calcular a média inicial
    atualizarMedia();
