
    // Obtém o caminho da página atual
    const paginaAtual = window.location.pathname;

    // Cria uma chave única para os comentários com base na página
    const chaveLocalStorage = `comentarios_${paginaAtual}`;

    // Obtém a lista de comentários da localStorage
    var ListaComentarios = document.getElementById('listaComentarios');
    let comentarios = localStorage.getItem(chaveLocalStorage) ? JSON.parse(localStorage.getItem(chaveLocalStorage)) : [];

    // Adiciona os comentários existentes à lista
    comentarios.map(item => {
        var novoItem = document.createElement('li');
        var textoNovoItem = document.createTextNode(`Comentário: ${item.comentario}, Avaliação: ${item.avaliacao}`);
        novoItem.appendChild(textoNovoItem);
        ListaComentarios.appendChild(novoItem);
    })

    // Função para adicionar um novo comentário
    const addComentario = () => {
        const comentario = document.getElementById("comentario");
        const avaliacao = document.getElementById("avaliacao");

        // Converte a avaliação para um número
        const avaliacaoNumerica = parseFloat(avaliacao.value);

        // Verifica se a avaliação está dentro do intervalo de 0 a 10
        if (!isNaN(avaliacaoNumerica) && avaliacaoNumerica >= 0 && avaliacaoNumerica <= 10) {
            // Cria um objeto de comentário
            const objComentario = {
                comentario: comentario.value,
                avaliacao: avaliacaoNumerica // Usa a avaliação convertida
            }

            // Obtém os comentários existentes da localStorage
            let comentarios = localStorage.getItem(chaveLocalStorage) ? JSON.parse(localStorage.getItem(chaveLocalStorage)) : [];

            // Adiciona o novo comentário à lista
            comentarios.push(objComentario);

            // Atualiza a localStorage com os novos comentários
            localStorage.setItem(chaveLocalStorage, JSON.stringify(comentarios));

            // Adiciona o novo comentário à lista na página
            var ListaComentarios = document.getElementById('listaComentarios');
            var novoItem = document.createElement('li');
            var textoNovoItem = document.createTextNode(`Comentário: ${objComentario.comentario}, Avaliação: ${objComentario.avaliacao}`);
            novoItem.appendChild(textoNovoItem);
            ListaComentarios.appendChild(novoItem);
        } else {
            // Exibe uma mensagem de erro se a avaliação estiver fora do intervalo
            alert("Avaliação inválida. Insira um valor entre 0 e 10.");
        }
    }
