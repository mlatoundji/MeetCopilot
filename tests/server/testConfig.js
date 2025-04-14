module.exports = {
    // Test timeouts
    timeout: {
        short: 2000,
        medium: 5000,
        long: 10000
    },

    // Test data
    testData: {
        context: {
            valid: "This is a test meeting context for suggestions",
            empty: "",
            long: "a".repeat(1000)
        },
        audio: {
            valid: "base64_encoded_audio_data",
            empty: "",
            invalid: "invalid_audio_data"
        },
        conversation: {
            valid: "This is a test conversation for summary generation",
            empty: "",
            long: "a".repeat(2000)
        }
    },

    // Mock responses
    mocks: {
        suggestions: {
            success: {
                suggestions: [
                    "Test suggestion 1",
                    "Test suggestion 2"
                ]
            },
            error: {
                error: "Failed to generate suggestions"
            }
        },
        transcription: {
            success: {
                transcription: "This is a test transcription"
            },
            error: {
                error: "Failed to transcribe audio"
            }
        },
        summary: {
            success: {
                summary: "This is a test summary"
            },
            error: {
                error: "Failed to generate summary"
            }
        }
    },

    // Performance thresholds
    performance: {
        suggestionResponseTime: 3000, // 3 seconds
        transcriptionResponseTime: 5000, // 5 seconds
        summaryResponseTime: 4000, // 4 seconds
        concurrentRequests: 5
    }
}; 