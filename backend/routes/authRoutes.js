// routes/authRoutes.js
import express from 'express'
import { login, register, logout, getProfile } from '../controller/authController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.post('/login', login)
router.post('/register', register)

// Protected routes
router.post('/logout', authenticateToken, logout)
router.get('/profile', authenticateToken, getProfile)

export default router