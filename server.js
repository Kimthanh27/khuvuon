const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');

const app = express();
const upload = multer(); // Middleware xử lý multipart/form-data

// Cấu hình CORS để tránh lỗi khi gọi API từ frontend
app.use(cors());
app.use(express.json());

// Leonardo AI API key
const API_KEY = '378df0a9-bd98-44e3-b51b-716cc1520ec6';
// OpenAI API key
const OPENAI_API_KEY = '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';

// Endpoint: Generate Prompt using OpenAI Chat API
app.post('/api/generate-prompt', async (req, res) => {
    const { keyword } = req.body;
    if (!keyword) {
        return res.status(400).json({ error: "Keyword is required." });
    }

    try {
        const openaiResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-4",
                messages: [
                    { role: "system", content: "Generate a Leonardo AI prompt for an image." },
                    { role: "user", content: `Keyword: "${keyword}"` }
                ],
                temperature: 0.7,
                max_tokens: 150
            },
            { headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` } }
        );

        const generatedPrompt = openaiResponse.data.choices?.[0]?.message?.content;
        if (!generatedPrompt) {
            return res.status(500).json({ error: "No prompt generated." });
        }

        res.json({ prompt: generatedPrompt.trim() });
    } catch (err) {
        console.error("OpenAI Error:", err.response?.data || err.message);
        res.status(500).json({ error: "Failed to generate prompt." });
    }
});

// Endpoint: Generate Images using Leonardo AI
app.post('/api/generate-upscaled', upload.single('image'), async (req, res) => {
    try {
        const imageFile = req.file;
        const prompt = req.body.prompt || 'A galaxy over snowy mountains';
        const strength = parseFloat(req.body.strength) || 0.5;
        const modelId = 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3';

        if (!imageFile || !prompt) {
            return res.status(400).json({ error: "Thiếu ảnh hoặc prompt." });
        }

        // 1. Upload ảnh lên Leonardo AI
        const formData = new FormData();
        formData.append('file', imageFile.buffer, { filename: imageFile.originalname });

        // Gửi ảnh lên Leonardo AI
        const uploadResp = await axios.post('https://cloud.leonardo.ai/api/rest/v1/init-image', formData, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });

        const initImageId = uploadResp.data.uploadInitImage.id;

        // 2. Gửi yêu cầu tạo ảnh
        const generationResp = await axios.post(
            'https://cloud.leonardo.ai/api/rest/v1/generations',
            {
                prompt: prompt,
                modelId: modelId,
                width: 512,
                height: 512,
                init_image_id: initImageId,
                init_strength: strength,
                num_images: 2
            },
            { headers: { 'Authorization': `Bearer ${API_KEY}` } }
        );

        const generatedImages = generationResp.data.generated_images || [];
        if (!generatedImages.length) {
            return res.status(500).json({ error: "Failed to generate images." });
        }

        res.json({ generated: generatedImages.map(x => x.url) });

    } catch (err) {
        console.error("Leonardo AI Error:", err.response?.data || err.message);
        res.status(500).json({ error: "Lỗi server hoặc API." });
    }
});

// Định dạng `module.exports` để tương thích với Vercel
module.exports = app;
