// import { useState } from 'react';
// import './App.css';

// function App() {
//   // State management
//   const [userText, setUserText] = useState('');           // User's input text
//   const [aiResponse, setAiResponse] = useState('');       // AI's response
//   const [isLoading, setIsLoading] = useState(false);      // Loading indicator
//   const [error, setError] = useState('');                 // Error messages

//   // Function to call backend
//   const callBackend = async (action) => {
//     // Validation: Make sure user typed something
//     if (!userText.trim()) {
//       setError('Please type something first!');
//       return;
//     }

//     // Clear previous errors and responses
//     setError('');
//     setAiResponse('');
//     setIsLoading(true);

//     try {
//       // Send request to backend
//       const response = await fetch('http://localhost:8000/api/process', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           text: userText,
//           action: action, // "improve" or "continue"
//         }),
//       });

//       // Check if response is OK (200-299)
//       if (!response.ok) {
//         throw new Error(`Server error: ${response.status}`);
//       }

//       // Parse response JSON
//       const data = await response.json();
      
//       // Display AI response
//       setAiResponse(data.result);
//     } catch (err) {
//       // Catch any errors (network, server, etc.)
//       setError(`Error: ${err.message}`);
//       console.error('Error:', err);
//     } finally {
//       // Always stop loading, whether success or failure
//       setIsLoading(false);
//     }
//   };

//   // Handler for Improve button
//   const handleImprove = () => {
//     callBackend('improve');
//   };

//   // Handler for Continue button
//   const handleContinue = () => {
//     callBackend('continue');
//   };

//   return (
//     <div className="container">
//       <header className="header">
//         <h1>✨ AI Text Editor</h1>
//         <p>Collaborate with AI to improve and continue your writing</p>
//       </header>

//       <main className="main">
//         {/* User Input Section */}
//         <section className="input-section">
//           <label htmlFor="userInput">Your Text</label>
//           <textarea
//             id="userInput"
//             className="textarea"
//             placeholder="Type your text here... then click a button to improve or continue!"
//             value={userText}
//             onChange={(e) => setUserText(e.target.value)}
//           />
          
//           {/* Buttons */}
//           <div className="button-group">
//             <button
//               className="btn btn-improve"
//               onClick={handleImprove}
//               disabled={isLoading}
//             >
//               {isLoading ? 'Processing...' : '✨ Improve with AI'}
//             </button>
//             <button
//               className="btn btn-continue"
//               onClick={handleContinue}
//               disabled={isLoading}
//             >
//               {isLoading ? 'Processing...' : '📝 Continue Writing'}
//             </button>
//           </div>
//         </section>

//         {/* Error Display */}
//         {error && (
//           <div className="error-box">
//             <strong>❌ Error:</strong> {error}
//           </div>
//         )}

//         {/* Loading State */}
//         {isLoading && (
//           <div className="loading-box">
//             <div className="spinner"></div>
//             <p>AI is thinking...</p>
//           </div>
//         )}

//         {/* AI Response Section */}
//         {aiResponse && !isLoading && (
//           <section className="response-section">
//             <h2>🤖 AI Response</h2>
//             <div className="response-box">
//               {aiResponse}
//             </div>
//             <button
//               className="btn btn-copy"
//               onClick={() => {
//                 navigator.clipboard.writeText(aiResponse);
//                 alert('Copied to clipboard!');
//               }}
//             >
//               📋 Copy to Clipboard
//             </button>
//           </section>
//         )}
//       </main>

//       <footer className="footer">
//         <p>Powered by Google Gemini API</p>
//       </footer>
//     </div>
//   );
// }

// export default App;


import { useState } from 'react';
import './App.css';

function App() {
  // State management
  const [userText, setUserText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Error finding state
  const [foundErrors, setFoundErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);

  // Auto-clear messages after 4 seconds
  if (successMessage) {
    setTimeout(() => setSuccessMessage(''), 4000);
  }
  if (error) {
    setTimeout(() => setError(''), 5000);
  }

  // Function to call backend
  const callBackend = async (endpoint, data) => {
    // Validation
    if (!userText.trim()) {
      setError('💭 Please write something first! Your text is empty.');
      return;
    }

    // Clear previous state
    setError('');
    setAiResponse('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      let errorMessage = 'Something went wrong';
      
      if (err.message.includes('Failed to fetch')) {
        errorMessage = '❌ Cannot connect to server. Is the backend running on http://localhost:8000?';
      } else {
        errorMessage = `❌ Error: ${err.message}`;
      }
      
      setError(errorMessage);
      console.error('Full error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Improve button
  const handleImprove = async () => {
    const result = await callBackend('/api/process', {
      text: userText,
      action: 'improve',
    });

    if (result) {
      setAiResponse(result.result);
      setSuccessMessage('✅ Text improved successfully with Google Gemini!');
    }
  };

  // Handler for Continue button
  const handleContinue = async () => {
    const result = await callBackend('/api/process', {
      text: userText,
      action: 'continue',
    });

    if (result) {
      setAiResponse(result.result);
      setSuccessMessage('✅ Text continued successfully with Google Gemini!');
    }
  };

  // Handler for Find Errors button
  const handleFindErrors = async () => {
    const result = await callBackend('/api/find-errors', {
      text: userText,
    });

    if (result) {
      setFoundErrors(result.errors);
      setShowErrors(true);
      setSuccessMessage(result.summary);
    }
  };

  // Handler to copy text
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(aiResponse);
      setSuccessMessage('📋 Copied to clipboard!');
    } catch {
      setError('❌ Failed to copy. Try manually selecting and copying.');
    }
  };

  // Handler to use AI response
  const handleUseText = () => {
    setUserText(aiResponse);
    setAiResponse('');
    setSuccessMessage('✅ Response inserted into editor!');
  };

  // Handler to clear
  const handleClear = () => {
    setUserText('');
    setAiResponse('');
    setError('');
    setSuccessMessage('');
    setFoundErrors([]);
    setShowErrors(false);
  };

  // Highlight errors in text
  const highlightErrors = () => {
    if (foundErrors.length === 0) return userText;
    
    let highlighted = userText;
    // Note: This is a simple implementation
    // In production, you'd want more sophisticated highlighting
    foundErrors.forEach((error) => {
      const regex = new RegExp(`\\b${error.error_text}\\b`, 'g');
      highlighted = highlighted.replace(regex, `[ERROR: ${error.error_text}]`);
    });
    return highlighted;
  };

  return (
    <div className="container">
      <header className="header">
        <h1>✨ AI Text Editor</h1>
        <p>Collaborate with AI to improve and continue your writing</p>
      </header>

      <main className="main">
        {/* Input Section - LEFT COLUMN */}
        <section className="input-section">
          <div className="section-header">
            <label htmlFor="userInput">Your Text</label>
            <span className="char-count">{userText.length} characters</span>
          </div>
          <textarea
            id="userInput"
            className="textarea"
            placeholder="Type your text here... then click a button!"
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
          />
          
          {/* Buttons */}
          <div className="button-group">
            <button
              className="btn btn-improve"
              onClick={handleImprove}
              disabled={isLoading}
              title="Improve with AI (Ctrl+Enter)"
            >
              {isLoading ? '⏳ Processing...' : '✨ Improve with AI'}
            </button>
            <button
              className="btn btn-continue"
              onClick={handleContinue}
              disabled={isLoading}
              title="Continue Writing (Ctrl+Shift+Enter)"
            >
              {isLoading ? '⏳ Processing...' : '📝 Continue Writing'}
            </button>
            <button
              className="btn btn-errors"
              onClick={handleFindErrors}
              disabled={isLoading}
              title="Find grammar and spelling errors"
            >
              {isLoading ? '⏳ Checking...' : '🔍 Find Errors'}
            </button>
          </div>

          {/* Error clearing button */}
          <button
            className="btn btn-clear"
            onClick={handleClear}
            disabled={isLoading}
          >
            🗑️ Clear All
          </button>
        </section>

        {/* RIGHT COLUMN - Messages + Errors + Response */}
        <div className="right-column">
          {/* Success Message */}
          {successMessage && (
            <div className="success-box">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="loading-box">
              <div className="spinner"></div>
              <p>AI is thinking... ✨</p>
              <small>This usually takes 2-5 seconds</small>
            </div>
          )}

          {/* Errors Found Section */}
          {showErrors && foundErrors.length > 0 && !isLoading && (
            <section className="errors-section">
              <h2>🔍 Errors Found ({foundErrors.length})</h2>
              <div className="errors-list">
                {foundErrors.map((err, idx) => (
                  <div key={idx} className={`error-item error-${err.error_type}`}>
                    <div className="error-header">
                      <span className="error-type-badge">{err.error_type}</span>
                      <span className="error-text">"{err.error_text}"</span>
                    </div>
                    <div className="error-details">
                      <p><strong>✅ Suggestion:</strong> {err.suggestion}</p>
                      <p><strong>💡 Explanation:</strong> {err.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* No Errors Found */}
          {showErrors && foundErrors.length === 0 && !isLoading && (
            <section className="success-section">
              <h2>✅ Text Quality Check</h2>
              <div className="success-message-box">
                <p>🎉 No errors found! Your text looks great!</p>
              </div>
            </section>
          )}

          {/* AI Response Section */}
          {aiResponse && !isLoading && (
            <section className="response-section">
              <h2>🤖 AI Response</h2>
              <div className="response-box">
                {aiResponse}
              </div>
              <div className="response-actions">
                <button
                  className="btn btn-copy"
                  onClick={handleCopy}
                >
                  📋 Copy to Clipboard
                </button>
                <button
                  className="btn btn-insert"
                  onClick={handleUseText}
                >
                  ↩️ Use This Text
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Powered by <strong>Google Gemini API</strong> | Built with React + FastAPI</p>
        <p className="footer-hint">💡 Features: Improve, Continue, Find Errors | MVP v1.0</p>
      </footer>
    </div>
  );
}

export default App;