
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    let { prompt } = req.body;

    // Fallback caso o body não venha parseado (comum em algumas configs do Vercel)
    if (typeof req.body === 'string') {
        try {
            const parsed = JSON.parse(req.body);
            prompt = parsed.prompt;
        } catch (e) { }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Configuração de API Key ausente no servidor.' });
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Erro no Proxy API:', error);
        res.status(500).json({ error: 'Erro interno ao processar a resposta da IA.' });
    }
}
