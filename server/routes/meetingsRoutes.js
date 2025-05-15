import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure meetings directory exists
const meetingsDir = path.join(__dirname, '../../data/meetings');
if (!fs.existsSync(meetingsDir)) {
    fs.mkdirSync(meetingsDir, { recursive: true });
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Save meeting data
router.post('/', async (req, res) => {
    try {
        const { saveMethod, meetingData } = req.body;

        if (!saveMethod || !meetingData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameters' 
            });
        }

        if (saveMethod === 'local') {
            // Save locally
            const filename = `${meetingData.id}.json`;
            const filepath = path.join(meetingsDir, filename);
            
            fs.writeFileSync(filepath, JSON.stringify(meetingData, null, 2));
            res.json({ success: true, message: 'Meeting saved locally' });
        } else if (saveMethod === 'supabase') {
            // Save to Supabase
            const { data, error } = await supabase
                .from('meetings')
                .insert([
                    {
                        dialogs: meetingData.dialogs,
                        summaries: meetingData.summaries,
                        suggestions: meetingData.suggestions,
                        metadata: meetingData.metadata,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;
            res.json({ success: true, message: 'Meeting saved to Supabase' });
        } else {
            res.status(400).json({ 
                success: false, 
                error: 'Invalid save method' 
            });
        }
    } catch (error) {
        console.error('Error saving meeting:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get all meetings
router.get('/', async (req, res) => {
    try {
        const { saveMethod } = req.query;

        if (!saveMethod) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing saveMethod parameter' 
            });
        }

        if (saveMethod === 'local') {
            // Read local files
            const files = fs.readdirSync(meetingsDir);
            const meetings = files.map(filename => {
                const filepath = path.join(meetingsDir, filename);
                const content = fs.readFileSync(filepath, 'utf8');
                const meeting = JSON.parse(content);
                // Add id and saveMethod to each meeting
                return {
                    ...meeting,
                    id: meeting.id || filename.replace('.json', ''),
                    metadata: {
                        ...meeting.metadata,
                        saveMethod: 'local'
                    }
                };
            });
            res.json({ 
                success: true,
                data: meetings 
            });
        } else if (saveMethod === 'supabase') {
            // Get from Supabase
            const { data, error } = await supabase
                .from('meetings')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({
                success: true,
                data: data
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: 'Invalid save method' 
            });
        }
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get specific meeting by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { saveMethod } = req.query;

        if (!saveMethod) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing saveMethod parameter' 
            });
        }

        if (saveMethod === 'local') {
            // Find the local file by ID
            const filename = `${id}.json`;
            const filepath = path.join(meetingsDir, filename);
            
            if (!fs.existsSync(filepath)) {
                return res.status(404).json({
                    success: false,
                    error: `Meeting with ID ${id} not found`
                });
            }
            
            const content = fs.readFileSync(filepath, 'utf8');
            const meeting = JSON.parse(content);
            
            // Add id and saveMethod to meeting
            const meetingWithMetadata = {
                ...meeting,
                id,
                metadata: {
                    ...meeting.metadata,
                    saveMethod: 'local'
                }
            };
            
            res.json({
                success: true,
                data: meetingWithMetadata
            });
        } else if (saveMethod === 'supabase') {
            // Get from Supabase by ID
            const { data, error } = await supabase
                .from('meetings')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: `Meeting with ID ${id} not found`
                    });
                }
                throw error;
            }
            
            res.json({
                success: true,
                data
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: 'Invalid save method' 
            });
        }
    } catch (error) {
        console.error('Error fetching meeting details:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

export default router; 