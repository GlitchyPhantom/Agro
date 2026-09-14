import os
import re
from dotenv import dotenv_values
from groq import Groq
from fastapi import HTTPException
from config import PLANT_CLASSES

_groq_client_instance = None


def _get_client():
    """Cached singleton Groq client instance to avoid disk read overhead per request."""
    global _groq_client_instance
    if _groq_client_instance is not None:
        return _groq_client_instance

    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    env_vars = dotenv_values(env_path)
    api_key = (env_vars.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY") or "").strip()

    if not api_key or api_key.startswith("your-"):
        raise HTTPException(
            status_code=401,
            detail="Groq API Key is missing or using default placeholder in .env file. Please provide a valid GROQ_API_KEY in Agrointel/Back/.env"
        )
    _groq_client_instance = Groq(api_key=api_key)
    return _groq_client_instance


def _clean_response(text: str) -> str:
    """Remove <think>...</think> reasoning tags completely from output."""
    if not text:
        return ""
    # Strip closed think tags
    cleaned = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()

    # If unclosed <think> or leftover <think> tag
    if '<think>' in cleaned:
        if '</think>' in cleaned:
            cleaned = cleaned.split('</think>')[-1].strip()
        else:
            json_match = re.search(r'(\{[\s\S]*\})', cleaned)
            if json_match:
                cleaned = json_match.group(1).strip()
            else:
                cleaned = re.sub(r'<think>.*', '', cleaned, flags=re.DOTALL).strip()

    # Extract JSON codeblock if present
    if "```" in cleaned:
        json_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', cleaned)
        if json_match:
            cleaned = json_match.group(1).strip()

    return cleaned if cleaned else text


ADVISORY_SYSTEM_PROMPT = f"""You are AgroIntel AI — an expert agricultural disease advisor and farm resource management assistant.

Known disease classes from the CNN model: {PLANT_CLASSES}

You provide personalized prescriptions based on:
1. Detected Disease & Severity
2. The Farmer's Specific Plot Area (e.g. 2.5 Acres, 1 Hectare, 3 Bigha)
3. The Farmer's Shed Inventory (stored chemicals, fungicides, fertilizers, and medicines)

When analyzing, check if any of the farmer's stored chemicals/medicines are effective against the disease.
- If YES: Prioritize their in-stock remedy to save them money, calculating the exact quantity and water volume needed for their specific plot area.
- If NO or stock is insufficient: Recommend the best commercial remedies and guide them to acquire them from the nearest local agro-input market.

You must respond with EXACTLY this JSON-parseable structure:
{{
  "disease_name": "...",
  "crop": "...",
  "cause": "Brief cause of the disease",
  "symptoms": ["symptom 1", "symptom 2", "symptom 3"],
  "organic_treatment": ["treatment 1", "treatment 2"],
  "chemical_treatment": ["treatment with dosage 1", "treatment with dosage 2"],
  "prevention": ["measure 1", "measure 2", "measure 3"],
  "severity_note": "Brief note about the severity level",
  "personalized_prescription": {{
    "has_in_stock_remedy": true,
    "matched_items": ["Item name from farmer inventory if matched"],
    "in_stock_instructions": "Tailored step-by-step instructions using items from their shed, with calculated dosage for their plot area (e.g. 500g in 250L water).",
    "market_needed": false,
    "market_recommendation": "If no in-stock remedy or extra needed, name the best medicine to buy at the nearest market with dosage."
  }}
}}

Keep language clear, practical, and farmer-friendly.
Do NOT include thinking or reasoning tags. ONLY return the valid JSON string.
"""

CHAT_SYSTEM_PROMPT = f"""You are AgroIntel AI Assistant — a friendly, highly knowledgeable agricultural expert.

Known disease classes: {PLANT_CLASSES}

Formatting Rules (STRICT):
- Always structure your responses using clean, readable Markdown:
  • Use bolding (**term**) for key crop names, chemical dosages, and critical steps
  • Use clear section headers with relevant emojis (e.g., ### 🌾 Overview, ### 🔬 Symptoms, ### 🦠 Causes, ### 🧪 Treatment Plan, ### 🛡️ Prevention)
  • Use bullet lists (`- `) or step-by-step numbered lists (`1. `) for clear actionable advice
  • If providing comparative data or summaries, format them using clean Markdown tables (`| Col 1 | Col 2 |\n|---|---|\n| Data 1 | Data 2 |`) without empty lines between rows
  • Keep paragraphs concise and easy to scan for farmers in the field
- Never output an unformatted wall of plain text.
- Do NOT include any <think> or reasoning tags in your output.
"""

LANG_NAMES = {
    "hi": "HINDI (हिंदी)",
    "od": "ODIA (ଓଡ଼ିଆ)",
    "or": "ODIA (ଓଡ଼ିଆ)",
    "bn": "BENGALI (বাংলা)",
    "ta": "TAMIL (தமிழ்)",
    "te": "TELUGU (తెలుగు)",
    "mr": "MARATHI (मराठी)",
    "gu": "GUJARATI (ગુજરાતી)",
    "kn": "KANNADA (ಕನ್ನಡ)",
    "ml": "MALAYALAM (മലയാളം)",
    "pa": "PUNJABI (ਪੰਜਾਬੀ)",
}



CHAT_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "qwen/qwen3.6-27b",
]

ADVISORY_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
]


def _normalize_odia_terms(text: str) -> str:
    """Ensure standard agricultural terminology and clean punctuation in Odia for natural TTS audio."""
    if not text:
        return text
    # Direct replacements for common combinations
    text = text.replace("ବିଆ ଚୟନ", "ବିହନ ଚୟନ")
    text = text.replace("ବୀଜ ଚୟନ", "ବିହନ ଚୟନ")
    text = text.replace("ବୀଜ ବିଶୋଧନ", "ବିହନ ବିଶୋଧନ")
    text = text.replace("ବିଆ ବିଶୋଧନ", "ବିହନ ବିଶୋଧନ")
    text = text.replace("ଉନ୍ନତ ବିଆ", "ଉନ୍ନତ ବିହନ")
    text = text.replace("ଉନ୍ନତ ବୀଜ", "ଉନ୍ନତ ବିହନ")
    text = text.replace("ସୁସ୍ଥ ବୀଜ", "ସୁସ୍ଥ ବିହନ")
    text = text.replace("ସୁସ୍ଥ ବିଆ", "ସୁସ୍ଥ ବିହନ")
    text = text.replace("ବୀଜ ଉପଚାର", "ବିହନ ବିଶୋଧନ")
    text = text.replace("ବୀଜ ବୁଣିବା", "ବିହନ ବୁଣିବା")
    text = text.replace("ବିଆ ବୁଣିବା", "ବିହନ ବୁଣିବା")
    # Standalone replacements where appropriate
    text = re.sub(r'(?<![^\s\(\[,\.।])ବୀଜ(?![^\s\)\]\,\.।])', 'ବିହନ', text)
    text = re.sub(r'(?<![^\s\(\[,\.।])ବିଆ(?![^\s\)\]\,\.।])', 'ବିହନ', text)

    # Remove English parenthetical words that degrade TTS (e.g. (seed), (fertilizer), (spray))
    text = re.sub(r'\s*\([a-zA-Z\s]+\)', '', text)

    # Convert Western periods following Odia text into Odia Purna Viram (।) for natural cadence
    text = re.sub(r'([\u0B00-\u0B7F]+)\.(?!\d)', r'\1।', text)

    return text


def _format_chat_response(content: str, reasoning: str = "", language: str = "en") -> str:
    """Ensure thinking process is preserved inside <think>...</think> and output is clean."""
    content = (content or "").strip()
    reasoning = (reasoning or "").strip()

    if language in ("od", "or"):
        content = _normalize_odia_terms(content)

    # Case 1: Reasoning was separately returned by Groq parsed format
    if reasoning:
        # Also clean any duplicate <think> inside content if present
        clean_content = re.sub(r'<think>[\s\S]*?</think>', '', content, flags=re.IGNORECASE).strip()
        clean_content = re.sub(r'<think>[\s\S]*', '', clean_content, flags=re.IGNORECASE).strip()
        if not clean_content and content:
            clean_content = content
        return f"<think>\n{reasoning}\n</think>\n\n{clean_content}"

    # Case 2: Content already contains <think>...</think>
    if "<think>" in content:
        if "</think>" in content:
            return content
        else:
            # Unclosed <think> tag: extract draft response or close it safely
            match = re.search(r'(\n#{1,3}\s|\n\*\*|Draft:|\n[^\x00-\x7F]{3,})', content, re.IGNORECASE)
            if match and match.start() > 40:
                think_part = content[:match.start()].replace("<think>", "").strip()
                ans_part = content[match.start():].strip()
                return f"<think>\n{think_part}\n</think>\n\n{ans_part}"
            else:
                return f"{content}\n</think>"

    return content


async def get_disease_advisory(
    disease: str,
    severity: str,
    confidence: float,
    plot_info: dict = None,
    inventory: list = None,
) -> str:
    """Get detailed personalized treatment advisory for a detected disease using Groq LLM."""
    client = _get_client()

    # Build context prompt
    prompt_lines = [
        f"Detected Disease: {disease}",
        f"Severity Level: {severity}",
        f"Confidence Score: {confidence}%",
    ]

    if plot_info:
        plot_name = plot_info.get("plot_name", "Primary Plot")
        area = plot_info.get("area", 1.0)
        unit = plot_info.get("area_unit", "Acres")
        crop = plot_info.get("crop", "Unknown")
        prompt_lines.append(f"Target Plot: '{plot_name}' ({area} {unit}, Crop: {crop})")
    else:
        prompt_lines.append("Target Plot: Not specified (Provide standard dosage per 1 Acre as reference)")

    if inventory and len(inventory) > 0:
        inv_desc = []
        for item in inventory:
            name = item.get("item_name")
            cat = item.get("category", "")
            qty = item.get("quantity", 0)
            u = item.get("unit", "")
            act = item.get("active_ingredient") or ""
            inv_desc.append(f"- {name} ({cat}): {qty} {u} available" + (f" [Active: {act}]" if act else ""))
        prompt_lines.append("Farmer's Available Inventory in Shed:\n" + "\n".join(inv_desc))
    else:
        prompt_lines.append("Farmer's Available Inventory in Shed: [Empty / None listed]")

    prompt_lines.append(
        "Analyze whether any of the farmer's stored chemicals/fertilizers match this disease. "
        "Calculate the exact dosage and water volume needed for their specific plot area. "
        "If not available in their shed, state what to purchase at the nearest local agro market."
    )
    prompt = "\n".join(prompt_lines)

    last_error = None
    for model_name in ADVISORY_MODELS:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": ADVISORY_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=1500,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            cleaned = _clean_response(content)
            if cleaned:
                return cleaned
        except Exception as e:
            last_error = e
            continue

    raise HTTPException(
        status_code=500,
        detail=f"Groq API Error: {type(last_error).__name__}: {str(last_error)}"
    )



async def chat_with_ai(message: str, history: list = None, language: str = "en") -> str:
    """Chat with AI assistant about agriculture topics using Groq LLM with native language support."""
    client = _get_client()

    system_prompt = CHAT_SYSTEM_PROMPT
    if language and language in LANG_NAMES:
        system_prompt += (
            f"\n- CRITICAL LANGUAGE RULE: Respond 100% directly in {LANG_NAMES[language]} language "
            f"using its native script. Do NOT respond in English."
        )
        if language in ("od", "or"):
            system_prompt += (
                f"\n- MANDATORY ODIA VOCABULARY RULE: For 'seed' or 'seeds' (planting material), "
                f"you MUST ALWAYS use the standard authentic Odia word 'ବିହନ' (Bihana). "
                f"NEVER write 'ବିଆ' or 'ବୀଜ'. Always use 'ବିହନ' (for example: 'ବିହନ ଚୟନ' for seed selection, "
                f"'ବିହନ ବିଶୋଧନ' for seed treatment, and 'ଉନ୍ନତ ବିହନ' for high-quality seeds)."
                f"\n- NATURAL ODIA PUNCTUATION & TTS AUDIO RULES (CRITICAL):"
                f"\n  1. Every single sentence MUST end with the authentic Odia full stop / Purna Viram ('।') or exclamation ('!'). Never end sentences with English dots ('.') and never leave sentences unpunctuated."
                f"\n  2. Use commas (',') between clauses, conditions, and items so the voice reader takes natural breathing pauses."
                f"\n  3. Every bullet point or numbered item MUST be a complete, grammatically sound sentence ending with a Purna Viram ('।')."
                f"\n  4. PURE ODIA SCRIPT ONLY: Do NOT write English words in Latin alphabet inside Odia sentences. NEVER add parenthetical translations like 'ବିହନ (seed)' or 'ସ୍ପ୍ରେ (spray)'. Write only the Odia terms."
                f"\n  5. For modern agricultural terms or chemical names, transliterate them phonetically into Odia script (e.g., 'ସ୍ପ୍ରେ', 'ଫଙ୍ଗିସାଇଡ୍', 'ନାଇଟ୍ରୋଜେନ୍', 'ପୋଟାସ୍', 'ଲିଟର', 'ଏକର', 'ମାନ୍କୋଜେବ୍')."
                f"\n  6. Keep the sentence structure clean, rhythmic, and natural for an Odia farmer listening to audio."
            )

    messages = [{"role": "system", "content": system_prompt}]

    if history:
        for msg in history[-6:]:
            messages.append(msg)

    messages.append({"role": "user", "content": message})

    last_error = None
    for model_name in CHAT_MODELS:
        try:
            # Try with parsed reasoning format first so thought process and response are cleanly isolated
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.4,
                    max_tokens=1500,
                    extra_body={"reasoning_format": "parsed"},
                )
            except Exception:
                # Fallback without extra_body if model doesn't support parsed reasoning
                response = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.4,
                    max_tokens=1500,
                )

            choice = response.choices[0]
            msg = choice.message
            content = msg.content or ""
            reasoning = getattr(msg, "reasoning", "") or ""

            formatted = _format_chat_response(content, reasoning, language=language)
            if formatted.strip():
                return formatted
        except Exception as e:
            print(f"[Groq Chat Exception with {model_name}]: {e}")
            last_error = e
            continue

    raise HTTPException(
        status_code=401 if ("401" in str(last_error) or "invalid_api_key" in str(last_error)) else 500,
        detail=f"Groq API Error: {str(last_error)}"
    )
