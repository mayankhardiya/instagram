const express = require('express');
const router = express.Router()
const mongoose = require('mongoose');
const User = mongoose.model("User");
var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../config/key')
const requireLogin = require('../middleware/requireLogin')
const nodemailer = require('nodemailer')
const { SENDGRID_API, EMAIL } = require('../config/key')

router.get('/protected', requireLogin, (req, res) => {
    console.log("hello");
});

router.post('/signup', (req, res) => {

    const { name, email, password } = req.body
    if (!email || !password || !name) {
        return res.status(422).json({ error: "Please add all the fileds" })
    }
    User.findOne({ email: email }).then((savedUser) => {
        if (savedUser) {
            return res.status(422).json({ error: "User already exists with that email" })
        }
        bcrypt.hash(password, 12).then(hashedpassword => {
            const user = new User({
                email,
                password: hashedpassword,
                name
            })
            user.save().then(user => {

                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'mayank.novasoftcorps@gmail.com',
                        pass: 'Mayank@001'
                    }
                });

                var mailOptions = {
                    from: 'mayank.novasoftcorps@gmail.com',
                    to: user.email,
                    subject: "Singup Messages",
                    text: 'You successfull login'
                };

                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });

                res.json({ message: "Saved Succefully" })
            }).catch(err => {
                console.log(err)
            })

        }).catch(err => {
            console.log(err)
        })
    })
});

router.post('/signin', (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(422).json({ error: "please add email or password" })
    }
    User.findOne({ email: email }).then(savedUser => {
        if (!savedUser) {
            return res.status(422).json({ error: "Invalid Email or password" })
        }
        bcrypt.compare(password, savedUser.password)
            .then(doMatch => {
                if (doMatch) {

                    const token = jwt.sign({ _id: savedUser._id }, JWT_SECRET)
                    const { _id, name, email, followers, following, pic } = savedUser
                    res.json({ token, user: { _id, name, email, followers, following, pic } })

                } else {

                    return res.status(422).json({ error: "Invalid email or password" });

                }
            }).catch(err => {
                console.log(err)
            })
    })

});

router.post('/reset-password', (req, res) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err)
        }
        const token = buffer.toString("hex")
        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    return res.status(422).json({ error: "User dont exists with that email" })
                }
                user.resetToken = token
                user.expireToken = Date.now() + 3600000
                user.save().then((result) => {
                    var transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'mayank.novasoftcorps@gmail.com',
                            pass: 'Mayank@001'
                        }
                    });

                    var mailOptions = {
                        from: 'mayank.novasoftcorps@gmail.com',
                        to: user.email,
                        subject: "Password reset",
                        text: `
                        <p>You requested for password reset</p>
                        <h5>click in this <a href="${EMAIL}/reset/${token}">link</a> to reset password</h5>
                        `
                    };

                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response);
                        }
                    });

                    res.json({ message: "check your email" })
                })

            })
    })

});

router.post('/new-password', (req, res) => {
    const newPassword = req.body.password
    const sentToken = req.body.token
    User.findOne({ resetToken: sentToken, expireToken: { $gt: Date.now() } })
        .then(user => {
            if (!user) {
                return res.status(422).json({ error: "Try again session expired" })
            }
            bcrypt.hash(newPassword, 12).then(hashedpassword => {
                user.password = hashedpassword
                user.resetToken = undefined
                user.expireToken = undefined
                user.save().then((saveduser) => {
                    res.json({ message: "password updated success" })
                })
            })
        }).catch(err => {
            console.log(err)
        })
})

module.exports = router