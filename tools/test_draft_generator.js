// Test the new synchronous draft generator
async function testDraftGenerator() {
  console.log('Testing Draft Generator with Local LLM...');
  
  const payload = {
    templateId: 'consumerComplaint',
    folderId: null,
    inputs: {
      petitionerName: 'Ram Kumar',
      respondentName: 'XYZ Electronics Store',
      facts: 'I purchased a mobile phone worth Rs. 25,000 on January 15, 2024. The phone stopped working after 10 days. Despite multiple visits to the store, they refused to replace or refund the defective product.',
      offence_sections: ['Section 2(1)(g) of Consumer Protection Act']
    },
    title: 'Consumer Complaint - Mobile Phone Defect'
  };

  try {
    const response = await fetch('http://localhost:5000/api/drafts/generate-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2NhbC11c2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IkxvY2FsIFVzZXIifQ.xyz'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    console.log('✅ Draft generated successfully!');
    console.log(`📄 Draft ID: ${result.id}`);
    console.log(`🤖 LLM Enhanced: ${result.llmEnhanced}`);
    console.log(`📊 Confidence: ${Math.round((result.confidence || 0) * 100)}%`);
    console.log(`📁 Document ID: ${result.documentId}`);
    
    if (result.contentText) {
      console.log('\n📝 Generated Content (first 300 chars):');
      console.log(result.contentText.substring(0, 300) + '...');
    }

    // Test PDF download if document ID exists
    if (result.documentId) {
      console.log('\n🔄 Testing PDF download...');
      const pdfResponse = await fetch(`http://localhost:5000/api/drafts/${result.id}/pdf`, {
        headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2NhbC11c2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IkxvY2FsIFVzZXIifQ.xyz' }
      });
      
      if (pdfResponse.ok) {
        console.log('✅ PDF download endpoint working');
      } else {
        console.log(`❌ PDF download failed: ${pdfResponse.status}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDraftGenerator();