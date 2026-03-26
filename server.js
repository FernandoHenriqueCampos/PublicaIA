require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// Logs de debug para todas as requisições
app.use((req, res, next) => {
    console.log(`\n📨 ${req.method} ${req.path}`);
    next();
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '50mb' }));

// Verificar se API key está carregada
if (!process.env.GEMINI_API_KEY) {
    console.error('❌ ERRO: GEMINI_API_KEY não encontrada no .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log('✅ Google Gemini API inicializada');

// Função para gerar imagem usando Hugging Face
async function generateImage(description) {
    try {
        console.log(`\n🎨 Gerando imagem com o novo roteador HF: "${description.substring(0, 50)}..."`);
        
        const hfToken = process.env.HUGGING_FACE_TOKEN;
        
        // Nova URL recomendada pelo erro 410
        const response = await fetch(
            "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
            {
                headers: { 
                    "Authorization": `Bearer ${hfToken}`,
                    "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify({ 
                    inputs: description,
                    parameters: {
                        negative_prompt: "blurry, low quality, distorted, deformed"
                    },
                    options: {
                        wait_for_model: true // Espera o modelo carregar se estiver "dormindo"
                    }
                }),
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Status ${response.status}: ${errorText}`);
        }
        
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        console.log(`✅ Imagem gerada com sucesso!`);
        return `data:image/jpeg;base64,${base64}`;
        
    } catch (error) {
        console.error("❌ Erro na geração da imagem:", error.message);
        throw error;
    }
}

// Rota para gerar publicação completa
app.post('/api/generate-post', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt é obrigatório" });
        }

        console.log(`\n📝 Gerando publicação com prompt: "${prompt}"\n`);

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash-lite"
        });

        // Prompt otimizado para gerar conteúdo de redes sociais
        const systemPrompt = `Você é um especialista em marketing digital e criação de conteúdo para redes sociais.
        
Baseado no prompt do usuário, gere um JSON com a seguinte estrutura (RESPONDA APENAS COM O JSON, SEM EXPLICAÇÕES):

{
  "titulo": "Um título atrativo e conciso (máx 60 caracteres)",
  "descricao": "Uma descrição envolvente para a publicação (150-250 caracteres, otimizada para cliques)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "cta": "Uma call-to-action clara (Clique aqui, Saiba mais, etc)",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "toneOfVoice": "profissional ou casual",
  "imagemKeywords": "palavras-chave para buscar a imagem (separadas por vírgula)"
}

Garanta que:
- O título seja atrativo e gere curiosidade
- A descrição inclua um benefício claro para o usuário
- As tags sejam relevantes para o nicho
- As hashtags sejam populares e relacionadas
- As palavras-chave para imagem descrever bem o conteúdo`;

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: `Gere conteúdo para esta publicação: ${prompt}` }
        ]);

        const response = await result.response;
        const text = response.text();

        // Parse do JSON retornado
        let postData;
        try {
            postData = JSON.parse(text);
        } catch (e) {
            // Tenta extrair JSON se houver texto extra
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                postData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Não foi possível extrair JSON válido da resposta");
            }
        }

        // Gera imagem baseada nas keywords
        console.log("🖼️  Gerando imagem com IA...");
        let imagemUrl;
        try {
            imagemUrl = await generateImage(postData.imagemKeywords);
        } catch (imageError) {
            console.error("⚠️  Erro ao gerar imagem, usando placeholder:");
            imagemUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'%3E%3Crect fill='%23f0f0f0' width='1200' height='630'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='%23999'%3EErro ao gerar imagem%3C/text%3E%3C/svg%3E";
        }

        // Retorna publicação completa
        res.json({
            success: true,
            post: {
                titulo: postData.titulo,
                descricao: postData.descricao,
                tags: postData.tags || [],
                hashtags: postData.hashtags || [],
                cta: postData.cta || "Saiba mais",
                toneOfVoice: postData.toneOfVoice || "profissional",
                imagemUrl: imagemUrl,
                imagemKeywords: postData.imagemKeywords
            }
        });

        console.log("✅ Publicação gerada com sucesso!\n");

    } catch (error) {
        console.error("❌ Erro detalhado:", error.message);
        res.status(500).json({ 
            error: "Erro ao gerar publicação",
            details: error.message
        });
    }
});

// Rota para gerar múltiplas variações (para A/B testing)
app.post('/api/generate-posts-variants', async (req, res) => {
    try {
        const { prompt, variants = 3 } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt é obrigatório" });
        }

        console.log(`\n📝 Gerando ${variants} variações...\n`);

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash-lite"
        });

        const systemPrompt = `Você é um especialista em marketing digital.
        
Gere ${variants} variações diferentes para a mesma publicação. Para cada variação, retorne um JSON com:

{
  "variacao": 1,
  "titulo": "Título único (máx 60 caracteres)",
  "descricao": "Descrição única (150-250 caracteres)",
  "tags": ["tag1", "tag2", "tag3"],
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "cta": "Call-to-action",
  "imagemKeywords": "palavras para imagem"
}

IMPORTANTE: Retorne APENAS um array JSON, sem explicações. Exemplo:
[{...}, {...}]`;

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: `Crie ${variants} variações para: ${prompt}` }
        ]);

        const response = await result.response;
        let text = response.text();

        // Remove marcadores de código se houver
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        let variações;
        try {
            variações = JSON.parse(text);
        } catch (e) {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                variações = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Erro ao fazer parse das variações");
            }
        }

        // Gera imagens para cada variação
        console.log(`🎨 Gerando ${variações.length} imagens...`);
        const postsComImagem = await Promise.all(
            variações.map(async (post) => {
                try {
                    const imagemUrl = await generateImage(post.imagemKeywords);
                    return {
                        ...post,
                        imagemUrl
                    };
                } catch (imgError) {
                    console.warn(`⚠️  Erro gerando imagem para variação, usando placeholder`);
                    return {
                        ...post,
                        imagemUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'%3E%3Crect fill='%23f0f0f0' width='1200' height='630'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='%23999'%3EErro ao gerar imagem%3C/text%3E%3C/svg%3E"
                    };
                }
            })
        );

        res.json({
            success: true,
            totalVariacoes: postsComImagem.length,
            posts: postsComImagem
        });

        console.log(`✅ ${postsComImagem.length} variações geradas!\n`);

    } catch (error) {
        console.error("❌ Erro:", error.message);
        res.status(500).json({ 
            error: "Erro ao gerar variações",
            details: error.message
        });
    }
});

// Rota de teste
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ Servidor de publicações está rodando!',
        endpoints: {
            'POST /api/generate-post': 'Gera uma publicação completa',
            'POST /api/generate-posts-variants': 'Gera múltiplas variações de uma publicação'
        }
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({ message: '✅ Servidor está rodando!' });
});

// Rota para diagnosticar problemas
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        apiKeyLoaded: !!process.env.GEMINI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
    console.log(`❌ Rota não encontrada: ${req.method} ${req.path}`);
    res.status(404).json({ 
        error: `Rota não encontrada: ${req.method} ${req.path}`,
        availableRoutes: [
            'GET /',
            'GET /api/test',
            'GET /api/status',
            'POST /api/generate-post',
            'POST /api/generate-posts-variants'
        ]
    });
});

app.listen(3000, () => {
    console.log('\n🚀 Servidor de publicações rodando em http://localhost:3000');
    console.log('📍 Teste: http://localhost:3000/api/test\n');
});