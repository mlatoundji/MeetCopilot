const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { initializeLocalLLM, generateLocalSuggestions, generateSummary, transcribeAudio, cleanupLocalLLM } = require('../../server/services/localLLMService');
const fs = require('fs');

describe('Local LLM Service', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('initializeLocalLLM', () => {
        it('should initialize successfully when model file exists', async () => {
            sandbox.stub(fs, 'existsSync').returns(true);
            const result = await initializeLocalLLM();
            expect(result).to.be.true;
        });

        it('should fail when model file does not exist', async () => {
            sandbox.stub(fs, 'existsSync').returns(false);
            const result = await initializeLocalLLM();
            expect(result).to.be.false;
        });
    });

    describe('generateLocalSuggestions', () => {
        it('should generate suggestions for valid context', async () => {
            const context = "Test context for suggestions";
            const result = await generateLocalSuggestions(context);
            expect(result).to.be.a('string');
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle empty context', async () => {
            const result = await generateLocalSuggestions("");
            expect(result).to.be.a('string');
        });

        it('should handle very long context', async () => {
            const longContext = "a".repeat(1000);
            const result = await generateLocalSuggestions(longContext);
            expect(result).to.be.a('string');
        });
    });

    describe('generateSummary', () => {
        it('should generate summary for conversation history', async () => {
            const history = "Test conversation history";
            const result = await generateSummary(history);
            expect(result).to.be.a('string');
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle empty history', async () => {
            const result = await generateSummary("");
            expect(result).to.be.a('string');
        });
    });

    describe('transcribeAudio', () => {
        it('should transcribe audio data', async () => {
            const audioData = "Test audio data";
            const result = await transcribeAudio(audioData);
            expect(result).to.be.a('string');
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle empty audio data', async () => {
            const result = await transcribeAudio("");
            expect(result).to.be.a('string');
        });
    });

    describe('cleanupLocalLLM', () => {
        it('should cleanup resources successfully', async () => {
            const result = await cleanupLocalLLM();
            expect(result).to.be.undefined;
        });
    });
}); 