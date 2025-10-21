
import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown@9';
import remarkGfm from 'remark-gfm@4';

export interface ChatMessage {
  role: 'user' | 'model' | 'error';
  content: string;
}

interface AiChatProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: () => void;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  isReady: boolean;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2 mb-4">
      <div className="w-2 h-2 rounded-full animate-pulse bg-foundry-accent"></div>
      <div className="w-2 h-2 rounded-full animate-pulse bg-foundry-accent" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-2 h-2 rounded-full animate-pulse bg-foundry-accent" style={{ animationDelay: '0.4s' }}></div>
      <span className="ml-2 text-foundry-text-muted">Analyzing...</span>
    </div>
);

const AiChat: React.FC<AiChatProps> = ({ prompt, setPrompt, onSubmit, chatHistory, isLoading, isReady }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);


  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-4 overflow-y-auto">
        {chatHistory.length === 0 && !isLoading && (
             <div className="h-full flex items-center justify-center text-foundry-text-muted text-center p-4">
                <p>{isReady ? "Ask a question about the loaded files." : "Add a journal, actor, or item to begin."}</p>
            </div>
        )}

        {chatHistory.map((message, index) => (
            <div key={index} className="mb-4">
                {message.role === 'user' && (
                    <>
                        <p className="font-bold text-foundry-accent mb-1">You</p>
                        <div className="bg-foundry-dark p-3 rounded-md whitespace-pre-wrap text-foundry-text">
                            {message.content}
                        </div>
                    </>
                )}
                {message.role === 'model' && (
                     <>
                        <p className="font-bold text-foundry-text mb-1">AI</p>
                        <div className="bg-foundry-dark p-3 rounded-md journal-page-content">
                             <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        </div>
                    </>
                )}
                {message.role === 'error' && (
                    <div className="text-red-400 bg-red-900/50 p-3 rounded-md mt-2">
                        {message.content}
                    </div>
                )}
            </div>
        ))}
        {isLoading && <LoadingSpinner />}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-foundry-light">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isReady ? "Ask about the loaded files..." : "Please add a journal, actor, or item first..."}
            className="flex-grow bg-foundry-dark border border-foundry-light rounded-md p-2 focus:ring-2 focus:ring-foundry-accent focus:outline-none resize-none transition-shadow"
            rows={2}
            disabled={!isReady || isLoading}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                }
            }}
          />
          <button
            type="submit"
            disabled={!isReady || isLoading || !prompt.trim()}
            className="px-4 py-2 bg-foundry-accent text-white font-semibold rounded-md hover:bg-orange-500 transition-colors disabled:bg-foundry-light disabled:cursor-not-allowed"
          >
            {isLoading ? (
               <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            ) : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiChat;
