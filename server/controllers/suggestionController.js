import fetch from 'node-fetch';

export const generateSuggestions = async (req, res) => {
    try {
      const systemPrompt = `
        Vous êtes un assistant IA spécialisé dans la synthèse et la génération de
        suggestions de réponses d'utilisateurs dans une conversation.
        Fournissez 3 suggestions de réponses potentielles (100-200 mots max chacune) sous forme de liste à puces à la dernière question détectée.
        Basez vos suggestions sur le contexte ci-dessous :
      `;
  
      const { context } = req.body;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });
  
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data });
      }
  
      res.json({ suggestions: data.choices[0].message.content });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  