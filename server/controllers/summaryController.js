import fetch from 'node-fetch';

export const generateSummary = async (req, res) => {
    try {
        console.log("Generate Summary...");
      const systemPrompt = `
  Tu es un assistant IA chargé de résumer un segment de conversation. 
  Le résumé doit être concis (100-200 mots max) et mettre en avant les points clés et éventuellement la dernière question posée par l'interlocuteur [System]. 
  Tes réponses doivent être claires et précises et se concentrer sur les informations les plus importantes.
  Voici le format de la réponse attendue :
  - Points clés : ...
  - Dernière question : ...
      `;
  
      const { context } = req.body;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });
  
      const data = await response.json();
      if (!response.ok) {
        console.log("Summary error: ", data);
        return res.status(response.status).json({ error: data });
      }
        console.log("Summary generated: ", data.choices[0].message.content);
      res.json({ summary: data.choices[0].message.content });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };