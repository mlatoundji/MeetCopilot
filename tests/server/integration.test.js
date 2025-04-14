const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const app = require('../../server/main');

chai.use(chaiHttp);

describe('System Integration Tests', () => {
    describe('Suggestion Generation Flow', () => {
        it('should generate suggestions from local LLM', async () => {
            const response = await chai
                .request(app)
                .post('/api/suggestions')
                .send({ context: 'Test meeting context' });

            expect(response).to.have.status(200);
            expect(response.body).to.have.property('suggestions');
            expect(response.body.suggestions).to.be.an('array');
        });

        it('should fallback to API when local LLM fails', async () => {
            const response = await chai
                .request(app)
                .post('/api/suggestions')
                .send({ context: 'Test context for API fallback' });

            expect(response).to.have.status(200);
            expect(response.body).to.have.property('suggestions');
        });
    });

    describe('Transcription Flow', () => {
        it('should transcribe audio successfully', async () => {
            const response = await chai
                .request(app)
                .post('/api/transcribe')
                .send({ audio: 'base64_encoded_audio_data' });

            expect(response).to.have.status(200);
            expect(response.body).to.have.property('transcription');
            expect(response.body.transcription).to.be.a('string');
        });

        it('should handle invalid audio data', async () => {
            const response = await chai
                .request(app)
                .post('/api/transcribe')
                .send({ audio: '' });

            expect(response).to.have.status(400);
        });
    });

    describe('Summary Generation Flow', () => {
        it('should generate meeting summary', async () => {
            const response = await chai
                .request(app)
                .post('/api/summary')
                .send({ 
                    conversation: 'Test meeting conversation',
                    interval: 5
                });

            expect(response).to.have.status(200);
            expect(response.body).to.have.property('summary');
            expect(response.body.summary).to.be.a('string');
        });

        it('should handle empty conversation', async () => {
            const response = await chai
                .request(app)
                .post('/api/summary')
                .send({ conversation: '' });

            expect(response).to.have.status(400);
        });
    });

    describe('Performance Tests', () => {
        it('should respond within 3 seconds for suggestions', async () => {
            const startTime = Date.now();
            await chai
                .request(app)
                .post('/api/suggestions')
                .send({ context: 'Performance test context' });
            const endTime = Date.now();
            
            expect(endTime - startTime).to.be.lessThan(3000);
        });

        it('should handle concurrent requests', async () => {
            const requests = Array(5).fill().map(() => 
                chai
                    .request(app)
                    .post('/api/suggestions')
                    .send({ context: 'Concurrent test context' })
            );

            const responses = await Promise.all(requests);
            responses.forEach(response => {
                expect(response).to.have.status(200);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle server errors gracefully', async () => {
            const response = await chai
                .request(app)
                .post('/api/suggestions')
                .send({ invalid: 'data' });

            expect(response).to.have.status(400);
            expect(response.body).to.have.property('error');
        });

        it('should handle missing endpoints', async () => {
            const response = await chai
                .request(app)
                .get('/api/nonexistent');

            expect(response).to.have.status(404);
        });
    });
}); 