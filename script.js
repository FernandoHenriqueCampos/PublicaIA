const API_URL = 'http://localhost:3000/api';

async function generatePost() {
    // Referências dos elementos da UI
    const promptInput = document.getElementById('user-input'); // ID atualizado para o nosso novo HTML
    const statusText = document.getElementById('status-text');
    const outputContent = document.getElementById('output-content');
    
    const promptValue = promptInput.value;

    if (!promptValue) {
        alert("Please enter a prompt first!");
        return;
    }

    // Início do Estado Visual de Carregamento
    statusText.innerText = "Connecting to Fernando's API...";
    outputContent.innerHTML = "<div class='loader'></div>";
    
    try {
        const response = await fetch(`${API_URL}/generate-post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptValue })
        });

        if (!response.ok) throw new Error("Server error");

        const data = await response.json();

        // Atualiza o status e renderiza o post
        statusText.innerText = "Generation Complete ✨";
        renderPost(data.post);

        // Limpa o input após o sucesso (Opcional, mas melhora a UX)
        promptInput.value = "";

    } catch (err) {
        console.error(err);
        statusText.innerText = "Connection Failed";
        outputContent.innerHTML = `<p style="color: #ff5959; font-size: 0.9rem;">
            <i class="bi bi-exclamation-triangle"></i> Error connecting to the server. 
            Check if your Node.js API is running at localhost:3000.
        </p>`;
    }
}

function renderPost(post) {
    const outputContent = document.getElementById('output-content');
    
    // Usando o estilo de "Card" que combina com o design dark
    outputContent.innerHTML = `
        <div class="insta-mockup">
            <div class="mockup-header">
                <div class="user-avatar">FH</div>
                <span>Fernando Henrique AI</span>
            </div>
            <img src="${post.imagemUrl}" class="mockup-img" alt="AI Generated Content">
            <div class="mockup-footer">
                <p class="post-title"><strong>${post.titulo}</strong></p>
                <p class="post-desc">${post.descricao}</p>
                <p class="post-hashtags">${post.hashtags.join(' ')}</p>
                
                <div class="action-bar">
                    <button class="btn-action" onclick="copyCaption(\`${post.descricao}\`)">
                        <i class="bi bi-clipboard"></i> Copy
                    </button>
                    <button class="btn-action" onclick="downloadImage('${post.imagemUrl}', 'ai-post.jpg')">
                        <i class="bi bi-download"></i> Save
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Funções Utilitárias permanecem as mesmas, mas com ícones Bootstrap
function copyCaption(text) {
    navigator.clipboard.writeText(text);
    alert("Caption copied to clipboard!");
}

function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}