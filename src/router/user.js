const express = require('express')
const multer = require('multer')
const sharp = require('sharp')

const auth = require('../middleware/auth')
const User = require('../models/user')

const router = express.Router()

//User creation endpoint
router.post('/users', async (req, res) => {
    const user = new User(req.body)

    try {
        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({ user: user, token })
    } catch (e) {
        res.status(400).send(e)
    }
})

//User authentication endpoint
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.status(200).send({ user: user, token })
    } catch (e) {
        res.status(400).send()
    }
})

//User logout endpoint
router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => token.token !== req.token)
        await req.user.save()
        res.status(200).send()
    } catch(e) {
        res.status(500).send()
    }
})

//User logout All endpoint
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.status(200).send()
    } catch(e) {
        res.status(500).send()
    }
})

const uploadAvatar = multer({
    limits: {
        fileSize: 1000000,
    },
    fileFilter(req, file, cb) {
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            cb(new Error('Please upload an image file.'))
        }
        cb(undefined, true)
    }
})
//user upload profile pictures endpoint
router.post('/users/me/avatar', auth, uploadAvatar.single('avatar'), async (req, res) => {
    try{
        const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
        req.user.avatar = buffer
        await req.user.save()
        res.status(200).send()
    } catch(e) {
        res.status(400).send()
    }
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

//User delete profile picture endpoint
router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined
    await req.user.save()
    res.status(200).send()
})

//User get profile picture endpoint
router.get('/users/:id/avatar', async (req, res) => {
    try{
        const user = await User.findById(req.params.id)
        if (!user || !user.avatar) {
            throw new Error()
        }
        res.set('Content-Type', 'image/png')
        res.status(200).send(user.avatar)
    } catch(e) {
        res.status(404).send()
    }
})

//User read user by auth endpoint
router.get('/users/me', auth, async (req, res) => {
    res.status(200).send(req.user)
})

//User update by id endpoint
router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.status(200).send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }
})

//User delete by id endpoint
router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove()
        res.status(200).send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }
})

module.exports = router