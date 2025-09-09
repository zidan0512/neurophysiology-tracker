
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const dbPath = path.join(__dirname, 'neurophysiology.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
    // Cases table
    db.run(`CREATE TABLE IF NOT EXISTS cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        patient_name TEXT,
        exam_date DATE NOT NULL,
        doctor_name TEXT NOT NULL,
        location TEXT NOT NULL,
        exam_type TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Doctors table
    db.run(`CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Branches table
    db.run(`CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Exam types table
    db.run(`CREATE TABLE IF NOT EXISTS exam_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert default data
    const defaultDoctors = ['Dr. Ahmed Hassan', 'Dr. Sarah Mohamed', 'Dr. Omar Ali'];
    const defaultBranches = ['Main Branch', 'North Branch', 'South Branch'];
    const defaultExamTypes = ['NCS only', 'NCS + EMG', 'EEG', 'Evoked Potentials', 'Sleep Study'];

    defaultDoctors.forEach(doctor => {
        db.run('INSERT OR IGNORE INTO doctors (name) VALUES (?)', [doctor]);
    });

    defaultBranches.forEach(branch => {
        db.run('INSERT OR IGNORE INTO branches (name) VALUES (?)', [branch]);
    });

    defaultExamTypes.forEach(type => {
        db.run('INSERT OR IGNORE INTO exam_types (name) VALUES (?)', [type]);
    });
});

// Helper function for database queries
const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const getQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const allQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// API Routes

// Cases endpoints
app.get('/api/cases', async (req, res) => {
    try {
        const { doctor, branch, examType, fromDate, toDate, search } = req.query;
        let query = 'SELECT * FROM cases WHERE 1=1';
        let params = [];

        if (doctor) {
            query += ' AND doctor_name = ?';
            params.push(doctor);
        }
        if (branch) {
            query += ' AND location = ?';
            params.push(branch);
        }
        if (examType) {
            query += ' AND exam_type = ?';
            params.push(examType);
        }
        if (fromDate) {
            query += ' AND exam_date >= ?';
            params.push(fromDate);
        }
        if (toDate) {
            query += ' AND exam_date <= ?';
            params.push(toDate);
        }
        if (search) {
            query += ' AND (patient_id LIKE ? OR patient_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY exam_date DESC, created_at DESC';

        const cases = await allQuery(query, params);
        res.json(cases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cases/:id', async (req, res) => {
    try {
        const case_data = await getQuery('SELECT * FROM cases WHERE id = ?', [req.params.id]);
        if (!case_data) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json(case_data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cases', async (req, res) => {
    try {
        const { patient_id, patient_name, exam_date, doctor_name, location, exam_type, notes } = req.body;
        
        if (!patient_id || !exam_date || !doctor_name || !location || !exam_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await runQuery(
            'INSERT INTO cases (patient_id, patient_name, exam_date, doctor_name, location, exam_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [patient_id, patient_name, exam_date, doctor_name, location, exam_type, notes]
        );

        const newCase = await getQuery('SELECT * FROM cases WHERE id = ?', [result.id]);
        res.status(201).json(newCase);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/cases/:id', async (req, res) => {
    try {
        const { patient_id, patient_name, exam_date, doctor_name, location, exam_type, notes } = req.body;
        
        if (!patient_id || !exam_date || !doctor_name || !location || !exam_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runQuery(
            'UPDATE cases SET patient_id = ?, patient_name = ?, exam_date = ?, doctor_name = ?, location = ?, exam_type = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [patient_id, patient_name, exam_date, doctor_name, location, exam_type, notes, req.params.id]
        );

        const updatedCase = await getQuery('SELECT * FROM cases WHERE id = ?', [req.params.id]);
        if (!updatedCase) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json(updatedCase);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/cases/:id', async (req, res) => {
    try {
        const result = await runQuery('DELETE FROM cases WHERE id = ?', [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json({ message: 'Case deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Doctors endpoints
app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await allQuery('SELECT * FROM doctors ORDER BY name');
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/doctors', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Doctor name is required' });
        }

        const result = await runQuery('INSERT INTO doctors (name) VALUES (?)', [name]);
        const newDoctor = await getQuery('SELECT * FROM doctors WHERE id = ?', [result.id]);
        res.status(201).json(newDoctor);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(409).json({ error: 'Doctor already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

app.delete('/api/doctors/:id', async (req, res) => {
    try {
        const result = await runQuery('DELETE FROM doctors WHERE id = ?', [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json({ message: 'Doctor deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Branches endpoints
app.get('/api/branches', async (req, res) => {
    try {
        const branches = await allQuery('SELECT * FROM branches ORDER BY name');
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/branches', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Branch name is required' });
        }

        const result = await runQuery('INSERT INTO branches (name) VALUES (?)', [name]);
        const newBranch = await getQuery('SELECT * FROM branches WHERE id = ?', [result.id]);
        res.status(201).json(newBranch);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(409).json({ error: 'Branch already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

app.delete('/api/branches/:id', async (req, res) => {
    try {
        const result = await runQuery('DELETE FROM branches WHERE id = ?', [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Branch not found' });
        }
        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Exam types endpoints
app.get('/api/exam-types', async (req, res) => {
    try {
        const examTypes = await allQuery('SELECT * FROM exam_types ORDER BY name');
        res.json(examTypes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/exam-types', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Exam type name is required' });
        }

        const result = await runQuery('INSERT INTO exam_types (name) VALUES (?)', [name]);
        const newExamType = await getQuery('SELECT * FROM exam_types WHERE id = ?', [result.id]);
        res.status(201).json(newExamType);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(409).json({ error: 'Exam type already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

app.delete('/api/exam-types/:id', async (req, res) => {
    try {
        const result = await runQuery('DELETE FROM exam_types WHERE id = ?', [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Exam type not found' });
        }
        res.json({ message: 'Exam type deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dashboard statistics endpoint
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const weekStart = startOfWeek.toISOString().split('T')[0];
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const monthStart = startOfMonth.toISOString().split('T')[0];

        const [todayCount] = await allQuery('SELECT COUNT(*) as count FROM cases WHERE exam_date = ?', [today]);
        const [weekCount] = await allQuery('SELECT COUNT(*) as count FROM cases WHERE exam_date >= ?', [weekStart]);
        const [monthCount] = await allQuery('SELECT COUNT(*) as count FROM cases WHERE exam_date >= ?', [monthStart]);
        const [totalCount] = await allQuery('SELECT COUNT(*) as count FROM cases');

        // Cases by exam type
        const examTypeStats = await allQuery(`
            SELECT exam_type, COUNT(*) as count 
            FROM cases 
            GROUP BY exam_type 
            ORDER BY count DESC
        `);

        // Cases by branch
        const branchStats = await allQuery(`
            SELECT location, COUNT(*) as count 
            FROM cases 
            GROUP BY location 
            ORDER BY count DESC
        `);

        // Cases by doctor
        const doctorStats = await allQuery(`
            SELECT doctor_name, COUNT(*) as count 
            FROM cases 
            GROUP BY doctor_name 
            ORDER BY count DESC
        `);

        res.json({
            counters: {
                today: todayCount.count,
                week: weekCount.count,
                month: monthCount.count,
                total: totalCount.count
            },
            charts: {
                examTypes: examTypeStats,
                branches: branchStats,
                doctors: doctorStats
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Neurophysiology Tracker Server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed.');
        }
        process.exit(0);
    });
});

module.exports = app;
