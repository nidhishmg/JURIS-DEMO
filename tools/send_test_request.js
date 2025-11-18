
async function send() {
  const payload = {
    user_id: 'local-user',
    template_id: 'consumerComplaint',
    case_folder_id: null,
    form_data: {
      petitionerName: 'ram kumar',
      respondentName: 'x shop',
      facts: 'Goods not delivered after payment',
      offence_sections: ['420 IPC']
    },
    attachments: [],
    idempotency_key: 'test-req-1'
  };

  const resp = await fetch('http://localhost:5000/api/v1/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer local-dev-token' }, body: JSON.stringify(payload)});
  const data = await resp.json();
  console.log('Status', resp.status, data);
}

send();
