const API_URL = 'http://localhost:3000/api';

// ─── Estado dos campos advanced ──────────────────────────────────────────────
const advState = {
    style:    'photorealistic',
    lighting: 'studio lighting',
    angle:    'close-up macro shot',
    bg:       'clean dark background',
    lang:     'pt-BR',
    tone:     'luxury & premium',
    ratio:    '1:1',
};

// ─── Init: tag selectors e preview ao vivo ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    const tagGroups = {
        'style-tags':    'style',
        'lighting-tags': 'lighting',
        'angle-tags':    'angle',
        'bg-tags':       'bg',
        'lang-tags':     'lang',
        'tone-tags':     'tone',
    };

    Object.entries(tagGroups).forEach(([groupId, stateKey]) => {
        const group = document.getElementById(groupId);
        if (!group) return;
        group.addEventListener('click', (e) => {
            const btn = e.target.closest('.tag');
            if (!btn) return;
            group.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            advState[stateKey] = btn.dataset.val;
            updatePreview();
        });
    });

    const ratioGroup = document.getElementById('ratio-tags');
    if (ratioGroup) {
        ratioGroup.addEventListener('click', (e) => {
            const btn = e.target.closest('.ratio-btn');
            if (!btn) return;
            ratioGroup.querySelectorAll('.ratio-btn').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            advState.ratio = btn.dataset.val;
            updatePreview();
        });
    }

    ['positive-override', 'negative-override'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
    });

    ['guidance-scale', 'inference-steps'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
    });

    const tx = document.getElementById('user-input');
    if (tx) {
        tx.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
            updatePreview();
        });
    }
});

// ─── Preview ao vivo ──────────────────────────────────────────────────────────
function updatePreview() {
    const previewEl = document.getElementById('prompt-preview-text');
    if (!previewEl) return;

    const mainInput = (document.getElementById('user-input')?.value || '').trim();
    const posExtra  = (document.getElementById('positive-override')?.value || '').trim();
    const negExtra  = (document.getElementById('negative-override')?.value || '').trim();
    const guidance  = document.getElementById('guidance-scale')?.value || '7.5';
    const steps     = document.getElementById('inference-steps')?.value || '45';

    const subject = mainInput || '[your brand idea]';

    const pos = `${advState.style} photo of ONE ${subject}, ${advState.angle}, ` +
                `${advState.lighting}, ${advState.bg}` +
                (posExtra ? `, ${posExtra}` : '') +
                `, 8k, hyper-realistic, commercial quality`;

    const neg = `cartoon, illustration, 3d render, anime, text, watermark, blurry, multiple items` +
                (negExtra ? `, ${negExtra}` : '');

    previewEl.textContent =
        `[+] ${pos}\n` +
        `[-] ${neg}\n` +
        `[cfg] guidance: ${guidance}  steps: ${steps}  ratio: ${advState.ratio}  lang: ${advState.lang}  tone: ${advState.tone}`;

    previewEl.classList.toggle('has-content', mainInput.length > 0);
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetAdvanced() {
    advState.style    = 'photorealistic';
    advState.lighting = 'studio lighting';
    advState.angle    = 'close-up macro shot';
    advState.bg       = 'clean dark background';
    advState.lang     = 'pt-BR';
    advState.tone     = 'luxury & premium';
    advState.ratio    = '1:1';

    ['positive-override', 'negative-override'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const gs = document.getElementById('guidance-scale');
    const is = document.getElementById('inference-steps');
    if (gs) { gs.value = '7.5'; document.getElementById('guidance-val').textContent = '7.5'; }
    if (is) { is.value = '45';  document.getElementById('steps-val').textContent = '45'; }

    const defaults = {
        'style-tags':    'photorealistic',
        'lighting-tags': 'studio lighting',
        'angle-tags':    'close-up macro shot',
        'bg-tags':       'clean dark background',
        'lang-tags':     'pt-BR',
        'tone-tags':     'luxury & premium',
    };
    Object.entries(defaults).forEach(([groupId, defaultVal]) => {
        const group = document.getElementById(groupId);
        if (!group) return;
        group.querySelectorAll('.tag').forEach(t => {
            t.classList.toggle('active', t.dataset.val === defaultVal);
        });
    });

    const ratioGroup = document.getElementById('ratio-tags');
    if (ratioGroup) {
        ratioGroup.querySelectorAll('.ratio-btn').forEach(t => {
            t.classList.toggle('active', t.dataset.val === '1:1');
        });
    }

    updatePreview();
}

// ─── Toggle painel ────────────────────────────────────────────────────────────
function toggleAdvanced() {
    const fields = document.getElementById('advanced-fields');
    const chevron = document.getElementById('toggle-chevron');
    const label = document.getElementById('toggle-label');
    const btn = document.getElementById('advanced-toggle-btn');

    // Toggle da classe hidden (que no CSS vamos melhorar)
    fields.classList.toggle('hidden');
    
    const isOpen = !fields.classList.contains('hidden');
    
    // Rotação do ícone e mudança de texto
    chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    label.textContent = isOpen ? 'Hide Settings' : 'Advanced Settings';
    
    // Feedback visual no botão
    btn.style.borderColor = isOpen ? 'var(--accent)' : '#222';

    if (isOpen) {
        updatePreview();
        // Scroll suave para mostrar os campos se estiver no mobile
        fields.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ─── Coleta parâmetros ────────────────────────────────────────────────────────
function collectAdvancedParams() {
    const isOpen = !document.getElementById('advanced-fields').classList.contains('hidden');
    if (!isOpen) return null;

    return {
        style:            advState.style,
        lighting:         advState.lighting,
        angle:            advState.angle,
        background:       advState.bg,
        language:         advState.lang,
        tone:             advState.tone,
        ratio:            advState.ratio,
        positiveOverride: (document.getElementById('positive-override')?.value || '').trim(),
        negativeOverride: (document.getElementById('negative-override')?.value || '').trim(),
        guidanceScale:    parseFloat(document.getElementById('guidance-scale')?.value || 7.5),
        inferenceSteps:   parseInt(document.getElementById('inference-steps')?.value || 45),
    };
}

// ─── Gera o post ──────────────────────────────────────────────────────────────
async function generatePost() {
    const promptInput   = document.getElementById('user-input');
    const statusText    = document.getElementById('status-text');
    const outputContent = document.getElementById('output-content');
    const promptValue   = promptInput.value.trim();

    if (!promptValue) {
        alert('Please enter a prompt first!');
        return;
    }

    statusText.innerHTML = '<span class="loading-dots">Processing</span>';
    outputContent.innerHTML = `
        <div style="display:flex; gap:16px; align-items:flex-start; padding:10px 0;">
            <div class="loader"></div>
            <div style="font-size:0.82rem; color:#555; line-height:2;">
                <span style="color:#888">01 —</span> Sanitizing prompt...<br>
                <span style="color:#888">02 —</span> Calling Gemini API...<br>
                <span style="color:#888">03 —</span> Building image prompt...<br>
                <span style="color:#888">04 —</span> Rendering with SDXL...
            </div>
        </div>`;

    try {
        const advancedParams = collectAdvancedParams();

        const response = await fetch(`${API_URL}/generate-post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: promptValue,
                advanced: advancedParams
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.details || `Server error ${response.status}`);
        }

        const data = await response.json();
        statusText.innerHTML = 'Generation Complete ✨';
        renderPost(data.post);
        promptInput.value = '';
        promptInput.style.height = 'auto';

    } catch (err) {
        console.error(err);
        statusText.innerHTML = 'Connection Failed';
        outputContent.innerHTML = `
            <p style="color:#ff5959; font-size:0.9rem;">
                <i class="bi bi-exclamation-triangle"></i>
                ${err.message || 'Error connecting to the server. Check if your Node.js API is running at localhost:3000.'}
            </p>`;
    }
}

// ─── Renderiza mockup ─────────────────────────────────────────────────────────
function renderPost(post) {
    const outputContent = document.getElementById('output-content');
    const safeDesc   = (post.descricao  || '').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const safeTitulo = (post.titulo     || '').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const fullCaption = `${post.titulo}\n\n${post.descricao}\n\n${(post.hashtags||[]).join(' ')}`;
    const safeCaption = fullCaption.replace(/`/g, '\\`').replace(/\$/g, '\\$');

    outputContent.innerHTML = `
        <div class="insta-mockup">
            <div class="mockup-header">
                <div class="user-avatar">FH</div>
                <div style="flex:1">
                    <div style="font-size:0.9rem; font-weight:600;">Fernando Henrique AI</div>
                    <div style="font-size:0.72rem; color:#555;">Sponsored · Just now</div>
                </div>
                <i class="bi bi-three-dots" style="color:#555; cursor:pointer;"></i>
            </div>

            <div style="position:relative;">
                <img src="${post.imagemUrl}" class="mockup-img" alt="AI Generated Content"
                    onerror="this.style.background='#111'; this.style.minHeight='300px';">
                <div style="position:absolute; bottom:10px; right:10px;
                    background:rgba(0,0,0,0.6); border-radius:6px; padding:3px 8px;
                    font-size:0.68rem; color:#aaa; backdrop-filter:blur(6px);">
                    AI Generated
                </div>
            </div>

            <div class="mockup-footer">
                <div style="display:flex; gap:16px; margin-bottom:12px; font-size:1.2rem; color:#888;">
                    <i class="bi bi-heart" style="cursor:pointer; transition:0.2s;"
                        onmouseover="this.style.color='#ff5959'" onmouseout="this.style.color='#888'"></i>
                    <i class="bi bi-chat" style="cursor:pointer; transition:0.2s;"
                        onmouseover="this.style.color='white'" onmouseout="this.style.color='#888'"></i>
                    <i class="bi bi-send" style="cursor:pointer; transition:0.2s;"
                        onmouseover="this.style.color='white'" onmouseout="this.style.color='#888'"></i>
                </div>

                <p class="post-title"><strong>${post.titulo}</strong></p>
                <p class="post-desc">${post.descricao}</p>

                ${post.tags ? `<p style="font-size:0.78rem; color:#444; margin-bottom:8px;">
                    ${post.tags.map(t => `<span style="background:#111; border-radius:4px; padding:2px 7px; margin:2px; display:inline-block;">${t}</span>`).join('')}
                </p>` : ''}

                <p class="post-hashtags">${(post.hashtags || []).join(' ')}</p>

                ${post.cta ? `<div style="margin-top:12px; padding:10px 14px;
                    background:rgba(182,89,255,0.08); border:1px solid rgba(182,89,255,0.2);
                    border-radius:8px; font-size:0.82rem; color:var(--accent);">
                    <i class="bi bi-arrow-right-circle"></i> ${post.cta}
                </div>` : ''}

                <div class="action-bar">
                    <button class="btn-action" onclick="copyCaption(\`${safeDesc}\`)">
                        <i class="bi bi-clipboard"></i> Copy
                    </button>
                    <button class="btn-action" onclick="copyCaption(\`${safeCaption}\`)">
                        <i class="bi bi-file-text"></i> Full Caption
                    </button>
                    <button class="btn-action" onclick="downloadImage('${post.imagemUrl}', 'ai-post.jpg')">
                        <i class="bi bi-download"></i> Save
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
function copyCaption(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied!');
    });
}

function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position:fixed; bottom:24px; right:24px;
        background:#1a1a1a; border:1px solid #333;
        color:white; padding:10px 20px; border-radius:8px;
        font-size:0.82rem; z-index:9999;
        animation: slideDown 0.2s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}