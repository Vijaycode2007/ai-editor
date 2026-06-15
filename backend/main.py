import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="AI Text Editor API",
    description="Backend for collaborative AI text editor",
    version="1.0.0"
)

# Configure CORS (allow frontend to call backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
print(f"🔍 Checking for API key... (found: {bool(GOOGLE_API_KEY)})")

if not GOOGLE_API_KEY:
    raise ValueError("""
    ❌ GOOGLE_API_KEY not found!
    
    Fix:
    1. Check backend/.env exists
    2. It should contain: GOOGLE_API_KEY=your_actual_key_here
    3. Replace 'your_actual_key_here' with real key from https://aistudio.google.com/apikey
    4. Save file and try again
    """)

genai.configure(api_key=GOOGLE_API_KEY)
print("✅ Google Gemini API configured successfully!")

# Use Gemini 3 Flash Preview model
try:
    model = genai.GenerativeModel("gemini-3-flash-preview")
    print("✅ Using gemini-3-flash-preview model (latest)")
except Exception as e:
    print(f"⚠️ Could not load gemini-3-flash-preview: {str(e)}")
    print("Falling back to gemini-1.5-flash...")
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        print("✅ Using gemini-1.5-flash model (fallback)")
    except Exception as e2:
        print(f"❌ Error loading fallback model: {str(e2)}")
        raise

# ============================================================
# DATA MODELS (Request/Response Validation)
# ============================================================

class ProcessRequest(BaseModel):
    """Request body for /api/process endpoint"""
    text: str
    action: str

class ProcessResponse(BaseModel):
    """Response body from /api/process endpoint"""
    result: str
    action: str

class FindErrorsRequest(BaseModel):
    """Request body for /api/find-errors endpoint"""
    text: str

class ErrorInfo(BaseModel):
    """Single error information"""
    position: int
    error_text: str
    error_type: str  # grammar, spelling, punctuation, clarity
    suggestion: str
    explanation: str

class FindErrorsResponse(BaseModel):
    """Response body from /api/find-errors endpoint"""
    errors: list[ErrorInfo]
    total_errors: int
    summary: str

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def improve_text(text: str) -> str:
    """
    Call Gemini API to improve user's text.
    Fixes grammar, clarity, and flow while keeping original meaning.
    """
    prompt = f"""You are a professional writing assistant. Improve the following text by:
- Fixing grammar and spelling
- Making it clearer and more concise
- Improving sentence flow
- Keeping the original meaning

Original text:
{text}

Provide only the improved text, nothing else."""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"❌ Error: {str(e)[:100]}"

def continue_text(text: str) -> str:
    """
    Call Gemini API to continue user's text.
    Generates 2-3 sentences that naturally follow the original text.
    """
    prompt = f"""You are a creative writing assistant. Continue the following text naturally and coherently.
Keep the same tone, style, and voice as the original.
Write 2-3 sentences that logically follow.

Original text:
{text}

Provide only the continuation (2-3 sentences), nothing else."""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"❌ Error: {str(e)[:100]}"

def find_errors(text: str) -> tuple[list[dict], str]:
    """
    Call Gemini API to find grammar, spelling, and clarity errors.
    Returns list of errors with suggestions and explanations.
    """
    prompt = f"""You are an expert grammar and writing teacher. Analyze the following text for errors.

Find ALL errors including:
- Grammar mistakes
- Spelling errors
- Punctuation issues
- Clarity problems
- Awkward phrasing
- Sentence structure issues

For each error, provide:
1. The exact error text
2. Error type (grammar/spelling/punctuation/clarity)
3. Correct suggestion
4. Brief explanation of why it's wrong

Format your response as JSON array like this:
[
  {{
    "position": 0,
    "error_text": "the cat",
    "error_type": "grammar",
    "suggestion": "The cat",
    "explanation": "Capitalize first word of sentence"
  }},
  ...
]

If no errors found, return: []

Text to analyze:
{text}"""

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Try to extract JSON from response
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            json_str = response_text
        
        # Parse JSON
        import json
        errors = json.loads(json_str)
        
        # Create summary
        if not errors:
            summary = "✅ No errors found! Your text looks great!"
        else:
            error_types = {}
            for error in errors:
                etype = error.get("error_type", "unknown")
                error_types[etype] = error_types.get(etype, 0) + 1
            
            summary_parts = []
            for etype, count in error_types.items():
                summary_parts.append(f"{count} {etype}")
            summary = f"⚠️ Found {len(errors)} error(s): {', '.join(summary_parts)}"
        
        return errors, summary
    except Exception as e:
        print(f"Error in find_errors: {str(e)}")
        return [], f"❌ Error analyzing text: {str(e)[:100]}"

# ============================================================
# API ROUTES
# ============================================================

@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "message": "✨ AI Text Editor API is running!",
        "version": "1.0.0",
        "status": "healthy",
        "model": "gemini-3-flash-preview",
        "available_endpoints": [
            "POST /api/process (improve/continue text)",
            "POST /api/find-errors (find grammar/spelling errors)",
            "GET /docs (API documentation)"
        ]
    }

@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "api_configured": bool(GOOGLE_API_KEY),
        "model_loaded": True,
        "model_name": "gemini-3-flash-preview"
    }

@app.post("/api/process", response_model=ProcessResponse)
async def process_text(request: ProcessRequest) -> ProcessResponse:
    """
    Main endpoint for text processing.
    
    Request body:
    {
        "text": "your text here",
        "action": "improve" or "continue"
    }
    
    Response:
    {
        "result": "processed text",
        "action": "improve" or "continue"
    }
    """
    
    # Validate action
    if request.action not in ["improve", "continue"]:
        raise ValueError('Action must be "improve" or "continue"')
    
    # Validate text is not empty
    if not request.text or not request.text.strip():
        raise ValueError("Text cannot be empty")
    
    # Call appropriate function based on action
    if request.action == "improve":
        result = improve_text(request.text)
    else:  # continue
        result = continue_text(request.text)
    
    return ProcessResponse(
        result=result,
        action=request.action
    )

@app.post("/api/find-errors", response_model=FindErrorsResponse)
async def find_errors_endpoint(request: FindErrorsRequest) -> FindErrorsResponse:
    """
    Endpoint to find grammar, spelling, and clarity errors in text.
    
    Request body:
    {
        "text": "your text to check for errors"
    }
    
    Response:
    {
        "errors": [
            {
                "position": 0,
                "error_text": "the cat",
                "error_type": "grammar",
                "suggestion": "The cat",
                "explanation": "Capitalize first word of sentence"
            }
        ],
        "total_errors": 1,
        "summary": "Found 1 error: 1 grammar"
    }
    """
    
    # Validate text is not empty
    if not request.text or not request.text.strip():
        raise ValueError("Text cannot be empty")
    
    # Find errors
    errors, summary = find_errors(request.text)
    
    # Convert to ErrorInfo objects
    error_infos = [
        ErrorInfo(
            position=error.get("position", 0),
            error_text=error.get("error_text", ""),
            error_type=error.get("error_type", "unknown"),
            suggestion=error.get("suggestion", ""),
            explanation=error.get("explanation", "")
        )
        for error in errors
    ]
    
    return FindErrorsResponse(
        errors=error_infos,
        total_errors=len(error_infos),
        summary=summary
    )

# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting AI Text Editor API Server...")
    print("📍 Server: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("🔑 Model: gemini-3-flash-preview (latest & fastest)")
    print("✨ Features: Improve text, Continue writing, Find errors")
    print("💡 Try: curl http://localhost:8000/")
    print()
    uvicorn.run(app, host="0.0.0.0", port=8000)