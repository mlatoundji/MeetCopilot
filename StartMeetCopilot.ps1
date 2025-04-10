# Save this script as StartProject.ps1 on your desktop

# Start the server
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npm start" -WorkingDirectory "C:\Users\moura\Documents\Personal\Dev\Javascript\MeetCopilot"

# Start the front-end application
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c python -m http.server 8000" -WorkingDirectory "C:\Users\moura\Documents\Personal\Dev\Javascript\MeetCopilot\public"