const { HUGGINGFACE_API_KEY } = process.env;

/**
 * AI Content Service
 * Handles text expansion and refinement using Hugging Face models.
 */
async function expandText(prompt, context = "civic complaint") {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error("AI Expansion key not configured.");
  }

  try {
    // We use a powerful text-generation model like Mistral-7B-Instruct
    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `<s>[INST] You are a civic assistant for the Shomadhan platform. 
          The user has provided a short note for a ${context}. 
          Please expand this into a detailed, professional, and clear description using 3-4 key bullet points. 
          Keep it concise but informative. 
          Input text: "${prompt}" [/INST]`,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.7,
            return_full_text: false
          }
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to generate AI text");
    }

    const result = await response.json();
    let generatedText = Array.isArray(result) ? result[0].generated_text : result.generated_text;

    // Clean up any lingering instruction tags
    return generatedText.replace(/\[\/INST\]/g, "").trim();
  } catch (err) {
    console.error("[AI Expander Error]:", err.message);
    throw err;
  }
}

module.exports = { expandText };
