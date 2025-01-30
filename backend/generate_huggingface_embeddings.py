from sentence_transformers import SentenceTransformer
import json

# Load FAQs
with open('../shared/faqs.json', 'r') as f:
    faqs = json.load(f)

# Load model
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# Generate embeddings
for faq in faqs:
    faq['embedding'] = model.encode([faq['question']])[0].tolist()  # Flatten the embedding

# Save updated embeddings
with open('../backend/embeddings.json', 'w') as f:
    json.dump([faq['embedding'] for faq in faqs], f, indent=2)

print('Embeddings updated successfully!')
