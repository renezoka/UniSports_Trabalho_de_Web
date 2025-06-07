const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { Types: { ObjectId } } = mongoose;
const User = require('./models/User');
const Turma = require('./models/Turma');

const app = express();
const port = 3001;

// Enhanced configurations
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/Public', express.static(path.join(__dirname, 'Public')));
app.use(express.static(path.join(__dirname, 'Public')));

// MongoDB connection with enhanced options
mongoose.connect('mongodb+srv://reneshow:lKRwjaxZcHC0nLFb@unisports.sqnspo5.mongodb.net/unisports', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
})
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch(err => console.error('❌ Erro na conexão:', err));

// Enable Mongoose debug mode to see queries
mongoose.set('debug', true);

// Validation utilities
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateObjectId = (id) => {
  return ObjectId.isValid(id) && (new ObjectId(id)).toString() === id;
};

// Enhanced error handling middleware
app.use((req, res, next) => {
  // Check for any ID parameters in the request
  if (req.params.id && !validateObjectId(req.params.id)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid ID format',
      details: 'The provided ID is not a valid MongoDB ObjectId'
    });
  }
  next();
});

// API Routes

// [1] User Registration - Enhanced
app.post('/register', async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    
    // Enhanced validation
    if (!email || !password || !username) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields',
        required: ['email', 'username', 'password']
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format'
      });
    }

    // Check for existing user more efficiently
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    }).select('email username');

    if (existingUser) {
      const conflictField = existingUser.email === email ? 'email' : 'username';
      return res.status(409).json({ 
        success: false,
        error: `${conflictField} already exists`,
        conflict: conflictField
      });
    }

    const newUser = new User({ name, email, username, password });
    await newUser.save();
    
    // Don't send password back
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({ 
      success: true,
      message: 'User created successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// [2] Login - Enhanced with basic security
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Username and password are required'
      });
    }

    const user = await User.findOne({ 
      $or: [{ email: username }, { username }] 
    }).select('+password');

    if (!user || user.password !== password) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Create user response without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({ 
      success: true,
      message: 'Login successful',
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed'
    });
  }
});

// [3] Create Turma - Completely safe version
app.post('/api/turmas', async (req, res) => {
  try {
    const { name, type, number, createdBy } = req.body;
    
    // Validate all fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!type) missingFields.push('type');
    if (!number) missingFields.push('number');
    if (!createdBy) missingFields.push('createdBy');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields',
        missing: missingFields
      });
    }

    if (!validateEmail(createdBy)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid creator email format'
      });
    }

    // Find user by email only, no ID conversion
    const user = await User.findOne({ email: createdBy })
      .select('_id email name')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found'
      });
    }

    // Create turma with double reference (email and ID)
    const turmaData = {
      name,
      type,
      number,
      createdBy: user.email,
      creatorId: user._id  // Storing both for redundancy
    };

    const newTurma = await Turma.create(turmaData);

    // Update user's turmas array safely
    await User.updateOne(
      { _id: user._id },
      { $addToSet: { turmas: newTurma._id } }
    );

    // Prepare response
    const response = {
      ...newTurma.toObject(),
      creator: {
        name: user.name,
        email: user.email
      }
    };

    res.status(201).json({
      success: true,
      message: 'Turma created successfully',
      turma: response
    });

  } catch (error) {
    console.error('Turma creation error:', error);
    
    if (error.message.includes('Cast to ObjectId failed')) {
      return res.status(400).json({ 
        success: false,
        error: 'ID conversion error',
        details: 'System attempted invalid ID conversion'
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Turma creation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// [4] Get Turmas by User - 100% safe version
app.get('/api/turmas/by-user/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Determine if identifier is email or ID
    let query;
    if (validateEmail(identifier)) {
      query = { email: identifier };
    } else if (validateObjectId(identifier)) {
      query = { _id: identifier };
    } else {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid identifier',
        details: 'Must be a valid email or user ID'
      });
    }

    // Find user safely
    const user = await User.findOne(query)
      .select('turmas')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found'
      });
    }

    // Get turmas using both possible reference methods
    const turmas = await Turma.find({
      $or: [
        { _id: { $in: user.turmas || [] } }, // By reference
        { createdBy: user.email }             // By email (backup)
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: turmas.length,
      turmas
    });

  } catch (error) {
    console.error('Get turmas error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get turmas'
    });
  }
});

// [5] Get All Turmas
app.get('/api/turmas', async (req, res) => {
  try {
    const turmas = await Turma.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: turmas.length,
      turmas
    });

  } catch (error) {
    console.error('Get all turmas error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get turmas'
    });
  }
});

// [6] Database Health Check
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      return res.status(503).json({
        success: false,
        status: 'Database not connected',
        dbState
      });
    }

    // Check collections
    const usersCount = await User.countDocuments();
    const turmasCount = await Turma.countDocuments();

    // Find potential data issues
    const usersWithInvalidRefs = await User.countDocuments({
      turmas: { $exists: true, $not: { $type: 'array' } }
    });

    res.status(200).json({
      success: true,
      status: 'Healthy',
      stats: {
        users: usersCount,
        turmas: turmasCount,
        data_issues: {
          users_with_invalid_refs: usersWithInvalidRefs
        }
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      status: 'Unhealthy',
      error: 'Health check failed'
    });
  }
});

// [7] Frontend Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// Enhanced Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Handle CastError specifically
  if (err.name === 'CastError' && err.path === '_id') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
      details: 'The provided ID is not valid'
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📊 MongoDB connected: ${mongoose.connection.host}`);
});