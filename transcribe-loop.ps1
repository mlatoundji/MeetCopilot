$filePath = "sample.wav"  # Path to your WAV file
$uri = "http://localhost:3000/api/transcribe/assemblyai"
# Initialize HttpClient once
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()

while ($true) {
    # Print current timestamp
    Write-Host "=== $(Get-Date -Format o) ==="
    try {
        # Build multipart form-data content
        $content = [System.Net.Http.MultipartFormDataContent]::new()
        # File content
        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
        $fileContent = [System.Net.Http.ByteArrayContent]::new($fileBytes)
        $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("audio/wav")
        $content.Add($fileContent, 'audio', [System.IO.Path]::GetFileName($filePath))
        # Other fields
        $content.Add([System.Net.Http.StringContent]::new('fr'), 'langCode')
        $content.Add([System.Net.Http.StringContent]::new('assemblyai'), 'model')
        $content.Add([System.Net.Http.StringContent]::new('audio/wav'), 'mimeType')
        $content.Add([System.Net.Http.StringContent]::new([System.IO.Path]::GetFileName($filePath)), 'filename')

        # Send request
        $response = $client.PostAsync($uri, $content).Result
        $response.EnsureSuccessStatusCode()
        $responseBody = $response.Content.ReadAsStringAsync().Result
        $json = ConvertFrom-Json $responseBody
        # Output transcription result
        Write-Host $json.transcription
    } catch {
        Write-Error $_.Exception.Message
    }
    # Wait before next iteration
    Start-Sleep -Seconds 1
} 