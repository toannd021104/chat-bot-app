Create a Chat App using AWS Amplify and Cognito (with CI/CD)
This repository contains the commands and code used in this YouTube video, modified to create a Chat Application instead of a Quiz App.
Terminal Commands
Here are the terminal commands in order of appearance of the video.
bashnpm install -g @aws-amplify/cli
bashamplify configure
bashnpx create-react-app <name of your app>
bashcd <name of your app>
bashamplify init
bashamplify add auth
bashamplify push
bashnpm install aws-amplify @aws-amplify/ui-react lucide-react
bashnpm start
Git Commands for CI/CD
bashgit init
bashgit add .
bashgit commit -m "Initial commit"
bashgit branch -M main
bashgit remote add origin <repository URL>
bashgit push -u origin main
Code Files

App.js: The React application that's configured to use Cognito for authentication
ChatApp.js: The main Chat component with messaging functionality
App.css: Styling for the application

Features

🔐 User Authentication with AWS Cognito
💬 Real-time Chat Interface with message history
📁 File Upload Support with preview
🗨️ Multiple Conversations management
📱 Responsive Design with modern UI
🚀 CI/CD Ready with AWS Amplify hosting

Chat App Functionality

User login/logout with AWS Cognito
Send and receive messages
File attachment support
Conversation management (create new, switch between conversations)
Message timestamps
Loading states and animations
Responsive sidebar with user profile

Getting Started

Clone this repository
Follow the terminal commands above in order
Configure your AWS credentials during amplify configure
Customize the chat functionality as needed
Deploy using amplify add hosting and amplify publish

Technologies Used

React 18
AWS Amplify
AWS Cognito
Lucide React (for icons)
Tailwind CSS (for styling)
