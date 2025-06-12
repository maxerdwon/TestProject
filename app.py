import os
import base64
# تأكد من استيراد render_template
from flask import Flask, request, jsonify, render_template 
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

# --- إعدادات التطبيق الأساسية (بالطريقة القياسية) ---
app = Flask(__name__)
CORS(app) 
load_dotenv()

# --- تهيئة عميل OpenAI ---
client = OpenAI()

# ... (كل قاموس البرومبتات يبقى كما هو) ...
PROMPT_SYSTEMS = {
    # ...
}


# =============================================================
# --- المسارات (Routes) ---
# =============================================================

# --- (هذا هو التعديل الأهم) ---
@app.route('/')
def tool_page():
    # استخدم render_template لعرض ملف HTML من مجلد templates
    return render_template('index.html')


@app.route('/api/generate-prompt', methods=['POST'])
def generate_prompt():
    if not request.json:
        return jsonify({"error": "Invalid request. Expecting JSON."}), 400

    image_data_url = request.json.get('image_base64')
    model_type = request.json.get('model', 'general')

    if not image_data_url:
        return jsonify({"error": "No image data provided."}), 400
    
    system_prompt = PROMPT_SYSTEMS.get(model_type, PROMPT_SYSTEMS['general'])
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analyze this image and generate a prompt based on my system instructions."
                        },
                        {
                            "type": "image_url",
                            "image_url": { "url": image_data_url }
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        description_text = response.choices[0].message.content.strip()
        return jsonify({"prompt": description_text})

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500


# --- تشغيل التطبيق ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)