// --- BACKEND SERVER FOR SEEKR / SYMPHONY ---
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bmxTfy8j', // Your correct password
    database: 'seekr_db'  // Your correct database
});

db.connect((err) => {
    if (err) console.log("Database connection failed: ", err);
    else console.log("Connected to seekr_db MySQL Database!");
});

// --- ROUTES ---

// 1. User Registration Route
app.post('/register', (req, res) => {
    const { fullName, email, password, role } = req.body;

    // Split "Full Name" into First and Last name for your database
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0]; 
    const lastName = nameParts.slice(1).join(' ') || ''; 

    // Capitalize the role to match your MySQL ENUM ('Member', 'Manager')
    const dbRole = role === 'manager' ? 'Manager' : 'Member';

    const sql = "INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)";
    
    db.query(sql, [firstName, lastName, email, password, dbRole], (err, result) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: "Email already exists or error occurred." });
        }
        res.json({ success: true, message: "Account Created!" });
    });
});

// 2. User Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
    db.query(sql, [email, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            const user = results[0];
            // Send the role back in lowercase so the frontend routing works perfectly
            res.json({ success: true, role: user.role.toLowerCase() });
        } else {
            res.json({ success: false, message: "Invalid email or password." });
        }
    });
});

// 3. Update Personality Route
app.post('/update-personality', (req, res) => {
    const { email, personalityType } = req.body;
    const sql = "UPDATE users SET personality_type = ? WHERE email = ?";
    db.query(sql, [personalityType, email], (err, result) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

// 4. Manager Creates a Project Route
app.post('/create-project', (req, res) => {
    const { title, industry, deadline, teamSize, managerEmail } = req.body;
    
    // Generate a random 6-character Join Code (e.g. "X9B2P1")
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Find the Manager's ID using their email
    db.query("SELECT id FROM users WHERE email = ?", [managerEmail], (err, users) => {
        if (err || users.length === 0) return res.json({ success: false, message: "Manager not found in DB." });
        
        const managerId = users[0].id;
        
        // Insert the new project into the database
        const sql = "INSERT INTO projects (join_code, title, industry, deadline, team_size, manager_id) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(sql, [joinCode, title, industry, deadline, teamSize, managerId], (err, result) => {
            if (err) return res.json({ success: false, message: "Error saving project." });
            res.json({ success: true, joinCode: joinCode }); 
        });
    });
});

// 5. Member Verifies Join Code Route
app.post('/verify-code', (req, res) => {
    const { joinCode } = req.body;
    const sql = "SELECT * FROM projects WHERE join_code = ?";
    db.query(sql, [joinCode], (err, projects) => {
        if (err) return res.json({ success: false });
        if (projects.length > 0) {
            res.json({ success: true, project: projects[0] }); 
        } else {
            res.json({ success: false, message: "Invalid Join Code. Check with your Manager." });
        }
    });
});

// 6. Member Enrolls in Project Route
app.post('/enroll', (req, res) => {
    const { email, projectId } = req.body;
    db.query("SELECT id FROM users WHERE email = ?", [email], (err, users) => {
        if (users.length > 0) {
            const userId = users[0].id;
            const sql = "INSERT INTO project_users (user_id, project_id, quiz_completed) VALUES (?, ?, true)";
            db.query(sql, [userId, projectId], (err, result) => {
                res.json({ success: true });
            });
        }
    });
});

// 7. AI Generate Quiz Route (SIMULATED FALLBACK)
app.post('/generate-quiz', (req, res) => {
    const { industry } = req.body;

    // Fake an AI delay so the frontend loading spinner looks real!
    setTimeout(() => {
        if(industry === "Marketing") {
            res.json({ success: true, question: "Which strategy yields the highest ROI for a B2B SaaS launch?", option1: "Account-Based Marketing (ABM)", option2: "Viral TikTok Campaigns" });
        } else if (industry === "Business") {
            res.json({ success: true, question: "How should a manager handle scope creep mid-sprint?", option1: "Enforce strict Agile change management", option2: "Approve all changes to please the client" });
        } else {
            res.json({ success: true, question: "Which approach handles real-time global data synchronization?", option1: "Event-driven CRDTs", option2: "Centralized Relational Mesh" });
        }
    }, 3500); // 3.5 second fake loading delay!
});

// Start Server
app.listen(3000, () => {
    console.log("Backend running on http://localhost:3000");
});