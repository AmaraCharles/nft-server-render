const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../../models/User');

// User Registration
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('username').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`);
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errorMessages 
        });
      }

      const { email, password, username } = req.body;

      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = new User({
        email,
        password: hashedPassword,
        username
      });

      await user.save();

      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

// User Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`);
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errorMessages 
        });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compareSync(password, user.password);
      if (!isMatch) {
        console.log('Password comparison failed for user:', user.email);
        console.log('Input password:', password);
        console.log('Stored hash:', user.password);
        console.log('Salt rounds:', process.env.BCRYPT_SALT_ROUNDS || 'default (10)');
        console.log('JWT secret:', process.env.JWT_SECRET ? 'exists' : 'missing');
        console.log('Environment variables:', {
          MONGODB_URI: process.env.MONGODB_URI ? 'exists' : 'missing',
          JWT_SECRET: process.env.JWT_SECRET ? 'exists' : 'missing',
          CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'exists' : 'missing'
        });
        console.log('User document:', user);
        return res.status(400).json({ 
          message: 'Invalid credentials',
          debug: {
            inputEmail: email,
            storedEmail: user.email,
            passwordMatch: isMatch
          }
        });
      }

      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

// Password Reset Request
router.post('/forgot-password',
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`);
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errorMessages 
        });
      }

      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate password reset token
      const resetToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      user.resetToken = resetToken;
      user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
      await user.save();

      // Here you would typically send an email with the reset link
      // For now, we'll just return the token
      res.json({ message: 'Password reset email sent', resetToken });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

// Reset Password
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`);
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errorMessages 
        });
      }

      const { token, password } = req.body;
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(404).json({ message: 'Invalid or expired reset token' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();

      res.json({ message: 'Password has been reset' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

module.exports = router;