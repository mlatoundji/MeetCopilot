/**
 * Makes an API call to a specified URL with the given options.
 * @param {string} url - The API endpoint.
 * @param {Object} options - The fetch options (method, headers, body, etc.).
 * @returns {Promise<Object>} - The parsed JSON response from the API.
 */
export const callApi = async (url, options) => {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'API call failed');
      }
      return data;
    } catch (error) {
      console.error(`API call to ${url} failed:`, error.message || error);
      throw error;
    }
};

export const downloadBlob = async(blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const filterTranscription = (text, lang) => {
    const filterOutBiasesStatics = {
        fr: [
            "Merci d'avoir regardé cette vidéo.",
            "Merci d'avoir regardé cette vidéo!",
            "Merci d'avoir regardé cette vidéo !",
            "Merci d'avoir regardé la vidéo.",
            "J'espère que vous avez apprécié la vidéo.",
            "Je vous remercie de vous abonner",
            "Sous-titres réalisés para la communauté d'Amara.org",
            "Sous-titres réalisés para la communauté d'Amara.org",
            "Merci d'avoir regardé!",
            "❤️ par SousTitreur.com",
            "— Sous-titrage ST'501 —",
            "Sous-titrage ST' 501",
            "Thanks for watching!",
            "Sous-titrage Société Radio-Canada",
            "sous-titres faits par la communauté d'Amara.org",
            "Merci.",
            "Au revoir.",
            "Merci de votre attention.",
            "la page Youtube de POP'N POP'N, voici la page YouTube de POP'N POP'N.",
            "Ciao !",
            "Sous-titres fait par la communauté d'Amara.org",
            "et je vous dis à très vite pour une prochaine vidéo. Au revoir et à bientôt !",
            "– Sous-titrage par Le Crayon d'oreille-de-la-mer –",
            "Sous-titrage",
            "Sous-titres",
            "Merci à tous d'avoir regardé cette vidéo",
            "Vap'n'Roll Thierry"
        ],
        en: [
            "Thank you for watching this video.",
            "Thank you for watching this video!",
            "Thank you for watching this video !",
            "Thank you for watching the video.",
            "I hope you enjoyed the video.",
            "Thank you for subscribing",
            "Subtitles made by the Amara.org community",
            "Subtitles made by the Amara.org community",
            "Thank you for watching!",
            "❤️ by SousTitreur.com",
            "— Subtitling ST'501 —",
            "Subtitling ST' 501",
            "Thanks for watching!",
            "Subtitling Société Radio-Canada",
            "subtitles made by the Amara.org community",
            "Thank you.",
        ]
    };

    const regexPatterns = {
        fr: [
            /Sous-titres? r[ée]alis[ée]s? (par|para) la communaut[ée] d'Amara\.org/i,
            /Merci d'avoir regard[ée] la (vidéo|vid[ée]o)!?/i
        ],
        en: [
            /Subtitles? made by the Amara\.org community/i,
            /Thank you for watching the video!?/i
        ]
    };

    filterOutBiasesStatics[lang].forEach(bias => {
        text = text.replaceAll(bias, "");
    });

    regexPatterns[lang].forEach(pattern => {
        text = text.replace(pattern, "");
    });

    return text.trim();
};
