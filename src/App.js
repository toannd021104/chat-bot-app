import React from 'react';
import './App.css';

// Imports the Quiz component from Quiz.js for use in this file.
import ChatApp from './chatapp';

function App() {
  return (
    <div className="App">
      <main>
        <header className='App-header'>
          <ChatApp />
        </header>
      </main>
    </div>
  );
}

export default App;