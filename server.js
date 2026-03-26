require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '50mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── 1. SANITIZAÇÃO (Melhorada para aceitar caracteres especiais de marketing) ───
function sanitizeUserInput(input) {
    if (!input || typeof input !== 'string') return '';
    return input.trim().replace(/\s+/g, ' ').slice(0, 250);
}

// ─── 2. BUILDER DE PROMPT (Integrado com os Sliders do Claude) ───
function buildImagePrompt(keywords, advanced = null) {
    // Se o painel estiver fechado, usamos um "Visual Style" padrão de alta qualidade
    const style    = advanced?.style    || 'professional advertising photography';
    const lighting = advanced?.lighting || 'studio lighting';
    const angle    = advanced?.angle    || 'close-up shot';
    const bg       = advanced?.background || 'clean minimalist background';

    // A "mágica" para evitar pilhas de comida: "ONE single" e "Centered composition"
    let positivePrompt = 
        `${style} of ONE single ${keywords}, centered composition, ${angle}, ${lighting}, ${bg}, ` +
        `8k resolution, photorealistic, cinematic lighting, masterpiece, commercial food styling`;

    if (advanced?.positiveOverride) positivePrompt += `, ${advanced.positiveOverride}`;

    // Negative Prompt Agressivo para manter o realismo
    let negativePrompt = "stack of items, multiple objects, piled, messy, distorted, text, watermark, logo, blurry, cartoon, anime, 3d render, lowres, ugly, mutated, messy table, cluttered";
    if (advanced?.negativeOverride) negativePrompt += `, ${advanced.negativeOverride}`;

    return { positive: positivePrompt, negative: negativePrompt };
}

// ─── 3. GERAÇÃO DE IMAGEM (Com suporte a Guidance e Steps) ───
async function generateImage(promptObj, advanced = null) {
    const hfToken = process.env.HUGGING_FACE_TOKEN;
    
    // Captura os valores exatos dos Sliders do front-end
    const guidance  = advanced?.guidanceScale ? parseFloat(advanced.guidanceScale) : 7.5;
    const steps     = advanced?.inferenceSteps ? parseInt(advanced.inferenceSteps) : 45;

    const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
            headers: { "Authorization": `Bearer ${hfToken}`, "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify({
                inputs: promptObj.positive,
                parameters: {
                    negative_prompt: promptObj.negative,
                    num_inference_steps: steps,
                    guidance_scale: guidance,
                },
                options: { wait_for_model: true }
            }),
        }
    );

    if (!response.ok) throw new Error(`HF Error: ${response.status}`);
    const buffer = await response.arrayBuffer();
    return `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
}

// ─── 4. ENDPOINT (Corrigindo o nome do modelo para 1.5-flash) ───
app.post('/api/generate-post', async (req, res) => {
    try {
        const { prompt, advanced } = req.body;
        if (!prompt) return res.status(400).json({ error: "Prompt is required" });

        const cleanPrompt = sanitizeUserInput(prompt);
        
        // IMPORTANTE: Usei gemini-1.5-flash (o 2.5 ainda não é estável para todos)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = `You are a world-class creative director. Respond ONLY with JSON.
        Language: ${advanced?.language || 'pt-BR'}. 
        Tone: ${advanced?.tone || 'professional'}.
        
        Structure:
        {
          "titulo": "Punchy headline",
          "descricao": "Engaging copy",
          "tags": ["tag1", "tag2"],
          "cta": "Call to action",
          "hashtags": ["#tag1"],
          "imagemKeywords": "ONE English sentence describing the main subject only"
        }`;

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: `Create a post for: ${cleanPrompt}` }
        ]);

        const postData = JSON.parse(result.response.text().replace(/```json|```/g, ""));

        // Gera o prompt visual unindo IA + Cliques do Usuário
        const imagePromptObj = buildImagePrompt(postData.imagemKeywords, advanced);
        
        const imagemUrl = await generateImage(imagePromptObj, advanced);

        res.json({ success: true, post: { ...postData, imagemUrl } });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: "Failed to generate post", details: error.message });
    }
});

app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));