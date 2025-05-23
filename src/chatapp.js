import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Plus, MessageSquare, User, Bot, X } from 'lucide-react';

const ChatApp = ({ signOut, user }) => {
    console.log('User object:', user);
  console.log('User attributes:', user?.attributes);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [conversations, setConversations] = useState([
    { id: 1, title: 'Cuộc trò chuyện mới', active: true }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Get user email from user object
  const userEmail = user?.signInDetails?.loginId || 'No email'; 
  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fake API functions - Replace these with actual API calls
  const sendMessageToAPI = async (message, files = []) => {
    console.log('Sending message to API:', message);
    console.log('Files:', files);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate API response
    return {
      content: `Đây là phản hồi giả cho tin nhắn: "${message}". Bạn có thể thay thế hàm này bằng API thật.`,
      timestamp: new Date()
    };
  };

  const uploadFileToAPI = async (file) => {
    console.log('Uploading file to API:', file.name);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id: Date.now(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file) // For preview only
    };
  };

  const createNewConversation = () => {
    console.log('Creating new conversation');
    const newConv = {
      id: Date.now(),
      title: 'Cuộc trò chuyện mới',
      active: true
    };
    
    setConversations(prev => prev.map(c => ({...c, active: false})).concat(newConv));
    setMessages([{
      id: Date.now(),
      type: 'assistant',
      content: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
      timestamp: new Date()
    }]);
    setUploadedFiles([]);
  };

  const selectConversation = (convId) => {
    console.log('Selecting conversation:', convId);
    setConversations(prev => prev.map(c => ({
      ...c, 
      active: c.id === convId
    })));
    
    // Here you would load conversation history from API
    // For now, just show a placeholder message
    setMessages([{
      id: Date.now(),
      type: 'assistant',
      content: 'Đã tải cuộc trò chuyện. Trong thực tế, bạn sẽ tải lịch sử từ API.',
      timestamp: new Date()
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && uploadedFiles.length === 0) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      files: uploadedFiles,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setUploadedFiles([]);
    setIsLoading(true);

    try {
      const response = await sendMessageToAPI(inputMessage, uploadedFiles);
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.content,
        timestamp: response.timestamp
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      try {
        const uploadedFile = await uploadFileToAPI(file);
        setUploadedFiles(prev => [...prev, uploadedFile]);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>Cuộc trò chuyện mới</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-2">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  conv.active 
                    ? 'bg-gray-700 text-white' 
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={16} />
                  <span className="truncate">{conv.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
            <span className="text-sm truncate" title={userEmail}>
              {userEmail || 'Loading...'}
            </span>
            <button
              onClick={signOut}
              className="ml-auto text-sm text-blue-400 hover:text-blue-200"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : ''}`}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                
                <div className={`max-w-3xl ${message.type === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white ml-12'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {/* Display files if any */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.files.map(file => (
                          <div
                            key={file.id}
                            className="flex items-center gap-2 p-2 bg-gray-100 rounded border"
                          >
                            <Paperclip size={14} />
                            <span className="text-sm">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {uploadedFiles.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border"
                  >
                    <Paperclip size={14} />
                    <span className="text-sm">{file.name}</span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Box */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập tin nhắn của bạn..."
                  className="w-full p-4 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="1"
                  style={{
                    minHeight: '52px',
                    maxHeight: '200px',
                    height: 'auto'
                  }}
                />
                
                {/* File Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <Paperclip size={20} />
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                />
              </div>
              
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() && uploadedFiles.length === 0}
                className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;