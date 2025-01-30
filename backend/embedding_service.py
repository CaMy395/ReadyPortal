from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')  # Load the embedding model

@app.route('/embed', methods=['POST'])
def embed():
    data = request.json
    if 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400

    text = data['text']
    embedding = model.encode([text])[0].tolist()  # Flatten the embedding
    print(f"Generated embedding: {embedding}")
    print(f"Embedding dimensions: {len(embedding)}")  # Log the dimensions
    return jsonify({'embedding': embedding})



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)  # Expose the service on port 5000
