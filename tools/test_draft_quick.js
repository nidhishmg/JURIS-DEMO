// Quick test for draft generation via browser DevTools
console.log('Testing draft generation API...');

async function testDraftAPI() {
    const testData = {
        templateId: 'bailApplication',
        inputs: {
            applicantName: 'John Doe',
            fatherName: 'Robert Doe',
            age: '30',
            address: '123 Test Street, Test City',
            firNumber: '420 IPC',
            policeStation: 'Central Police Station',
            facts: 'Murder as begni comtted',
            grounds: 'ufhufuf the cops'
        },
        title: 'Test Bail Application'
    };

    try {
        const response = await fetch('/api/drafts/generate-sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        console.log('Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ SUCCESS!');
            console.log('Draft ID:', result.id);
            console.log('Content preview:', result.content.substring(0, 200) + '...');
            return result;
        } else {
            const error = await response.text();
            console.log('❌ Error:', error);
        }
    } catch (error) {
        console.log('❌ Network error:', error.message);
    }
}

// Run test
testDraftAPI();