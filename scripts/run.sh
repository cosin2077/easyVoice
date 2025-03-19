docker run -d \
  --restart unless-stopped \
  --name easyvoice \
  -p 3000:3000 \
  -v $(pwd)/audio:/app/audio \
  -e OPENAI_BASE_URL=https://api.openai.com/v1 \
  -e OPENAI_KEY=your_openai_key_here \
  -e MODEL_NAME=gpt-4o-mini \
  cosin2077/easyvoice:latest