// Simple test to check if server endpoints work
async function quickTest() {
  console.log('Testing server endpoints...');
  
  // Test templates endpoint first
  try {
    console.log('1. Testing templates endpoint...');
    const templatesResponse = await fetch('http://localhost:5000/api/templates');
    if (templatesResponse.ok) {
      const templates = await templatesResponse.json();
      console.log(`✅ Templates loaded: ${templates.length} templates found`);
    } else {
      console.log(`❌ Templates failed: ${templatesResponse.status}`);
      return;
    }
  } catch (error) {
    console.log(`❌ Templates request failed: ${error.message}`);
    return;
  }

  // Test old draft generation endpoint
  try {
    console.log('2. Testing legacy draft generation...');
    const payload = {
      templateId: 'consumerComplaint', 
      inputs: {
        petitionerName: 'Test User',
        respondentName: 'Test Store',
        facts: 'This is a test complaint about defective goods.'
      },
      title: 'Test Complaint'
    };

    const draftResponse = await fetch('http://localhost:5000/api/drafts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (draftResponse.ok) {
      const draft = await draftResponse.json();
      console.log(`✅ Legacy draft generation works. Draft ID: ${draft.id}`);
    } else {
      const error = await draftResponse.text();
      console.log(`❌ Legacy draft failed: ${draftResponse.status} - ${error}`);
    }
  } catch (error) {
    console.log(`❌ Legacy draft request failed: ${error.message}`);
  }
}

quickTest();