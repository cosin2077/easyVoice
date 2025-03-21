docker run -it \
  --rm \
  --name easyvoice \
  -p 3000:3000 \
  -v $(pwd)/audio:/app/audio \
  easyvoice