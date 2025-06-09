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

app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/Public', express.static(path.join(__dirname, 'Public')));
app.use(express.static(path.join(__dirname, 'Public')));

mongoose
  .connect(
    "mongodb+srv://reneshow:lKRwjaxZcHC0nLFb@unisports.sqnspo5.mongodb.net/unisports",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: "majority",
    }
  )
  .then(() => console.log("✅ Conectado ao MongoDB"))
  .catch((err) => console.error("❌ Erro na conexão:", err));

mongoose.set('debug', true);

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateObjectId = (id) => {
  return ObjectId.isValid(id) && (new ObjectId(id)).toString() === id;
};

app.use((req, res, next) => {
  if (req.params.id && !validateObjectId(req.params.id)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid ID format',
      details: 'The provided ID is not a valid MongoDB ObjectId'
    });
  }
  next();
});


app.post('/register', async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    
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

app.post('/api/turmas', async (req, res) => {
  try {
    const { name, type, number, createdBy } = req.body;
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

    const user = await User.findOne({ email: createdBy })
      .select('_id email name')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found'
      });
    }

    const turmaData = {
      name,
      type,
      number,
      createdBy: user.email,
      creatorId: user._id  
    };

    const newTurma = await Turma.create(turmaData);

    await User.updateOne(
      { _id: user._id },
      { $addToSet: { turmas: newTurma._id } }
    );

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

app.get('/api/turmas/by-user/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

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

    const user = await User.findOne(query)
      .select('turmas')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found'
      });
    }

    const turmas = await Turma.find({
      $or: [
        { _id: { $in: user.turmas || [] } }, 
        { createdBy: user.email }             
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

app.get('/api/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      return res.status(503).json({
        success: false,
        status: 'Database not connected',
        dbState
      });
    }

    const usersCount = await User.countDocuments();
    const turmasCount = await Turma.countDocuments();

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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.put('/api/turmas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, number } = req.body;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid turma ID' });
    }
    const updateFields = {};
    if (name) updateFields.name = name;
    if (type) updateFields.type = type;
    if (number) updateFields.number = number;
    const turma = await Turma.findByIdAndUpdate(id, updateFields, { new: true });
    if (!turma) {
      return res.status(404).json({ success: false, error: 'Turma not found' });
    }
    res.status(200).json({ success: true, message: 'Turma updated', turma });
  } catch (error) {
    console.error('Update turma error:', error);
    res.status(500).json({ success: false, error: 'Failed to update turma' });
  }
});

app.delete('/api/turmas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid turma ID' });
    }
    const turma = await Turma.findByIdAndDelete(id);
    if (!turma) {
      return res.status(404).json({ success: false, error: 'Turma not found' });
    }
    await User.updateMany(
      { turmas: id },
      { $pull: { turmas: id } }
    );
    res.status(200).json({ success: true, message: 'Turma deleted' });
  } catch (error) {
    console.error('Delete turma error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete turma' });
  }
});

app.get('/api/user/profile', async (req, res) => {
  try {
    const userEmail = req.query.email || 'default@example.com'; 
    const user = await User.findOne({ email: userEmail }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Erro ao obter perfil do usuário:', error);
    res.status(500).json({ success: false, error: 'Erro ao obter perfil do usuário' });
  }
});

app.put('/api/user/profile', async (req, res) => {
  try {
    const userEmail = req.body.email || 'default@example.com'; 
    const { name, image } = req.body;

    const user = await User.findOneAndUpdate(
      { email: userEmail },
      { name, image },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Erro ao atualizar perfil do usuário:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar perfil do usuário' });
  }
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  if (err.name === 'CastError' && err.path === '_id') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
      details: 'The provided ID is not valid'
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📊 MongoDB connected: ${toString(mongoose.connection.host)}`);
});