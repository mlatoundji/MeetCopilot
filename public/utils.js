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
      console.error(`API call to ${url} failed:`, error.message);
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

export const filterTranscription = (text) => {
    const filterOutBiasesStatics = [
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
      "Merci."
    ];
  
    const regexPatterns = [
      /Sous-titres? r[ée]alis[ée]s? (par|para) la communaut[ée] d'Amara\.org/i,
      /Merci d'avoir regard[ée] la (vidéo|vid[ée]o)!?/i
    ];
  
    filterOutBiasesStatics.forEach(bias => {
      text = text.replaceAll(bias, "");
    });
  
    regexPatterns.forEach(pattern => {
      text = text.replace(pattern, "");
    });
  
    return text.trim();
  }