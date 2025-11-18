// Test script to check if local LLM is running
async function testLocalLLM() {
  console.log('Testing Local LLM Connection...');
  
  try {
    // Test if Ollama is running
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (response.ok) {
      console.log('✅ Local LLM (Ollama) is running');
      
      // Test model availability
      const models = await response.json();
      console.log('Available models:', models.models?.map(m => m.name) || []);
      const hasMistral = models.models?.some(m => m.name.includes('mistral'));
      
      if (hasMistral) {
        const mistralModel = models.models.find(m => m.name.includes('mistral'));
        console.log('✅ Mistral model is available:', mistralModel.name);
        
        // Test text generation
        console.log('\nTesting text generation...');
        const generateResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: mistralModel.name,
            prompt: 'Write a brief legal notice template',
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: 200,
            },
          }),
        });
        
        if (generateResponse.ok) {
          const result = await generateResponse.json();
          console.log('✅ Text generation successful');
          console.log('Sample output:', result.response.substring(0, 200) + '...');
        } else {
          console.log('❌ Text generation failed');
          console.log('Status:', generateResponse.status);
          console.log('Error:', await generateResponse.text());
        }
      } else {
        console.log('❌ Mistral model not found. Run: ollama pull mistral:7b-instruct');
      }
    } else {
      console.log('❌ Local LLM not available');
    }
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('\nTo set up local LLM:');
    console.log('1. Install Ollama: https://ollama.com/download');
    console.log('2. Run: ollama pull mistral:7b-instruct');
    console.log('3. Start: ollama serve');
  }
}

testLocalLLM();