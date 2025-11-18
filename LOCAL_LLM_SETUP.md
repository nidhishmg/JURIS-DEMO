# Local LLM Integration with JurisThis Draft Generator

## Setup Instructions

### Prerequisites

1. **Install Ollama** (if not already installed):
   - Download from: https://ollama.com/download
   - Or use Windows installer

2. **Install and run Mistral-7B model**:
   ```bash
   ollama pull mistral:7b-instruct
   ```

3. **Start Ollama server**:
   ```bash
   ollama serve
   ```
   This should start the server on http://localhost:11434

### Configuration

The `.env` file has been updated with local LLM settings:

```env
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=mistral:7b-instruct
LOCAL_LLM_TIMEOUT=30000
```

### How It Works

#### Draft Generation Process:
1. **Template Processing**: First, the system fills the template with user inputs
2. **LLM Enhancement**: If local LLM is available, it enhances the draft with:
   - Better legal language
   - Proper formatting
   - Legal references and citations
   - Professional structure
3. **Fallback**: If LLM is unavailable, uses template-only generation

#### New Features Added:

1. **Auto-Enhancement During Generation**:
   - Drafts are automatically enhanced with local LLM when generated
   - Shows "Enhanced with AI" notification when successful

2. **Manual Enhancement Button**:
   - "Enhance with AI" button in the draft editor
   - Improves existing drafts using local LLM

3. **AI Validation**:
   - "AI Validate" button checks draft quality
   - Provides suggestions and identifies issues
   - Shows validation results in the editor

4. **PDF Export**:
   - Enhanced drafts can be exported as PDF
   - Maintains legal formatting and structure

### Testing the Setup

1. **Test LLM Connection**:
   ```bash
   node test-llm.js
   ```

2. **Start the Development Server**:
   ```bash
   npm run dev
   ```

3. **Test Draft Generation**:
   - Navigate to the Draft Generator
   - Select a template (e.g., Legal Notice)
   - Fill in the form
   - Generate draft - it should automatically enhance with LLM

### API Endpoints Added

- `POST /api/drafts/:id/enhance` - Enhance existing draft with LLM
- `POST /api/drafts/:id/validate` - Validate draft with LLM

### UI Enhancements

#### Draft Generator:
- Shows enhancement status in notifications
- Indicates when drafts are LLM-enhanced

#### Draft Editor:
- "Enhance with AI" button for manual enhancement
- "AI Validate" button for quality checking
- Validation results display panel
- Real-time enhancement feedback

### Troubleshooting

1. **LLM Not Available**:
   - Check if Ollama is running: `ollama list`
   - Verify model is installed: `ollama list` should show `mistral:7b-instruct`
   - Check server status: Visit http://localhost:11434

2. **Performance Issues**:
   - Ensure your RTX 4060 GPU is being used
   - Check GPU memory usage during generation
   - Adjust timeout in `.env` if needed

3. **Generation Errors**:
   - Check server logs for detailed error messages
   - Verify template format is correct
   - Ensure all required inputs are provided

### Next Steps

1. **Test with Different Templates**:
   - Try Consumer Complaint, Bail Application, etc.
   - Each template will be enhanced differently

2. **Customize Prompts**:
   - Modify `localLlmService.ts` to adjust enhancement prompts
   - Add template-specific enhancement logic

3. **Add More AI Features**:
   - Auto-citation verification
   - Legal compliance checking
   - Document summarization

The system now provides a complete local AI-powered draft generation experience with your Mistral-7B model!