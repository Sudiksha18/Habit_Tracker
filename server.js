const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const Habit = require('./models/Habit'); // Add this line
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Update MongoDB connection with more robust options
mongoose.connect('mongodb://127.0.0.1:27017/nithyadb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // connectTimeoutMS: 60000,
  // socketTimeoutMS: 60000,
  // serverSelectionTimeoutMS: 60000,
  // heartbeatFrequencyMS: 1000,
  // maxPoolSize: 10,
})
.then(() => {
  console.log('Connected to MongoDB');
  app.listen(5001, () => console.log('Server running on http://localhost:5001'));
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Add a test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Habit Tracker API' });
});

// Add this function before your routes
// Update the password validation function
const validatePassword = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const errors = [];
  
  if (password.length < minLength) {
    errors.push('Password must be at least 6 characters long');
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors.length > 0 ? errors.join(', ') : null;
};

// Update the signup route to handle multiple validation messages
app.post('/api/signup', async (req, res) => {
  console.log('Received signup request:', req.body);
  const { fullName, email, password } = req.body;
  
  // Validate password
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user = new User({ fullName, email, password });
    console.log('Creating user:', user);
    await user.save();
    console.log('User saved successfully');
    res.status(201).json({ message: 'Signup successful' });
  } catch (error) {
    console.error('Signup error details:', error);
    res.status(500).json({ 
      message: 'Something went wrong',
      error: error.message
    });
  }
});

// Add this after your signup route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Get user's habits or create default habits for new users
    let habits = await Habit.find({ userEmail: email });
    
    if (habits.length === 0) {
      // Create default habits for new users
      const defaultHabits = [
        {
          text: 'Morning Exercise',
          description: '30 minutes of cardio or strength training',
          category: 'health',
          streak: 0,
          completed: false,
          userEmail: email
        }
      ];
      
      habits = await Habit.insertMany(defaultHabits);
    }

    res.json({ 
      message: 'Login successful',
      user: {
        fullName: user.fullName,
        email: user.email
      },
      habits: habits
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// Add new route to save habits
app.post('/api/habits', async (req, res) => {
  const { habit, userEmail } = req.body;
  
  // Add validation checks
  if (!habit?.text) {
    return res.status(400).json({ message: 'Habit text is required' });
  }
  if (!habit?.category) {
    return res.status(400).json({ message: 'Category is required' });
  }

  try {
    // First verify if user exists
    const user = await User.findOne({ email: userEmail.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newHabit = new Habit({
      text: habit.text,
      description: habit.description || '',
      category: habit.category,
      streak: habit.streak || 0,
      completed: habit.completed || false,
      userEmail: userEmail.toLowerCase()
    });
    
    const savedHabit = await newHabit.save();
    console.log('Habit saved:', savedHabit); // Add logging
    res.status(201).json(savedHabit);
  } catch (error) {
    console.error('Error saving habit:', error);
    res.status(500).json({ 
      message: 'Error saving habit',
      error: error.message 
    });
  }
});

// Get habits for specific user
app.get('/api/habits', async (req, res) => {
  try {
    const userEmail = req.query.userEmail.toLowerCase();
    
    // Verify user exists
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const habits = await Habit.find({ userEmail: userEmail });
    res.json(habits);
  } catch (error) {
    console.error('Error fetching habits:', error);
    res.status(500).json({ message: 'Error fetching habits' });
  }
});
const habitRoutes = require('./routes/habits');
app.use('/api/habits', habitRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
