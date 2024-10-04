const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs')

const app = express()

app.use(bodyParser.json())

app.post('/login', (req, res) => {
    fs.readFile('utenti.json', 'utf-8', (error, data) => {
        if (error) {
            res.status(500).send('Error reading user data');
            return;
        }

        const users = JSON.parse(data);
        const user = users.find(user => user.username === req.body.username && user.password === req.body.password);

        if (user) {
            res.status(200).json({ message: 'User found', loggedSpotify: user.loggedSpotify });
        } else {
            res.status(404).send('User not found');
        }
    });
});

app.post('/register', (req, res) => {
    fs.readFile('utenti.json', 'utf-8', (error, data) => {
        if (error) {
            res.status(500).send('Error reading user data');
            return;
        }

        const users = JSON.parse(data);
        const existingUser = users.find(user => user.username === req.body.username);

        if (existingUser) {
            res.status(409).send('Username already exists');
            return;
        }

        const newUser = {
            username: req.body.username,
            password: req.body.password,
            loggedSpotify: req.body.loggedSpotify
        };

        users.push(newUser);

        fs.writeFile('utenti.json', JSON.stringify(users), (error) => {
            if (error) {
                res.status(500).send('Error writing user data');
                return;
            }

            res.status(201).send('User created');
        });
    });
});

app.delete('/delete', (req, res) => {
    fs.readFile('utenti.json', 'utf-8', (error, data) => {
        if (error) {
            res.status(500).send('Error reading user data');
            return;
        }

        let users = JSON.parse(data);
        const userIndex = users.findIndex(user => user.username === req.body.username);

        if (userIndex === -1) {
            res.status(404).send('User not found');
            return;
        }

        users.splice(userIndex, 1);

        fs.writeFile('utenti.json', JSON.stringify(users), (error) => {
            if (error) {
                res.status(500).send('Error writing user data');
                return;
            }

            res.status(200).send('User deleted');
        });
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});



